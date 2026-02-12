import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  Autocomplete,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import saleReturnService, {
  CreateSaleReturnData,
  SimpleSaleReturnItemInput,
} from "@/services/saleReturnService";
import productService, { Product } from "@/services/productService";
import { toast } from "sonner";

interface SalesReturnDialogProps {
  open: boolean;
  onClose: () => void;
  shiftId: number | null;
}

interface ReturnRow extends SimpleSaleReturnItemInput {
  id: number;
  product?: Product;
}

export const SalesReturnDialog: React.FC<SalesReturnDialogProps> = ({
  open,
  onClose,
  shiftId,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [items, setItems] = useState<ReturnRow[]>([]);
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "bankak" | "fawry" | "ocash"
  >("cash");
  const [submitting, setSubmitting] = useState(false);

  // Load products lazily for autocomplete
  React.useEffect(() => {
    if (!productQuery.trim()) {
      setProducts([]);
      return;
    }
    const t = setTimeout(() => {
      setProductLoading(true);
      productService
        .getProductsForAutocomplete(productQuery.trim(), 25)
        .then((list) => setProducts(Array.isArray(list) ? list : []))
        .catch(() => setProducts([]))
        .finally(() => setProductLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [productQuery]);

  const handleAddProduct = (product: Product | null) => {
    if (!product) return;
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      // Increase quantity by 1 if already selected
      setItems((prev) =>
        prev.map((row) =>
          row.product_id === product.id
            ? { ...row, quantity: row.quantity + 1 }
            : row,
        ),
      );
      return;
    }
    const defaultPrice =
      Number(product.last_sale_price_per_sellable_unit) ||
      Number(product.suggested_sale_price_per_sellable_unit) ||
      0;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        product_id: product.id,
        quantity: 1,
        price: defaultPrice,
        product,
      },
    ]);
  };

  const handleQuantityChange = (id: number, value: string) => {
    const qty = Number(value);
    if (!Number.isFinite(qty) || qty <= 0) return;
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, quantity: qty } : row)),
    );
  };

  const handlePriceChange = (id: number, value: string) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) return;
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, price } : row)),
    );
  };

  const handleRemoveRow = (id: number) => {
    setItems((prev) => prev.filter((row) => row.id !== id));
  };

  const totalReturnedAmount = useMemo(
    () => items.reduce((sum, row) => sum + row.quantity * row.price, 0),
    [items],
  );

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("أضف منتجاً واحداً على الأقل للمردود");
      return;
    }
    const payload: CreateSaleReturnData = {
      reason: reason.trim() || null,
      shift_id: shiftId ?? undefined,
      returned_payment_method: paymentMethod,
      items: items.map<SimpleSaleReturnItemInput>((row) => ({
        product_id: row.product_id,
        quantity: row.quantity,
        price: row.price,
      })),
    };
    try {
      setSubmitting(true);
      await saleReturnService.createSaleReturn(payload);
      toast.success("تم إنشاء مردود المبيعات بنجاح");
      // Reset local state and close
      setItems([]);
      setReason("");
      onClose();
    } catch (err: any) {
      const friendly =
        err?.friendlyMessage || "فشل إنشاء مردود المبيعات. حاول مرة أخرى.";
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
      <DialogTitle>مردود مبيعات</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <FormControl size="small" sx={{ maxWidth: 200 }}>
            <InputLabel id="returned-payment-method-label">
              طريقة المردود
            </InputLabel>
            <Select
              labelId="returned-payment-method-label"
              value={paymentMethod}
              label="طريقة المردود"
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value as "cash" | "bankak" | "fawry" | "ocash",
                )
              }
            >
              <MenuItem value="cash">نقدي</MenuItem>
              <MenuItem value="bankak">بنكك</MenuItem>
              <MenuItem value="fawry">فوري</MenuItem>
              <MenuItem value="ocash">أوكاش</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            options={products}
            getOptionLabel={(option) => option.name || ""}
            loading={productLoading}
            onInputChange={(_, value) => setProductQuery(value)}
            onChange={(_, value) => handleAddProduct(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="اختر منتجاً للإرجاع"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {productLoading ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {items.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {items.map((row) => (
                <Box
                  key={row.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr auto",
                    gap: 1,
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">
                    {row.product?.name ?? `#${row.product_id}`}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    label="الكمية"
                    value={row.quantity}
                    onChange={(e) =>
                      handleQuantityChange(row.id, e.target.value)
                    }
                    inputProps={{ min: 1, step: 1 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="السعر"
                    value={row.price}
                    onChange={(e) => handlePriceChange(row.id, e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveRow(row.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Box sx={{ mt: 1, textAlign: "right" }}>
                <Typography variant="body2" fontWeight={600}>
                  إجمالي القيمة: {totalReturnedAmount.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}

          <TextField
            label="سبب المردود (اختياري)"
            size="small"
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} disabled={submitting}>
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || items.length === 0}
        >
          {submitting ? "جاري الحفظ..." : "إنشاء مردود"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SalesReturnDialog;

