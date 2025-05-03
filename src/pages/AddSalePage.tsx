// src/pages/AddSalePage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useForm,
  Controller,
  useFieldArray,
  useWatch,
  SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
// import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Calendar as CalendarIcon,
  Trash2,
  PlusCircle,
  Save,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

// Services and Types
import saleService, { CreateSaleData } from "../services/saleService"; // Use SaleService
import clientService, { Client } from "../services/clientService"; // Need ClientService
import productService, { Product } from "../services/productService";
import { formatNumber } from "@/constants"; // Your number formatting helper
import apiClient from "@/lib/axios";

// --- Zod Schema Definition ---
const saleItemSchema = z.object({
  product_id: z
    .number({ required_error: "validation:required" })
    .positive({ message: "validation:selectProduct" }),
  product: z.custom<Product>().optional(), // For UI state
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
  // available_stock stored temporarily for client-side check (optional)
  available_stock: z.number().optional(),
});

const addSaleSchema = z.object({
  client_id: z
    .number({ required_error: "validation:required" })
    .positive({ message: "validation:selectClient" }), // Changed from supplier_id
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
    .min(1, { message: "sales:errorItemsRequired" }), // Use sales specific key
  // Optional: Add refinement to check total paid amount against calculated total amount
  // .refine(...)
  // Optional: Add refinement to check quantity against available_stock stored temporarily
  // .refine(items => items.every(item => item.quantity <= (item.available_stock ?? Infinity)), {
  //     message: "sales:insufficientStockClient", // Add client-side specific message key
  //     path: ["items"], // Associate error with the items array
  // }),
});

// Infer TypeScript type
type AddSaleFormValues = z.infer<typeof addSaleSchema>;
type SaleItemFormValues = z.infer<typeof saleItemSchema>;

// --- Component ---
const AddSalePage: React.FC = () => {
  const { t } = useTranslation([
    "sales",
    "common",
    "validation",
    "clients",
    "products",
  ]); // Add 'sales' namespace
  const navigate = useNavigate();

  // --- State ---
  //   const [clients, setClients] = useState<Client[]>([]); // State for Clients
  const [products, setProducts] = useState<Product[]>([]);
  //   const [loadingClients, setLoadingClients] = useState(false); // Loading state for Clients
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // State specifically for product search within the comboboxes
  const [productOptions, setProductOptions] = useState<Product[]>([]); // Options currently displayed
  const [productSearchValue, setProductSearchValue] = useState(""); // Value in the search input
  const [isProductSearchLoading, setIsProductSearchLoading] = useState(false);
  const productSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Client Search State
  const [clients, setClients] = useState<Client[]>([]); // Options for client dropdown
  const [loadingClients, setLoadingClients] = useState(false); // Loading for client *list*
  const [clientSearchInput, setClientSearchInput] = useState(""); // Raw input value
  const [debouncedClientSearch, setDebouncedClientSearch] = useState(""); // Debounced value for API
  const clientDebounceRef = useRef<NodeJS.Timeout | null>(null); // Timer ref
  // Popover states
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [productPopoverStates, setProductPopoverStates] = useState<
    Record<number, boolean>
  >({});
  // Product search state
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const debounceTimeoutRef = useRef(null);

  // --- React Hook Form ---
  const form = useForm<AddSaleFormValues>({
    resolver: zodResolver(addSaleSchema),
    defaultValues: {
      client_id: undefined,
      sale_date: new Date(),
      status: "completed", // Default status might be 'completed' for sales
      invoice_number: "",
      notes: "",
      paid_amount: 0,
      items: [],
    },
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    setError,
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });

  // Calculate Grand Total
  const grandTotal = watchedItems.reduce(
    (total, item) =>
      total + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );

  // --- Data Fetching ---
  // --- Fetch Clients (Modified for Async Search) ---
  const fetchClients = useCallback(
    async (search: string) => {
      // Only fetch if search term has sufficient length (optional)
      if (!search || search.trim().length < 2) {
        setClients([]); // Clear options
        setLoadingClients(false);
        return;
      }
      setLoadingClients(true);
      console.log(`Searching clients with: "${search}"`);
      try {
        // --- CALL THE CLIENT AUTOCOMPLETE ENDPOINT ---
        const response = await apiClient.get<{ data: Client[] }>(
          `/clients/autocomplete?search=${encodeURIComponent(search)}&limit=15`
        );
        // Or use modified clientService.getClients if adapted
        // const response = await clientService.getClients(1, search, 15);

        setClients(response.data.data ?? response.data); // Adapt based on API structure
      } catch (error) {
        console.error("Error searching clients:", error);
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

  // --- Debounce Effect for Client Search ---
  useEffect(() => {
    if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current);
    clientDebounceRef.current = setTimeout(() => {
      setDebouncedClientSearch(clientSearchInput);
    }, 300); // 300ms delay
    return () => {
      if (clientDebounceRef.current) clearTimeout(clientDebounceRef.current);
    };
  }, [clientSearchInput]);

  // --- Effect to Fetch Clients on Debounced Change ---
  useEffect(() => {
    fetchClients(debouncedClientSearch);
  }, [debouncedClientSearch, fetchClients]);
  // --- Debounced Product Search Function ---
  const searchProducts = useCallback(async (search: string) => {
    if (!search || search.trim().length < 2) {
      // Optional: minimum search length
      setProductOptions([]); // Clear options if search is too short
      setIsProductSearchLoading(false);
      return;
    }
    setIsProductSearchLoading(true);
    console.log(`Searching products with: "${search}"`);
    try {
      // --- CALL THE DEDICATED AUTOCOMPLETE ENDPOINT ---
      const response = await apiClient.get<{ data: Product[] }>(
        `/products/autocomplete?search=${encodeURIComponent(search)}&limit=15`
      );
      // Or call the modified index endpoint:
      // const response = await productService.getProducts(1, search, 'name', 'asc', 15);

      setProductOptions(response.data.data ?? response.data); // Adapt based on API response structure
    } catch (error) {
      console.error("Error searching products:", error);
      // Optionally show toast, but might be annoying during typing
      setProductOptions([]); // Clear options on error
    } finally {
      setIsProductSearchLoading(false);
    }
  }, []); // No dependencies needed here usually

  // --- Debounce Effect for Product Search Input ---
  useEffect(() => {
    if (productSearchDebounceRef.current)
      clearTimeout(productSearchDebounceRef.current);

    productSearchDebounceRef.current = setTimeout(() => {
      searchProducts(productSearchValue); // Call search function with current input value
    }, 300); // 300ms debounce delay - adjust as needed

    return () => {
      if (productSearchDebounceRef.current)
        clearTimeout(productSearchDebounceRef.current);
    };
  }, [productSearchValue, searchProducts]); // Re-run when input value changes
  // useEffect(() => { fetchClients(); /* fetchProducts() maybe? */ }, [fetchClients, fetchProducts]); // Initial fetch

  // --- Form Submission ---
  const onSubmit: SubmitHandler<AddSaleFormValues> = async (data) => {
    setServerError(null);
    // Client-side check: Ensure paid amount isn't more than calculated total
    const calculatedTotal = data.items.reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
      0
    );
    if (data.paid_amount > calculatedTotal) {
      setError("paid_amount", {
        type: "manual",
        message: t("sales:errorPaidExceedsTotal"),
      }); // Add key
      setServerError(t("sales:errorPaidExceedsTotal"));
      toast.error(t("common:error"), {
        description: t("sales:errorPaidExceedsTotal"),
      });
      return; // Stop submission
    }

    const apiData: CreateSaleData = {
      ...data,
      sale_date: format(data.sale_date as Date, "yyyy-MM-dd"),
      paid_amount: Number(data.paid_amount), // Ensure paid amount is number
      items: data.items.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price), // Ensure unit price is number
      })),
    };
    console.log("Submitting Sale to API:", apiData);
    try {
      await saleService.createSale(apiData); // Use saleService
      toast.success(t("common:success"), {
        description: t("sales:saveSuccess"),
      });
      navigate("/sales"); // Navigate to sales list
    } catch (err) {
      console.error("Failed to create sale:", err);
      const generalError = saleService.getErrorMessage(err);
      const apiErrors = saleService.getValidationErrors(err);
      toast.error(t("common:error"), { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([key, messages]) => {
          const match = key.match(/^items\.(\d+)\.(.+)$/); // Check for item errors (e.g., stock)
          if (match) {
            const [, index, fieldName] = match;
            // Highlight the quantity field if it's a stock error related to items
            const fieldToSetError =
              fieldName === "quantity" || key.includes("stock")
                ? `items.${index}.quantity`
                : `items.${index}.${fieldName as keyof SaleItemFormValues}`;
            setError(fieldToSetError as any, {
              type: "server",
              message: messages[0],
            });
          } else if (key in ({} as AddSaleFormValues)) {
            setError(key as keyof AddSaleFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        });
        setServerError(t("validation:checkFields"));
      }
    }
  };

  // --- Add/Remove Item Handlers ---
  const addItem = () => {
    append({ product_id: 0, quantity: 1, unit_price: 0, product: undefined });
  };
  const removeItem = (index: number) => {
    remove(index);
  };
  const handleProductSearchInputChange = (search: string) => {
    setProductSearchInput(search);
  };

  // --- Render Page ---
  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center mb-6 gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          {t("sales:addPageTitle")}
        </h1>
      </div>

      {/* Form Card */}
      <Card className="dark:bg-gray-900">
        <Form {...form}>
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
              {/* Top Section Grid */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4 mb-8">
                {/* Client Combobox */}
                <FormField
                  control={control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                      <FormLabel>
                        {t("sales:selectClient")}{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover
                        open={clientPopoverOpen}
                        onOpenChange={(open) => {
                          setClientPopoverOpen(open);
                          if (!open) setClientSearchInput(""); // Reset search on close
                        }}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={isSubmitting}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {/* Find SELECTED client name from the CURRENT options OR show ID */}
                              {field.value
                                ? clients.find((c) => c.id === field.value)
                                    ?.name ?? `Client ID: ${field.value}`
                                : t("sales:selectClientPlaceholder") ||
                                  "Select client..."}
                              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                          <Command shouldFilter={false}>
                            {" "}
                            {/* Disable default filtering */}
                            <CommandInput
                              placeholder={
                                t("clients:searchPlaceholder") ||
                                "Search client..."
                              }
                              value={clientSearchInput} // Controlled input
                              onValueChange={setClientSearchInput} // Update raw search state -> triggers debounce
                            />
                            <CommandList>
                              {loadingClients && (
                                <div className="p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                  {t("common:loading")}...
                                </div>
                              )}
                              {!loadingClients &&
                                clients.length === 0 &&
                                clientSearchInput && (
                                  <CommandEmpty>
                                    {t("common:noResults")}
                                  </CommandEmpty>
                                )}
                              {!loadingClients &&
                                clients.length === 0 &&
                                !clientSearchInput && (
                                  <CommandEmpty>
                                    {t("clients:typeToSearch")}
                                  </CommandEmpty>
                                )}
                              {!loadingClients && (
                                <CommandGroup>
                                  {clients.map((client) => (
                                    <CommandItem
                                      key={client.id}
                                      value={`${client.name} ${client.email}`} // Value for accessibility/filtering if enabled
                                      onSelect={() => {
                                        field.onChange(client.id); // Update RHF state with ID
                                        setClientPopoverOpen(false); // Close popover
                                        setClientSearchInput(""); // Clear search input
                                        // Set clients back to just the selected one? Optional.
                                        // setClients([client]);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "me-2 h-4 w-4",
                                          client.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {client.name}{" "}
                                      {client.email && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({client.email})
                                        </span>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Sale Date Picker */}
                <FormField
                  control={control}
                  name="sale_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      {" "}
                      <FormLabel>
                        {t("sales:saleDate")}{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>{" "}
                      <Popover>
                        {" "}
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              disabled={isSubmitting}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {" "}
                              <CalendarIcon className="me-2 h-4 w-4" />{" "}
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("common:pickDate")}</span>
                              )}{" "}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() ||
                              date < new Date("1900-01-01") ||
                              isSubmitting
                            }
                            initialFocus
                          />
                        </PopoverContent>{" "}
                      </Popover>{" "}
                      <FormMessage />{" "}
                    </FormItem>
                  )}
                />
                {/* Status Select */}
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      {" "}
                      <FormLabel>
                        {t("sales:statusLabel")}{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>{" "}
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="completed">
                            {t("sales:status_completed")}
                          </SelectItem>
                          <SelectItem value="pending">
                            {t("sales:status_pending")}
                          </SelectItem>
                          <SelectItem value="draft">
                            {t("sales:status_draft")}
                          </SelectItem>
                          <SelectItem value="cancelled">
                            {t("sales:status_cancelled")}
                          </SelectItem>
                        </SelectContent>
                      </Select>{" "}
                      <FormMessage />{" "}
                    </FormItem>
                  )}
                />
                {/* Invoice Number */}
                <FormField
                  control={control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("sales:invoiceLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="INV-001"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Paid Amount */}
                <FormField
                  control={control}
                  name="paid_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sales:paidAmountLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Notes */}
                <FormField
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>{t("sales:notesLabel")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={
                            t("sales:notesPlaceholder") ||
                            "Notes about the sale..."
                          }
                          className="resize-y min-h-[60px]"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator className="my-6" />
              {/* Items Section */}
              <h3 className="text-lg font-medium mb-4">
                {t("sales:itemsSectionTitle")}
              </h3>
              {errors.items?.root && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errors.items.root.message}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">
                {fields.map((item, index) => (
                  <Card
                    key={item.id}
                    className="p-3 dark:bg-gray-800 border dark:border-gray-700"
                  >
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Product Combobox (Modified for Async Search) */}
                      <FormField
                        control={control}
                        name={`items.${index}.product_id`}
                        render={({ field }) => (
                          <FormItem className="col-span-12 md:col-span-5 flex flex-col">
                            <FormLabel>
                              {t("sales:product")}{" "}
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <Popover
                              open={productPopoverStates[index]}
                              onOpenChange={(open) => {
                                setProductPopoverStates((prev) => ({
                                  ...prev,
                                  [index]: open,
                                }));
                                // Reset search input and options when closing
                                if (!open) setProductSearchValue("");
                              }}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  {/* Find the *full product object* for display */}
                                  {/* This requires the selected product to be in the 'products' state OR fetch it separately */}
                                  {/* Simpler: just display the ID temporarily or fetch name on selection */}
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={isSubmitting}
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value
                                      ? watch(`items.${index}.product`)?.name ??
                                        `Product ID: ${field.value}`
                                      : t("sales:selectProductPlaceholder")}
                                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command shouldFilter={false}>
                                  {" "}
                                  {/* Disable default filtering */}
                                  <CommandInput
                                    placeholder={t(
                                      "products:searchPlaceholder"
                                    )}
                                    value={productSearchValue} // Controlled input
                                    onValueChange={setProductSearchValue} // Update search state -> triggers debounce effect
                                  />
                                  <CommandList>
                                    {isProductSearchLoading && (
                                      <div className="p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                        {t("common:loading")}...
                                      </div>
                                    )}
                                    {!isProductSearchLoading &&
                                      productOptions.length === 0 &&
                                      productSearchValue && (
                                        <CommandEmpty>
                                          {t("common:noResults")}
                                        </CommandEmpty>
                                      )}
                                    {!isProductSearchLoading &&
                                      productOptions.length === 0 &&
                                      !productSearchValue && (
                                        <CommandEmpty>
                                          {t("products:typeToSearch")}
                                        </CommandEmpty>
                                      )}{" "}
                                    {/* Prompt user */}
                                    {!isProductSearchLoading && (
                                      <CommandGroup>
                                        {productOptions.map((product) => (
                                          <CommandItem
                                            key={product.id}
                                            value={`${product.name} ${product.sku}`} // Value used if filtering enabled
                                            onSelect={() => {
                                              field.onChange(product.id); // Set product ID
                                              setValue(
                                                `items.${index}.unit_price`,
                                                Number(product.sale_price) || 0
                                              ); // Set sale price
                                              setValue(
                                                `items.${index}.product`,
                                                product
                                              ); // Store full product temporarily
                                              setProductPopoverStates(
                                                (prev) => ({
                                                  ...prev,
                                                  [index]: false,
                                                })
                                              ); // Close popover
                                              setProductSearchValue(""); // Clear search input
                                              setProductOptions([]); // Clear search results
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "me-2 h-4 w-4",
                                                product.id === field.value
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {product.name}{" "}
                                            <span className="text-xs text-muted-foreground ml-2">
                                              ({product.sku || "No SKU"})
                                            </span>{" "}
                                            <span className="ml-auto text-xs">
                                              {t("sales:availableStock", {
                                                count: product.stock_quantity,
                                              })}
                                            </span>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Quantity */}
                      <FormField
                        control={control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="col-span-4 md:col-span-2">
                            <FormLabel>{t("sales:quantity")}*</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="1"
                                {...field}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Unit Price */}
                      <FormField
                        control={control}
                        name={`items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem className="col-span-4 md:col-span-2">
                            <FormLabel>{t("sales:unitPrice")}*</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Total Price */}
                      <div className="col-span-3 md:col-span-2 flex items-end justify-end pb-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {t("sales:totalPrice")}:{" "}
                          {formatNumber(
                            (Number(watchedItems[index]?.quantity) || 0) *
                              (Number(watchedItems[index]?.unit_price) || 0)
                          )}
                        </p>
                      </div>
                      {/* Remove Button */}
                      <div className="col-span-1 flex items-end justify-end pb-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={isSubmitting || fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {/* Add Item Button */}
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  <PlusCircle className="me-2 h-4 w-4" />{" "}
                  {t("sales:addProduct")}
                </Button>
              </div>
              <Separator className="my-6" />
              {/* Grand Total & Due Amount */}
              <div className="flex justify-end mb-2">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t("sales:grandTotal")}: {formatNumber(grandTotal)}
                </p>
              </div>
              <div className="flex justify-end mb-6">
                <p className="text-md text-gray-600 dark:text-gray-300">
                  {t("sales:amountDue")}:{" "}
                  {formatNumber(
                    grandTotal - (Number(watch("paid_amount")) || 0)
                  )}
                </p>
              </div>{" "}
              {/* Add amountDue key */}
              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}{" "}
                  {t("sales:submitSale")}
                </Button>
              </div>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default AddSalePage;
