// src/components/sales/SaleItemRow.tsx (or inline in SaleFormPage)
import React, { useState, useEffect, } from "react";
import { useFormContext, } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

// Types
import { Product } from "../../services/productService";
import { PurchaseItem } from "../../services/purchaseService"; // Assuming PurchaseItem type is exported
import { formatNumber } from "@/constants";
import apiClient from "@/lib/axios"; // For direct API call for batches
import dayjs from "dayjs";
import { all } from "axios";

interface SaleItemRowProps {
  index: number;
  remove: (index: number) => void;
  // Product search props (passed from parent SaleFormPage)
  allProducts: Product[]; // Full list of products for initial selection (or searched list)
  loadingAllProducts: boolean;
  productSearchInput: string;
  onProductSearchInputChange: (value: string) => void;
  isSubmitting: boolean;
  itemCount: number;
}

// Zod schema for one item in the Sale form


export const SaleItemRow: React.FC<SaleItemRowProps> = ({
  index,
  remove,
  allProducts,
  loadingAllProducts,
  productSearchInput,
  onProductSearchInputChange,
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
  } = useFormContext();
  console.log(allProducts,"allProducts");
  // State for this row's product and batch selection
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [batchPopoverOpen, setBatchPopoverOpen] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<PurchaseItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Watch fields for this item row
  const currentProductId = watch(`items.${index}.product_id`);
  const selectedBatchId = watch(`items.${index}.purchase_item_id`);
  console.log(selectedBatchId,"selectedBatchId");
  const quantity = watch(`items.${index}.quantity`);
  const unitPrice = watch(`items.${index}.unit_price`); // Price might be set by batch or editable
  const itemTotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const stockForSelectedBatch = watch(`items.${index}.available_stock`); // Stock of the selected batch
  // Fetch available batches when a product_id is selected or changes
  useEffect(() => {
    const fetchBatches = async (productId: number) => {
      if (!productId) {
        setAvailableBatches([]);
        setValue(`items.${index}.purchase_item_id`, null); // Clear selected batch
        setValue(`items.${index}.unit_price`, 0); // Clear price
        setValue(`items.${index}.available_stock`, undefined);
        setValue(`items.${index}.batch_number_display`, null);
        return;
      }
      setLoadingBatches(true);
      try {
        // Adjust API endpoint as needed
        const response = await apiClient.get<{ data: PurchaseItem[] }>(
          `/products/${productId}/available-batches`
        );
        setAvailableBatches(response.data.data ?? response.data); // Handle both {data:[]} and []
        console.log(
          `Batches for product ${productId}:`,
          response.data.data ?? response.data
        );
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
      setAvailableBatches([]); // Clear batches if no product selected
    }
  }, [currentProductId, index, setValue, t]);

  const handleProductSelect = (product: Product) => {
    setValue(`items.${index}.product_id`, product.id, { shouldValidate: true });
    setValue(`items.${index}.product`, product); // Store full product for display
    setValue(`items.${index}.purchase_item_id`, null); // Reset batch selection
    setValue(
      `items.${index}.unit_price`,
      Number(product.suggested_sale_price) || 0
    ); // Suggest price
    setValue(`items.${index}.available_stock`, undefined); // Will be set by batch
    setValue(`items.${index}.batch_number_display`, null);
    clearErrors(`items.${index}.product_id`); // Clear previous validation error
    setProductPopoverOpen(false);
    // onProductSearchInputChange(''); // Optionally clear parent search
  };

  const handleBatchSelect = (batch: PurchaseItem | null) => {
    if (batch) {
      setValue(`items.${index}.purchase_item_id`, batch.id, {
        shouldValidate: true,
      });
      setValue(
        `items.${index}.unit_price`,
        Number(batch.sale_price) ||
          Number(watch(`items.${index}.product`)?.suggested_sale_price) ||
          0,
        { shouldValidate: true }
      );
      setValue(`items.${index}.available_stock`, batch.remaining_quantity);
      setValue(
        `items.${index}.batch_number_display`,
        `${batch.batch_number || t("common:n/a")} (Exp: ${
          batch.expiry_date
            ? dayjs(batch.expiry_date).format("YYYY-MM-DD")
            : t("common:n/a")
        })`
      );
      clearErrors(`items.${index}.purchase_item_id`); // Clear previous validation error
    } else {
      setValue(`items.${index}.purchase_item_id`, null);
      setValue(`items.${index}.available_stock`, undefined);
      setValue(`items.${index}.batch_number_display`, null);
    }
    setBatchPopoverOpen(false);
  };

  const itemRHFerrors = errors.items?.[index] ;

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
                  if (!open) onProductSearchInputChange("");
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
                      {watch(`items.${index}.product`)?.name ??
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
                      value={productSearchInput}
                      onValueChange={onProductSearchInputChange}
                    //   disabled={loadingAllProducts}
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
                        productSearchInput && (
                          <CommandEmpty>{t("common:noResults")}</CommandEmpty>
                        )}
                      {!loadingAllProducts &&
                        allProducts.length === 0 &&
                        !productSearchInput && (
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
              <FormLabel>
                {t("sales:selectBatch")} <span className="text-red-500">*</span>
              </FormLabel>{" "}
              {/* Add key */}
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
                        availableBatches.length === 0
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
                          ? `Batch ID: ${field.value}`
                          : t("sales:selectBatchPlaceholder"))
                      )}{" "}
                      {/* Add key */}
                      <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                  <Command>
                    {/* No search input for batches in this example, shows all available */}
                    <CommandList>
                      {loadingBatches && (
                        <CommandEmpty>{t("common:loading")}...</CommandEmpty>
                      )}
                      {!loadingBatches && availableBatches.length === 0 && (
                        <CommandEmpty>
                          {t("sales:noBatchesAvailable")}
                        </CommandEmpty>
                      )}{" "}
                      {/* Add key */}
                      {!loadingBatches && (
                        <CommandGroup>
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
                              {batch.batch_number || t("common:n/a")} (Exp:{" "}
                              {batch.expiry_date
                                ? dayjs(batch.expiry_date).format("YYYY-MM-DD")
                                : t("common:n/a")}
                              , Avail: {batch.remaining_quantity}, Price:{" "}
                              {formatNumber(batch.sale_price)})
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

        {/* Quantity */}
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field, fieldState }) => (
            <FormItem className="md:col-span-1">
              <FormLabel>{t("sales:quantity")}*</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  {...field}
                  disabled={isSubmitting || !selectedBatchId}
                  className={cn(
                    (Number(field.value) >
                      (stockForSelectedBatch ?? Infinity) ||
                      (itemRHFerrors?.quantity && !fieldState.error)) &&
                      "border-red-500 focus-visible:ring-red-500"
                  )}
                />
              </FormControl>
              <FormMessage>
                {fieldState.error?.message ? t(fieldState.error.message) : null}
              </FormMessage>
              {itemRHFerrors?.quantity && !fieldState.error && (
                <p className="text-xs text-red-500 mt-1">
                  {itemRHFerrors.quantity.message
                    ? t(itemRHFerrors.quantity.message)
                    : t("sales:insufficientStock")}
                </p>
              )}
              {Number(field.value) > (stockForSelectedBatch ?? Infinity) &&
                !fieldState.error &&
                !itemRHFerrors?.quantity && (
                  <p className="text-xs text-orange-500 mt-1">
                    {t("sales:insufficientStock")}
                  </p>
                )}
            </FormItem>
          )}
        />

        {/* Unit Price (Potentially auto-filled by batch, but editable) */}
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
