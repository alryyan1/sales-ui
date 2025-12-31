import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
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
  Typography,
  Alert,
} from "@mui/material";

// Services
import { warehouseService, Warehouse } from "@/services/warehouseService";
import stockTransferService, {
  CreateStockTransferData,
} from "@/services/stockTransferService";
import { Product } from "@/services/productService";
import { offlineSaleService } from "@/services/offlineSaleService";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface CreateStockTransferDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface TransferFormValues {
  from_warehouse_id: string;
  to_warehouse_id: string;
  product_id: string;
  quantity: string;
  transfer_date: string;
  notes: string;
}

export function CreateStockTransferDialog({
  onSuccess,
  trigger,
}: CreateStockTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TransferFormValues>({
    defaultValues: {
      from_warehouse_id: "",
      to_warehouse_id: "",
      product_id: "",
      quantity: "",
      transfer_date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  // Watch form values for filtering
  const fromWarehouseId = form.watch("from_warehouse_id");
  const selectedProductId = form.watch("product_id");
  const transferQuantity = form.watch("quantity");

  // Filter warehouses: exclude selected "from" warehouse from "to" list
  const availableToWarehouses = useMemo(() => {
    if (!fromWarehouseId) return warehouses;
    return warehouses.filter(
      (w) => w.id.toString() !== fromWarehouseId
    );
  }, [warehouses, fromWarehouseId]);

  // Get selected product and its stock in the "from" warehouse
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id.toString() === selectedProductId);
  }, [products, selectedProductId]);

  // Get available stock in the selected "from" warehouse
  const availableStock = useMemo(() => {
    if (!selectedProduct || !fromWarehouseId) return null;
    const warehouseId = parseInt(fromWarehouseId);
    
    // Check if product has warehouse-specific stock
    if (selectedProduct.warehouses && selectedProduct.warehouses.length > 0) {
      const warehouseStock = selectedProduct.warehouses.find(
        (w) => w.id === warehouseId
      );
      if (warehouseStock) {
        return warehouseStock.pivot.quantity;
      }
    }
    
    // Fallback to general stock_quantity if no warehouse-specific data
    return selectedProduct.stock_quantity || 0;
  }, [selectedProduct, fromWarehouseId]);

  useEffect(() => {
    if (open) {
      loadWarehouses();
      loadProducts(""); // Initial load or empty search
    } else {
      // Reset form when dialog closes
      form.reset();
    }
  }, [open]);

  // Reset "to_warehouse_id" if it becomes invalid (same as from_warehouse_id)
  useEffect(() => {
    const toWarehouseId = form.getValues("to_warehouse_id");
    if (fromWarehouseId && toWarehouseId === fromWarehouseId) {
      form.setValue("to_warehouse_id", "");
      form.clearErrors("to_warehouse_id");
    }
  }, [fromWarehouseId, form]);

  const loadWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const data = await warehouseService.getAll();
      setWarehouses(data);
    } catch (error) {
      toast.error("فشل تحميل المستودعات");
    } finally {
      setLoadingWarehouses(false);
    }
  };

  // Load products from IndexedDB cache
  const loadProducts = async (search: string) => {
    try {
      setLoadingProducts(true);
      // Try to load from IndexedDB cache first
      const cachedProducts = await offlineSaleService.searchProducts(search);
      
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts);
      } else {
        // If cache is empty, show message but don't fail
        toast.info("لا توجد منتجات في الذاكرة المؤقتة. يرجى تحديث البيانات.");
        setProducts([]);
      }
    } catch (error) {
      console.error("Error loading products from cache:", error);
      toast.error("فشل تحميل المنتجات من الذاكرة المؤقتة");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const onSubmit = async (values: TransferFormValues) => {
    if (values.from_warehouse_id === values.to_warehouse_id) {
      form.setError("to_warehouse_id", {
        type: "manual",
        message: "يجب أن يكون المصدر والوجهة مختلفين",
      });
      return;
    }

    // Validate stock availability
    if (availableStock !== null && availableStock !== undefined) {
      const requestedQuantity = parseFloat(values.quantity);
      if (requestedQuantity > availableStock) {
        form.setError("quantity", {
          type: "manual",
          message: `المخزون المتاح غير كافٍ. المتاح: ${availableStock}`,
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload: CreateStockTransferData = {
        from_warehouse_id: parseInt(values.from_warehouse_id),
        to_warehouse_id: parseInt(values.to_warehouse_id),
        product_id: parseInt(values.product_id),
        quantity: parseFloat(values.quantity),
        transfer_date: values.transfer_date,
        notes: values.notes,
      };

      await stockTransferService.create(payload);
      toast.success("تم تحويل المخزون بنجاح");
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "فشل إنشاء التحويل");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || <Button variant="outlined">تحويل جديد</Button>}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إنشاء تحويل مخزون</DialogTitle>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Controller
                  control={form.control}
                  name="from_warehouse_id"
                  rules={{ required: "مطلوب" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="من المستودع"
                      fullWidth
                      error={!!form.formState.errors.from_warehouse_id}
                      helperText={
                        form.formState.errors.from_warehouse_id?.message
                      }
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
                  rules={{ required: "مطلوب" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="إلى المستودع"
                      fullWidth
                      error={!!form.formState.errors.to_warehouse_id}
                      helperText={
                        form.formState.errors.to_warehouse_id?.message ||
                        (!fromWarehouseId && "اختر المستودع المصدر أولاً")
                      }
                      disabled={loadingWarehouses || !fromWarehouseId}
                    >
                      {availableToWarehouses.length === 0 ? (
                        <MenuItem disabled>
                          {fromWarehouseId
                            ? "لا توجد مستودعات أخرى متاحة"
                            : "اختر المستودع المصدر أولاً"}
                        </MenuItem>
                      ) : (
                        availableToWarehouses.map((w) => (
                          <MenuItem key={w.id} value={w.id.toString()}>
                            {w.name}
                          </MenuItem>
                        ))
                      )}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid size={12}>
                <Controller
                  control={form.control}
                  name="product_id"
                  rules={{ required: "مطلوب" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label={loadingProducts ? "جاري التحميل..." : "المنتج"}
                      fullWidth
                      error={!!form.formState.errors.product_id}
                      helperText={form.formState.errors.product_id?.message}
                      disabled={loadingProducts}
                    >
                      {products.length === 0 ? (
                        <MenuItem disabled>
                          {loadingProducts
                            ? "جاري التحميل..."
                            : "لا توجد منتجات متاحة"}
                        </MenuItem>
                      ) : (
                        products.map((p) => {
                          // Show warehouse-specific stock if available
                          let stockDisplay = p.stock_quantity || 0;
                          if (
                            fromWarehouseId &&
                            p.warehouses &&
                            p.warehouses.length > 0
                          ) {
                            const warehouseId = parseInt(fromWarehouseId);
                            const warehouseStock = p.warehouses.find(
                              (w) => w.id === warehouseId
                            );
                            if (warehouseStock) {
                              stockDisplay = warehouseStock.pivot.quantity;
                            }
                          }
                          return (
                            <MenuItem key={p.id} value={p.id.toString()}>
                              {p.name} (المخزون: {stockDisplay})
                            </MenuItem>
                          );
                        })
                      )}
                    </TextField>
                  )}
                />
                {/* Show available stock info */}
                {selectedProduct && fromWarehouseId && availableStock !== null && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      المخزون المتاح في المستودع المحدد:{" "}
                      <strong>{availableStock}</strong>
                    </Typography>
                  </Alert>
                )}
              </Grid>

              <Grid size={6}>
                <TextField
                  {...form.register("quantity", {
                    required: "مطلوب",
                    min: { value: 0.01, message: "يجب أن يكون أكبر من 0" },
                    validate: (value) => {
                      if (
                        availableStock !== null &&
                        availableStock !== undefined
                      ) {
                        const qty = parseFloat(value);
                        if (qty > availableStock) {
                          return `المخزون المتاح غير كافٍ. المتاح: ${availableStock}`;
                        }
                      }
                      return true;
                    },
                  })}
                  label="الكمية"
                  type="number"
                  fullWidth
                  error={!!form.formState.errors.quantity}
                  helperText={
                    form.formState.errors.quantity?.message ||
                    (availableStock !== null &&
                      `المتاح: ${availableStock}`)
                  }
                  inputProps={{ step: "0.01", min: 0.01 }}
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  {...form.register("transfer_date", { required: "مطلوب" })}
                  label="التاريخ"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!form.formState.errors.transfer_date}
                  helperText={form.formState.errors.transfer_date?.message}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  {...form.register("notes")}
                  label="ملاحظات"
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="ملاحظات اختيارية..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="inherit">
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Save size={18} />
                )
              }
            >
              تحويل المخزون
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
