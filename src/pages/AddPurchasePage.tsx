// src/pages/AddPurchasePage.tsx
import React, { useState, useEffect, useCallback } from "react";
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
import { format } from "date-fns"; // For formatting date in DatePicker button
import { cn } from "@/lib/utils"; // shadcn utility for merging class names

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // shadcn Alert
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
} from "lucide-react"; // Icons

// Services and Types
import purchaseService, {
  CreatePurchaseData,
} from "../services/purchaseService";
import supplierService, { Supplier } from "../services/supplierService";
import productService, { Product } from "../services/productService";
import { formatNumber } from "@/constants"; // Assuming you have this helper

// --- Zod Schema (Remains largely the same, ensure validation keys match translations) ---
const purchaseItemSchema = z.object({
  product_id: z
    .number({ required_error: "validation:required" })
    .positive({ message: "validation:selectProduct" }),
  product: z.custom<Product>().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: "validation:invalidInteger" })
    .int({ message: "validation:invalidInteger" })
    .min(1, { message: "validation:minQuantity" }),
  unit_cost: z
    .preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce
        .number({ invalid_type_error: "validation:invalidPrice" })
        .min(0, { message: "validation:minZero" })
    )
    .default(0),
});

const addPurchaseSchema = z.object({
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

type AddPurchaseFormValues = z.infer<typeof addPurchaseSchema>;
type PurchaseItemFormValues = z.infer<typeof purchaseItemSchema>;

// --- Component ---
const AddPurchasePage: React.FC = () => {
  const { t } = useTranslation([
    "purchases",
    "common",
    "validation",
    "suppliers",
    "products",
  ]);
  const navigate = useNavigate();

  // --- State ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // State for managing Combobox popover visibility programmatically if needed
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  // Separate state for product combobox popovers in the field array
  const [productPopoverStates, setProductPopoverStates] = useState<
    Record<number, boolean>
  >({});

  // --- React Hook Form ---
  const form = useForm<AddPurchaseFormValues>({
    resolver: zodResolver(addPurchaseSchema),
    defaultValues: {
      supplier_id: undefined,
      purchase_date: new Date(),
      status: "pending",
      reference_number: "",
      notes: "",
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
      total + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
    0
  );

  // --- Data Fetching ---
 // --- Fetch Suppliers (Implemented) ---
 const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true); // Indicate loading started
    console.log("Fetching suppliers...");
    try {
        // Fetching potentially all suppliers for the dropdown.
        // Consider limiting or adding search if the list can be very large.
        // Example: Fetch first 200 suppliers.
        const response = await supplierService.getSuppliers(
            1,    // Page 1
            '',   // No search term initially
            200   // Limit results (adjust as needed)
            // Note: supplierService.getSuppliers needs pagination limit param if not already added
        );
        setSuppliers(response.data); // Update state with fetched suppliers
        console.log("Suppliers fetched:", response.data.length);
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        // Show error notification using Sonner
        toast.error(t('common:error'), {
            description: supplierService.getErrorMessage(error, t('suppliers:fetchError') || 'Failed to load suppliers'), // Use translation key
        });
        setSuppliers([]); // Clear suppliers on error
    } finally {
        setLoadingSuppliers(false); // Indicate loading finished
    }
}, [t]);
 // --- Fetch Products (Implemented) ---
 const fetchProducts = useCallback(async (searchTerm = '') => {
    // Set loading state specifically for products
    // If you implement per-combobox loading, you might adjust this
    setLoadingProducts(true);
    console.log(`Fetching products with search: "${searchTerm}"`);
    try {
        // Fetch a limited number, sorted by name, with optional search term
        // Adjust limit (e.g., 100) as needed for autocomplete performance
        const response = await productService.getProducts(
            1,           // Fetch page 1
            searchTerm,  // Pass the search term
            'name',      // Sort by name
            'asc',       // Ascending order
            100          // Limit results (adjust as needed)
        );
        setProducts(response.data); // Update the products state
    } catch (error) {
        console.error("Error fetching products for autocomplete:", error);
        // Show an error toast to the user if fetching fails
        toast.error(t('common:error'), {
            description: productService.getErrorMessage(error, t('products:fetchError') || 'Failed to load products'), // Use translation key
        });
        setProducts([]); // Clear products on error
    } finally {
        setLoadingProducts(false); // Clear loading state
    }
}, [t]); // Added t as dependency for translated error message
  useEffect(() => {

    fetchSuppliers();
    fetchProducts();
  }, [fetchSuppliers, fetchProducts]);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<AddPurchaseFormValues> = async (data) => {
    setServerError(null);
    const apiData: CreatePurchaseData = {
      ...data,
      purchase_date: format(data.purchase_date as Date, "yyyy-MM-dd"), // Format date
      items: data.items.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
      })),
    };
    console.log("Submitting shadcn form to API:", apiData);
    try {
      await purchaseService.createPurchase(apiData);
      toast.success(t("common:success"), {
        description: t("purchases:saveSuccess"),
      });
      navigate("/purchases");
    } catch (err) {
      const generalError = purchaseService.getErrorMessage(err);
      const apiErrors = purchaseService.getValidationErrors(err);
      toast.error(t("common:error"), { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        /* ... (map apiErrors using setError, same logic as before) ... */
      }
    }
  };

  // --- Add/Remove Item Handlers ---
  const addItem = () => {
    append({ product_id: 0, quantity: 1, unit_cost: 0, product: undefined });
  };
  const removeItem = (index: number) => {
    remove(index);
  };

  // --- Render Page ---
  return (
    // Use Tailwind for overall page padding and background
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header with Back Button */}
      <div className="flex items-center mb-6 gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label={t("common:back") || "Back"}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          {t("purchases:addPageTitle")}
        </h1>
      </div>

      {/* Form wrapped in shadcn Card and Form components */}
      <Card className="dark:bg-gray-900">
        <Form {...form}>
          {" "}
          {/* Spread RHF methods */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Card Header (Optional) */}
            {/* <CardHeader><CardTitle>Purchase Details</CardTitle></CardHeader> */}

            <CardContent className="pt-6">
              {" "}
              {/* Add padding */}
              {/* General Server Error Alert */}
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("common:error")}</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}
              {/* Top Section Grid Layout */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4 mb-8">
                {/* Supplier Combobox */}
                <FormField
                  control={control}
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                      <FormLabel>
                        {t("purchases:selectSupplier")}{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover
                        open={supplierPopoverOpen}
                        onOpenChange={setSupplierPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={supplierPopoverOpen}
                              disabled={loadingSuppliers || isSubmitting}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {loadingSuppliers
                                ? t("common:loading")
                                : field.value
                                ? suppliers.find((s) => s.id === field.value)
                                    ?.name
                                : t("purchases:selectSupplier")}
                              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                          <Command>
                            <CommandInput
                              placeholder={
                                t("suppliers:searchPlaceholder") ||
                                "Search supplier..."
                              }
                            />
                            <CommandList>
                              <CommandEmpty>
                                {t("common:noResults")}
                              </CommandEmpty>
                              <CommandGroup>
                                {suppliers.map((supplier) => (
                                  <CommandItem
                                    key={supplier.id}
                                    value={supplier.name} // Use name for searching/filtering in CommandInput
                                    onSelect={() => {
                                      field.onChange(supplier.id); // Set the ID value for RHF
                                      setSupplierPopoverOpen(false); // Close popover
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "me-2 h-4 w-4",
                                        supplier.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {supplier.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Purchase Date Picker */}
                <FormField
                  control={control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        {t("purchases:purchaseDate")}{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              disabled={isSubmitting}
                              className={cn(
                                "w-full justify-start text-start font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="me-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("common:pickDate")}</span>
                              )}
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
                            } // Example disabled dates
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status Select */}
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("purchases:statusLabel")}{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                t("purchases:selectStatusPlaceholder") ||
                                "Select status"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">
                            {t("purchases:status_pending")}
                          </SelectItem>
                          <SelectItem value="ordered">
                            {t("purchases:status_ordered")}
                          </SelectItem>
                          <SelectItem value="received">
                            {t("purchases:status_received")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reference Number */}
                <FormField
                  control={control}
                  name="reference_number"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("purchases:referenceLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="PO-12345"
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
                      <FormLabel>{t("purchases:notesLabel")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={
                            t("purchases:notesPlaceholder") ||
                            "Any relevant notes..."
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
              <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-100">
                {t("purchases:itemsSectionTitle")}
              </h3>
              {/* Items array validation error */}
              {errors.items?.root && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errors.items.root.message}
                  </AlertDescription>
                </Alert>
              )}
              {/* Items Array */}
              <div className="space-y-4">
                {fields.map((item, index) => (
                  <Card
                    key={item.id}
                    className="p-3 dark:bg-gray-800 border dark:border-gray-700"
                  >
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Product Combobox */}
                      <FormField
                        control={control}
                        name={`items.${index}.product_id`}
                        render={({ field }) => (
                          <FormItem className="col-span-12 md:col-span-5 flex flex-col">
                            <FormLabel>
                              {t("purchases:product")}{" "}
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            {/* TODO: Implement improved Product Combobox with async search */}
                            <Popover
                              open={productPopoverStates[index]}
                              onOpenChange={(open) =>
                                setProductPopoverStates((prev) => ({
                                  ...prev,
                                  [index]: open,
                                }))
                              }
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
                                    {field.value
                                      ? products.find(
                                          (p) => p.id === field.value
                                        )?.name
                                      : t(
                                          "purchases:selectProductPlaceholder"
                                        ) || "Select product..."}
                                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command>
                                  <CommandInput
                                    placeholder={
                                      t("products:searchPlaceholder") ||
                                      "Search product..."
                                    } /* onValueChange={handleProductSearch} */
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      {t("common:noResults")}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {products.map((product) => (
                                        <CommandItem
                                          key={product.id}
                                          value={product.name}
                                          onSelect={() => {
                                            field.onChange(product.id);
                                            setValue(
                                              `items.${index}.unit_cost`,
                                              Number(product.purchase_price) ||
                                                0
                                            );
                                            setProductPopoverStates((prev) => ({
                                              ...prev,
                                              [index]: false,
                                            }));
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
                                          {product.name} (
                                          {product.sku || "No SKU"})
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
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
                            <FormLabel>{t("purchases:quantity")}*</FormLabel>
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
                      {/* Unit Cost */}
                      <FormField
                        control={control}
                        name={`items.${index}.unit_cost`}
                        render={({ field }) => (
                          <FormItem className="col-span-4 md:col-span-2">
                            <FormLabel>{t("purchases:unitCost")}*</FormLabel>
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
                      {/* Total Cost (Display Only) */}
                      <div className="col-span-3 md:col-span-2 flex items-end justify-end pb-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {t("purchases:totalCost")}:{" "}
                          {formatNumber(
                            (Number(watchedItems[index]?.quantity) || 0) *
                              (Number(watchedItems[index]?.unit_cost) || 0)
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
                          aria-label={t("purchases:remove") || "Remove"}
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
                  {t("purchases:addProduct")}
                </Button>
              </div>
              <Separator className="my-6" />
              {/* Grand Total Display */}
              <div className="flex justify-end mb-6">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {t("purchases:grandTotal")}: {formatNumber(grandTotal)}
                </p>
              </div>
              {/* Form Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  {t("purchases:submitPurchase")}
                </Button>
              </div>
            </CardContent>
            {/* End Content Area */}
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default AddPurchasePage;
