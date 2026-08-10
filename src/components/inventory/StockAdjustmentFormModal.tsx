// src/components/inventory/StockAdjustmentFormModal.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
import { warehouseService, Warehouse } from "@/services/warehouseService"; // Import warehouse service
import { ProductImage } from "@/components/products/ProductImage";
import { useLanguage } from "@/context/LanguageContext";

function createAdjustmentFormSchema(t: (key: string) => string) {
  return z.object({
    warehouse_id: z.number({ required_error: t("warehouseRequired") }),
    product_id: z
      .number({ required_error: t("productRequired") })
      .positive({ message: t("validProductRequired") }),
    selected_product_name: z.string().optional(),
    purchase_item_id: z.number().positive().nullable().optional(),
    selected_batch_info: z.string().nullable().optional(),
    // We will split quantity handling into: adjustmentType ('add' | 'subtract') and numerical value
    quantity_value: z.coerce
      .number({
        required_error: t("fieldRequired"),
        invalid_type_error: t("mustBeInteger"),
      })
      .int({ message: t("mustBeInteger") })
      .positive({ message: t("valueMustBePositive") }),
    adjustment_type: z.enum(["add", "subtract"]),
    reason: z.string().min(1, { message: t("fieldRequired") }),
    notes: z.string().nullable().optional(),
  });
}

type AdjustmentFormValues = z.infer<ReturnType<typeof createAdjustmentFormSchema>>;

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
  const { direction } = useLanguage();
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");

  const adjustmentReasons = useMemo(
    () =>
      [
        { value: "stock_take", label: t("adjReason_stockTake") },
        { value: "damaged", label: t("adjReason_damaged") },
        { value: "lost", label: t("adjReason_lost") },
        { value: "found", label: t("adjReason_found") },
        { value: "initial_stock", label: t("adjReason_initialStock") },
        { value: "adjustment", label: t("adjReason_adjustment") },
        { value: "other", label: t("adjReason_other") },
      ] as const,
    [t]
  );

  const adjustmentFormSchema = useMemo(() => createAdjustmentFormSchema(t), [t]);

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

  // --- Fetch Products directly from API ---
  const fetchProducts = useCallback(async (search: string) => {
    setLoadingProducts(true);
    try {
      const response = await productService.getProductsForAutocomplete(
        search,
        50,
        selectedWarehouseId ?? undefined
      );
      setProducts(response);
    } catch (error) {
      console.error("Error searching products", error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedWarehouseId]);

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
      toast.success(tCommon("success"), {
        description: t("adjustmentSavedSuccess"),
      });
      onSaveSuccess(result.product);
      onClose();
    } catch (err) {
      console.error("Failed to save stock adjustment:", err);
      const generalError = stockAdjustmentService.getErrorMessage(err);
      const apiErrors = stockAdjustmentService.getValidationErrors(err);
      toast.error(tCommon("error"), { description: generalError });
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
        <DialogTitle sx={{ direction, fontWeight: "bold" }}>
          {t("addAdjustmentDialogTitle")}
        </DialogTitle>
        <DialogContent sx={{ direction }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
            {serverError && !isSubmitting && (
              <Alert severity="error">
                <AlertTitle>{tCommon("error")}</AlertTitle>
                {serverError}
              </Alert>
            )}

            {/* Warehouse Selection */}
            <Controller
              control={control}
              name="warehouse_id"
              render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error}>
                  <InputLabel>{t("warehouseLabel")}</InputLabel>
                  <Select
                    {...field}
                    label={t("warehouseLabel")}
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
                        `${newValue.name} (${newValue.sku || t("noSkuLabel")})`
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
                      label={t("productLabel")}
                      placeholder={t("searchProductPlaceholderShort")}
                      error={!!fieldState.error}
                      helperText={
                        !selectedWarehouseId
                          ? t("selectWarehouseFirstHint")
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
                          gap: 1.5,
                          width: "100%",
                        }}
                      >
                        <ProductImage
                          imageUrl={option.image_url}
                          productName={option.name}
                          size={32}
                        />
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
                    productSearchInput ? t("noResultsFound") : t("typeToSearchProduct")
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
                      label: t("totalStockAdjustmentFallback"),
                      isTotal: true,
                    },
                    ...availableBatches.map((batch) => ({
                      id: batch.id,
                      label: `${
                        batch.batch_number || `ID: ${batch.id}`
                      } (${t("expiryColonPrefix", {
                        date: batch.expiry_date
                          ? dayjs(batch.expiry_date).format("YYYY-MM-DD")
                          : "N/A",
                      })})`,
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
                          t("totalStockAdjustmentFallback")
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
                          label: t("totalStockAdjustmentFallback"),
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
                            } (${t("expiryColonPrefix", {
                              date: batch?.expiry_date
                                ? dayjs(batch.expiry_date).format("YYYY-MM-DD")
                                : "N/A",
                            })})`;
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
                      label={t("selectBatchLabel")}
                      placeholder={
                        loadingBatches
                          ? tCommon("loading")
                          : t("selectBatchOrLeaveEmpty")
                      }
                      helperText={t("selectBatchHelperText")}
                    />
                  )}
                  noOptionsText={t("noBatchesForProductWarehouse")}
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
                      <Typography fontWeight="bold">{tCommon("add")}</Typography>
                    </ToggleButton>
                    <ToggleButton value="subtract" sx={{ px: 3 }}>
                      <RemoveIcon sx={{ mr: 1 }} />
                      <Typography fontWeight="bold">{t("subtractToggleLabel")}</Typography>
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
                    label={t("quantityLabel")}
                    placeholder={t("quantityExamplePlaceholder")}
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
                  <InputLabel>{t("reasonColumn")}</InputLabel>
                  <Select {...field} label={t("reasonColumn")} disabled={isSubmitting}>
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
                  label={t("notesLabel")}
                  placeholder={t("notesPlaceholderShort")}
                  multiline
                  rows={3}
                  disabled={isSubmitting}
                  fullWidth
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ direction, px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            {tCommon("cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {isSubmitting ? t("savingEllipsis") : t("saveAdjustmentButton")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockAdjustmentFormModal;
