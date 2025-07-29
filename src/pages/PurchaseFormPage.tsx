// src/pages/PurchaseFormPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useForm,
  FormProvider,
  SubmitHandler,
  useWatch,
} from "react-hook-form"; // Import FormProvider
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// Import Child Components
import { PurchaseHeaderFormSection } from "../components/purchases/PurchaseHeaderFormSection";
import { PurchaseItemsList } from "../components/purchases/PurchaseItemsList";

// shadcn/ui & Lucide Icons (Only those needed for page shell/totals/submit)
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, AlertCircle, FileText } from "lucide-react";

// Services and Types
import purchaseService, {
  CreatePurchaseData,
  UpdatePurchaseData,
} from "../services/purchaseService";
import supplierService, { Supplier } from "../services/supplierService";
import productService, { Product } from "../services/productService";
import exportService from "../services/exportService";
import { formatNumber } from "@/constants";
import apiClient from "@/lib/axios";

// --- Zod Schema Definition (with item ID for edits) ---
const purchaseItemSchema = z.object({
  id: z.number().nullable().optional(), // For existing items during update
  product_id: z
    .number({ required_error: "validation:required" })
    .positive({ message: "validation:selectProduct" }),
    
  product: z.custom<Product>().optional(), // For UI state only
  batch_number: z
    .string()
    .max(100, { message: "validation:maxLengthHundred" })
    .nullable()
    .optional(), // Add key "validation:maxLengthHundred"
  quantity: z.coerce
    .number({ invalid_type_error: "validation:invalidInteger" })
    .int({ message: "validation:invalidInteger" })
    .min(1, { message: "validation:minQuantity" }),
  unit_cost: z.coerce
    .number({ invalid_type_error: "validation:invalidPrice" })
    .min(0, { message: "validation:minZero" }),
  total_sellable_units_display: z.number().optional(),
  cost_per_sellable_unit_display: z.number().optional(),
  sale_price: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce
      .number({ invalid_type_error: "validation:invalidPrice" })
      .min(0, { message: "validation:minZero" })
      .nullable()
      .optional()
  ),
  expiry_date: z
    .date({ invalid_type_error: "validation:invalidDate" })
    .nullable()
    .optional(),
});

const purchaseFormSchema = z.object({
  supplier_id: z
    .number({ required_error: "validation:required" })
    .positive({ message: "validation:selectSupplier" }),
  purchase_date: z.date({
    required_error: "validation:required",
    invalid_type_error: "validation:invalidDate",
  }),
  status: z.enum(["received", "pending", "ordered"], {
    required_error: "validation:required",
  }),
  reference_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z
    .array(purchaseItemSchema)
    .min(1, { message: "purchases:errorItemsRequired" }),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

// Type for a single item in the PurchaseFormValues
export type PurchaseItemFormValues = {
  id?: number | null;
  product_id: number;
  product?: Product; // Full selected product object (includes UOM info)
  batch_number?: string | null;
  quantity: number; // Quantity of STOCKING UNITS (e.g., boxes)
  unit_cost: number; // Cost per STOCKING UNIT (e.g., per box)
  sale_price?: number | null; // Intended sale price PER SELLABLE UNIT
  expiry_date?: Date | null;
  // Display only, calculated:
  total_sellable_units_display?: number;
  cost_per_sellable_unit_display?: number;
};

// --- Component ---
const PurchaseFormPage: React.FC = () => {
  const { t } = useTranslation([
    "purchases",
    "common",
    "validation",
    "suppliers",
    "products",
  ]);
  const navigate = useNavigate();
  const { id: purchaseIdParam } = useParams<{ id?: string }>();
  const purchaseId = purchaseIdParam ? Number(purchaseIdParam) : null;
  const isEditMode = Boolean(purchaseId);

  // --- State ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(isEditMode); // Loading existing purchase
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Search States
  const [supplierSearchInput, setSupplierSearchInput] = useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
  const supplierDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Selected objects for display
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );

  // --- React Hook Form Setup ---
  const formMethods = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier_id: undefined,
      purchase_date: new Date(),
      status: "pending",
      reference_number: "",
      notes: "",
      items: [
        {
          product_id: 0,
          batch_number: "",
          quantity: 1,
          unit_cost: 0,
          sale_price: null,
          expiry_date: null,
          product: undefined,
          
        },
      ],
    },
  });
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
    setError,
    control,
    formState: { errors },
  } = formMethods;
  console.log(errors,'errors')
  const watchedItems = useWatch({ control, name: "items" });
  const grandTotal =
    watchedItems?.reduce(
      (total, item) =>
        total + (Number(item?.quantity) || 0) * (Number(item?.unit_cost) || 0),
      0
    ) ?? 0;

  // --- Data Fetching Callbacks ---
  const fetchSuppliers = useCallback(
    async (search: string) => {
      if (!search && !isEditMode && suppliers.length > 0 && !selectedSupplier)
        return; // Don't clear if already populated and no search
      setLoadingSuppliers(true);
      try {
        const response = await apiClient.get<{ data: Supplier[] }>(
          `/suppliers?search=${encodeURIComponent(
            search
          )}&limit=15`
        );
        setSuppliers(response.data.data ?? response.data);
      } catch (error) {
        toast.error(t("common:error"), {
          description: supplierService.getErrorMessage(error),
        });
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    },
    [t, selectedSupplier]
  ); // Added dependencies

  const fetchProducts = useCallback(
    async (search: string) => {
      if (!search && !isEditMode && products.length > 0) return;
      setLoadingProducts(true);
      try {
        const response = await apiClient.get<{ data: Product[] }>(
          `/products/autocomplete?search=${encodeURIComponent(search)}&limit=15`
        );
        setProducts(response.data.data ?? response.data);
      } catch (error) {
        toast.error(t("common:error"), {
          description: productService.getErrorMessage(error),
        });
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    },
    []
  ); // Added dependencies

  // --- Debounce Effects ---
  useEffect(() => {
    if (supplierDebounceRef.current) clearTimeout(supplierDebounceRef.current);
    supplierDebounceRef.current = setTimeout(() => {
      setDebouncedSupplierSearch(supplierSearchInput);
    }, 300);
    return () => {
      if (supplierDebounceRef.current)
        clearTimeout(supplierDebounceRef.current);
    };
  }, [supplierSearchInput]);
  useEffect(() => {
    if(debouncedSupplierSearch !=''){

      fetchSuppliers(debouncedSupplierSearch);
    }
  }, [debouncedSupplierSearch, fetchSuppliers]);
  useEffect(() => {
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    productDebounceRef.current = setTimeout(() => {
      setDebouncedProductSearch(productSearchInput);
    }, 300);
    return () => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    };
  }, [productSearchInput]);
  useEffect(() => {
    fetchProducts(debouncedProductSearch);
  }, [debouncedProductSearch, fetchProducts]);

  // --- Fetch Existing Purchase Data for Edit Mode ---
  useEffect(() => {
    const loadPurchaseData = async (id: number) => {
      setLoadingData(true);
      setServerError(null);
      try {
        const existingPurchase = await purchaseService.getPurchase(id);
        if (!existingPurchase.items)
          throw new Error("Purchase items missing in API response.");

        // Pre-fetch related data for display
        const initialSupplier = existingPurchase.supplier_id
          ? await supplierService
              .getSupplier(existingPurchase.supplier_id)
              .catch(() => null)
          : null;

        const productIds = existingPurchase.items.map(
          (item) => item.product_id
        );
        const initialProducts =
          productIds.length > 0
            ? await productService.getProductsByIds(productIds).catch(() => [])
            : [];

        if (initialSupplier)
          setSuppliers((prev) =>
            prev.find((s) => s.id === initialSupplier.id)
              ? prev
              : [initialSupplier, ...prev]
          );
        setProducts((prev) => {
          // Merge fetched products with existing to avoid duplicates
          const existingProductIds = new Set(prev.map((p) => p.id));
          const newProducts = initialProducts.filter(
            (p) => !existingProductIds.has(p.id)
          );
          return [...prev, ...newProducts];
        });
        setSelectedSupplier(initialSupplier);

        const initialProductMap = initialProducts.reduce((map, prod) => {
          map[prod.id] = prod;
          return map;
        }, {} as Record<number, Product>);

        reset({
          supplier_id: existingPurchase.supplier_id ?? undefined,
          purchase_date: existingPurchase.purchase_date
            ? parseISO(existingPurchase.purchase_date)
            : new Date(),
          status: existingPurchase.status,
          reference_number: existingPurchase.reference_number || "",
          notes: existingPurchase.notes || "",
          items: existingPurchase.items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            product: initialProductMap[item.product_id],
            batch_number: item.batch_number || "",
            quantity: Number(item.quantity) || 1,
            unit_cost: Number(item.unit_cost) || 0,
            sale_price:
              item.sale_price !== null ? Number(item.sale_price) : null,
            expiry_date: item.expiry_date ? parseISO(item.expiry_date) : null,
          })),
        });
      } catch (err) {
        console.error("Failed to load purchase data:", err);
        const errorMsg = purchaseService.getErrorMessage(err);
        setError("root", { type: "manual", message: errorMsg });
        toast.error(t("common:error"), { description: errorMsg });
        navigate("/purchases"); // Redirect if purchase not found
      } finally {
        setLoadingData(false);
      }
    };

    if (isEditMode && purchaseId) {
      loadPurchaseData(purchaseId);
    } else {
      fetchSuppliers(""); // Fetch initial list for add mode if search is empty
      fetchProducts(""); // Fetch initial list for add mode if search is empty
      setLoadingData(false);
    }
  }, [
    isEditMode,
    purchaseId,
    reset,
    navigate,
    t,
  ]); // Added fetchSuppliers/fetchProducts

  // --- Form Submission ---
  const onSubmit: SubmitHandler<PurchaseFormValues> = async (data) => {
    setServerError(null);
    const apiData: CreatePurchaseData | UpdatePurchaseData = {
      ...data,
      purchase_date: format(data.purchase_date as Date, "yyyy-MM-dd"),
      items: data.items.map((item) => ({
        id: isEditMode ? item.id : undefined, // Send ID only if editing and item has one
        product_id: item.product_id,
        batch_number: item.batch_number || null,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
        sale_price:
          item.sale_price !== null && item.sale_price !== undefined
            ? Number(item.sale_price)
            : null,
        expiry_date: item.expiry_date
          ? format(item.expiry_date as Date, "yyyy-MM-dd")
          : null,
      })),
    };
    console.log(
      `Submitting ${isEditMode ? "Update" : "Create"} Purchase:`,
      apiData
    );
    try {
      if (isEditMode && purchaseId) {
        await purchaseService.updatePurchase(
          purchaseId,
          apiData as UpdatePurchaseData
        ); // Cast if types differ significantly
      } else {
        await purchaseService.createPurchase(apiData as CreatePurchaseData);
      }
      toast.success(t("common:success"), {
        description: t("purchases:saveSuccess"),
      });
      navigate("/purchases", {
        state: { updatedPurchaseId: isEditMode ? purchaseId : undefined },
      }); // Pass ID for highlight
    } catch (err) {
      console.error(
        `Failed to ${isEditMode ? "update" : "create"} purchase:`,
        err
      );
      const generalError = purchaseService.getErrorMessage(err);
      const apiErrors = purchaseService.getValidationErrors(err);
      toast.error(t("common:error"), { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([key, messages]) => {
          const match = key.match(/^items\.(\d+)\.(.+)$/);
          if (match) {
            const [, index, fieldName] = match;
            setError(
              `items.${index}.${fieldName}` as keyof PurchaseFormValues,
              { type: "server", message: messages[0] }
            );
          } else if (key in ({} as PurchaseFormValues)) {
            setError(key as keyof PurchaseFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        });
        setServerError(t("validation:checkFields"));
      }
    }
  };

  // --- PDF Export Handler ---
  const handleViewPdf = async () => {
    if (!purchaseId) return;
    
    try {
      await exportService.exportPurchasePdf(purchaseId);
    } catch (err) {
      toast.error(t("common:error"), {
        description: err instanceof Error ? err.message : "Failed to open PDF",
      });
    }
  };

  // --- Render Page ---
  //if (loadingData && isEditMode) { /* ... Loading Indicator for Edit Mode Initial Load ... */ }
  //if (error && isEditMode && !loadingData) { /* ... Error Alert for Edit Mode Initial Load ... */ }

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/purchases")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
            {isEditMode
              ? t("purchases:editPurchaseTitle")
              : t("purchases:addPageTitle")}{" "}
            {/* Add key */}
            {isEditMode && purchaseId && ` #${purchaseId}`}
          </h1>
        </div>
        
        {/* PDF Button - Only show in edit mode */}
        {isEditMode && purchaseId && (
          <Button
            variant="outline"
            onClick={handleViewPdf}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {t("purchases:viewPdf")}
          </Button>
        )}
      </div>

      <Card className="dark:bg-gray-900">
        <FormProvider {...formMethods}>
          {" "}
          {/* Pass all form methods via context */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="pt-6">
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("common:error")}</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <PurchaseHeaderFormSection
                suppliers={suppliers}
                loadingSuppliers={loadingSuppliers}
                supplierSearchInput={supplierSearchInput}
                onSupplierSearchInputChange={setSupplierSearchInput}
                isSubmitting={isSubmitting}
                selectedSupplier={selectedSupplier}
                onSupplierSelect={setSelectedSupplier}
              />
              <Separator className="my-6" />
              <PurchaseItemsList
                products={products}
                loadingProducts={loadingProducts}
                productSearchInput={productSearchInput}
                onProductSearchInputChange={setProductSearchInput}
                isSubmitting={isSubmitting}
              />
              <Separator className="my-6" />
          
   
              {/* Totals Display */}
              <div className="flex justify-end mb-6">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t("purchases:grandTotal")}: {formatNumber(grandTotal)}
                </p>
              </div>
              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting || (loadingData && isEditMode)}
                  size="lg"
                >
                  {" "}
                  {/* Disable if initial data is loading for edit */}
                  {isSubmitting && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditMode
                    ? t("common:update")
                    : t("purchases:submitPurchase")}
                </Button>
              </div>
            </CardContent>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
};

export default PurchaseFormPage;
