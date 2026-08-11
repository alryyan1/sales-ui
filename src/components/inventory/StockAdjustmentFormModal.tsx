// src/components/inventory/StockAdjustmentFormModal.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

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
import { useAuth } from "@/context/AuthContext";
import { warehouseService, Warehouse } from "@/services/warehouseService";
import { ProductImage } from "@/components/products/ProductImage";
import { useLanguage } from "@/context/LanguageContext";

const TOTAL_STOCK_OPTION_ID = "__total__";

function createAdjustmentFormSchema(t: (key: string) => string) {
  return z.object({
    warehouse_id: z.number({ required_error: t("warehouseRequired") }),
    product_id: z
      .number({ required_error: t("productRequired") })
      .positive({ message: t("validProductRequired") }),
    purchase_item_id: z.number().positive().nullable().optional(),
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

// A pseudo-option representing "adjust the product's total stock" rather than a specific batch.
interface BatchOption {
  id: number | typeof TOTAL_STOCK_OPTION_ID;
  label: string;
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
  const productRequestIdRef = useRef(0);
  const highlightedProductRef = useRef<Product | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // --- RHF Setup ---
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      warehouse_id: user?.warehouse_id || undefined,
      product_id: undefined,
      purchase_item_id: null,
      quantity_value: undefined,
      adjustment_type: "add",
      reason: "adjustment",
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
  const adjustmentType = watch("adjustment_type");
  const quantityValue = watch("quantity_value");

  // --- Fetch Warehouses (defaulting to "Main Warehouse" if the user has none assigned) ---
  useEffect(() => {
    if (isOpen) {
      setLoadingWarehouses(true);
      warehouseService
        .getAll()
        .then((data) => {
          setWarehouses(data);
          if (!user?.warehouse_id && data.length > 0) {
            const mainWarehouse =
              data.find((w) => w.name.trim().toLowerCase() === "main warehouse") ?? data[0];
            setValue("warehouse_id", mainWarehouse.id);
          }
        })
        .catch((err: unknown) => console.error("Failed to load warehouses", err))
        .finally(() => setLoadingWarehouses(false));
    }
  }, [isOpen, user?.warehouse_id, setValue]);

  // --- Fetch Products ---
  // Intentionally does NOT filter by warehouse stock — stock adjustments need to find any
  // product, including one being stocked into this warehouse for the first time.
  // selectedWarehouseId is only passed as stockWarehouseId to annotate the returned stock
  // quantity, it doesn't filter the result set.
  const fetchProducts = useCallback(
    async (search: string) => {
      const requestId = ++productRequestIdRef.current;
      setLoadingProducts(true);
      try {
        const response = await productService.getProductsForAutocomplete(
          search,
          50,
          undefined,
          selectedWarehouseId ?? undefined
        );
        // Discard results from a stale/out-of-order request — only the most recently
        // issued fetch is allowed to update the visible list and loading state.
        if (requestId !== productRequestIdRef.current) return;
        setProducts(response);
      } catch (error) {
        if (requestId !== productRequestIdRef.current) return;
        console.error("Error searching products", error);
        setProducts([]);
      } finally {
        if (requestId === productRequestIdRef.current) setLoadingProducts(false);
      }
    },
    [selectedWarehouseId]
  );

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
        return;
      }
      setLoadingBatches(true);
      try {
        const response = await apiClient.get<{ data: PurchaseItem[] }>(
          `/products/${productId}/available-batches`,
          {
            params: { warehouse_id: warehouseId },
          }
        );
        let batches = response.data.data ?? response.data;

        // Client-side filter fallback (if backend sends all batches and they have purchase relation loaded)
        batches = batches.filter((batch) => {
          const purchase = (batch as unknown as { purchase?: { warehouse_id?: number } })
            .purchase;
          if (purchase?.warehouse_id) {
            return Number(purchase.warehouse_id) === Number(warehouseId);
          }
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
        reason: "adjustment",
        notes: "",
        product_id: undefined,
        purchase_item_id: null,
      });
      setServerError(null);
      setProducts([]);
      setAvailableBatches([]);
      setProductSearchInput("");
    }
  }, [isOpen, reset, user?.warehouse_id]);

  // Moves focus to the quantity field right after a product is selected — the delay lets
  // the Autocomplete finish closing/updating before we steal focus from it.
  const focusQuantityField = () => {
    setTimeout(() => {
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }, 50);
  };

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
          setError(field as keyof AdjustmentFormValues, {
            type: "server",
            message: Array.isArray(messages) ? messages[0] : messages,
          });
        });
      }
    }
  };

  const signedPreview =
    typeof quantityValue === "number" && !Number.isNaN(quantityValue)
      ? adjustmentType === "add"
        ? quantityValue
        : -quantityValue
      : null;

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
                    value={field.value ?? ""}
                    label={t("warehouseLabel")}
                    disabled={isSubmitting || loadingWarehouses}
                    onChange={(e) => {
                      const warehouseId = Number(e.target.value);
                      field.onChange(warehouseId);
                      setValue("product_id", undefined as unknown as number);
                      setValue("purchase_item_id", null);
                    }}
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
                  options={products}
                  getOptionLabel={(option) =>
                    `${option.name}${option.sku ? ` (${option.sku})` : ""}`
                  }
                  loading={loadingProducts}
                  onInputChange={(_, newInputValue, reason) => {
                    // Only genuine typing should trigger a new search — MUI also fires this
                    // when it resets the input text to the selected option's label ("reset")
                    // or when the field is cleared ("clear"); reacting to those re-triggers a
                    // fetch whose response then resets the input again, looping forever.
                    if (reason === "input" || reason === "clear") {
                      setProductSearchInput(newInputValue);
                    }
                  }}
                  onChange={(_, newValue) => {
                    field.onChange(newValue ? newValue.id : undefined);
                    setValue("purchase_item_id", null);
                    if (newValue) focusQuantityField();
                  }}
                  value={products.find((p) => p.id === field.value) || null}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  autoHighlight
                  onHighlightChange={(_, option) => {
                    highlightedProductRef.current = option;
                  }}
                  // Attached on Autocomplete itself (not nested inside renderInput's
                  // TextField) — MUI wires its own Enter/arrow-key handling onto the actual
                  // <input> via params.inputProps, which takes precedence over a handler
                  // nested that deep, so a top-level TextField onKeyDown never fires.
                  onKeyDown={async (e) => {
                    if (e.key !== "Enter") return;

                    const term = productSearchInput.trim();
                    if (!term) return;

                    // Always prioritize an exact SKU match over whatever autoHighlight has
                    // highlighted, so typing/scanning a full SKU reliably selects that exact
                    // product instead of submitting the form or picking the wrong option.
                    const exactMatch = products.find(
                      (p) =>
                        p.sku != null &&
                        String(p.sku).trim().toLowerCase() === term.toLowerCase()
                    );
                    if (exactMatch) {
                      e.preventDefault();
                      e.stopPropagation();
                      field.onChange(exactMatch.id);
                      setValue("purchase_item_id", null);
                      focusQuantityField();
                      return;
                    }

                    // No exact SKU match among currently loaded options — if something is
                    // highlighted (typically from a name search), let native Enter select it.
                    if (highlightedProductRef.current) return;

                    // Otherwise (e.g. scanned faster than the debounce/options could load),
                    // force an immediate lookup for an exact SKU match.
                    e.preventDefault();
                    e.stopPropagation();
                    setLoadingProducts(true);
                    try {
                      const results = await productService.getProductsForAutocomplete(
                        term,
                        5,
                        undefined,
                        selectedWarehouseId ?? undefined
                      );
                      const match = results.find(
                        (p) =>
                          p.sku != null &&
                          String(p.sku).trim().toLowerCase() === term.toLowerCase()
                      );
                      setProducts(results);
                      if (match) {
                        field.onChange(match.id);
                        setValue("purchase_item_id", null);
                        focusQuantityField();
                      } else if (results.length === 0) {
                        toast.error(t("noResultsFound"));
                      }
                    } catch (error) {
                      console.error("Error searching products", error);
                    } finally {
                      setLoadingProducts(false);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("productLabel")}
                      placeholder={t("searchProductPlaceholderShort")}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message || ""}
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
              render={({ field }) => {
                const options: BatchOption[] = [
                  { id: TOTAL_STOCK_OPTION_ID, label: t("totalStockAdjustmentFallback") },
                  ...availableBatches.map((batch) => ({
                    id: batch.id,
                    label: `${batch.batch_number || `ID: ${batch.id}`} (${t(
                      "expiryColonPrefix",
                      {
                        date: batch.expiry_date
                          ? dayjs(batch.expiry_date).format("YYYY-MM-DD")
                          : "N/A",
                      }
                    )})`,
                  })),
                ];
                const currentValue =
                  options.find((o) => o.id === (field.value ?? TOTAL_STOCK_OPTION_ID)) ?? null;

                return (
                  <Autocomplete
                    options={options}
                    getOptionLabel={(option) => option.label}
                    loading={loadingBatches}
                    disabled={
                      !selectedProductId ||
                      loadingBatches ||
                      availableBatches.length === 0
                    }
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, newValue) => {
                      field.onChange(
                        !newValue || newValue.id === TOTAL_STOCK_OPTION_ID
                          ? null
                          : (newValue.id as number)
                      );
                    }}
                    value={currentValue}
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
                );
              }}
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

              {/* Absolute Quantity Value */}
              <Controller
                control={control}
                name="quantity_value"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    inputRef={quantityInputRef}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSubmit(onSubmit)();
                      }
                    }}
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
            {signedPreview !== null && (
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  mt: -2,
                  color: signedPreview >= 0 ? "success.main" : "error.main",
                }}
              >
                {signedPreview > 0 ? "+" : ""}
                {signedPreview}
              </Typography>
            )}

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
                  value={field.value ?? ""}
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
