import React, { useEffect, useState } from "react";
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
} from "@mui/material";

// Services
import { warehouseService, Warehouse } from "@/services/warehouseService";
import stockTransferService, {
  CreateStockTransferData,
} from "@/services/stockTransferService";
import productService, { Product } from "@/services/productService";
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

  useEffect(() => {
    if (open) {
      loadWarehouses();
      loadProducts(""); // Initial load or empty search
    }
  }, [open]);

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

  // Simple product load for now - in production should be autocomplete
  const loadProducts = async (search: string) => {
    try {
      setLoadingProducts(true);
      const data = await productService.getProductsForAutocomplete(search);
      setProducts(data);
    } catch (error) {
      console.error(error);
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
                        form.formState.errors.to_warehouse_id?.message
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
                      {products.map((p) => (
                        <MenuItem key={p.id} value={p.id.toString()}>
                          {p.name} (Stock: {p.stock_quantity})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  {...form.register("quantity", {
                    required: "مطلوب",
                    min: { value: 0.01, message: "يجب أن يكون أكبر من 0" },
                  })}
                  label="الكمية"
                  type="number"
                  fullWidth
                  error={!!form.formState.errors.quantity}
                  helperText={form.formState.errors.quantity?.message}
                  inputProps={{ step: "0.01" }}
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
