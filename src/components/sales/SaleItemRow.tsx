// src/components/sales/SaleItemRow.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { format } from "date-fns"; // For formatting dates
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
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
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Trash2,
  PackageSearch,
} from "lucide-react";

// Types
import { Product } from "../../services/productService";
import { PurchaseItem as BatchType } from "../../services/purchaseService"; // Batch is essentially a PurchaseItem record
import { formatNumber, formatCurrency, formatDate } from "@/constants"; // Your formatter
import apiClient from "@/lib/axios"; // For direct API call for batches

interface SaleItemRowProps {
  index: number;
  remove: (index: number) => void; // Function from useFieldArray to remove this item
  // Product search props (passed from parent SaleFormPage -> SaleItemsList)
  allProducts: Product[]; // List of products to search from (parent manages this list)
  loadingAllProducts: boolean; // Loading state for the parent's product search
  productSearchInputForRow: string; // Search input specific to *this row's* product combobox trigger (if needed)
  onProductSearchInputChangeForRow: (value: string) => void; // Handler to update parent's search term
  isSubmitting: boolean; // Form submission state from parent
  itemCount: number; // Total number of items, to disable remove on last item
}

// This type should match the 'item' structure within SaleFormPage's Zod schema for 'items' array
type SaleItemFormValues = {
  id?: number | null;
  product_id: number | null; // Allow null for unselected
  product?: Product; // Full selected product object for display & unit info
  purchase_item_id?: number | null; // Selected Batch ID
  batch_number_display?: string | null; // For displaying selected batch info in trigger
  quantity: number | string; // RHF might handle as string initially
  unit_price: number | string; // RHF might handle as string initially
  available_stock?: number; // Remaining quantity of the SELECTED BATCH (in sellable units)
};

export const SaleItemRow: React.FC<SaleItemRowProps> = ({
  index,
  remove,
  allProducts,
  loadingAllProducts,
  productSearchInputForRow, // Use this if each row has independent search
  onProductSearchInputChangeForRow,
  isSubmitting,
  itemCount,
}) => {
  const { t } = useTranslation([
    "sales",
    "common",
    "products",
    "validation",
    "purchases",
  ]);
  const {
    control,
    watch,
    setValue,
    getFieldState,
    formState: { errors },
    clearErrors,
  } = useFormContext<any>(); // Use 'any' or the full form type

  // Local state for this row's popovers and fetched batches
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [batchPopoverOpen, setBatchPopoverOpen] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<BatchType[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Watch fields specific to this item row
  const currentProductId = watch(`items.${index}.product_id`);
  const selectedProductForDisplay = watch(`items.${index}.product`) as
    | Product
    | undefined;
  const quantity = watch(`items.${index}.quantity`);
  const unitPrice = watch(`items.${index}.unit_price`);
  const itemTotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const stockForSelectedBatch = watch(`items.${index}.available_stock`);

  // Fetch available batches when currentProductId changes
  useEffect(() => {
    const fetchBatches = async (productId: number) => {
      setLoadingBatches(true);
      setAvailableBatches([]); // Clear previous batches
      try {
        const response = await apiClient.get<{ data: BatchType[] }>(
          `/products/${productId}/available-batches`
        );
        setAvailableBatches(response.data.data ?? response.data);
      } catch (error) {
        toast.error(t("common:error"), {
          description: t("sales:errorFetchingBatches"),
        });
        setAvailableBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };

    if (currentProductId && currentProductId !== 0) {
      fetchBatches(currentProductId);
    } else {
      setAvailableBatches([]); // Clear if no product or product ID is 0/null
    }
    // When product changes, reset batch selection and related fields
    setValue(`items.${index}.purchase_item_id`, null);
    setValue(`items.${index}.batch_number_display`, null);
    setValue(
      `items.${index}.available_stock`,
      selectedProductForDisplay?.stock_quantity
    ); // Default to total product stock initially
  }, [
    currentProductId,
    index,
    setValue,
    t,
    selectedProductForDisplay?.stock_quantity,
  ]);

  const handleProductSelect = (product: Product) => {
    setValue(`items.${index}.product_id`, product.id, { shouldValidate: true });
    setValue(`items.${index}.product`, product); // Store full product object
    // Unit price logic depends on your business rule:
    // 1. From Product's suggested_sale_price (if available)
    // 2. Calculated from Product's latest_purchase_cost + markup
    // 3. Or wait for batch selection to set it from batch.sale_price
    const suggestedPrice = product.suggested_sale_price
      ? Number(product.suggested_sale_price)
      : product.latest_purchase_cost && product.units_per_stocking_unit
      ? (Number(product.latest_purchase_cost) /
          product.units_per_stocking_unit) *
        1.25
      : 0; // Example fallback
    setValue(
      `items.${index}.unit_price`,
      Number(suggestedPrice.toFixed(2)) || 0
    );
    clearErrors(`items.${index}.product_id`);
    setProductPopoverOpen(false);
    // onProductSearchInputChangeForRow(''); // Let parent decide if search should be cleared globally or per row
  };

  const handleBatchSelect = (batch: BatchType | null) => {
    if (batch) {
      setValue(`items.${index}.purchase_item_id`, batch.id, {
        shouldValidate: true,
      });
      // Prioritize batch's specific sale price, then product's suggested, then fallback
      const batchSalePrice = batch.sale_price ? Number(batch.sale_price) : null;
      const productSuggestedPrice =
        selectedProductForDisplay?.suggested_sale_price
          ? Number(selectedProductForDisplay.suggested_sale_price)
          : null;
      setValue(
        `items.${index}.unit_price`,
        batchSalePrice ?? productSuggestedPrice ?? 0,
        { shouldValidate: true }
      );
      setValue(`items.${index}.available_stock`, batch.remaining_quantity);
      setValue(
        `items.${index}.batch_number_display`,
        `${batch.batch_number || t("common:n/a")} (Exp: ${
          batch.expiry_date ? formatDate(batch.expiry_date) : t("common:n/a")
        })`
      );
      clearErrors(`items.${index}.purchase_item_id`);
    } else {
      // User selected "-- Sell from Total Stock --" or cleared selection
      setValue(`items.${index}.purchase_item_id`, null);
      setValue(
        `items.${index}.available_stock`,
        selectedProductForDisplay?.stock_quantity
      ); // Revert to total product stock
      setValue(`items.${index}.batch_number_display`, null);
      const suggestedPrice = selectedProductForDisplay?.suggested_sale_price
        ? Number(selectedProductForDisplay.suggested_sale_price)
        : 0;
      setValue(`items.${index}.unit_price`, suggestedPrice, {
        shouldValidate: true,
      });
    }
    setBatchPopoverOpen(false);
  };

  const itemRHFerrors = errors.items?.[index] as any; // For accessing nested field errors

  return (
    <Card className="p-4 dark:bg-gray-800 border dark:border-gray-700 relative shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => remove(index)}
        disabled={isSubmitting || itemCount <= 1}
        aria-label={t("sales:remove")}
        className="absolute top-2 end-2 h-7 w-7 text-muted-foreground hover:text-red-500 z-10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-3 items-start pt-6 md:pt-2">
        {/* Product Combobox */}
        <FormField
          control={control}
          name={`items.${index}.product_id`}
          render={({ field, fieldState }) => (
            <FormItem className="md:col-span-4 flex flex-col">
              <FormLabel>
                {t("sales:product")} <span className="text-red-500">*</span>
              </FormLabel>
              <Popover
                open={productPopoverOpen}
                onOpenChange={(open) => {
                  setProductPopoverOpen(open);
                  if (!open) onProductSearchInputChangeForRow("");
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
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {selectedProductForDisplay?.name ??
                        (field.value && field.value !== 0
                          ? `ID: ${field.value}`
                          : t("sales:selectProductPlaceholder"))}
                      <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t("products:searchPlaceholder")}
                      value={productSearchInputForRow}
                      onValueChange={onProductSearchInputChangeForRow}
                      disabled={loadingAllProducts || isSubmitting}
                    />
                    <CommandList>
                      {loadingAllProducts && (
                        <div className="p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />{" "}
                          {t("common:loading")}...
                        </div>
                      )}
                      {!loadingAllProducts &&
                        allProducts.length === 0 &&
                        productSearchInputForRow && (
                          <CommandEmpty>{t("common:noResults")}</CommandEmpty>
                        )}
                      {!loadingAllProducts &&
                        allProducts.length === 0 &&
                        !productSearchInputForRow && (
                          <CommandEmpty>
                            {t("products:typeToSearch")}
                          </CommandEmpty>
                        )}
                      {!loadingAllProducts && (
                        <CommandGroup>
                          {allProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.name} ${product.sku}`}
                              onSelect={() => handleProductSelect(product)}
                              disabled={
                                product.stock_quantity <= 0 &&
                                !(product.id === field.value)
                              }
                              className={cn(
                                product.stock_quantity <= 0 &&
                                  !(product.id === field.value) &&
                                  "opacity-50 cursor-not-allowed"
                              )}
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
                              </span>{" "}
                              <span
                                className={`ml-auto text-xs ${
                                  product.stock_quantity <= 0
                                    ? "text-red-500"
                                    : "text-green-600"
                                }`}
                              >
                                {t("inventory:currentStock")}:{" "}
                                {formatNumber(product.stock_quantity)}{" "}
                                {product.sellable_unit_name || ""}
                              </span>{" "}
                            </CommandItem>
                          ))}{" "}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage>
                {fieldState.error?.message ? t(fieldState.error.message) : null}
              </FormMessage>
            </FormItem>
          )}
        />

        {/* Batch Selection Combobox */}
        <FormField
          control={control}
          name={`items.${index}.purchase_item_id`}
          render={({ field, fieldState }) => (
            <FormItem className="md:col-span-3 flex flex-col">
              <FormLabel>{t("sales:selectBatch")}*</FormLabel>
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
                        loadingBatches ||
                        !currentProductId ||
                        (availableBatches.length === 0 && !loadingBatches)
                      }
                      className={cn(
                        "w-full justify-between text-start",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {loadingBatches ? (
                        <div className="flex items-center">
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />{" "}
                          {t("common:loading")}...
                        </div>
                      ) : (
                        watch(`items.${index}.batch_number_display`) ||
                        (field.value
                          ? `${t("purchases:batchId")}: ${field.value}`
                          : t("sales:selectBatchPlaceholder"))
                      )}
                      <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                  <Command>
                    <CommandList>
                      {loadingBatches && (
                        <CommandEmpty>{t("common:loading")}...</CommandEmpty>
                      )}
                      {!loadingBatches &&
                        availableBatches.length === 0 &&
                        currentProductId && (
                          <CommandEmpty>
                            {t("sales:noBatchesAvailable")}
                          </CommandEmpty>
                        )}
                      {!loadingBatches && !currentProductId && (
                        <CommandEmpty>
                          {t("sales:selectProductFirst")}
                        </CommandEmpty>
                      )}
                      {!loadingBatches && availableBatches.length > 0 && (
                        <CommandGroup>
                          {/* Option to sell from general stock if backend supports it as fallback */}
                          {/* <CommandItem key="total-stock-for-sale" onSelect={() => handleBatchSelect(null)}> {t('sales:sellFromTotalStock')} </CommandItem> */}
                          {availableBatches.map((batch) => (
                            <CommandItem
                              key={batch.id}
                              value={String(batch.id)}
                              onSelect={() => handleBatchSelect(batch)}
                            >
                              <Check
                                className={cn(
                                  "me-2 h-4 w-4",
                                  batch.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col text-xs leading-tight">
                                <span>
                                  {batch.batch_number || `ID: ${batch.id}`} (Av:{" "}
                                  {formatNumber(batch.remaining_quantity)})
                                </span>
                                <span className="text-muted-foreground">
                                  Exp:{" "}
                                  {batch.expiry_date
                                    ? formatDate(batch.expiry_date)
                                    : "N/A"}{" "}
                                  | Price:{" "}
                                  {batch.sale_price
                                    ? formatCurrency(batch.sale_price)
                                    : "N/A"}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage>
                {fieldState.error?.message
                  ? t(fieldState.error.message)
                  : itemRHFerrors?.purchase_item_id?.message
                  ? t(itemRHFerrors.purchase_item_id.message)
                  : null}
              </FormMessage>
            </FormItem>
          )}
        />

        {/* Quantity (in Sellable Units) */}
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field: qtyField, fieldState: qtyFieldState }) => (
            <FormItem className="md:col-span-1">
              {" "}
              {/* Adjusted span for more space */}
              <FormLabel>{t("sales:quantity")}*</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  {...qtyField}
                  disabled={isSubmitting }
                  className={cn(
                    (Number(qtyField.value) >
                      (stockForSelectedBatch ?? Infinity) ||
                      (itemRHFerrors?.quantity && !qtyFieldState.error)) &&
                      "border-red-500 focus-visible:ring-red-500"
                  )}
                />
              </FormControl>
              <FormMessage>
                {qtyFieldState.error?.message
                  ? t(qtyFieldState.error.message)
                  : null}
              </FormMessage>
              {/* Server-side stock error */}
              {itemRHFerrors?.quantity && !qtyFieldState.error && (
                <p className="text-xs text-red-500 mt-1">
                  {itemRHFerrors.quantity.message
                    ? t(itemRHFerrors.quantity.message)
                    : t("sales:insufficientStock")}
                </p>
              )}
              {/* Client-side stock warning */}
              {Number(qtyField.value) > (stockForSelectedBatch ?? Infinity) &&
                !qtyFieldState.error &&
                !itemRHFerrors?.quantity && (
                  <p className="text-xs text-orange-500 mt-1">
                    {t("sales:insufficientStockDetail", {
                      available: formatNumber(stockForSelectedBatch) ?? 0,
                    })}
                  </p>
                )}
            </FormItem>
          )}
        />

        {/* Unit Price (per Sellable Unit) */}
        <FormField
          control={control}
          name={`items.${index}.unit_price`}
          render={({ field, fieldState }) => (
            <FormItem className="md:col-span-2">
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
              <FormMessage>
                {fieldState.error?.message ? t(fieldState.error.message) : null}
              </FormMessage>
            </FormItem>
          )}
        />

        {/* Total Price (Display Only) */}
        <div className="md:col-span-2 flex items-end justify-end pb-1 text-gray-700 dark:text-gray-300 md:pt-6">
          <div className="w-full text-right">
            <p className="text-xs text-muted-foreground hidden md:block">
              {t("sales:totalPrice")}
            </p>
            <p className="text-sm font-medium">{formatNumber(itemTotal)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
