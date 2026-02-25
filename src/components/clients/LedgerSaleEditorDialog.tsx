import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
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
} from "@mui/material";
import { X, Search as SearchIcon, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import saleService, { Sale, SaleItem } from "@/services/saleService";
import productService, { Product } from "@/services/productService";
import { SaleItemsTable } from "@/components/sales/SaleItemsTable";
import { formatNumber } from "@/constants";

interface LedgerSaleEditorDialogProps {
  open: boolean;
  onClose: () => void;
  saleId: number | null;
  /** Callback fired when the sale gets modified so the ledger can refresh */
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

  // Product Autocomplete
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productInputValue, setProductInputValue] = useState("");
  const productInputRef = useRef<HTMLInputElement>(null);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Action Loading states
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);

  // Discount State
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "fixed",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchSale = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await saleService.getSale(saleId);
      setSale(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load sale details",
      );
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

  // Product Search Debounce
  useEffect(() => {
    if (!open) return;
    const searchStr = productInputValue.trim();
    if (searchStr.length === 0) {
      setProductOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setProductSearchLoading(true);
      try {
        const results =
          await productService.getProductsForAutocomplete(searchStr);
        setProductOptions(Array.isArray(results) ? results : []);
      } catch (err) {
        console.error("Product search error:", err);
      } finally {
        setProductSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [productInputValue, open]);

  // Handle adding an item
  const handleAddProductToSale = useCallback(
    async (product: Product) => {
      if (!sale?.id) return;
      setAddProductLoading(true);
      try {
        // Optimistic UI could be added here
        const responseSale = await saleService.addSaleItem(sale.id, {
          product_id: Number(product.id),
          quantity: 1, // Default to 1
          unit_price: Number(product.suggested_sale_price ?? 0),
          purchase_item_id: undefined, // Let backend logic handle FIFO/LIFO
        });

        // Backend should return the updated sale with its new items
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
    },
    [sale?.id, onSaleUpdated],
  );

  // Handle barcode/enter press
  const handleAddProductByBarcode = useCallback(
    async (barcodeOrName: string) => {
      if (!sale?.id || !barcodeOrName.trim()) return;
      setAddProductLoading(true);
      try {
        const results = await productService.getProductsForAutocomplete(
          barcodeOrName.trim(),
        );
        const data = Array.isArray(results) ? results : [];
        if (data.length === 1) {
          // Exact match, e.g. barcode
          await handleAddProductToSale(data[0]);
        } else if (data.length > 1) {
          setProductOptions(data);
          toast.info("يوجد أكثر من نتيجة مطابقة، يرجى الاختيار من القائمة");
        } else {
          toast.warning("المنتج غير موجود");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "فشل البحث");
      } finally {
        setAddProductLoading(false);
      }
    },
    [sale?.id, handleAddProductToSale],
  );

  // Handlers for modifying existing items
  const handleQuantityChange = useCallback(
    async (item: SaleItem, newQuantity: number) => {
      if (!sale?.id || !item.id) return;
      try {
        const responseSale = await saleService.updateSaleItem(
          sale.id,
          item.id,
          {
            quantity: newQuantity,
            unit_price: Number(item.unit_price ?? 0),
          },
        );
        setSale(responseSale);
        onSaleUpdated();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "فشل تعديل الكمية");
      }
    },
    [sale?.id, onSaleUpdated],
  );

  const handlePriceChange = useCallback(
    async (item: SaleItem, newPrice: number) => {
      if (!sale?.id || !item.id) return;
      try {
        const responseSale = await saleService.updateSaleItem(
          sale.id,
          item.id,
          {
            quantity: item.quantity,
            unit_price: newPrice,
          },
        );
        setSale(responseSale);
        onSaleUpdated();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "فشل تعديل السعر");
      }
    },
    [sale?.id, onSaleUpdated],
  );

  const handleDeleteItem = useCallback(
    async (item: SaleItem) => {
      if (!sale?.id || !item.id) return;
      // Prevent deleting if payments exist, matching PosBlankPage validation
      if ((sale.payments?.length ?? 0) > 0) {
        toast.error("لا يمكن حذف الأصناف عند وجود مدفوعات لهذه الفاتورة");
        return;
      }

      setRemovingItemId(item.id);
      try {
        await saleService.deleteSaleItem(sale.id, item.id);
        await fetchSale();
        onSaleUpdated();
        toast.success("تم الحذف بنجاح");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "فشل حذف الصنف");
      } finally {
        setRemovingItemId(null);
      }
    },
    [sale, onSaleUpdated, fetchSale],
  );

  const handleApplyDiscount = useCallback(async () => {
    if (!sale?.id) return;
    const num = Number(discountValue);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("أدخل قيمة خصم صحيحة");
      return;
    }
    setDiscountLoading(true);
    try {
      const updated = await saleService.updateSaleDiscount(sale.id, {
        discount_type: discountType,
        discount_amount: num,
      });
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
      const updated = await saleService.updateSaleDiscount(sale.id, {
        discount_type: "fixed",
        discount_amount: 0,
      });
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
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }
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
      toast.success("تم إضافة الدفعة بنجاح");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل إضافة الدفعة");
    } finally {
      setPaymentLoading(false);
    }
  }, [
    sale?.id,
    paymentAmount,
    paymentMethod,
    paymentReference,
    fetchSale,
    onSaleUpdated,
  ]);

  const handleDeletePayment = useCallback(
    async (paymentId: number) => {
      if (!sale?.id) return;
      try {
        // note: the endpoint in backend supports a single payment deletion, and saleService exposes deletePayment
        await saleService.deletePayment(sale.id, paymentId);
        await fetchSale();
        onSaleUpdated();
        toast.success("تم حذف الدفعة بنجاح");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "فشل حذف الدفعة");
      }
    },
    [sale?.id, fetchSale, onSaleUpdated],
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <DialogTitle sx={{ p: 0, fontWeight: "bold" }}>
          تعديل عناصر الفاتورة {saleId ? `#${saleId}` : ""}
        </DialogTitle>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2, display: "flex", flexDirection: "column" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : sale ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                bgcolor: "background.paper",
                p: 2,
                borderRadius: 1,
                boxShadow: 1,
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  العميل
                </Typography>
                <Typography fontWeight="bold">
                  {sale.client_name ?? sale.client?.name ?? "عميل نقدي"}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2" color="text.secondary">
                  الإجمالي الحالي
                </Typography>
                <Typography
                  fontWeight="bold"
                  color={
                    Number(sale.due_amount ?? 0) > 0
                      ? "error.main"
                      : "success.main"
                  }
                >
                  {formatNumber(sale.total_amount ?? 0)}
                </Typography>
              </Box>
            </Box>

            <Autocomplete
              freeSolo
              value={selectedProduct}
              inputValue={productInputValue}
              onInputChange={(_, value) => setProductInputValue(value)}
              onChange={(_, newValue: string | Product | null) => {
                if (typeof newValue === "string") {
                  handleAddProductByBarcode(newValue);
                } else if (newValue && typeof newValue === "object") {
                  handleAddProductToSale(newValue);
                }
              }}
              options={productOptions}
              getOptionLabel={(opt) => {
                if (typeof opt === "string") return opt;
                const option = opt as Product;
                return option?.name
                  ? `${option.name}${option.sku ? ` (${option.sku})` : ""}`
                  : "";
              }}
              loading={productSearchLoading}
              disabled={addProductLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={productInputRef}
                  placeholder="ابحث عن منتج أو الباركود لإضافته..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <SearchIcon
                        size={18}
                        style={{ marginRight: 8, opacity: 0.5 }}
                      />
                    ),
                    endAdornment: (
                      <>
                        {addProductLoading ? (
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, opt) => {
                if (typeof opt === "string")
                  return (
                    <li {...props} key={opt}>
                      {opt}
                    </li>
                  );
                const option = opt as Product;
                return (
                  <li {...props} key={option.id}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {option.name}
                        </Typography>
                        {option.current_stock_quantity != null ||
                        option.stock_quantity != null ? (
                          <Typography
                            variant="caption"
                            color={
                              (option.current_stock_quantity ??
                                option.stock_quantity ??
                                0) <= 5
                                ? "error.main"
                                : "success.main"
                            }
                            fontWeight="bold"
                          >
                            {`الكمية: ${formatNumber(
                              option.current_stock_quantity ??
                                option.stock_quantity ??
                                0,
                            )}`}
                          </Typography>
                        ) : null}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {[
                            option.sku,
                            option.suggested_sale_price != null &&
                              `السعر: ${formatNumber(
                                Number(option.suggested_sale_price),
                              )}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                        {option.earliest_expiry_date && (
                          <Typography variant="caption" color="warning.dark">
                            {`ينتهي: ${option.earliest_expiry_date}`}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </li>
                );
              }}
              noOptionsText={
                productInputValue.trim() ? "لا توجد نتائج" : "اكتب للبحث"
              }
              sx={{ width: "100%" }}
            />

            <SaleItemsTable
              items={sale.items || []}
              maxHeight={400}
              onQuantityChange={handleQuantityChange}
              onPriceChange={handlePriceChange}
              onDeleteItem={handleDeleteItem}
              canDeleteItems={(sale.payments?.length ?? 0) === 0}
              deletingItemId={removingItemId}
              disableQuantityAndPriceEdit={
                Math.abs(
                  Number(sale.paid_amount ?? 0) -
                    Number(sale.total_amount ?? 0),
                ) < 1e-6 && (sale.payments?.length ?? 0) > 0
              }
            />

            <Divider sx={{ my: 1 }} />

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 3,
              }}
            >
              {/* Totals & Discount Column */}
              <Box sx={{ flex: { xs: "1 1 auto", md: 5 }, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  ملخص الفاتورة
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    bgcolor: "background.paper",
                    p: 2,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                >
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      المجموع الفرعي
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(sale.subtotal ?? 0)}
                    </Typography>
                  </Box>

                  {Number(sale.discount_amount ?? 0) > 0 && (
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        الخصم
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="error.main"
                      >
                        - {formatNumber(sale.discount_amount ?? 0)}
                      </Typography>
                    </Box>
                  )}

                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <FormControl size="small" sx={{ minWidth: 90, flex: 1 }}>
                      <InputLabel>نوع الخصم</InputLabel>
                      <Select
                        value={discountType}
                        label="نوع الخصم"
                        onChange={(e) =>
                          setDiscountType(
                            e.target.value as "percentage" | "fixed",
                          )
                        }
                      >
                        <MenuItem value="fixed">مبلغ ثابت</MenuItem>
                        <MenuItem value="percentage">نسبة مئوية</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      type="number"
                      placeholder={
                        discountType === "percentage" ? "٪" : "المبلغ"
                      }
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      sx={{ width: 80 }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleApplyDiscount}
                      disabled={discountLoading || !discountValue.trim()}
                    >
                      تطبيق
                    </Button>
                  </Box>

                  {Number(sale.discount_amount ?? 0) > 0 && (
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      onClick={handleRemoveDiscount}
                      disabled={discountLoading}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      إلغاء الخصم
                    </Button>
                  )}

                  <Divider />

                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      الإجمالي
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="success.main"
                    >
                      {formatNumber(sale.total_amount ?? 0)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      المدفوع
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatNumber(sale.paid_amount ?? 0)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      المتبقي
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="error.main"
                    >
                      {formatNumber(sale.due_amount ?? 0)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Payments Column */}
              <Box sx={{ flex: { xs: "1 1 auto", md: 7 }, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  المدفوعات
                </Typography>
                <Box
                  sx={{
                    bgcolor: "background.paper",
                    p: 2,
                    borderRadius: 1,
                    boxShadow: 1,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      flexWrap: "wrap",
                      mb: 2,
                    }}
                  >
                    <TextField
                      size="small"
                      label="المبلغ"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      sx={{ width: 100 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>الطريقة</InputLabel>
                      <Select
                        value={paymentMethod}
                        label="الطريقة"
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <MenuItem value="cash">كاش</MenuItem>
                        <MenuItem value="bankak">بنكك</MenuItem>
                        <MenuItem value="fawry">فوري</MenuItem>
                        <MenuItem value="ocash">أوكاش</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label="المرجع (اختياري)"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      sx={{ flex: 1, minWidth: 120 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleAddPayment}
                      disabled={paymentLoading || !paymentAmount}
                      startIcon={<CreditCard size={16} />}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      دفع
                    </Button>
                  </Box>

                  {sale.payments && sale.payments.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>التاريخ</TableCell>
                          <TableCell>الطريقة</TableCell>
                          <TableCell>المبلغ</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sale.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{payment.payment_date}</TableCell>
                            <TableCell>{payment.method}</TableCell>
                            <TableCell>
                              {formatNumber(payment.amount)}
                            </TableCell>
                            <TableCell align="left">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeletePayment(payment.id!)}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "center", py: 2 }}
                    >
                      لا توجد مدفوعات مسجلة
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="contained" color="primary">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};
