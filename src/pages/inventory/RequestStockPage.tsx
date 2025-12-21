// src/pages/inventory/RequestStockPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
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
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Calendar as CalendarIcon,
  Trash2,
  PlusCircle,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

// Services and Types
import stockRequisitionService, {
  CreateStockRequisitionData,
} from "../../services/stockRequisitionService"; // Adjust path
import productService, { Product } from "../../services/productService";

// --- Zod Schema Definition ---
const requisitionItemSchema = z.object({
  product_id: z
    .number({ required_error: "مطلوب" })
    .positive({ message: "الرجاء اختيار منتج" }),
  product_name_display: z.string().optional(), // For displaying selected product name
  requested_quantity: z.coerce
    .number({ invalid_type_error: "يجب أن يكون رقماً صحيحاً" })
    .int({ message: "يجب أن يكون رقماً صحيحاً" })
    .min(1, { message: "الكمية يجب أن تكون 1 على الأقل" }),
  item_notes: z.string().nullable().optional(),
});

const createRequisitionSchema = z.object({
  department_or_reason: z
    .string()
    .min(1, { message: "مطلوب" })
    .max(255, { message: "النص طويل جداً" }), // Example: make reason required
  request_date: z.date({
    required_error: "مطلوب",
    invalid_type_error: "تاريخ غير صالح",
  }),
  notes: z.string().nullable().optional(),
  items: z
    .array(requisitionItemSchema)
    .min(1, { message: "يجب إضافة عنصر واحد على الأقل" }), // Add key
});

type CreateRequisitionFormValues = z.infer<typeof createRequisitionSchema>;
type RequisitionItemFormValues = z.infer<typeof requisitionItemSchema>;

// --- Component ---
const RequestStockPage: React.FC = () => {
  // Removed useTranslation
  const navigate = useNavigate();

  // --- State ---
  const [products, setProducts] = useState<Product[]>([]); // For product combobox options
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Product search & popover states (per item, so needs array or more complex state if multiple comboboxes are open)
  // For simplicity, using one shared search for all product comboboxes for now
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [activeProductPopoverIndex, setActiveProductPopoverIndex] = useState<
    number | null
  >(null);

  // --- React Hook Form ---
  const form = useForm<CreateRequisitionFormValues>({
    resolver: zodResolver(createRequisitionSchema),
    defaultValues: {
      department_or_reason: "",
      request_date: new Date(),
      notes: "",
      items: [
        {
          product_id: 0,
          product_name_display: "",
          requested_quantity: 1,
          item_notes: "",
        },
      ], // Start with one item
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

  // --- Fetch Products (Debounced) ---
  const fetchProducts = useCallback(
    async (search: string) => {
      if (!search && products.length > 0 && !productSearchInput) return;
      setLoadingProducts(true);
      try {
        const response = await productService.getProductsForAutocomplete(
          search,
          30
        );
        setProducts(response);
      } catch (error) {
        toast.error("خطأ", {
          description: productService.getErrorMessage(error),
        });
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    },
    [productSearchInput]
  ); // Dependencies

  useEffect(() => {
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    productDebounceRef.current = setTimeout(
      () => setDebouncedProductSearch(productSearchInput),
      300
    );
    return () => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    };
  }, [productSearchInput]);

  useEffect(() => {
    fetchProducts(debouncedProductSearch);
  }, [debouncedProductSearch, fetchProducts]);
  useEffect(() => {
    fetchProducts("");
  }, [fetchProducts]); // Initial fetch

  // --- Form Submission ---
  const onSubmit: SubmitHandler<CreateRequisitionFormValues> = async (data) => {
    setServerError(null);
    const apiData: CreateStockRequisitionData = {
      department_or_reason: data.department_or_reason,
      request_date: format(data.request_date as Date, "yyyy-MM-dd"),
      notes: data.notes || null,
      items: data.items.map((item) => ({
        product_id: item.product_id,
        requested_quantity: Number(item.requested_quantity),
        item_notes: item.item_notes || null,
      })),
    };
    console.log("Submitting Stock Requisition:", apiData);
    try {
      await stockRequisitionService.createRequisition(apiData);
      toast.success("تم بنجاح", {
        description: "تم إنشاء طلب المخزون بنجاح",
      }); // Add key
      navigate("/admin/inventory/requisitions"); // Navigate to a list page (to be created)
    } catch (err) {
      console.error("Failed to create stock requisition:", err);
      const generalError = stockRequisitionService.getErrorMessage(err);
      const apiErrors = stockRequisitionService.getValidationErrors(err);
      toast.error("خطأ", { description: generalError });
      setServerError(generalError);
      if (apiErrors && Array.isArray(apiErrors)) {
        apiErrors.forEach((error) => {
          setError(error.field, { message: error.message });
        });
      }
    }
  };

  // --- Add/Remove Item Handlers ---
  const addItem = () => {
    append({
      product_id: 0,
      product_name_display: "",
      requested_quantity: 1,
      item_notes: "",
    });
  };
  const removeItem = (index: number) => {
    remove(index);
  };
  const handleProductSearchInputChange = (search: string) => {
    setProductSearchInput(search);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center mb-6 gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          طلب مخزون جديد
        </h1>
      </div>

      <Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle>تفاصيل الطلب</CardTitle>
          {/* Add key */}
          <CardDescription>أدخل تفاصيل طلب المخزون أدناه</CardDescription>
          {/* Add key */}
        </CardHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="pt-6 space-y-6">
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>خطأ</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="department_or_reason"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        القسم / السبب
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="أدخل القسم أو سبب الطلب"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add keys */}
                <FormField
                  control={control}
                  name="request_date"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        تاريخ الطلب
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover>
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
                              <CalendarIcon className="me-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>اختر تاريخاً</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || isSubmitting
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add key */}
                <FormField
                  control={control}
                  name="notes"
                  render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="أي ملاحظات إضافية..."
                          className="min-h-[60px]"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add keys */}
              </div>
              <Separator className="my-6" />
              {/* Items Section */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">العناصر المطلوبة</h3>
                {/* Add key */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={isSubmitting}
                >
                  <PlusCircle className="me-2 h-4 w-4" />
                  إضافة عنصر
                </Button>
                {/* Add key */}
              </div>
              {errors.items &&
                !Array.isArray(errors.items) &&
                errors.items.root && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      {errors.items.root.message}
                    </AlertDescription>
                  </Alert>
                )}
              <div className="space-y-4">
                {fields.map((item, index) => (
                  <Card
                    key={item.id}
                    className="p-4 dark:bg-gray-800 border dark:border-gray-700 relative"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={isSubmitting || fields.length <= 1}
                      className="absolute top-2 end-2 h-7 w-7 text-muted-foreground hover:text-red-500 z-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-6 md:pt-2">
                      {/* Product Combobox */}
                      <FormField
                        control={control}
                        name={`items.${index}.product_id`}
                        render={({ field: productFieldCtrl, fieldState }) => (
                          <FormItem className="md:col-span-7 flex flex-col">
                            <FormLabel>
                              المنتج
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <Popover
                              open={activeProductPopoverIndex === index}
                              onOpenChange={(open) => {
                                setActiveProductPopoverIndex(
                                  open ? index : null
                                );
                                if (!open) setProductSearchInput("");
                              }}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={isSubmitting}
                                    className={cn(
                                      "w-full justify-between text-start",
                                      !productFieldCtrl.value &&
                                        "text-muted-foreground"
                                    )}
                                  >
                                    {watch(
                                      `items.${index}.product_name_display`
                                    ) ||
                                      (productFieldCtrl.value
                                        ? `ID: ${productFieldCtrl.value}`
                                        : "اختر منتجاً...")}
                                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="بحث عن منتج..."
                                    value={productSearchInput}
                                    onValueChange={
                                      handleProductSearchInputChange
                                    }
                                    // disabled={loadingProducts}
                                  />
                                  <CommandList>
                                    {/* Loading/Empty/Results states for products */}
                                    {loadingProducts && (
                                      <div className="p-2 text-center text-sm">
                                        <Loader2 className="inline me-2 h-4 w-4 animate-spin" />
                                        جاري التحميل...
                                      </div>
                                    )}
                                    {!loadingProducts &&
                                      products.length === 0 &&
                                      productSearchInput && (
                                        <CommandEmpty>
                                          لا توجد نتائج
                                        </CommandEmpty>
                                      )}
                                    {!loadingProducts &&
                                      products.length === 0 &&
                                      !productSearchInput && (
                                        <CommandEmpty>اكتب للبحث</CommandEmpty>
                                      )}
                                    {!loadingProducts &&
                                      products.map((product) => (
                                        <CommandItem
                                          key={product.id}
                                          value={`${product.name} ${product.sku}`}
                                          onSelect={() => {
                                            productFieldCtrl.onChange(
                                              product.id
                                            );
                                            setValue(
                                              `items.${index}.product_name_display`,
                                              `${product.name} (${
                                                product.sku || "N/A"
                                              })`
                                            );
                                            setActiveProductPopoverIndex(null);
                                            setProductSearchInput("");
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "me-2 h-4 w-4",
                                              product.id ===
                                                productFieldCtrl.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {product.name} ({product.sku || "N/A"}
                                          ) - المخزون الحالي:
                                          {product.stock_quantity}
                                        </CommandItem>
                                      ))}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Requested Quantity */}
                      <FormField
                        control={control}
                        name={`items.${index}.requested_quantity`}
                        render={({ field, fieldState }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>الكمية المطلوبة*</FormLabel>
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
                      {/* Add keys */}
                      {/* Item Notes (Optional) */}
                      <FormField
                        control={control}
                        name={`items.${index}.item_notes`}
                        render={({ field, fieldState }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>ملاحظات العنصر</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ملاحظات (اختياري)"
                                {...field}
                                value={field.value ?? ""}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Add keys */}
                    </div>
                  </Card>
                ))}
              </div>
              {fields.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  لا توجد عناصر في الطلب
                </p>
              )}
              {/* Add key */}
              {/* Submit Button */}
              <div className="flex justify-end mt-8">
                <Button
                  type="submit"
                  disabled={isSubmitting || loadingProducts}
                  size="lg"
                >
                  {isSubmitting && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  إرسال الطلب {/* Add key */}
                </Button>
              </div>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default RequestStockPage;
