// src/components/purchases/PurchaseItemRow.tsx
import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Calendar as CalendarIcon,
  Trash2,
} from "lucide-react";

// Types
import { Product } from "../../services/productService"; // Assuming Product type is exported
import { formatCurrency, formatNumber } from "@/constants"; // Your formatter
import { PurchaseFormValues } from "@/pages/PurchaseFormPage";

interface PurchaseItemRowProps {
  index: number;
  remove: (index: number) => void;
  products: Product[];
  loadingProducts: boolean;
  productSearchInput: string;
  onProductSearchInputChange: (value: string) => void;
  isSubmitting: boolean;
  itemCount: number;
}

// Type for a single item in the PurchaseFormValues
export type PurchaseItemFormValues = {
  id?: number | null;
  product_id: number;
  product?: Product; // Full selected product object (includes UOM info)
  batch_number?: string | null;
  quantity: number; // Quantity of STOCKING UNITS (e.g., boxes)
  unit_cost: number; // Cost per STOCKING UNIT (e.g., per box)
  sale_price?: number | null; // Intended sale price PER SELLABLE UNIT
  expiry_date?: Date | null;
  // Display only, calculated:
  total_sellable_units_display?: number;
  cost_per_sellable_unit_display?: number;
};
export const PurchaseItemRow: React.FC<PurchaseItemRowProps> = ({
  index,
  remove,
  products,
  loadingProducts,
  productSearchInput,
  onProductSearchInputChange,
  isSubmitting,
  itemCount,
}) => {
  const { t } = useTranslation([
    "purchases",
    "common",
    "products",
    "validation",
  ]);
  const { control, watch, setValue } = useFormContext<PurchaseFormValues>(); // Get methods from parent Form context
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

  // Watch fields for this item row
  const selectedProduct = watch(`items.${index}.product`) as
    | Product
    | undefined; // Get the full product object
  const quantityOfStockingUnits = watch(`items.${index}.quantity`);
  const costPerStockingUnit = watch(`items.${index}.unit_cost`);

  // Calculate display values
  const unitsPerStocking = selectedProduct?.units_per_stocking_unit || 1;
  const totalSellableUnitsDisplay =
    (Number(quantityOfStockingUnits) || 0) * unitsPerStocking;
  const costPerSellableUnitDisplay =
    unitsPerStocking > 0
      ? (Number(costPerStockingUnit) || 0) / unitsPerStocking
      : 0;
  const itemTotalCost =
    (Number(quantityOfStockingUnits) || 0) * (Number(costPerStockingUnit) || 0);

  useEffect(() => {
    // Update display fields if product or its UOM factor changes
    setValue(
      `items.${index}.total_sellable_units_display`,
      totalSellableUnitsDisplay,
      { shouldValidate: false }
    );
    setValue(
      `items.${index}.cost_per_sellable_unit_display`,
      costPerSellableUnitDisplay,
      { shouldValidate: false }
    );
  }, [totalSellableUnitsDisplay, costPerSellableUnitDisplay, index, setValue]);

  const handleProductSelect = (product: Product) => {
    setValue(`items.${index}.product_id`, product.id, { shouldValidate: true });
    setValue(`items.${index}.product`, product); // Store full product object
    // Clear cost fields if product changes, or auto-fill based on last purchase (more complex)
    setValue(`items.${index}.unit_cost`, product.latest_cost_per_sellable_unit, { shouldValidate: true }); // Or product.latest_purchase_cost_per_stocking_unit if you track that
    setValue(
      `items.${index}.sale_price`,
      product.suggested_sale_price_per_sellable_unit || null,
      { shouldValidate: true }
    ); // Suggest sale price per sellable unit
    setProductPopoverOpen(false);
    // onProductSearchInputChange(''); // Optionally clear parent search
  };

  return (
    <Card className="p-4 dark:bg-gray-800 border dark:border-gray-700 relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => remove(index)}
        disabled={isSubmitting || itemCount <= 1}
        aria-label={t("purchases:remove") || "Remove"}
        className="absolute top-2 end-2 h-7 w-7 text-muted-foreground hover:text-red-500 disabled:text-gray-300 dark:disabled:text-gray-600"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-6">
        {/* Added pt for remove button */}
        {/* Product Combobox (lg:col-span-3) */}
        <FormField
          control={control}
          name={`items.${index}.product_id`}
          render={({ field, fieldState }) => (
            <FormItem className="lg:col-span-3 flex flex-col">
              <FormLabel>
                {t("purchases:product")} <span className="text-red-500">*</span>
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
                      {selectedProduct?.name ??
                        (field.value && field.value !== 0
                          ? `ID: ${field.value}`
                          : t("purchases:selectProductPlaceholder"))}
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
                    />
                    <CommandList>
                      {loadingProducts && (
                        <div className="p-2 text-center text-sm">
                          <Loader2 className="inline me-2 h-4 w-4 animate-spin" />
                          {t("common:loading")}...
                        </div>
                      )}
                      {!loadingProducts &&
                        products.length === 0 &&
                        productSearchInput && (
                          <CommandEmpty>{t("common:noResults")}</CommandEmpty>
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
                              onSelect={() => handleProductSelect(product)}
                            >
                              
                              <Check
                                className={cn(
                                  "me-2 h-4 w-4",
                                  product.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {product.name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({product.sku || "N/A"})
                              </span>
                            </CommandItem>
                          ))}
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
        {/* Batch Number */}
        <FormField
          control={control}
          name={`items.${index}.batch_number`}
          render={({ field, fieldState }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>{t("purchases:batchNumber")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("purchases:batchNumberPlaceholder")}
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Quantity (of Stocking Units) (lg:col-span-1) */}
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem className="lg:col-span-2">
              <FormLabel>
                {t("purchases:quantityStocking", {
                  unit: selectedProduct?.stocking_unit_name || t("common:unit"),
                })}
                *
              </FormLabel>
              {/* Add key */}
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
        {/* Unit Cost (per Stocking Unit) (lg:col-span-2) */}
        <FormField
          control={control}
          name={`items.${index}.unit_cost`}
          render={({ field }) => (
            <FormItem className="lg:col-span-2">
              <FormLabel>
                {t("purchases:unitCostStocking", {
                  unit: selectedProduct?.stocking_unit_name || t("common:unit"),
                })}
                *
              </FormLabel>
              {/* Add key */}
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
        {/* Total Sellable Units Display (lg:col-span-1) */}
        <FormItem className="lg:col-span-2">
          <FormLabel className="text-xs text-muted-foreground">
            {t("purchases:totalSellableUnits")}
          </FormLabel>
          {/* Add key */}
          <div className="px-3 py-2 h-9 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600">
            {formatNumber(totalSellableUnitsDisplay)}
            {selectedProduct?.sellable_unit_name || t("common:items")}
          </div>
        </FormItem>
        {/* Intended Sale Price (per Sellable Unit) (lg:col-span-2) */}
        <FormField
          control={control}
          name={`items.${index}.sale_price`}
          render={({ field }) => (
            <FormItem className="lg:col-span-3">
              <FormLabel>
                {t("purchases:intendedSalePricePerSellable", {
                  unit: selectedProduct?.sellable_unit_name || t("common:item"),
                })}
              </FormLabel>
              {/* Add key */}
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
        {/* Expiry Date (lg:col-span-2) */}
        <FormField
          control={control}
          name={`items.${index}.expiry_date`}
          render={({ field }) => (
            <FormItem className="lg:col-span-2 flex flex-col">
              
              <FormLabel>{t("purchases:expiryDate")}</FormLabel>
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
                        <span>{t("common:pickDate")}</span>
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
                      date <
                        new Date(
                          new Date().setDate(new Date().getDate() - 1)
                        ) || isSubmitting
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Item Total Cost (lg:col-span-2) */}
        <div className="lg:col-span-2 flex items-end justify-end pb-1 text-gray-700 dark:text-gray-300 md:pt-6">
          <div className="w-full text-right">
            <p className="text-xs text-muted-foreground hidden md:block">
              {t("purchases:itemTotalCost")}
            </p>
            {/* Add key */}
            <p className="text-sm font-medium">{formatNumber(itemTotalCost)}</p>
          </div>
        </div>
        {/* Empty div for remove button alignment (or adjust grid spans) */}
        {/* <div className="md:col-span-1"></div> */}
      </div>
    </Card>
  );
};
