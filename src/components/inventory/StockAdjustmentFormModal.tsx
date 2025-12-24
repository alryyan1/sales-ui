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
  ToggleButton,
  ToggleButtonGroup,
  FormHelperText,
} from "@mui/material";

// Icons
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

// Services and Types
import stockAdjustmentService, {
  CreateStockAdjustmentData,
} from "../../services/stockAdjustmentService";
import productService, { Product } from "../../services/productService";
import { PurchaseItem } from "../../services/purchaseService";
import apiClient from "@/lib/axios";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";
import { offlineSaleService } from "@/services/offlineSaleService"; // Use offline service for cached products
import { warehouseService, Warehouse } from "@/services/warehouseService"; // Import warehouse service

// --- Zod Schema with Arabic messages ---
const adjustmentReasons = [
  { value: "stock_take", label: "جرد المخزون" },
  { value: "damaged", label: "تلف" },
  { value: "lost", label: "فقدان" },
  { value: "found", label: "اكتشاف" },
  { value: "initial_stock", label: "مخزون ابتدائي" },
  { value: "adjustment", label: "تعديل عادي" },
  { value: "other", label: "أخرى" },
] as const;

const adjustmentFormSchema = z.object({
  warehouse_id: z.number({ required_error: "يرجى اختيار المخزن" }),
  product_id: z
    .number({ required_error: "يرجى اختيار منتج" })
    .positive({ message: "يرجى اختيار منتج صحيح" }),
  selected_product_name: z.string().optional(),
  purchase_item_id: z.number().positive().nullable().optional(),
  selected_batch_info: z.string().nullable().optional(),
  // We will split quantity handling into: adjustmentType ('add' | 'subtract') and numerical value
  quantity_value: z.coerce
    .number({
      required_error: "هذا الحقل مطلوب",
      invalid_type_error: "يجب أن يكون رقماً صحيحاً",
    })
    .int({ message: "يجب أن يكون رقماً صحيحاً" })
    .positive({ message: "يجب أن تكون القيمة أكبر من صفر" }),
  adjustment_type: z.enum(["add", "subtract"]),
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
  const { user } = useAuth();

  // State for async data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableBatches, setAvailableBatches] = useState<PurchaseItem[]>([]);

  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
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
      warehouse_id: user?.warehouse_id || undefined,
      product_id: undefined,
      selected_product_name: "",
      purchase_item_id: null,
      selected_batch_info: null,
      quantity_value: undefined,
      adjustment_type: "add",
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

  const selectedWarehouseId = watch("warehouse_id");
  const selectedProductId = watch("product_id");

  // --- Fetch Warehouses ---
  useEffect(() => {
    if (isOpen) {
      setLoadingWarehouses(true);
      warehouseService
        .getAll()
        .then((data) => {
          setWarehouses(data);
          if (user?.warehouse_id && !selectedWarehouseId) {
            setValue("warehouse_id", user.warehouse_id);
          }
        })
        .catch((err: any) => console.error("Failed to load warehouses", err))
        .finally(() => setLoadingWarehouses(false));
    }
  }, [isOpen, user?.warehouse_id, setValue, selectedWarehouseId]);

  // --- Fetch Products (Cached / Debounced) ---
  const fetchProducts = useCallback(async (search: string) => {
    // If no warehouse selected, maybe don't search? Or search global?
    // Usually stock adjustment is warehouse specific.
    // Let's assume we can search all, but ideally we filter by warehouse if possible.
    // The cached search `offlineSaleService.searchProducts` returns all products.

    setLoadingProducts(true);
    try {
      // Use offline service for cached/fast search
      // Note: This returns all products in local DB.
      const response = await offlineSaleService.searchProducts(search);
      setProducts(response.slice(0, 50)); // Limit to 50 for performance
    } catch (error) {
      console.error("Error searching products", error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

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

  // --- Fetch Available Batches ---
  // Must filter by BOTH Product AND Warehouse
  const fetchBatchesForProduct = useCallback(
    async (
      productId: number | undefined | null,
      warehouseId: number | undefined
    ) => {
      if (!productId || !warehouseId) {
        setAvailableBatches([]);
        setValue("purchase_item_id", null);
        setValue("selected_batch_info", null);
        return;
      }
      setLoadingBatches(true);
      try {
        // We probably need a backend endpoint that filters by warehouse?
        // standard endpoint: `/products/${productId}/available-batches`
        // Does it accept warehouse_id param? If not, we might need to filter client side if the API returns warehouse info.
        // Assuming we update the API or use a param.
        // Let's pass `warehouse_id` as query param if the backend supports it.
        // If the backend `StockAdjustmentController` checks the batch warehouse, we should only show valid ones.

        const response = await apiClient.get<{ data: PurchaseItem[] }>(
          `/products/${productId}/available-batches`,
          {
            params: { warehouse_id: warehouseId },
          }
        );
        // If API doesn't support filtering, we must filter client side if `purchase.warehouse_id` is present.
        // Assuming data structure has it.
        let batches = response.data.data ?? response.data;

        // Client-side filter fallback (if backend sends all batches and they have purchase relation loaded)
        // Ideally backend does this.
        batches = batches.filter((batch) => {
          // @ts-ignore - checking if property exists
          if (batch.purchase && batch.purchase.warehouse_id) {
            // @ts-ignore
            return Number(batch.purchase.warehouse_id) === Number(warehouseId);
          }
          // If we can't verify, we might show it but backend will validte.
          return true;
        });

        setAvailableBatches(batches);
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
    fetchBatchesForProduct(selectedProductId, selectedWarehouseId);
  }, [selectedProductId, selectedWarehouseId, fetchBatchesForProduct]);

  // --- Effect to Reset Form on Open/Close ---
  useEffect(() => {
    if (isOpen) {
      reset({
        warehouse_id: user?.warehouse_id || undefined,
        quantity_value: undefined,
        adjustment_type: "add",
        reason: "",
        notes: "",
        product_id: undefined,
      });
      setServerError(null);
      setProducts([]);
      setAvailableBatches([]);
      setProductSearchInput("");
    }
  }, [isOpen, reset, user?.warehouse_id]);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<AdjustmentFormValues> = async (data) => {
    setServerError(null);

    // Calculate final Signed Quantity
    const signedQuantity =
      data.adjustment_type === "add"
        ? data.quantity_value
        : -data.quantity_value;

    const apiData: CreateStockAdjustmentData = {
      warehouse_id: data.warehouse_id,
      product_id: data.product_id!,
      purchase_item_id: data.purchase_item_id ?? null,
      quantity_change: signedQuantity,
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
          // Map backend field names if they differ
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
        <DialogTitle sx={{ direction: "rtl", fontWeight: "bold" }}>
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

            {/* Warehouse Selection */}
            <Controller
              control={control}
              name="warehouse_id"
              render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error}>
                  <InputLabel>المخزن</InputLabel>
                  <Select
                    {...field}
                    label="المخزن"
                    disabled={isSubmitting || loadingWarehouses}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {warehouses.map((wh) => (
                      <MenuItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <FormHelperText>{fieldState.error.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {/* Product Selection */}
            <Controller
              control={control}
              name="product_id"
              render={({ field, fieldState }) => (
                <Autocomplete
                  disabled={!selectedWarehouseId}
                  options={products}
                  getOptionLabel={(option) =>
                    `${option.name}${option.sku ? ` (${option.sku})` : ""}`
                  }
                  loading={loadingProducts}
                  onInputChange={(_, newInputValue) => {
                    setProductSearchInput(newInputValue);
                  }}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      field.onChange(newValue.id);
                      setValue(
                        "selected_product_name",
                        `${newValue.name} (${newValue.sku || "بدون SKU"})`
                      );
                    } else {
                      field.onChange(undefined);
                      setValue("selected_product_name", "");
                    }
                  }}
                  value={products.find((p) => p.id === field.value) || null}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="المنتج"
                      placeholder="ابحث عن منتج..."
                      error={!!fieldState.error}
                      helperText={
                        !selectedWarehouseId
                          ? "يرجى اختيار المخزن أولاً"
                          : fieldState.error?.message || ""
                      }
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingProducts ? (
                              <CircularProgress size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          width: "100%",
                        }}
                      >
                        {field.value === option.id && (
                          <CheckIcon fontSize="small" color="primary" />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2">{option.name}</Typography>
                          {option.sku && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              SKU: {option.sku}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )}
                  noOptionsText={
                    productSearchInput ? "لا توجد نتائج" : "اكتب للبحث عن منتج"
                  }
                />
              )}
            />

            {/* Batch Selection */}
            <Controller
              control={control}
              name="purchase_item_id"
              render={({ field }) => (
                <Autocomplete
                  options={[
                    {
                      id: null,
                      label: "تعديل المخزون الإجمالي",
                      isTotal: true,
                    },
                    ...availableBatches.map((batch) => ({
                      id: batch.id,
                      label: `${
                        batch.batch_number || `ID: ${batch.id}`
                      } (متوفر: ${batch.remaining_quantity}, انتهاء: ${
                        batch.expiry_date
                          ? dayjs(batch.expiry_date).format("YYYY-MM-DD")
                          : "N/A"
                      })`,
                      batch,
                    })),
                  ]}
                  getOptionLabel={(option) => option.label}
                  loading={loadingBatches}
                  disabled={
                    !selectedProductId ||
                    loadingBatches ||
                    availableBatches.length === 0
                  }
                  onChange={(_, newValue) => {
                    if (newValue) {
                      if (newValue.isTotal) {
                        field.onChange(null);
                        setValue(
                          "selected_batch_info",
                          "تعديل المخزون الإجمالي"
                        );
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
                      ? {
                          id: null,
                          label: "تعديل المخزون الإجمالي",
                          isTotal: true,
                        }
                      : availableBatches.find((b) => b.id === field.value)
                      ? {
                          id: field.value,
                          label: (() => {
                            const batch = availableBatches.find(
                              (b) => b.id === field.value
                            );
                            return `${
                              batch?.batch_number || `ID: ${batch?.id}`
                            } (متوفر: ${batch?.remaining_quantity}, انتهاء: ${
                              batch?.expiry_date
                                ? dayjs(batch.expiry_date).format("YYYY-MM-DD")
                                : "N/A"
                            })`;
                          })(),
                          batch: availableBatches.find(
                            (b) => b.id === field.value
                          ),
                        }
                      : null
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="اختيار الدفعة (اختياري)"
                      placeholder={
                        loadingBatches
                          ? "جاري التحميل..."
                          : "اختر دفعة أو اتركه لتعديل المخزون الإجمالي"
                      }
                      helperText="اختر دفعة محددة أو اتركه فارغاً لتعديل المخزون الإجمالي"
                    />
                  )}
                  noOptionsText="لا توجد دفعات متاحة لهذا المنتج في هذا المخزن"
                />
              )}
            />

            {/* Quantity Change Section */}
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              {/* Toggle Type (+ / -) */}
              <Controller
                control={control}
                name="adjustment_type"
                render={({ field }) => (
                  <ToggleButtonGroup
                    value={field.value}
                    exclusive
                    onChange={(_, newVal) => {
                      if (newVal) field.onChange(newVal);
                    }}
                    color={field.value === "add" ? "success" : "error"}
                    sx={{ height: 56 }}
                  >
                    <ToggleButton value="add" sx={{ px: 3 }}>
                      <AddIcon sx={{ mr: 1 }} />
                      <Typography fontWeight="bold">إضافة</Typography>
                    </ToggleButton>
                    <ToggleButton value="subtract" sx={{ px: 3 }}>
                      <RemoveIcon sx={{ mr: 1 }} />
                      <Typography fontWeight="bold">خصم</Typography>
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              />

              {/* Abslute Quantity Value */}
              <Controller
                control={control}
                name="quantity_value"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="الكمية"
                    placeholder="مثال: 5"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={isSubmitting}
                    sx={{ flex: 1 }}
                  />
                )}
              />
            </Box>

            {/* Reason Select */}
            <Controller
              control={control}
              name="reason"
              render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error}>
                  <InputLabel>السبب</InputLabel>
                  <Select {...field} label="السبب" disabled={isSubmitting}>
                    {adjustmentReasons.map((reason) => (
                      <MenuItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldState.error && (
                    <FormHelperText>{fieldState.error.message}</FormHelperText>
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
