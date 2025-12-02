// src/components/inventory/StockAdjustmentFormModal.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  AlertTitle,
  CircularProgress,
  Autocomplete,
} from "@mui/material";

// Icons
import CheckIcon from "@mui/icons-material/Check";

// Services and Types
import stockAdjustmentService, {
  CreateStockAdjustmentData,
} from "../../services/stockAdjustmentService";
import productService, { Product } from "../../services/productService";
import { PurchaseItem } from "../../services/purchaseService";
import apiClient from "@/lib/axios";
import dayjs from "dayjs";

// --- Zod Schema with Arabic messages ---
const adjustmentReasons = [
  { value: "stock_take", label: "جرد المخزون" },
  { value: "damaged", label: "تلف" },
  { value: "lost", label: "فقدان" },
  { value: "found", label: "اكتشاف" },
  { value: "initial_stock", label: "مخزون ابتدائي" },
  { value: "other", label: "أخرى" },
] as const;

const adjustmentFormSchema = z.object({
  product_id: z
    .number({ required_error: "يرجى اختيار منتج" })
    .positive({ message: "يرجى اختيار منتج صحيح" }),
  selected_product_name: z.string().optional(),
  purchase_item_id: z.number().positive().nullable().optional(),
  selected_batch_info: z.string().nullable().optional(),
  quantity_change: z.coerce
    .number({
      required_error: "هذا الحقل مطلوب",
      invalid_type_error: "يجب أن يكون رقماً صحيحاً",
    })
    .int({ message: "يجب أن يكون رقماً صحيحاً" })
    .refine((val) => val !== 0, { message: "يجب أن تكون القيمة غير صفر" }),
  reason: z.string().min(1, { message: "هذا الحقل مطلوب" }),
  notes: z.string().nullable().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

// --- Component Props ---
interface StockAdjustmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedProduct?: Product) => void;
}

// --- Component ---
const StockAdjustmentFormModal: React.FC<StockAdjustmentFormModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  // State for async data
  const [products, setProducts] = useState<Product[]>([]);
  const [availableBatches, setAvailableBatches] = useState<PurchaseItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Search States
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);

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
    formState: { isSubmitting },
    setError,
    setValue,
  } = form;

  const selectedProductId = watch("product_id");

  // --- Fetch Products (Debounced) ---
  const fetchProducts = useCallback(async (search: string) => {
    if (!search && products.length > 0 && !productSearchInput) return;
    setLoadingProducts(true);
    try {
      const response = await productService.getProductsForAutocomplete(search, 20);
      setProducts(response);
    } catch (error) {
      toast.error("خطأ", {
        description: productService.getErrorMessage(error),
      });
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [products.length, productSearchInput]);

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
      product_id: data.product_id!,
      purchase_item_id: data.purchase_item_id ?? null,
      quantity_change: Number(data.quantity_change),
      reason: data.reason,
      notes: data.notes || null,
    };
    try {
      const result = await stockAdjustmentService.createAdjustment(apiData);
      toast.success("نجح", {
        description: "تم حفظ التعديل بنجاح",
      });
      onSaveSuccess(result.product);
      onClose();
    } catch (err) {
      console.error("Failed to save stock adjustment:", err);
      const generalError = stockAdjustmentService.getErrorMessage(err);
      const apiErrors = stockAdjustmentService.getValidationErrors(err);
      toast.error("خطأ", { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          setError(field as keyof AdjustmentFormValues, {
            type: "server",
            message: Array.isArray(messages) ? messages[0] : messages,
          });
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle sx={{ direction: "rtl" }}>
          إضافة تعديل مخزون
        </DialogTitle>
        <DialogContent sx={{ direction: "rtl" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
            {serverError && !isSubmitting && (
              <Alert severity="error">
                <AlertTitle>خطأ</AlertTitle>
                {serverError}
              </Alert>
            )}

            {/* Product Selection */}
            <Controller
              control={control}
              name="product_id"
              render={({ field, fieldState }) => (
                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => `${option.name}${option.sku ? ` (${option.sku})` : ''}`}
                  loading={loadingProducts}
                  onInputChange={(_, newInputValue) => {
                    setProductSearchInput(newInputValue);
                  }}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      field.onChange(newValue.id);
                      setValue("selected_product_name", `${newValue.name} (${newValue.sku || "بدون SKU"})`);
                    } else {
                      field.onChange(undefined);
                      setValue("selected_product_name", "");
                    }
                  }}
                  value={products.find(p => p.id === field.value) || null}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="المنتج"
                      placeholder="ابحث عن منتج..."
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message || ""}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingProducts ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                        {field.value === option.id && (
                          <CheckIcon fontSize="small" color="primary" />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2">{option.name}</Typography>
                          {option.sku && (
                            <Typography variant="caption" color="text.secondary">
                              SKU: {option.sku}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )}
                  noOptionsText={productSearchInput ? "لا توجد نتائج" : "اكتب للبحث عن منتج"}
                />
              )}
            />

            {/* Batch Selection (Optional) */}
            <Controller
              control={control}
              name="purchase_item_id"
              render={({ field }) => (
                <Autocomplete
                  options={[
                    { id: null, label: "تعديل المخزون الإجمالي", isTotal: true },
                    ...availableBatches.map(batch => ({
                      id: batch.id,
                      label: `${batch.batch_number || `ID: ${batch.id}`} (متوفر: ${batch.remaining_quantity}, انتهاء: ${batch.expiry_date ? dayjs(batch.expiry_date).format("YYYY-MM-DD") : "N/A"})`,
                      batch,
                    })),
                  ]}
                  getOptionLabel={(option) => option.label}
                  loading={loadingBatches}
                  disabled={!selectedProductId || loadingBatches || availableBatches.length === 0}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      if (newValue.isTotal) {
                        field.onChange(null);
                        setValue("selected_batch_info", "تعديل المخزون الإجمالي");
                      } else {
                        field.onChange(newValue.id);
                        setValue("selected_batch_info", newValue.label);
                      }
                    } else {
                      field.onChange(null);
                      setValue("selected_batch_info", null);
                    }
                  }}
                  value={
                    field.value === null
                      ? { id: null, label: "تعديل المخزون الإجمالي", isTotal: true }
                      : availableBatches.find(b => b.id === field.value)
                        ? {
                            id: field.value,
                            label: (() => {
                              const batch = availableBatches.find(b => b.id === field.value);
                              return `${batch?.batch_number || `ID: ${batch?.id}`} (متوفر: ${batch?.remaining_quantity}, انتهاء: ${batch?.expiry_date ? dayjs(batch.expiry_date).format("YYYY-MM-DD") : "N/A"})`;
                            })(),
                            batch: availableBatches.find(b => b.id === field.value),
                          }
                      : null
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="اختيار الدفعة (اختياري)"
                      placeholder={loadingBatches ? "جاري التحميل..." : "اختر دفعة أو اتركه لتعديل المخزون الإجمالي"}
                      helperText="اختر دفعة محددة أو اتركه فارغاً لتعديل المخزون الإجمالي"
                    />
                  )}
                  noOptionsText="لا توجد دفعات متاحة لهذا المنتج"
                />
              )}
            />

            {/* Quantity Change */}
            <Controller
              control={control}
              name="quantity_change"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  type="number"
                  label="التغيير في الكمية"
                  placeholder="+10 أو -5"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message || "أدخل قيمة موجبة لزيادة المخزون أو سالبة لتقليله"}
                  disabled={isSubmitting}
                  fullWidth
                />
              )}
            />

            {/* Reason Select */}
            <Controller
              control={control}
              name="reason"
              render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error}>
                  <InputLabel>السبب</InputLabel>
                  <Select
                    {...field}
                    label="السبب"
                    disabled={isSubmitting}
                  >
                    {adjustmentReasons.map((reason) => (
                      <MenuItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {fieldState.error.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />

            {/* Notes */}
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="ملاحظات (اختياري)"
                  placeholder="أضف أي ملاحظات إضافية..."
                  multiline
                  rows={3}
                  disabled={isSubmitting}
                  fullWidth
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl", px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ التعديل"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockAdjustmentFormModal;
