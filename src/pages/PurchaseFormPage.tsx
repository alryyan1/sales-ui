// src/pages/PurchaseFormPage.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useForm,
  FormProvider,
  SubmitHandler,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// Import Child Components
import { PurchaseHeaderFormSection } from "../components/purchases/PurchaseHeaderFormSection";
import { PurchaseItemsList } from "../components/purchases/PurchaseItemsList";
import PurchaseItemsImportDialog from "../components/purchases/PurchaseItemsImportDialog";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, AlertCircle, FileText, Upload } from "lucide-react";

// Services and Types
import purchaseService, {
  CreatePurchaseData,
  UpdatePurchaseData,
} from "../services/purchaseService";
import supplierService, { Supplier } from "../services/supplierService";
import productService, { Product } from "../services/productService";
import exportService from "../services/exportService";
import { formatNumber, preciseCalculation } from "@/constants";
import apiClient from "@/lib/axios";

// --- Zod Schema Definition ---
const purchaseItemSchema = z.object({
  id: z.number().nullable().optional(),
  product_id: z
    .number({ required_error: "validation:required" })
    .positive({ message: "validation:selectProduct" }),
  product: z.custom<Product>().optional(),
  batch_number: z
    .string()
    .max(100, { message: "validation:maxLengthHundred" })
    .nullable()
    .optional(),
  quantity: z.coerce
    .number({ invalid_type_error: "validation:invalidInteger" })
    .int({ message: "validation:invalidInteger" })
    .min(1, { message: "validation:minQuantity" }),
  unit_cost: z.coerce
    .number({ invalid_type_error: "validation:invalidPrice" })
    .min(0, { message: "validation:minZero" }),
  total_sellable_units_display: z.number().optional(),
  cost_per_sellable_unit_display: z.number().optional(),
  sale_price: z.union([
    z.number().min(0, { message: "validation:minZero" }),
    z.null(),
    z.undefined()
  ]).optional(),
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

export type PurchaseItemFormValues = {
  id?: number | null;
  product_id: number;
  product?: Product;
  batch_number?: string | null;
  quantity: number;
  unit_cost: number;
  sale_price?: number | null;
  expiry_date?: Date | null;
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
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Search States
  const [supplierSearchInput, setSupplierSearchInput] = useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
  const supplierDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSupplierSearchRef = useRef<string>("");
  
  // Selected objects for display
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

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
  } = formMethods;

  // Memoized watched items to prevent unnecessary re-renders
  const watchedItems = useWatch({ control, name: "items" });
  
  // Watch purchase status to determine if items can be modified
  const watchedStatus = useWatch({ control, name: "status" });
  const isPurchaseReceived = watchedStatus === "received";
  
  // Memoized grand total calculation
  const grandTotal = useMemo(() => 
    watchedItems?.reduce(
      (total, item) =>
        preciseCalculation(total, preciseCalculation(Number(item?.quantity) || 0, Number(item?.unit_cost) || 0, 'multiply', 2), 'add', 2),
      0
    ) ?? 0,
    [watchedItems]
  );

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

  // Memoized supplier search effect
  useEffect(() => {
    if (debouncedSupplierSearch !== '' && debouncedSupplierSearch !== lastSupplierSearchRef.current) {
      lastSupplierSearchRef.current = debouncedSupplierSearch;
      
      const searchSuppliers = async () => {
        setLoadingSuppliers(true);
        try {
          const response = await apiClient.get<{ data: Supplier[] }>(
            `/suppliers?search=${encodeURIComponent(debouncedSupplierSearch)}&limit=15`
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
      };
      searchSuppliers();
    }
  }, [debouncedSupplierSearch, t]);

  // --- Load Initial Products for New Purchases ---
  useEffect(() => {
    const loadInitialProducts = async () => {
      if (!isEditMode && products.length === 0) {
        try {
          // Load initial products for autocomplete in new purchases
          const initialProducts = await productService.getProductsForAutocomplete("", 50, true);
          setProducts(initialProducts);
        } catch (error) {
          console.error("Failed to load initial products:", error);
          // Don't show error toast for this as it's not critical
        }
      }
    };

    loadInitialProducts();
  }, [isEditMode, products.length]);

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
        let initialProducts: Product[] = [];
        if (productIds.length > 0) {
          try {
            initialProducts = await productService.getProductsByIds(productIds);
          } catch (error) {
            console.error("Failed to fetch products by IDs:", error);
            initialProducts = [];
          }
        }
        
        const safeInitialProducts = Array.isArray(initialProducts) ? initialProducts : [];

        if (initialSupplier)
          setSuppliers((prev) =>
            prev.find((s) => s.id === initialSupplier.id)
              ? prev
              : [initialSupplier, ...prev]
          );
        setProducts((prev) => {
          const existingProductIds = new Set(prev.map((p) => p.id));
          const newProducts = safeInitialProducts.filter(
            (p) => !existingProductIds.has(p.id)
          );
          return [...prev, ...newProducts];
        });
        setSelectedSupplier(initialSupplier);

        const initialProductMap = safeInitialProducts.reduce((map, prod) => {
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
        navigate("/purchases");
      } finally {
        setLoadingData(false);
      }
    };

    if (isEditMode && purchaseId) {
      loadPurchaseData(purchaseId);
    } else {
      setLoadingData(false);
    }
  }, [isEditMode, purchaseId, reset, navigate, t, setError]);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<PurchaseFormValues> = useCallback(async (data) => {
    setServerError(null);
    const apiData: CreatePurchaseData | UpdatePurchaseData = {
      ...data,
      purchase_date: format(data.purchase_date as Date, "yyyy-MM-dd"),
      items: data.items.map((item) => ({
        id: isEditMode ? item.id : undefined,
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
        );
      } else {
        await purchaseService.createPurchase(apiData as CreatePurchaseData);
      }
      toast.success(t("common:success"), {
        description: t("purchases:saveSuccess"),
      });
      navigate("/purchases", {
        state: { updatedPurchaseId: isEditMode ? purchaseId : undefined },
      });
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
  }, [isEditMode, purchaseId, navigate, t, setError]);

  // --- PDF Export Handler ---
  const handleViewPdf = useCallback(async () => {
    if (!purchaseId) return;
    
    try {
      await exportService.exportPurchasePdf(purchaseId);
    } catch (err) {
      toast.error(t("common:error"), {
        description: err instanceof Error ? err.message : "Failed to open PDF",
      });
    }
  }, [purchaseId, t]);

  // --- Import Success Handler ---
  const handleImportSuccess = useCallback(async () => {
    if (!purchaseId) return;
    
    try {
      const existingPurchase = await purchaseService.getPurchase(purchaseId);
      if (!existingPurchase.items)
        throw new Error("Purchase items missing in API response.");

      const initialSupplier = existingPurchase.supplier_id
        ? await supplierService
            .getSupplier(existingPurchase.supplier_id)
            .catch(() => null)
        : null;

      const productIds = existingPurchase.items.map(
        (item) => item.product_id
      );
      let initialProducts: Product[] = [];
      if (productIds.length > 0) {
        try {
          initialProducts = await productService.getProductsByIds(productIds);
        } catch (error) {
          console.error("Failed to fetch products by IDs:", error);
          initialProducts = [];
        }
      }
      
      const safeInitialProducts = Array.isArray(initialProducts) ? initialProducts : [];

      if (initialSupplier)
        setSuppliers((prev) =>
          prev.find((s) => s.id === initialSupplier.id)
            ? prev
            : [initialSupplier, ...prev]
        );
      setProducts((prev) => {
        const existingProductIds = new Set(prev.map((p) => p.id));
        const newProducts = safeInitialProducts.filter(
          (p) => !existingProductIds.has(p.id)
        );
        return [...prev, ...newProducts];
      });
      setSelectedSupplier(initialSupplier);

      const initialProductMap = safeInitialProducts.reduce((map, prod) => {
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
    }
  }, [purchaseId, reset, setError, t]);

  return (
    <div className="dark:bg-gray-950 min-h-screen pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/purchases")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
              {isEditMode
                ? t("purchases:editPurchaseTitle")
                : t("purchases:addPageTitle")}{" "}
              {isEditMode && purchaseId && ` #${purchaseId}`}
            </h1>
            {isPurchaseReceived && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                {t("purchases:purchaseReceivedReadOnly")}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditMode && purchaseId && !isPurchaseReceived && (
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {t("purchases:importItems")}
            </Button>
          )}
          
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
          
          <Button
            type="submit"
            disabled={isSubmitting || (loadingData && isEditMode)}
            size="lg"
            onClick={handleSubmit(onSubmit)}
          >
            {isSubmitting && (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            )}
            {isEditMode
              ? t("common:update")
              : t("purchases:submitPurchase")}
          </Button>
        </div>
      </div>

      <Card className="dark:bg-gray-900">
        <FormProvider {...formMethods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="pt-1">
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
                isPurchaseReceived={isPurchaseReceived}
              />
              <Separator className="my-6" />
              <PurchaseItemsList
                products={products}
                isSubmitting={isSubmitting}
                isPurchaseReceived={isPurchaseReceived}
              />
              <Separator className="my-6" />
          
              {/* Totals Display */}
              <div className="flex justify-end mb-6">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t("purchases:grandTotal")}: {formatNumber(grandTotal)}
                </p>
              </div>
            </CardContent>
          </form>
        </FormProvider>
      </Card>

      {/* Purchase Items Import Dialog */}
      {isEditMode && purchaseId && (
        <PurchaseItemsImportDialog
          open={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          purchaseId={purchaseId}
          onImportSuccess={() => {
            handleImportSuccess();
            setIsImportDialogOpen(false);
            toast.success(t("common:success"), {
              description: t("purchases:importItemsSuccess"),
            });
          }}
        />
      )}
    </div>
  );
};

export default PurchaseFormPage;
