// src/pages/SaleFormPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  FormProvider,
  SubmitHandler,
} from "react-hook-form"; // Import FormProvider
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// Import Child Components (Refactored Structure)
import { SaleHeaderFormSection } from "../components/sales/SaleHeaderFormSection"; // Assuming refactor
import { SaleItemsList } from "../components/sales/SaleItemsList"; // Assuming refactor

// shadcn/ui & Lucide Icons (Only those needed for page shell/totals/submit)
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, ArrowLeft, AlertCircle } from "lucide-react";

// Services and Types
import saleService, {
  Sale,
  CreateSaleData,
  SaleItem,
} from "../services/saleService";
import clientService, { Client } from "../services/clientService";
import productService, { Product } from "../services/productService";
import { formatNumber } from "@/constants"; // Your number formatting helper
import apiClient from "@/lib/axios";



// --- Zod Schema Definition (with item ID for edits) ---
const saleItemSchema = z.object({
  id: z.number().nullable().optional(),
  product_id: z
    .number({ required_error: "validation:required" })
    .positive({ message: "validation:selectProduct" }),
  product: z.custom<Product>().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: "validation:invalidInteger" })
    .int({ message: "validation:invalidInteger" })
    .min(1, { message: "validation:minQuantity" }),
  unit_price: z
    .preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce
        .number({ invalid_type_error: "validation:invalidPrice" })
        .min(0, { message: "validation:minZero" })
    )
    .default(0),
  available_stock: z.number().optional(),
});

const saleFormSchema = z
  .object({
    client_id: z
      .number({ required_error: "validation:required" })
      .positive({ message: "validation:selectClient" }),
    sale_date: z.date({
      required_error: "validation:required",
      invalid_type_error: "validation:invalidDate",
    }),
    status: z.enum(["completed", "pending", "draft", "cancelled"], {
      required_error: "validation:required",
    }),
    invoice_number: z.string().nullable().optional(),
    paid_amount: z
      .preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce
          .number({ invalid_type_error: "validation:invalidNumber" })
          .min(0, { message: "validation:minZero" })
      )
      .default(0),
    notes: z.string().nullable().optional(),
    items: z
      .array(saleItemSchema)
      .min(1, { message: "sales:errorItemsRequired" }),
  })
  .refine(
    (data) => {
      const total = data.items.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0
      );
      // Ensure paid amount is not negative and not more than total
      return data.paid_amount >= 0 && data.paid_amount <= total;
    },
    {
      message: "sales:errorPaidExceedsTotal", // Use appropriate message key
      path: ["paid_amount"],
    }
  );

type SaleFormValues = z.infer<typeof saleFormSchema>;

// --- Component ---
const SaleFormPage: React.FC = () => {
  const { t } = useTranslation([
    "sales",
    "common",
    "validation",
    "clients",
    "products",
  ]);
  const navigate = useNavigate();
  const { id: saleIdParam } = useParams<{ id?: string }>();
  
  const saleId = saleIdParam ? Number(saleIdParam) : null;
  const isEditMode = Boolean(saleId);

  // --- State ---
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setErrorr] = useState(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(isEditMode); // Loading existing sale
  const [loadingClients, setLoadingClients] = useState(false); // Separate loading for async search
  const [loadingProducts, setLoadingProducts] = useState(false); // Separate loading for async search
  const [serverError, setServerError] = useState<string | null>(null); // General API errors
  // Search States
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const clientDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Selected objects for display in triggers
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // --- React Hook Form ---
  const formMethods = useForm<SaleFormValues>({
    // Use formMethods for FormProvider
   resolver:zodResolver(saleFormSchema),
  
    defaultValues: {
      client_id: undefined,
      sale_date: new Date(),
      status: "completed",
      invoice_number: "",
      notes: "",
     paid_amount:0,
      items: [],
    },
  });
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
    watch,
    setError,
    control,
  } = formMethods;

  // Watch for total calculations
  const watchedItems = useWatch({ control, name: "items" });
  const watchedPaidAmount = useWatch({ control, name: "paid_amount" });
  const grandTotal =
    watchedItems?.reduce(
      (total, item) =>
        total + (Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0),
      0
    ) ?? 0;
  const amountDue = grandTotal - (Number(watchedPaidAmount) || 0);

  // --- Data Fetching Callbacks ---
  const fetchClients = useCallback(
    async (search: string) => {
      if (!search || search.trim().length < 1) {
        setClients([]);
        setLoadingClients(false);
        return;
      } // Adjust min length if needed
      setLoadingClients(true);
      try {
        const response = await apiClient.get<{ data: Client[] }>(
          `/clients/autocomplete?search=${encodeURIComponent(search)}&limit=15`
        );
        setClients(response.data.data ?? response.data);
      } catch (error) {
        toast.error(t("common:error"), {
          description: clientService.getErrorMessage(
            error,
            t("clients:fetchError")
          ),
        });
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    },
    [t]
  );

  const fetchProducts = useCallback(
    async (search: string) => {
      if (!search || search.trim().length < 1) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      } // Adjust min length
      setLoadingProducts(true);
      try {
        const response = await apiClient.get<{ data: Product[] }>(
          `/products/autocomplete?search=${encodeURIComponent(search)}&limit=15`
        );
        setProducts(response.data.data ?? response.data);
      } catch (error) {
        toast.error(t("common:error"), {
          description: productService.getErrorMessage(
            error,
            t("products:fetchError")
          ),
        });
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    },
    [t]
  );

  // --- Debounce Effects ---
  useEffect(() => {
    if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current);
    clientDebounceRef.current = setTimeout(() => {
      setDebouncedClientSearch(clientSearchInput);
    }, 300);
    return () => {
      if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current);
    };
  }, [clientSearchInput]);
  useEffect(() => {
    fetchClients(debouncedClientSearch);
  }, [debouncedClientSearch, fetchClients]);
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

  // --- Fetch Existing Sale Data ---
  useEffect(() => {
    const loadSaleData = async (id: number) => {
      setLoadingData(true);
      setServerError(null);
      try {
        const existingSale = await saleService.getSale(id);
        if (!existingSale.items) throw new Error("Sale items missing.");

        // Fetch Client and Products needed
        const clientReq = existingSale.client_id
          ? clientService.getClient(existingSale.client_id)
          : Promise.resolve(null);
        const productIds = existingSale.items.map((item) => item.product_id);
        const productsReq =
          productIds.length > 0
            ? productService.getProductsByIds(productIds)
            : Promise.resolve([]);

        const [initialClient, initialProducts] = await Promise.all([
          clientReq.catch(() => null),
          productsReq.catch(() => []),
        ]);

        if (initialClient) setClients([initialClient]); // Seed initial dropdown options
        setProducts(initialProducts); // Seed initial dropdown options
        setSelectedClient(initialClient); // Set for trigger display

        const initialProductMap = initialProducts.reduce((map, prod) => {
          map[prod.id] = prod;
          return map;
        }, {} as Record<number, Product>);

        reset({
          // Reset the entire form state
          client_id: existingSale.client_id ?? undefined,
          sale_date: existingSale.sale_date
            ? parseISO(existingSale.sale_date)
            : new Date(),
          status: existingSale.status,
          invoice_number: existingSale.invoice_number || "",
          paid_amount: Number(existingSale.paid_amount) || 0,
          notes: existingSale.notes || "",
          items: existingSale.items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            product: initialProductMap[item.product_id],
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            available_stock: initialProductMap[item.product_id]?.stock_quantity,
          })),
        });
      } catch (err) {
        /* ... (error handling) ... */
      } finally {
        setLoadingData(false);
      }
    };

    if (isEditMode && saleId) loadSaleData(saleId);
    else setLoadingData(false);
  }, [isEditMode, saleId, reset, navigate, t]); // Dependencies

  // --- Form Submission ---
  const onSubmit: SubmitHandler<SaleFormValues> = async (data) => {
    setServerError(null);
    // Paid amount validation handled by Zod refine

    const apiData: CreateSaleData | any = {
      ...data,
      sale_date: format(data.sale_date as Date, "yyyy-MM-dd"),
      paid_amount: Number(data.paid_amount),
      items: data.items.map((item) => ({
        id: item.id, // Include ID for updates
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
    };
    console.log(
      `Submitting ${isEditMode ? "Update" : "Create"} Sale:`,
      apiData
    );
    try {
      let savedSale: Sale;
            if (isEditMode && saleId) {
                savedSale = await saleService.updateSale(saleId, apiData); // Use update service
            } else {
                savedSale = await saleService.createSale(apiData);
            }
      toast.success(t("common:success"), {
        description: t("sales:saveSuccess"),
      });
      // --- Navigate back with state ---
      navigate("/sales", {
        replace: true, // Optional: replace edit page in history
        state: { updatedSaleId: savedSale.id }, // Pass the ID
      });
    } catch (err) {
      console.error(`Failed to ${isEditMode ? "update" : "create"} sale:`, err);
      const generalError = saleService.getErrorMessage(err);
      const apiErrors = saleService.getValidationErrors(err);
      toast.error(t("common:error"), { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        /* ... map errors using setError ... */
      }
    }
  };

  // --- Render Logic ---
  // 1. Display Full Page Loader ONLY when fetching existing Sale data in Edit Mode
  if (loadingData && isEditMode) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-150px)] dark:bg-gray-950">
        {" "}
        {/* Adjust height as needed */}
        <div className="flex flex-col items-center text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
          <p>{t("common:loadingData") || "Loading Sale Data..."}</p>{" "}
          {/* Add key */}
        </div>
      </div>
    );
  }

  // 2. Display Error Message ONLY if there was an error loading existing Sale data in Edit Mode
  // We check !isEditMode because the main form handles its own internal serverError state after loading
  // This error block is primarily for the *initial* load failure in edit mode.
  if (error && isEditMode) {
    return (
      <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-md w-full mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>
            {t("sales:errorLoadingSale") || "Could not load sale details."}{" "}
            {/* Add key */}
            <br />
            {error} {/* Display the specific error message */}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate("/sales")}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t("sales:backToList")}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center mb-6 gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/sales")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          {isEditMode ? t("sales:editSaleTitle") : t("sales:addPageTitle")}
          {isEditMode && saleId && ` #${saleId}`}
        </h1>
      </div>

      {/* Form Card */}
      <Card className="dark:bg-gray-900">
        {/* FormProvider makes RHF methods available to child components */}
        <FormProvider {...formMethods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="pt-6">
              {/* Server Error Alert */}
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("common:error")}</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {/* Render Header Section Component */}
              <SaleHeaderFormSection
                clients={clients}
                loadingClients={loadingClients}
                clientSearchInput={clientSearchInput}
                onClientSearchInputChange={setClientSearchInput}
                isSubmitting={isSubmitting}
                selectedClient={selectedClient} // Pass selected client object for display
                onClientSelect={setSelectedClient} // Pass handler to update selected client
              />

              <Separator className="my-6" />

              {/* Render Items List Component */}
              <SaleItemsList
                products={products}
                loadingProducts={loadingProducts}
                productSearchInput={productSearchInput}
                onProductSearchInputChange={setProductSearchInput}
                isSubmitting={isSubmitting}
                // No need to pass control, errors etc. thanks to FormProvider
              />

              <Separator className="my-6" />

              {/* Totals Display */}
              <div className="flex justify-end mb-2">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t("sales:grandTotal")}: {formatNumber(grandTotal)}
                </p>
              </div>
              <div className="flex justify-end mb-6">
                <p className="text-md text-gray-600 dark:text-gray-300">
                  {t("sales:amountDue")}: {formatNumber(amountDue)}
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditMode ? t("common:update") : t("sales:submitSale")}
                </Button>
              </div>
            </CardContent>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
};

export default SaleFormPage; // Ensure export matches filename
