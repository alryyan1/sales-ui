// src/components/inventory/requisitions/RequisitionItemProcessingRow.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";

// Types
import { Product } from "../../../services/productService";
import { PurchaseItem } from "../../../services/purchaseService"; // Batch type
import { StockRequisitionItem as OriginalRequisitionItem } from "../../../services/stockRequisitionService"; // Type for original item
import { formatNumber, formatDate, formatCurrency } from "@/constants";
import apiClient from "@/lib/axios";

interface RequisitionItemProcessingRowProps {
  index: number;
  originalItem: OriginalRequisitionItem; // Pass the original requested item data
  isSubmitting: boolean;
  // product: Product; // Product details for this item (already on originalItem.product)
}

// Type for this specific item in RHF
type ProcessItemFormValues = {
  id: number;
  product_id: number;
  product_name_display?: string;
  requested_quantity: number;
  issued_quantity: number;
  issued_from_purchase_item_id?: number | null;
  selected_batch_info?: string | null;
  available_batch_stock?: number;
  status: "pending" | "issued" | "rejected_item";
  item_notes?: string | null;
};

export const RequisitionItemProcessingRow: React.FC<
  RequisitionItemProcessingRowProps
> = ({ index, originalItem, isSubmitting }) => {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<any>(); // Use any for parent form type

  const [itemBatches, setItemBatches] = useState<PurchaseItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchPopoverOpen, setBatchPopoverOpen] = useState(false);

  const itemStatus = watch(`items.${index}.status`);
  const selectedBatchId = watch(`items.${index}.issued_from_purchase_item_id`);
  const availableStockForSelectedBatch = watch(
    `items.${index}.available_batch_stock`
  );

  // Fetch batches when product_id is available and item is not rejected
  useEffect(() => {
    const fetchBatches = async (productId: number) => {
      if (!productId || itemStatus === "rejected_item") {
        setItemBatches([]);
        return;
      }
      setLoadingBatches(true);
      try {
        const response = await apiClient.get<{ data: PurchaseItem[] }>(
          `/products/${productId}/available-batches`
        );
        setItemBatches(response.data.data ?? response.data);
      } catch (error) {
        console.error("Error fetching batches:", error);
        setItemBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };

    if (originalItem.product_id) {
      fetchBatches(originalItem.product_id);
    }
  }, [originalItem.product_id, itemStatus]); // Re-fetch if item status changes (e.g., from rejected to pending)

  const itemRHFerrors = errors.items?.[index] as any;

  return (
    <Card className="p-4 dark:bg-gray-800 border dark:border-gray-700">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold">
            {watch(`items.${index}.product_name_display`) ||
              originalItem.product?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            الكمية المطلوبة:{" "}
            {originalItem.requested_quantity}
          </p>
        </div>
        <FormField
          control={control}
          name={`items.${index}.status`}
          render={({ field }) => (
            <FormItem className="w-40">
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">
                    قيد الانتظار
                  </SelectItem>
                  <SelectItem value="issued">
                    صدر
                  </SelectItem>
                  <SelectItem value="rejected_item">
                    مرفوض
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      {itemStatus !== "rejected_item" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Batch Selection */}
          <FormField
            control={control}
            name={`items.${index}.issued_from_purchase_item_id`}
            render={({ field, fieldState }) => (
              <FormItem className="md:col-span-5 flex flex-col">
                <FormLabel>الإصدار من الدفعة*</FormLabel>
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
                          itemBatches.length === 0
                        }
                        className={cn(
                          "w-full justify-between text-start",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {loadingBatches ? (
                          <Loader2 className="h-4 w-4 animate-spin me-2" />
                        ) : (
                          watch(`items.${index}.selected_batch_info`) ||
                          "اختر الدفعة"
                        )}
                        <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                    <Command>
                      <CommandList>
                        {loadingBatches && (
                          <CommandEmpty>جاري التحميل...</CommandEmpty>
                        )}
                        {!loadingBatches && itemBatches.length === 0 && (
                          <CommandEmpty>
                            لا توجد دفعات متاحة
                          </CommandEmpty>
                        )}
                        {!loadingBatches && (
                          <CommandGroup>
                            {itemBatches.map((batch) => (
                              <CommandItem
                                key={batch.id}
                                value={String(batch.id)}
                                onSelect={() => {
                                  field.onChange(batch.id);
                                  setValue(
                                    `items.${index}.available_batch_stock`,
                                    batch.remaining_quantity
                                  );
                                  setValue(
                                    `items.${index}.selected_batch_info`,
                                    `${
                                      batch.batch_number || `ID:${batch.id}`
                                    } (Avail: ${
                                      batch.remaining_quantity
                                    }, Exp: ${
                                      batch.expiry_date
                                        ? formatDate(batch.expiry_date)
                                        : "N/A"
                                    })`
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
                                {batch.batch_number || `ID:${batch.id}`} (Avail:{" "}
                                {batch.remaining_quantity}, Exp:{" "}
                                {batch.expiry_date
                                  ? formatDate(batch.expiry_date)
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
                <FormMessage>
                  {fieldState.error?.message || itemRHFerrors?.issued_from_purchase_item_id?.message || null}
                </FormMessage>
              </FormItem>
            )}
          />

          {/* Issued Quantity */}
          <FormField
            control={control}
            name={`items.${index}.issued_quantity`}
            render={({ field: qtyField, fieldState: qtyFieldState }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>الكمية المصدرة*</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max={originalItem.requested_quantity}
                    step="1"
                    placeholder="0"
                    {...qtyField}
                    disabled={isSubmitting || !selectedBatchId}
                    className={cn(
                      (Number(qtyField.value) >
                        (availableStockForSelectedBatch ?? 0) ||
                        (itemRHFerrors?.issued_quantity &&
                          !qtyFieldState.error)) &&
                        "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                </FormControl>
                <FormMessage>
                  {qtyFieldState.error?.message || null}
                </FormMessage>
                {itemRHFerrors?.issued_quantity && !qtyFieldState.error && (
                  <p className="text-xs text-red-500 mt-1">
                    {itemRHFerrors.issued_quantity.message || "المخزون غير كافٍ"}
                  </p>
                )}
                {Number(qtyField.value) >
                  (availableStockForSelectedBatch ?? 0) &&
                  !qtyFieldState.error &&
                  !itemRHFerrors?.issued_quantity && (
                    <p className="text-xs text-orange-500 mt-1">
                      الكمية المصدرة تتجاوز المخزون المتاح في الدفعة
                    </p>
                  )}
              </FormItem>
            )}
          />
          {/* Item Notes by Manager */}
          <FormField
            control={control}
            name={`items.${index}.item_notes`}
            render={({ field }) => (
              <FormItem className="md:col-span-4">
                <FormLabel>ملاحظات معالجة العنصر</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[40px] text-xs"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      )}
      {itemStatus === "rejected_item" && (
        <FormField
          control={control}
          name={`items.${index}.item_notes`}
          render={({ field }) => (
            <FormItem className="mt-2">
              <FormLabel>سبب الرفض</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="أدخل سبب رفض هذا العنصر"
                  className="min-h-[40px] text-xs"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </Card>
  );
};
