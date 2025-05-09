// src/components/inventory/StockAdjustmentFormModal.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  Check,
  ChevronsUpDown,
  PackageSearch,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Services and Types
import stockAdjustmentService, {
  CreateStockAdjustmentData,
} from "../../services/stockAdjustmentService";
import productService, { Product } from "../../services/productService";
import { PurchaseItem } from "../../services/purchaseService"; // Batch type
import apiClient from "@/lib/axios"; // For direct batch fetch
import { formatNumber } from "@/constants"; // Assuming formatDate exists here now
import dayjs from "dayjs";

// --- Zod Schema ---
const adjustmentReasons = [
  "stock_take",
  "damaged",
  "lost",
  "found",
  "initial_stock",
  "other",
] as const; // Added initial_stock

const adjustmentFormSchema = z.object({
  product_id: z
    .number({ required_error: "validation:required" })
    .positive({ message: "validation:selectProduct" }),
  selected_product_name: z.string().optional(), // For display in trigger
  purchase_item_id: z.number().positive().nullable().optional(), // ID of the specific batch
  selected_batch_info: z.string().nullable().optional(), // For display in batch trigger
  quantity_change: z.coerce
    .number({
      required_error: "validation:required",
      invalid_type_error: "validation:invalidInteger",
    })
    .int({ message: "validation:invalidInteger" })
    .refine((val) => val !== 0, { message: "validation:nonZeroRequired" }),
  reason: z.string().min(1, { message: "validation:required" }),
  notes: z.string().nullable().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

// --- Component Props ---
interface StockAdjustmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedProduct?: Product) => void; // Pass back updated product if API returns it
}

// --- Component ---
const StockAdjustmentFormModal: React.FC<StockAdjustmentFormModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const { t } = useTranslation([
    "inventory",
    "common",
    "products",
    "validation",
  ]);

  // State for async data
  const [products, setProducts] = useState<Product[]>([]);
  const [availableBatches, setAvailableBatches] = useState<PurchaseItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Search & Popover States
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [batchPopoverOpen, setBatchPopoverOpen] = useState(false);

  // --- RHF Setup ---
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      product_id: undefined,
      selected_product_name: "",
      purchase_item_id: null,
      selected_batch_info: null,
      quantity_change: undefined,
      reason: "",
      notes: "",
    },
  });
  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { isSubmitting, errors },
    setError,
    setValue,
  } = form;

  const selectedProductId = watch("product_id");

  // --- Fetch Products (Debounced) ---
  const fetchProducts = useCallback(
    async (search: string) => {
      if (!search && products.length > 0 && !productSearchInput) return; // Avoid refetch if not searching and list exists
      setLoadingProducts(true);
      try {
        const response = await productService.getProductsForAutocomplete(
          search,
          20
        ); // Use autocomplete endpoint
        setProducts(response);
      } catch (error) {
        toast.error(t("common:error"), {
          description: productService.getErrorMessage(error),
        });
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    },
    [t, products.length, productSearchInput]
  ); // Added dependencies

  console.log(productSearchInput,'productSearchInput')
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

  // --- Fetch Available Batches for Selected Product ---
  const fetchBatchesForProduct = useCallback(
    async (productId: number | undefined | null) => {
      if (!productId) {
        setAvailableBatches([]);
        setValue("purchase_item_id", null);
        setValue("selected_batch_info", null);
        return;
      }
      setLoadingBatches(true);
      try {
        const response = await apiClient.get<{ data: PurchaseItem[] }>(
          `/products/${productId}/available-batches`
        );
        setAvailableBatches(response.data.data ?? response.data);
      } catch (error) {
        console.error("Error fetching batches:", error);
        setAvailableBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    },
    [setValue]
  );

  useEffect(() => {
    fetchBatchesForProduct(selectedProductId);
  }, [selectedProductId, fetchBatchesForProduct]);

  // --- Effect to Reset Form on Open/Close ---
  useEffect(() => {
    if (isOpen) {
      reset();
      setServerError(null);
      setProducts([]);
      setAvailableBatches([]);
      setProductSearchInput("");
      setDebouncedProductSearch("");
    }
  }, [isOpen, reset]);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<AdjustmentFormValues> = async (data) => {
    setServerError(null);
    const apiData: CreateStockAdjustmentData = {
      product_id: data.product_id!, // product_id is required by Zod
      purchase_item_id: data.purchase_item_id ?? null,
      quantity_change: Number(data.quantity_change),
      reason: data.reason,
      notes: data.notes || null,
    };
    console.log("Submitting Stock Adjustment:", apiData);
    try {
      const result = await stockAdjustmentService.createAdjustment(apiData);
      toast.success(t("common:success"), {
        description: t("inventory:adjustmentSuccess"),
      });
      onSaveSuccess(result.product); // Pass back updated product
      onClose();
    } catch (err) {
      console.error("Failed to save stock adjustment:", err);
      const generalError = stockAdjustmentService.getErrorMessage(err);
      const apiErrors = stockAdjustmentService.getValidationErrors(err);
      toast.error(t("common:error"), { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        /* ... map errors using setError ... */
      }
    }
  };

  return (
    <Dialog modal={false} open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
              <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {t("inventory:addAdjustmentTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("common:error")}</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {/* Product Selection */}
              <FormField
                control={control}
                name="product_id"
                render={({ field, fieldState }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      {t("products:product")}{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover
                      open={productPopoverOpen}
                      onOpenChange={(open) => {
                        setProductPopoverOpen(open);
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
                              !watch("selected_product_name") &&
                                "text-muted-foreground"
                            )}
                          >
                            {watch("selected_product_name") ||
                              t("inventory:selectProductPlaceholder")}
                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput autoFocus={true}
                            placeholder={t("products:searchPlaceholder")}
                            value={productSearchInput}
                            onValueChange={setProductSearchInput}
                            // disabled={loadingProducts}
                          />
                          <CommandList>
                            {loadingProducts && (
                              <div className="p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                {t("common:loading")}...
                              </div>
                            )}
                            {!loadingProducts &&
                              products.length === 0 &&
                              productSearchInput && (
                                <CommandEmpty>
                                  {t("common:noResults")}
                                </CommandEmpty>
                              )}
                            {!loadingProducts &&
                              products.length === 0 &&
                              !productSearchInput && (
                                <CommandEmpty>
                                  {t("products:typeToSearch")}
                                </CommandEmpty>
                              )}
                            {!loadingProducts && (
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={`${product.name} ${product.sku}`}
                                    onSelect={() => {
                                      field.onChange(product.id);
                                      setValue(
                                        "selected_product_name",
                                        `${product.name} (${
                                          product.sku || "No SKU"
                                        })`
                                      );
                                      setProductPopoverOpen(false);
                                      setProductSearchInput("");
                                    }}
                                  >
                                    {" "}
                                    <Check
                                      className={cn(
                                        "me-2 h-4 w-4",
                                        product.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />{" "}
                                    {product.name}{" "}
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({product.sku || "No SKU"})
                                    </span>
                                  </CommandItem>
                                ))}{" "}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Batch Selection (Optional) */}
              <FormField
                control={control}
                name="purchase_item_id"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t("inventory:selectBatchOptional")}</FormLabel>
                    <Popover
                      open={batchPopoverOpen}
                      onOpenChange={setBatchPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={
                              isSubmitting ||
                              !selectedProductId ||
                              loadingBatches ||
                              availableBatches.length === 0
                            }
                            className={cn(
                              "w-full justify-between text-start",
                              !watch("selected_batch_info") &&
                                "text-muted-foreground"
                            )}
                          >
                            {loadingBatches ? (
                              <div className="flex items-center">
                                <Loader2 className="me-2 h-4 w-4 animate-spin" />{" "}
                                {t("common:loading")}...
                              </div>
                            ) : (
                              watch("selected_batch_info") ||
                              t("inventory:selectBatchPlaceholder")
                            )}
                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                        <Command>
                          <CommandList>
                            {loadingBatches && (
                              <CommandEmpty>
                                {t("common:loading")}...
                              </CommandEmpty>
                            )}
                            {!loadingBatches &&
                              availableBatches.length === 0 && (
                                <CommandEmpty>
                                  {t("inventory:noBatchesForProduct")}
                                </CommandEmpty>
                              )}{" "}
                            {/* Add key */}
                            {!loadingBatches && (
                              <CommandGroup>
                                <CommandItem
                                  key="total-stock"
                                  onSelect={() => {
                                    field.onChange(null);
                                    setValue(
                                      "selected_batch_info",
                                      t("inventory:adjustTotalStock")
                                    );
                                    setBatchPopoverOpen(false);
                                  }}
                                >
                                  {" "}
                                  {t("inventory:adjustTotalStock")}{" "}
                                </CommandItem>
                                {availableBatches.map((batch) => (
                                  <CommandItem
                                    key={batch.id}
                                    value={String(batch.id)}
                                    onSelect={() => {
                                      field.onChange(batch.id);
                                      setValue(
                                        "selected_batch_info",
                                        `${
                                          batch.batch_number ||
                                          `ID: ${batch.id}`
                                        } (Av: ${batch.remaining_quantity})`
                                      );
                                      setBatchPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "me-2 h-4 w-4",
                                        batch.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {batch.batch_number || `ID: ${batch.id}`}{" "}
                                    (Avail: {batch.remaining_quantity}, Exp:{" "}
                                    {batch.expiry_date
                                      ? dayjs(batch.expiry_date).format(
                                          "YYYY-MM-DD"
                                        )
                                      : "N/A"}
                                    )
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      {t("inventory:batchSelectDesc")}
                    </FormDescription>
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Quantity Change */}
              <FormField
                control={control}
                name="quantity_change"
                render={({ field, fieldState }) => (
                  <FormItem>
                    {" "}
                    <FormLabel>
                      {t("inventory:quantityChange")}{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>{" "}
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="+10 or -5"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>{" "}
                    <FormDescription>
                      {t("inventory:quantityChangeDesc")}
                    </FormDescription>{" "}
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>{" "}
                  </FormItem>
                )}
              />

              {/* Reason Select */}
              <FormField
                control={control}
                name="reason"
                render={({ field, fieldState }) => (
                  <FormItem>
                    {" "}
                    <FormLabel>
                      {t("inventory:reasonLabel")}{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>{" "}
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      {" "}
                      <FormControl>
                        <SelectTrigger>
                          {" "}
                          <SelectValue
                            placeholder={t("inventory:reasonSelectPlaceholder")}
                          />{" "}
                        </SelectTrigger>
                      </FormControl>{" "}
                      <SelectContent>
                        {" "}
                        {adjustmentReasons.map((reasonKey) => (
                          <SelectItem key={reasonKey} value={reasonKey}>
                            {t(`inventory:reason_${reasonKey}`)}
                          </SelectItem>
                        ))}{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>{" "}
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={control}
                name="notes"
                render={({ field, fieldState }) => (
                  <FormItem>
                    {" "}
                    <FormLabel>{t("inventory:notesLabel")}</FormLabel>{" "}
                    <FormControl>
                      <Textarea
                        placeholder={t("inventory:notesPlaceholder")}
                        className="resize-y min-h-[80px]"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>{" "}
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>{" "}
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="p-6 pt-4 border-t dark:border-gray-700">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSubmitting}>
                  {t("common:cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {" "}
                {isSubmitting && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}{" "}
                {t("inventory:submitAdjustment")}{" "}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StockAdjustmentFormModal;
