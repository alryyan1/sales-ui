// src/components/sales/terminal/SaleWorkspace.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form"; // Import FormProvider
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"; // Your Zod schemas
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// Import your actual Zod schemas (assuming they are defined in a way that can be imported)
// For example, if they are in SaleFormPage.tsx or a dedicated schema file:
// import { saleFormSchema, SaleFormValues, saleItemSchema, paymentItemSchema } from '@/pages/sales/SaleFormPage'; // Adjust path

// Placeholder schemas if not imported (REPLACE WITH YOUR ACTUAL SCHEMAS)
const saleItemSchema = z.object({
  id: z.number().optional().nullable(),
  product_id: z.number().positive(),
  purchase_item_id: z.number().optional().nullable(),
  product: z.any().optional(),
  batch_number_display: z.string().optional().nullable(),
  quantity: z.coerce.number().min(1),
  unit_price: z.coerce.number().min(0),
  available_stock: z.number().optional(),
});
const paymentItemSchema = z.object({
  id: z.number().optional().nullable(),
  method: z.enum([
    "cash",
    "visa",
    "mastercard",
    "bank_transfer",
    "mada",
    "other",
    "store_credit",
  ]),
  amount: z.coerce.number().min(0.01),
  payment_date: z.date(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
const saleFormSchema = z
  .object({
    client_id: z.number().positive().optional().nullable(),
    sale_date: z.date(),
    status: z.enum(["completed", "pending", "draft", "cancelled"]),
    invoice_number: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z.array(saleItemSchema).min(1),
    payments: z.array(paymentItemSchema).optional(),
  })
  .refine(
    (data) => {
      const total = data.items.reduce(
        (s, i) => s + i.quantity * i.unit_price,
        0
      );
      const paid = data.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
      return paid <= total;
    },
    { message: "sales:errorPaidExceedsTotalOrInvalid", path: ["payments"] }
  );
type SaleFormValues = z.infer<typeof saleFormSchema>;

// Import your refactored form section components

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, AlertCircle } from "lucide-react";

// Types & Services
import { ActiveSaleDataType } from "@/pages/sales/SalesTerminalPage"; // Type from parent
import clientService, { Client } from "@/services/clientService";
import productService, { Product } from "@/services/productService";
import apiClient from "@/lib/axios"; // For fetching clients/products if not passed
import { SaleHeaderFormSection } from "../SaleHeaderFormSection";
import { SaleItemsList } from "../SaleItemsList";
import { SalePaymentsSection } from "../SalePaymentsSection";
import { SaleTotalsDisplay } from "../SaleTotalsDisplay";

interface SaleWorkspaceProps {
  initialSaleData: ActiveSaleDataType; // Data for new or existing sale
  isEditMode: boolean;
  onSave: (
    data: SaleFormValues,
    saleIdToUpdate?: number | null
  ) => Promise<boolean>; // Parent save handler
  //isLoading prop from parent indicates parent is busy (e.g. fetching activeSaleData)
  // RHF's formState.isSubmitting handles this component's submission loading
  parentIsLoading: boolean;
  activeSaleData?: ActiveSaleDataType; // Optional prop for parent to pass active sale data
}

export const SaleWorkspace: React.FC<SaleWorkspaceProps> = ({
  initialSaleData,
  isEditMode,
  onSave,

  parentIsLoading,
  activeSaleData,
}) => {
  const { t } = useTranslation(["sales", "common", "validation"]);
  const [serverError, setServerError] = useState<string | null>(null);

  // State for async combobox data (clients & products) - fetched here or passed from parent
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [productSearchInput, setProductSearchInput] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>();
  // Debounce refs
  const clientDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // --- React Hook Form Setup ---
  const formMethods = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    // defaultValues set by reset in useEffect
  });
  const {
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isSubmitting, errors },
    control,
  } = formMethods;

  // Reset form when initialSaleData changes
  useEffect(() => {
    console.log(
      "SaleWorkspace: Resetting form with initial data:",
      initialSaleData
    );
    setServerError(null);
    const defaultItems =
      initialSaleData.items && initialSaleData.items.length > 0
        ? initialSaleData.items.map((item) => ({
            id: item.id, // For edit mode
            product_id: item.product_id || 0,
            product: item.product, // Full product object
            purchase_item_id: item.purchase_item_id,
            batch_number_display: item.batch_number_sold,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            available_stock: item.available_stock,
          }))
        : [
            {
              product_id: 0,
              quantity: 1,
              unit_price: 0,
              batch_number_display: null,
              id: null,
              product: undefined,
              purchase_item_id: null,
              available_stock: undefined,
            },
          ];

    const defaultPayments =
      initialSaleData.payments && initialSaleData.payments.length > 0
        ? initialSaleData.payments.map((p) => ({
            id: p.id,
            method: p.method as any,
            amount: Number(p.amount) || 0,
            payment_date: p.payment_date
              ? parseISO(p.payment_date)
              : new Date(),
            reference_number: p.reference_number || "",
            notes: p.notes || "",
          }))
        : [];

    reset({
      client_id: initialSaleData.client_id || undefined,
      sale_date: initialSaleData.sale_date
        ? parseISO(initialSaleData.sale_date)
        : new Date(),
      status: initialSaleData.status || "pending",
      invoice_number: initialSaleData.invoice_number || "",
      notes: initialSaleData.notes || "",
      items: defaultItems,
      payments: defaultPayments,
    });

    // If editing, pre-populate selectedClient for combobox display
    if (isEditMode && initialSaleData.client_id && initialSaleData.client) {
      setSelectedClient(initialSaleData.client);
      // Ensure this client is in the `clients` list for the combobox
      setClients((prev) =>
        prev.find((c) => c.id === initialSaleData.client_id)
          ? prev
          : [initialSaleData.client!, ...prev]
      );
    } else {
      setSelectedClient(null);
    }
  }, [initialSaleData, isEditMode, reset]);

  const fetchDefaultCleint = () => {
    clientService.getClient(1).then((data) => {
      console.log(data, "one client");
      setSelectedClient(data);
      setValue("client_id", data.id);
      // setValue("client_id", data.id);
    });
  };

  useEffect(() => {
    fetchDefaultCleint();
  }, []);
  // --- Data Fetching for Comboboxes ---
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
    clientDebounceRef.current = setTimeout(
      () => fetchClients(clientSearchInput),
      300
    );
    return () => {
      if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current);
    };
  }, [clientSearchInput, fetchClients]);
  useEffect(() => {
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    productDebounceRef.current = setTimeout(
      () => fetchProducts(productSearchInput),
      300
    );
    return () => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    };
  }, [productSearchInput, fetchProducts]);

  // Initial fetch for empty search to populate dropdowns slightly
  useEffect(() => {
    fetchClients("");
    fetchProducts("");
  }, [fetchClients, fetchProducts]);

  // --- Form Submission ---
  const onFormSubmit: SubmitHandler<SaleFormValues> = async (data) => {
    setServerError(null);
    const saleIdToUpdate =
      isEditMode && initialSaleData.id ? initialSaleData.id : null;
    const success = await onSave(data, saleIdToUpdate); // Call parent's save handler
    if (!success) {
      // Parent's onSave would have shown a toast for specific API error.
      // Here we can set a general error if onSave returns false.
      setServerError(t("common:submissionError")); // Add key
    }
  };

  // Calculated Totals
  const watchedItems = watch("items");
  const watchedPayments = watch("payments");
  const grandTotal =
    watchedItems?.reduce(
      (sum, item) =>
        sum + (Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0),
      0
    ) ?? 0;
  const totalPaid =
    watchedPayments?.reduce(
      (sum, payment) => sum + (Number(payment?.amount) || 0),
      0
    ) ?? 0;
  const amountDue = grandTotal - totalPaid;

  if (parentIsLoading && !initialSaleData.id) {
    // Show loader if parent is loading initial data for a *new* sale form
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col dark:bg-gray-900 shadow-md border-border dark:border-gray-700">
      {/* <CardHeader className="border-b dark:border-gray-700 p-4">
        <CardTitle className="text-xl">
          {isEditMode ? t("sales:editSaleTitle") : t("sales:newSaleTitle")}
          {isEditMode &&
            initialSaleData.id &&
            ` - ${initialSaleData.invoice_number || `#${initialSaleData.id}`}`}
        </CardTitle>
      </CardHeader> */}
      <FormProvider {...formMethods}>
        {" "}
        {/* Provide RHF context */}
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex-grow flex flex-col overflow-hidden"
        >
          <CardContent className="flex-grow space-y-6 overflow-y-auto p-4 md:p-6">
            {serverError && !isSubmitting && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("common:error")}</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <SaleHeaderFormSection
              clients={clients}
              loadingClients={loadingClients}
              clientSearchInput={clientSearchInput}
              onClientSearchInputChange={setClientSearchInput}
              isSubmitting={isSubmitting}
              selectedClient={selectedClient}
              onClientSelect={setSelectedClient}
            />
            <Separator className="my-4" />
            <SaleItemsList
              activeSaleData={activeSaleData}
              products={products}
              loadingProducts={loadingProducts}
              productSearchInput={productSearchInput}
              onProductSearchInputChange={setProductSearchInput}
              isSubmitting={isSubmitting}
            />
            <Separator className="my-4" />
            <SalePaymentsSection
              isSubmitting={isSubmitting}
              grandTotal={grandTotal}
            />
          </CardContent>
            <div className="flex flex-row items-center justify-between gap-4 p-4 md:p-6 border-t dark:border-gray-700 mt-auto bg-background dark:bg-gray-900">
            {/* Footer within form */}
            <SaleTotalsDisplay
              grandTotal={grandTotal}
              totalPaid={totalPaid}
              amountDue={amountDue}
            />
            <Button
              type="submit"
              disabled={isSubmitting || parentIsLoading}
              size="lg"
              className="mt-0"
            >
              {(isSubmitting || parentIsLoading) && (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              {isEditMode ? t("common:updateSale") : t("common:createSale")}
            </Button>
            </div>
        </form>
      </FormProvider>
    </Card>
  );
};
