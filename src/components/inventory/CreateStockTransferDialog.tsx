import React, { useEffect, useState, useMemo } from "react";
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
import stockTransferService from "@/services/stockTransferService";
import productService, { Product } from "@/services/productService";
import { toast } from "sonner";
import { ProductImage } from "@/components/products/ProductImage";

interface CreateStockTransferDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface ItemFormValue {
  product: Product | null;
  quantity: string;
}

interface TransferFormValues {
  from_warehouse_id: string;
  to_warehouse_id: string;
  transfer_date: string;
  notes: string;
  items: ItemFormValue[];
}

export function CreateStockTransferDialog({
  onSuccess,
  trigger,
}: CreateStockTransferDialogProps) {
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-item product options & loading state
  const [productOptions, setProductOptions] = useState<Product[][]>([[]]);
  const [productLoading, setProductLoading] = useState<boolean[]>([false]);

  const form = useForm<TransferFormValues>({
    defaultValues: {
      from_warehouse_id: "",
      to_warehouse_id: "",
      transfer_date: new Date().toISOString().split("T")[0],
      notes: "",
      items: [{ product: null, quantity: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const fromWarehouseId = form.watch("from_warehouse_id");

  const availableToWarehouses = useMemo(() => {
    if (!fromWarehouseId) return warehouses;
    return warehouses.filter((w) => w.id.toString() !== fromWarehouseId);
  }, [warehouses, fromWarehouseId]);

  // Load warehouses on open; reset on close
  useEffect(() => {
    if (open) {
      loadWarehouses();
    } else {
      form.reset({
        from_warehouse_id: "",
        to_warehouse_id: "",
        transfer_date: new Date().toISOString().split("T")[0],
        notes: "",
        items: [{ product: null, quantity: "" }],
      });
      setProductOptions([[]]);
      setProductLoading([false]);
    }
  }, [open]);

  // When source warehouse changes: reset all items & reload products
  useEffect(() => {
    form.setValue("items", [{ product: null, quantity: "" }]);
    setProductOptions([[]]);
    setProductLoading([false]);
    if (fromWarehouseId) {
      loadProductsForRow(0, "", fromWarehouseId);
    }
  }, [fromWarehouseId]);

  // Reset to_warehouse if it matches from_warehouse
  useEffect(() => {
    const toId = form.getValues("to_warehouse_id");
    if (fromWarehouseId && toId === fromWarehouseId) {
      form.setValue("to_warehouse_id", "");
    }
  }, [fromWarehouseId]);

  const loadWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      setWarehouses(await warehouseService.getAll());
    } catch {
      toast.error(t("failedToLoadWarehouses"));
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const loadProductsForRow = async (
    index: number,
    search: string,
    warehouseId?: string
  ) => {
    const wId = warehouseId ? parseInt(warehouseId) : undefined;
    setProductLoading((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    try {
      const data = await productService.getProductsForAutocomplete(
        search,
        25,
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
    append({ product: null, quantity: "" });
    const newIndex = fields.length;
    setProductOptions((prev) => [...prev, []]);
    setProductLoading((prev) => [...prev, false]);
    if (fromWarehouseId) {
      loadProductsForRow(newIndex, "", fromWarehouseId);
    }
  };

  const removeItem = (index: number) => {
    remove(index);
    setProductOptions((prev) => prev.filter((_, i) => i !== index));
    setProductLoading((prev) => prev.filter((_, i) => i !== index));
  };

  const getStockLabel = (p: Product): string => {
    const stock = p.current_stock_quantity ?? p.stock_quantity ?? 0;
    return `${p.name} ${t("stockColonSuffix", { stock })}`;
  };

  const onSubmit = async (values: TransferFormValues) => {
    if (values.from_warehouse_id === values.to_warehouse_id) {
      form.setError("to_warehouse_id", {
        type: "manual",
        message: t("sourceDestMustDiffer"),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await stockTransferService.create({
        from_warehouse_id: parseInt(values.from_warehouse_id),
        to_warehouse_id: parseInt(values.to_warehouse_id),
        transfer_date: values.transfer_date,
        notes: values.notes,
        items: values.items
          .filter((item) => item.product && item.quantity)
          .map((item) => ({
            product_id: item.product!.id,
            quantity: parseFloat(item.quantity),
          })),
      });
      toast.success(t("transferSuccess"));
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || t("failedToCreateTransfer"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || <Button variant="outlined">{t("newTransferButton")}</Button>}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t("createTransferTitle")}</DialogTitle>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              {/* Warehouses */}
              <Grid size={6}>
                <Controller
                  control={form.control}
                  name="from_warehouse_id"
                  rules={{ required: t("requiredField") }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label={t("fromWarehouseColumn")}
                      fullWidth
                      size="small"
                      error={!!form.formState.errors.from_warehouse_id}
                      helperText={form.formState.errors.from_warehouse_id?.message}
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
                  name="to_warehouse_id"
                  rules={{ required: t("requiredField") }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label={t("toWarehouseColumn")}
                      fullWidth
                      size="small"
                      error={!!form.formState.errors.to_warehouse_id}
                      helperText={
                        form.formState.errors.to_warehouse_id?.message ||
                        (!fromWarehouseId && t("selectSourceWarehouseFirst"))
                      }
                      disabled={loadingWarehouses || !fromWarehouseId}
                    >
                      {availableToWarehouses.map((w) => (
                        <MenuItem key={w.id} value={w.id.toString()}>
                          {w.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  {...form.register("transfer_date", { required: t("requiredField") })}
                  label={t("dateColumn")}
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  error={!!form.formState.errors.transfer_date}
                  helperText={form.formState.errors.transfer_date?.message}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  {...form.register("notes")}
                  label={t("notes")}
                  fullWidth
                  size="small"
                  placeholder={t("optionalPlaceholder")}
                />
              </Grid>

              {/* Items */}
              <Grid size={12}>
                <Divider sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t("productsColumn")}
                  </Typography>
                </Divider>

                {!fromWarehouseId && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    {t("selectSourceWarehouseToAddProducts")}
                  </Alert>
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
                            disabled={!fromWarehouseId}
                            getOptionLabel={getStockLabel}
                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                            value={f.value}
                            onChange={(_, val) => f.onChange(val)}
                            onInputChange={(_, value, reason) => {
                              if (reason === "input")
                                loadProductsForRow(index, value, fromWarehouseId);
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
                                label={t("productLabel")}
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

                    {/* Quantity */}
                    <Box sx={{ width: 120 }}>
                      <TextField
                        {...form.register(`items.${index}.quantity`, {
                          required: t("requiredField"),
                          min: { value: 0.01, message: "> 0" },
                        })}
                        label={t("quantityLabel")}
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
                  disabled={!fromWarehouseId}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                >
                  {t("addProductButton")}
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
              {t("transferStockButton")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
