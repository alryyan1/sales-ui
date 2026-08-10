import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Grid,
  Alert,
  Typography,
  IconButton,
  Divider,
  Autocomplete,
  Box,
} from "@mui/material";
import { Plus, Trash2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { warehouseService, Warehouse } from "@/services/warehouseService";
import transitOrderService from "@/services/transitOrderService";
import productService, { Product } from "@/services/productService";
import supplierService, { Supplier } from "@/services/supplierService";
import { toast } from "sonner";
import { ProductImage } from "@/components/products/ProductImage";

interface CreateTransitOrderDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface ItemFormValue {
  product: Product | null;
  quantity: string;
}

interface TransitOrderFormValues {
  warehouse_id: string;
  supplier: Supplier | null;
  order_date: string;
  eta_date: string;
  notes: string;
  items: ItemFormValue[];
}

const emptyItem: ItemFormValue = { product: null, quantity: "" };

export function CreateTransitOrderDialog({
  onSuccess,
  trigger,
}: CreateTransitOrderDialogProps) {
  const { t } = useTranslation("transitOrders");
  const { t: tCommon } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-item product options & loading state
  const [productOptions, setProductOptions] = useState<Product[][]>([[]]);
  const [productLoading, setProductLoading] = useState<boolean[]>([false]);
  const itemInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);

  const form = useForm<TransitOrderFormValues>({
    defaultValues: {
      warehouse_id: "",
      supplier: null,
      order_date: new Date().toISOString().split("T")[0],
      eta_date: new Date().toISOString().split("T")[0],
      notes: "",
      items: [emptyItem],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const warehouseId = form.watch("warehouse_id");
  const items = form.watch("items");

  // Load warehouses on open; reset on close
  useEffect(() => {
    if (open) {
      loadWarehouses();
      loadSuppliers("");
    } else {
      form.reset({
        warehouse_id: "",
        supplier: null,
        order_date: new Date().toISOString().split("T")[0],
        eta_date: new Date().toISOString().split("T")[0],
        notes: "",
        items: [emptyItem],
      });
      setProductOptions([[]]);
      setProductLoading([false]);
    }
  }, [open]);

  // Default destination warehouse to the "الدامر" branch once warehouses load
  useEffect(() => {
    if (open && warehouses.length && !form.getValues("warehouse_id")) {
      const damar = warehouses.find((w) => w.name.includes("الدامر"));
      form.setValue("warehouse_id", (damar ?? warehouses[0]).id.toString());
    }
  }, [open, warehouses]);

  // When destination warehouse changes: reload products (stock preview only, no filtering)
  useEffect(() => {
    if (warehouseId) {
      productOptions.forEach((_, index) => loadProductsForRow(index, "", warehouseId));
    }
  }, [warehouseId]);

  // Focus the newly added row's product field once it's rendered
  useEffect(() => {
    if (pendingFocusIndex !== null) {
      itemInputRefs.current[pendingFocusIndex]?.focus();
      setPendingFocusIndex(null);
    }
  }, [fields.length, pendingFocusIndex]);

  const loadWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      setWarehouses(await warehouseService.getAll());
    } catch {
      toast.error(t("failedToLoadWarehousesTO"));
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadSuppliers = async (search: string) => {
    try {
      setLoadingSuppliers(true);
      const response = await supplierService.getSuppliers(1, search);
      setSuppliers(response.data ?? []);
    } catch {
      toast.error(t("failedToLoadSuppliers"));
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadProductsForRow = async (
    index: number,
    search: string,
    stockWarehouseId?: string
  ) => {
    const wId = stockWarehouseId ? parseInt(stockWarehouseId) : undefined;
    setProductLoading((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    try {
      // No warehouseId filter arg: keep zero-stock products selectable.
      // stockWarehouseId only annotates current_stock_quantity for the preview.
      const data = await productService.getProductsForAutocomplete(
        search,
        25,
        undefined,
        wId
      );
      setProductOptions((prev) => {
        const next = [...prev];
        next[index] = data;
        return next;
      });
    } catch {
      // silent
    } finally {
      setProductLoading((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  };

  const addItem = () => {
    const newIndex = fields.length;
    append(emptyItem);
    setProductOptions((prev) => [...prev, []]);
    setProductLoading((prev) => [...prev, false]);
    loadProductsForRow(newIndex, "", warehouseId);
    setPendingFocusIndex(newIndex);
  };

  const removeItem = (index: number) => {
    remove(index);
    setProductOptions((prev) => prev.filter((_, i) => i !== index));
    setProductLoading((prev) => prev.filter((_, i) => i !== index));
    itemInputRefs.current.splice(index, 1);
  };

  const getStockLabel = (p: Product): string => {
    const stock = p.current_stock_quantity ?? p.stock_quantity ?? 0;
    return `${p.name} ${t("stockColonSuffix", { stock })}`;
  };

  const getCurrentStock = (index: number): number => {
    const item = items?.[index];
    return item?.product?.current_stock_quantity ?? item?.product?.stock_quantity ?? 0;
  };

  const getTotalStock = (index: number): number => {
    const qty = Number(items?.[index]?.quantity) || 0;
    return getCurrentStock(index) + qty;
  };

  const onSubmit = async (values: TransitOrderFormValues) => {
    try {
      setIsSubmitting(true);
      await transitOrderService.create({
        warehouse_id: parseInt(values.warehouse_id),
        supplier_id: values.supplier?.id ?? undefined,
        order_date: values.order_date || undefined,
        eta_date: values.eta_date || undefined,
        notes: values.notes || undefined,
        items: values.items
          .filter((item) => item.product && item.quantity)
          .map((item) => ({
            product_id: item.product!.id,
            quantity: parseFloat(item.quantity),
          })),
      });
      toast.success(t("orderCreatedSuccess"));
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || t("failedToCreateOrder"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || <Button variant="contained">{t("newTransitOrderButton")}</Button>}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t("createTransitOrderTitle")}</DialogTitle>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Controller
                  control={form.control}
                  name="warehouse_id"
                  rules={{ required: t("requiredField") }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label={t("destinationWarehouseColumn")}
                      fullWidth
                      size="small"
                      error={!!form.formState.errors.warehouse_id}
                      helperText={form.formState.errors.warehouse_id?.message}
                      disabled={loadingWarehouses}
                    >
                      {warehouses.map((w) => (
                        <MenuItem key={w.id} value={w.id.toString()}>
                          {w.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={6}>
                <Controller
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <Autocomplete
                      options={suppliers}
                      loading={loadingSuppliers}
                      getOptionLabel={(s) => s.name}
                      isOptionEqualToValue={(opt, val) => opt.id === val.id}
                      value={field.value}
                      onChange={(_, val) => field.onChange(val)}
                      onInputChange={(_, value, reason) => {
                        if (reason === "input") loadSuppliers(value);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t("supplierColumn")}
                          size="small"
                          placeholder={t("optionalPlaceholder")}
                          slotProps={{
                            input: {
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {loadingSuppliers && (
                                    <CircularProgress size={16} />
                                  )}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            },
                          }}
                        />
                      )}
                    />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  {...form.register("order_date", { required: t("requiredField") })}
                  label={t("orderDateColumn")}
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  error={!!form.formState.errors.order_date}
                  helperText={form.formState.errors.order_date?.message}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  {...form.register("eta_date")}
                  label={t("etaDateFieldLabel")}
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  {...form.register("notes")}
                  label={t("notesLabel")}
                  fullWidth
                  size="small"
                  placeholder={t("optionalPlaceholder")}
                />
              </Grid>

              {/* Items */}
              <Grid size={12}>
                <Divider sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t("itemsLabel")}
                  </Typography>
                </Divider>

                {!warehouseId && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    {t("selectWarehouseFirstToAddItems")}
                  </Alert>
                )}

                {warehouseId && (
                  <Box sx={{ display: "flex", gap: 1, mb: 0.5, px: 0.5 }}>
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{ width: 110 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {t("currentStockColumn")}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 100 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {t("enteredQuantityLabel")}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 110 }}>
                      <Typography variant="caption" color="primary.main" fontWeight={700}>
                        {t("totalCurrentPlusEnteredLabel")}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 36 }} />
                  </Box>
                )}

                {fields.map((field, index) => (
                  <Box
                    key={field.id}
                    sx={{ display: "flex", gap: 1, mb: 1, alignItems: "flex-start" }}
                  >
                    {/* Product Autocomplete */}
                    <Box sx={{ flex: 1 }}>
                      <Controller
                        control={form.control}
                        name={`items.${index}.product`}
                        rules={{ required: t("requiredField") }}
                        render={({ field: f, fieldState }) => (
                          <Autocomplete
                            options={productOptions[index] ?? []}
                            loading={productLoading[index]}
                            disabled={!warehouseId}
                            getOptionLabel={getStockLabel}
                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                            value={f.value}
                            onChange={(_, val) => f.onChange(val)}
                            onInputChange={(_, value, reason) => {
                              if (reason === "input")
                                loadProductsForRow(index, value, warehouseId);
                            }}
                            renderOption={(props, option) => (
                              <Box component="li" {...props} key={option.id}
                                sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75 }}
                              >
                                <ProductImage
                                  imageUrl={option.image_url}
                                  productName={option.name}
                                  size={30}
                                />
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>{option.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {getStockLabel(option).replace(option.name, "").trim()}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                inputRef={(el: HTMLInputElement | null) => {
                                  itemInputRefs.current[index] = el;
                                  const originalRef = params.inputRef as unknown as
                                    | ((instance: HTMLInputElement | null) => void)
                                    | React.MutableRefObject<HTMLInputElement | null>
                                    | undefined;
                                  if (typeof originalRef === "function") originalRef(el);
                                  else if (originalRef) originalRef.current = el;
                                }}
                                label={t("itemColumn")}
                                size="small"
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                                slotProps={{
                                  input: {
                                    ...params.InputProps,
                                    endAdornment: (
                                      <>
                                        {productLoading[index] && (
                                          <CircularProgress size={16} />
                                        )}
                                        {params.InputProps.endAdornment}
                                      </>
                                    ),
                                  },
                                }}
                              />
                            )}
                          />
                        )}
                      />
                    </Box>

                    {/* Current stock (read-only, for clarity) */}
                    <Box sx={{ width: 110 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={getCurrentStock(index)}
                        InputProps={{ readOnly: true }}
                        disabled
                      />
                    </Box>

                    {/* Quantity */}
                    <Box sx={{ width: 100 }}>
                      <TextField
                        {...form.register(`items.${index}.quantity`, {
                          required: t("requiredField"),
                          min: { value: 0.01, message: t("minQuantityValidation") },
                        })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addItem();
                          }
                        }}
                        type="number"
                        size="small"
                        fullWidth
                        error={!!form.formState.errors.items?.[index]?.quantity}
                        helperText={
                          form.formState.errors.items?.[index]?.quantity?.message
                        }
                        inputProps={{ step: "0.01", min: 0.01 }}
                      />
                    </Box>

                    {/* Total Stock preview (current + ordered), highlighted for clarity */}
                    <Box sx={{ width: 110 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={getTotalStock(index)}
                        InputProps={{ readOnly: true }}
                        sx={{
                          "& .MuiInputBase-input": {
                            fontWeight: 700,
                            color: "primary.main",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "primary.light",
                          },
                        }}
                      />
                    </Box>

                    {/* Remove row */}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeItem(index)}
                      disabled={fields.length === 1}
                      sx={{ mt: 0.5 }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                ))}

                <Button
                  size="small"
                  startIcon={<Plus size={16} />}
                  onClick={addItem}
                  disabled={!warehouseId}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                >
                  {t("addItemButton")}
                </Button>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpen(false)} color="inherit">
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Save size={18} />
                )
              }
            >
              {t("saveOrderButton")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
