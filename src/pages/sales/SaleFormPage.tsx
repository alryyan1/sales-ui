// src/pages/SaleFormPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useForm,
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
import { SaleHeaderFormSection } from "../../components/sales/SaleHeaderFormSection"; // Assuming refactor
import { SaleItemsList } from "../../components/sales/SaleItemsList"; // Assuming refactor

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
  UpdateSaleData,
} from "../../services/saleService";
import clientService, { Client } from "../../services/clientService";
import productService, { Product } from "../../services/productService";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants"; // Your number formatting helper
import apiClient from "@/lib/axios";
import { SalePaymentsSection } from "@/components/sales/SalePaymentsSection";
import { SaleTotalsDisplay } from "@/components/sales/SaleTotalsDisplay";


// --- Component ---
const SaleFormPage: React.FC = () => {
  const { t } = useTranslation([
    "sales",
    "common",
    "validation",
    "clients",
    "products",
  ]);
  const saleItemSchema = z.object({
  id: z.number().nullable().optional(),

  product_id: z
    .number({ required_error: t("validation:required") })
    .positive({ message: t("validation:selectProduct") }),
  purchase_item_id: z.number().nullable().optional(),
  product: z.custom<Product>().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: t("validation:invalidInteger") })
    .int({ message: t("validation:invalidInteger") })
    .min(1, { message: t("validation:minQuantity") }),
  unit_price: z
    .preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce
        .number({ invalid_type_error: t("validation:invalidPrice") })
        .min(0, { message: t("validation:minZero") })
    )
    .default(0),
  available_stock: z.number().optional(),
});

const paymentItemSchema = z.object({
  method: z.enum([
    "cash",
    "visa",
    "mastercard",
    "bank_transfer",
    "mada",
    "other",
    "store_credit",
  ]),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce
      .number({
        required_error: t("validation:required"),
        invalid_type_error: t("validation:invalidNumber"),
      })
      .min(0.01, {
        message: t("validation:minPaymentAmount"),
      })
  ),
  payment_date: z.date({
    required_error: t("validation:required"),
    invalid_type_error: t("validation:invalidDate"),
  }),
  referance_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const saleFormSchema = z
  .object({
    client_id: z
      .number({ required_error: t("validation:required") })
      .positive({ message: t("validation:selectClient") }),
    sale_date: z.date({
      required_error: t("validation:required"),
      invalid_type_error: t("validation:invalidDate"),
    }),
    status: z.enum(["completed", "pending", "draft", "cancelled"], {
      required_error: t("validation:required"),
    }),
    invoice_number: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    items: z
      .array(saleItemSchema)
      .min(1, { message: t("sales:errorItemsRequired") }),
    payments: z.array(paymentItemSchema).optional(),
  })
  .refine(
    (data) => {
      const totalSaleAmount = data.items.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0
      );
      const totalPaidAmount =
        data.payments?.reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0),
          0
        ) ?? 0;
      return totalPaidAmount <= totalSaleAmount;
    },
    {
      message: t("sales:errorPaidExceedsTotal"),
      path: ["payments"],
    }
  );

  type SaleItemFormValues = z.infer<typeof saleItemSchema>; // <-- THIS IS THE CORRECT TYPE

type SaleFormValues = z.infer<typeof saleFormSchema>;
type PaymentItemFormValues = z.infer<typeof paymentItemSchema>;
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
    resolver: zodResolver(saleFormSchema),

    defaultValues: {
      client_id: selectedClient?.id,
      sale_date: new Date(),
      status: "completed",
      invoice_number: "",
      notes: "",
      items: [],
      payments: [],
    },
  });
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
    watch,
    setValue,
    setError,
    control,
  } = formMethods;



  const watchedItems = useWatch({ control, name: "items" });
  const watchedPayments = useWatch({ control, name: "payments" });

  const grandTotal =
    watchedItems?.reduce(
      (sum, item) =>
        preciseCalculation(sum, preciseCalculation(Number(item?.quantity) || 0, Number(item?.unit_price) || 0, 'multiply', 2), 'add', 2),
      0
    ) ?? 0;
  const totalPaid =
    watchedPayments?.reduce(
      (sum, payment) => preciseCalculation(sum, Number(payment?.amount) || 0, 'add', 2),
      0
    ) ?? 0;
  const amountDue = preciseCalculation(grandTotal, totalPaid, 'subtract', 2);
  // Predefined payment methods (can also be fetched from API if configurable)
  const paymentMethodOptions = [
    { value: "cash", labelKey: "paymentMethods:cash" },
    { value: "visa", labelKey: "paymentMethods:visa" },
    { value: "mastercard", labelKey: "paymentMethods:mastercard" },
    { value: "bank_transfer", labelKey: "paymentMethods:bank_transfer" },
    { value: "mada", labelKey: "paymentMethods:mada" },
    { value: "store_credit", labelKey: "paymentMethods:store_credit" },
    { value: "other", labelKey: "paymentMethods:other" },
  ];

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

  const fetchDefaultCleint = () => {
    clientService.getClient(1).then((data) => {
      console.log(data, "one client");
      setSelectedClient(data);
      setValue("client_id", data.id);
    });
  };

  useEffect(() => {
    fetchDefaultCleint();
  }, []);

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
        console.error("Error loading sale data:", err);
        setServerError(
          t("sales:errorLoadingSale") || "Could not load sale details."
        );
      } finally {
        setLoadingData(false);
      }
    };

    if (isEditMode && saleId) loadSaleData(saleId);
    else setLoadingData(false);
  }, [isEditMode, saleId, reset, navigate, t]); // Dependencies

// --- Form Submission (COMPLETE IMPLEMENTATION) ---
const onSubmit: SubmitHandler<SaleFormValues> = async (data) => {
  setServerError(null); // Clear previous server errors
  console.log(data, "form data");
  // Data is already validated by Zod at this point, including the refine check.
  // The `data` object here matches `SaleFormValues`.

  // Prepare data for the API (CreateSaleData or UpdateSaleData)
  const apiItems = data.items.map(item => ({
      id: isEditMode && item.id ? item.id : undefined, // Include item ID only if editing and item exists
      product_id: item.product_id,
      purchase_item_id: item.purchase_item_id ?? null, // Send selected batch ID
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
  }));

  const apiPayments = data.payments?.map(p => ({
      id: isEditMode && p.id ? p.id : undefined, // Include payment ID only if editing and payment exists
      method: p.method,
      amount: Number(p.amount),
      payment_date: format(p.payment_date as Date, "yyyy-MM-dd"), // Format date
      reference_number: p.reference_number || null,
      notes: p.notes || null,
  })) || []; // Ensure it's an empty array if no payments

  const apiDataPayload = {
      client_id: data.client_id,
      sale_date: format(data.sale_date as Date, "yyyy-MM-dd"),
      status: data.status,
      invoice_number: data.invoice_number || null,
      notes: data.notes || null,
      items: apiItems,
      payments: apiPayments,
      // The backend SaleController will calculate total_amount and paid_amount based on items and payments
  };

  console.log(`Submitting ${isEditMode ? 'Update' : 'Create'} Sale to API:`, apiDataPayload);

  try {
      let savedSale: Sale;
      if (isEditMode && saleId) {
          // Ensure your UpdateSaleData type and backend update method can handle
          // adding/updating/removing items and payments.
          // This usually involves more complex logic than a simple PUT.
          savedSale = await saleService.updateSale(saleId, apiDataPayload as UpdateSaleData);
      } else {
          savedSale = await saleService.createSale(apiDataPayload as CreateSaleData);
      }

      toast.success(t("common:success"), { description: t("sales:saveSuccess") });
      navigate("/sales", { state: { updatedSaleId: savedSale.id } }); // Pass ID for potential highlight

  } catch (err) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} sale:`, err);
      const generalError = saleService.getErrorMessage(err);
      const apiErrors = saleService.getValidationErrors(err);

      toast.error(t("common:error"), { description: generalError });
      setServerError(generalError); // Display a general error message at the top of the form

      // Map API validation errors back to RHF fields for specific error messages
      if (apiErrors) {
          Object.entries(apiErrors).forEach(([key, messages]) => {
              // Handle top-level errors
              if (key in ({} as SaleFormValues)) {
                  setError(key as keyof SaleFormValues, { type: 'server', message: messages[0] });
              }

              // Handle nested item errors (e.g., "items.0.quantity": ["Insufficient stock..."])
              const itemMatch = key.match(/^items\.(\d+)\.(.+)$/);
              if (itemMatch) {
                  const [, index, fieldName] = itemMatch;
                  const fieldToSetErrorOnItem = (fieldName === 'quantity' || key.includes('stock'))
                      ? `items.${index}.quantity` // Point stock errors to quantity field
                      : `items.${index}.${fieldName as keyof SaleItemFormValues}`;
                  setError(fieldToSetErrorOnItem as any, { type: 'server', message: messages[0] });
              }

              // Handle nested payment errors (e.g., "payments.0.amount": ["Invalid amount..."])
              const paymentMatch = key.match(/^payments\.(\d+)\.(.+)$/);
              if (paymentMatch) {
                  const [, index, fieldName] = paymentMatch;
                  setError(`payments.${index}.${fieldName as keyof PaymentItemFormValue}`, { type: 'server', message: messages[0] });
              }
          });
           // If there were field-specific errors, also set a general hint
          if (Object.keys(apiErrors).length > 0) {
               setServerError(t('validation:checkFields'));
          }
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
                selectedClient={selectedClient}
                onClientSelect={setSelectedClient}
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
              {/* --- Render Payments Section --- */}
              <SalePaymentsSection
                isSubmitting={isSubmitting}
                grandTotal={grandTotal} // Pass grandTotal for auto-fill logic
              />
              {/* Totals Display */}
              {/* --- Render Totals Display --- */}
              <SaleTotalsDisplay
                grandTotal={grandTotal}
                totalPaid={totalPaid}
                amountDue={amountDue}
              />

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
