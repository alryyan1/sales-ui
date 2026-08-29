import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Autocomplete,
  TextField,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  Avatar,
} from "@mui/material";
import { X, Search as SearchIcon, Trash2, Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import saleService, { Sale, SaleItem } from "@/services/saleService";
import productService, { Product } from "@/services/productService";
import { SaleItemsTable } from "@/components/sales/SaleItemsTable";
import { formatNumber } from "@/constants";

interface LedgerSaleEditorDialogProps {
  open: boolean;
  onClose: () => void;
  saleId: number | null;
  onSaleUpdated: () => void;
}

export const LedgerSaleEditorDialog: React.FC<LedgerSaleEditorDialogProps> = ({
  open,
  onClose,
  saleId,
  onSaleUpdated,
}) => {
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productInputValue, setProductInputValue] = useState("");
  const productInputRef = useRef<HTMLInputElement>(null);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  const fetchSale = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await saleService.getSale(saleId);
      setSale(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load sale details");
      toast.error("فشل في تحميل بيانات العملية");
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    if (open && saleId) {
      fetchSale();
    } else {
      setSale(null);
      setProductInputValue("");
      setSelectedProduct(null);
    }
  }, [open, saleId, fetchSale]);

  // Auto-fill payment amount with current balance whenever sale data changes
  useEffect(() => {
    const due = Number(sale?.due_amount ?? 0);
    setPaymentAmount(due > 0 ? String(due) : "");
  }, [sale]);

  useEffect(() => {
    if (!open) return;
    const searchStr = productInputValue.trim();
    if (!searchStr) { setProductOptions([]); return; }
    const timer = setTimeout(async () => {
      setProductSearchLoading(true);
      try {
        const results = await productService.getProductsForAutocomplete(searchStr);
        setProductOptions(Array.isArray(results) ? results : []);
      } catch { /* silent */ } finally {
        setProductSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [productInputValue, open]);

  const handleAddProductToSale = useCallback(async (product: Product) => {
    if (!sale?.id) return;
    setAddProductLoading(true);
    try {
      const responseSale = await saleService.addSaleItem(sale.id, {
        product_id: Number(product.id),
        quantity: 1,
        unit_price: Number(product.suggested_sale_price ?? 0),
        purchase_item_id: undefined,
      });
      setSale(responseSale.sale);
      onSaleUpdated();
      toast.success(`تمت إضافة ${product.name}`);
      setProductInputValue("");
      setSelectedProduct(null);
      setTimeout(() => productInputRef.current?.focus(), 100);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل في إضافة المنتج");
    } finally {
      setAddProductLoading(false);
    }
  }, [sale?.id, onSaleUpdated]);

  const handleAddProductByBarcode = useCallback(async (barcodeOrName: string) => {
    if (!sale?.id || !barcodeOrName.trim()) return;
    setAddProductLoading(true);
    try {
      const results = await productService.getProductsForAutocomplete(barcodeOrName.trim());
      const data = Array.isArray(results) ? results : [];
      if (data.length === 1) {
        await handleAddProductToSale(data[0]);
      } else if (data.length > 1) {
        setProductOptions(data);
        toast.info("يوجد أكثر من نتيجة، يرجى الاختيار");
      } else {
        toast.warning("المنتج غير موجود");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل البحث");
    } finally {
      setAddProductLoading(false);
    }
  }, [sale?.id, handleAddProductToSale]);

  const handleQuantityChange = useCallback(async (item: SaleItem, newQuantity: number) => {
    if (!sale?.id || !item.id) return;
    try {
      const responseSale = await saleService.updateSaleItem(sale.id, item.id, {
        quantity: newQuantity,
        unit_price: Number(item.unit_price ?? 0),
      });
      setSale(responseSale);
      onSaleUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل تعديل الكمية");
    }
  }, [sale?.id, onSaleUpdated]);

  const handlePriceChange = useCallback(async (item: SaleItem, newPrice: number) => {
    if (!sale?.id || !item.id) return;
    try {
      const responseSale = await saleService.updateSaleItem(sale.id, item.id, {
        quantity: item.quantity,
        unit_price: newPrice,
      });
      setSale(responseSale);
      onSaleUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل تعديل السعر");
    }
  }, [sale?.id, onSaleUpdated]);

  const handleDeleteItem = useCallback(async (item: SaleItem) => {
    if (!sale?.id || !item.id) return;
    if ((sale.payments?.length ?? 0) > 0) {
      toast.error("لا يمكن حذف الأصناف عند وجود مدفوعات");
      return;
    }
    setRemovingItemId(item.id);
    try {
      await saleService.deleteSaleItem(sale.id, item.id);
      await fetchSale();
      onSaleUpdated();
      toast.success("تم الحذف");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل حذف الصنف");
    } finally {
      setRemovingItemId(null);
    }
  }, [sale, onSaleUpdated, fetchSale]);

  const handleApplyDiscount = useCallback(async () => {
    if (!sale?.id) return;
    const num = Number(discountValue);
    if (!Number.isFinite(num) || num < 0) { toast.error("أدخل قيمة خصم صحيحة"); return; }
    setDiscountLoading(true);
    try {
      const updated = await saleService.updateSaleDiscount(sale.id, { discount_type: discountType, discount_amount: num });
      setSale(updated);
      onSaleUpdated();
      setDiscountValue("");
      toast.success("تم تطبيق الخصم");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل تطبيق الخصم");
    } finally {
      setDiscountLoading(false);
    }
  }, [sale?.id, discountType, discountValue, onSaleUpdated]);

  const handleRemoveDiscount = useCallback(async () => {
    if (!sale?.id) return;
    setDiscountLoading(true);
    try {
      const updated = await saleService.updateSaleDiscount(sale.id, { discount_type: "fixed", discount_amount: 0 });
      setSale(updated);
      onSaleUpdated();
      setDiscountValue("");
      toast.success("تم إلغاء الخصم");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل إلغاء الخصم");
    } finally {
      setDiscountLoading(false);
    }
  }, [sale?.id, onSaleUpdated]);

  const handleAddPayment = useCallback(async () => {
    if (!sale?.id) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) { toast.error("الرجاء إدخال مبلغ صحيح"); return; }
    setPaymentLoading(true);
    try {
      await saleService.addPayment(sale.id, {
        method: paymentMethod,
        amount: Number(paymentAmount),
        reference_number: paymentReference || null,
      });
      await fetchSale();
      onSaleUpdated();
      setPaymentAmount("");
      setPaymentReference("");
      setIsAddPaymentOpen(false);
      toast.success("تمت إضافة الدفعة");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل إضافة الدفعة");
    } finally {
      setPaymentLoading(false);
    }
  }, [sale?.id, paymentAmount, paymentMethod, paymentReference, fetchSale, onSaleUpdated]);

  const handleDeletePayment = useCallback(async (paymentId: number) => {
    if (!sale?.id) return;
    try {
      await saleService.deletePayment(sale.id, paymentId);
      await fetchSale();
      onSaleUpdated();
      toast.success("تم حذف الدفعة");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل حذف الدفعة");
    }
  }, [sale?.id, fetchSale, onSaleUpdated]);

  const handleFullPayment = useCallback(async () => {
    if (!sale?.id) return;
    const due = Number(sale.due_amount ?? 0);
    if (due <= 0) return;
    setPaymentLoading(true);
    try {
      await saleService.addPayment(sale.id, {
        method: paymentMethod,
        amount: due,
        reference_number: null,
      });
      await fetchSale();
      onSaleUpdated();
      setPaymentAmount("");
      toast.success("تم تسديد كامل المبلغ");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل إضافة الدفعة");
    } finally {
      setPaymentLoading(false);
    }
  }, [sale?.id, sale?.due_amount, paymentMethod, fetchSale, onSaleUpdated]);

  const hasPayments = (sale?.payments?.length ?? 0) > 0;
  const due = Number(sale?.due_amount ?? 0);
  const isFullyPaid =
    Math.abs(Number(sale?.paid_amount ?? 0) - Number(sale?.total_amount ?? 0)) < 1e-6 && hasPayments;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: "92vh", display: "flex", flexDirection: "column" } }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", gap: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          فاتورة #{saleId}
        </Typography>
        {sale && (
          <Chip
            label={due > 0 ? `متبقي: ${formatNumber(due)}` : "مدفوعة بالكامل"}
            color={due > 0 ? "error" : "success"}
            size="small"
            sx={{ height: 22, fontSize: "0.72rem" }}
          />
        )}
        {sale && due > 0 && (
          <Tooltip title={`تسديد كامل المبلغ (${formatNumber(due)})`}>
            <span>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={handleFullPayment}
                disabled={paymentLoading}
                startIcon={paymentLoading ? <CircularProgress size={14} color="inherit" /> : <CheckCircle size={15} />}
                sx={{ textTransform: "none", fontWeight: 600, "& .MuiButton-startIcon": { ml: "4px" } }}
              >
                تسديد كامل
              </Button>
            </span>
          </Tooltip>
        )}
        <IconButton onClick={onClose} size="small">
          <X size={17} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, gap: 1.5 }}>
            <CircularProgress size={24} />
            <Typography color="text.secondary" variant="body2">جاري التحميل...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Typography color="error" variant="body2">{error}</Typography>
          </Box>
        ) : sale ? (
          <Box sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

            {/* Summary strip */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, px: 2, py: 1, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider", flexWrap: "wrap" }}>
              <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                <Avatar/>
                {/* <Typography variant="caption" color="text.secondary">العميل</Typography> */}
                <Typography variant="body2" fontWeight={600}>
                  {sale.client_name ?? sale.client?.name ?? "عميل نقدي"}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              {[
                { label: "الإجمالي", value: sale.total_amount ?? 0, color: "text.primary" },
                { label: "المدفوع", value: sale.paid_amount ?? 0, color: "success.main" },
                { label: "المتبقي", value: due, color: due > 0 ? "error.main" : "success.main" },
              ].map(({ label, value, color }) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={700} color={color} dir="ltr">
                    {formatNumber(value)}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Scrollable body */}
            <Box sx={{ flex: 1, overflow: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>

              {/* Product search */}
              <Autocomplete
              sx={{width:400}}
                freeSolo
                value={selectedProduct}
                inputValue={productInputValue}
                onInputChange={(_, v) => setProductInputValue(v)}
                onChange={(_, newValue: string | Product | null) => {
                  if (typeof newValue === "string") handleAddProductByBarcode(newValue);
                  else if (newValue) handleAddProductToSale(newValue);
                }}
                options={productOptions}
                getOptionLabel={(opt) => {
                  if (typeof opt === "string") return opt;
                  const o = opt as Product;
                  return o.name ? `${o.name}${o.sku ? ` (${o.sku})` : ""}` : "";
                }}
                loading={productSearchLoading}
                disabled={addProductLoading}
                size="small"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={productInputRef}
                    placeholder="ابحث أو امسح باركود لإضافة منتج..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <SearchIcon size={15} style={{ marginRight: 6, opacity: 0.45 }} />,
                      endAdornment: (
                        <>
                          {addProductLoading ? <CircularProgress size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, opt) => {
                  if (typeof opt === "string") return <li {...props} key={opt}>{opt}</li>;
                  const o = opt as Product;
                  return (
                    <li {...props} key={o.id}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 1 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{o.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[o.sku, o.suggested_sale_price != null && `السعر: ${formatNumber(Number(o.suggested_sale_price))}`].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                        {o.is_service ? (
                          <Typography variant="caption" fontWeight={700} color="text.secondary">
                            خدمة
                          </Typography>
                        ) : (o.current_stock_quantity ?? o.stock_quantity) != null && (
                          <Typography variant="caption" fontWeight={700}
                            color={(o.current_stock_quantity ?? o.stock_quantity ?? 0) <= 5 ? "error.main" : "success.main"}>
                            {formatNumber(o.current_stock_quantity ?? o.stock_quantity ?? 0)}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                noOptionsText={productInputValue.trim() ? "لا توجد نتائج" : "اكتب للبحث"}
              />

              {/* Items table */}
              <SaleItemsTable
                items={sale.items || []}
                maxHeight={260}
                onQuantityChange={handleQuantityChange}
                onPriceChange={handlePriceChange}
                onDeleteItem={handleDeleteItem}
                canDeleteItems={!hasPayments}
                deletingItemId={removingItemId}
                disableQuantityAndPriceEdit={isFullyPaid}
              />

              <Divider />

              {/* Discount + Payments */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: hasPayments ? "1fr" : "1fr 1fr" }, gap: 1.5 }}>

                {/* Discount — hidden when sale has payments */}
                {!hasPayments && <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary"
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 0.75 }}>
                    الخصم
                  </Typography>
                  <Box sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>النوع</InputLabel>
                        <Select value={discountType} label="النوع"
                          onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}>
                          <MenuItem value="fixed">مبلغ</MenuItem>
                          <MenuItem value="percentage">نسبة %</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        type="number"
                        placeholder={discountType === "percentage" ? "%" : "0.00"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button size="small" variant="outlined" fullWidth onClick={handleApplyDiscount}
                        disabled={discountLoading || !discountValue.trim() || hasPayments}>
                        تطبيق
                      </Button>
                      {Number(sale.discount_amount ?? 0) > 0 && (
                        <Button size="small" variant="outlined" color="error" fullWidth
                          onClick={handleRemoveDiscount} disabled={discountLoading || hasPayments}>
                          إلغاء
                        </Button>
                      )}
                    </Box>
                    {Number(sale.discount_amount ?? 0) > 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">المطبق</Typography>
                        <Typography variant="caption" fontWeight={700} color="error.main">
                          − {formatNumber(sale.discount_amount ?? 0)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>}

                {/* Payments */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                      المدفوعات
                    </Typography>
                    {!isFullyPaid && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<Plus size={13} />}
                        onClick={() => {
                          const due = Number(sale.due_amount ?? 0);
                          setPaymentAmount(due > 0 ? String(due) : "");
                          setPaymentReference("");
                          setPaymentMethod("cash");
                          setIsAddPaymentOpen(true);
                        }}
                        sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.25, "& .MuiButton-startIcon": { ml: "4px" } }}
                      >
                        إضافة دفعة
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden",maxWidth:'400px' }}>
                    {sale.payments && sale.payments.length > 0 ? (
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "grey.50" }}>
                            <TableCell sx={{ py: 0.4, fontSize: "0.74rem" }}>التاريخ</TableCell>
                            <TableCell sx={{ py: 0.4, fontSize: "0.74rem" }}>الطريقة</TableCell>
                            <TableCell sx={{ py: 0.4, fontSize: "0.74rem" }} align="right">المبلغ</TableCell>
                            <TableCell sx={{ py: 0.4, width: 32 }} />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sale.payments.map((payment) => (
                            <TableRow key={payment.id} sx={{ "&:last-child td": { border: 0 } }}>
                              <TableCell sx={{ py: 0.4, fontSize: "0.78rem" }}>{payment.payment_date}</TableCell>
                              <TableCell sx={{ py: 0.4, fontSize: "0.78rem" }}>{payment.method}</TableCell>
                              <TableCell sx={{ py: 0.4, fontSize: "0.78rem" }} align="right" dir="ltr">
                                {formatNumber(payment.amount)}
                              </TableCell>
                              <TableCell sx={{ py: 0.4 }}>
                                <Tooltip title="حذف">
                                  <IconButton size="small" color="error"
                                    onClick={() => handleDeletePayment(payment.id!)}>
                                    <Trash2 size={13} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Typography variant="caption" color="text.secondary"
                        sx={{ textAlign: "center", display: "block", py: 1.5 }}>
                        لا توجد مدفوعات
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="contained" size="small">إغلاق</Button>
      </DialogActions>

      {/* ── Add Payment Sub-Dialog ─────────────────────────────────── */}
      <Dialog
        open={isAddPaymentOpen}
        onClose={() => !paymentLoading && setIsAddPaymentOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>إضافة دفعة</Typography>
          <IconButton size="small" onClick={() => setIsAddPaymentOpen(false)} disabled={paymentLoading}>
            <X size={16} />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              label="المبلغ"
              size="small"
              type="number"
              fullWidth
              autoFocus
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddPayment(); } }}
              inputProps={{ min: 0 }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>طريقة الدفع</InputLabel>
              <Select
                label="طريقة الدفع"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="cash">كاش</MenuItem>
                <MenuItem value="bankak">بنكك</MenuItem>
                <MenuItem value="fawry">فوري</MenuItem>
                <MenuItem value="ocash">أوكاش</MenuItem>
                <MenuItem value="bank_transfer">تحويل بنكي</MenuItem>
                <MenuItem value="card">بطاقة</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="رقم المرجع (اختياري)"
              size="small"
              fullWidth
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: "divider", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setIsAddPaymentOpen(false)}
            disabled={paymentLoading}
          >
            إلغاء
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={handleAddPayment}
            disabled={paymentLoading || !paymentAmount || Number(paymentAmount) <= 0}
            startIcon={paymentLoading ? <CircularProgress size={14} color="inherit" /> : null}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
