import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Checkbox,
  Card,
  CardContent,
  Divider,
  alpha,
  useTheme,
  InputAdornment,
} from "@mui/material";
import {
  Search as SearchIcon,
  AlertCircle,
  Phone,
  FileText,
  CreditCard,
  PackageMinus,
  Receipt,
} from "lucide-react";
import saleReturnService, {
  CreateSaleReturnData,
  SimpleSaleReturnItemInput,
} from "@/services/saleReturnService";
import saleService, { Sale, SaleItem } from "@/services/saleService";
import { toast } from "sonner";

interface SalesReturnDialogProps {
  open: boolean;
  onClose: () => void;
  shiftId: number | null;
}

interface SelectedReturn {
  product_id: number;
  quantity: number;
  price: number;
  returnQuantity: number;
}

export const SalesReturnDialog: React.FC<SalesReturnDialogProps> = ({
  open,
  onClose,
  shiftId,
}) => {
  const [saleIdInput, setSaleIdInput] = useState("");
  const [fetchedSale, setFetchedSale] = useState<Sale | null>(null);
  const [saleLoadError, setSaleLoadError] = useState<string | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [selectedReturns, setSelectedReturns] = useState<
    Record<number, SelectedReturn>
  >({});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "bankak" | "fawry" | "ocash"
  >("cash");
  const [submitting, setSubmitting] = useState(false);
  const theme = useTheme();

  const handleSearchSale = async () => {
    const id = Number(saleIdInput.trim());
    if (!id || !Number.isFinite(id)) {
      setSaleLoadError("أدخل رقم فاتورة صحيح");
      return;
    }
    setSaleLoadError(null);
    setSaleLoading(true);
    try {
      const sale = await saleService.getSale(id);
      const dueAmount = Number(sale.due_amount) || 0;
      if (dueAmount > 0.01) {
        setFetchedSale(null);
        setSaleLoadError("لا يمكن إرجاع أصناف من فاتورة غير مسددة بالكامل.");
        return;
      }
      setFetchedSale(sale);
      setSelectedReturns({});
    } catch {
      setFetchedSale(null);
      setSaleLoadError("لا توجد فاتورة بهذا الرقم");
    } finally {
      setSaleLoading(false);
    }
  };

  const toggleItemSelected = (item: SaleItem) => {
    const pid = item.product_id;
    const price = Number(item.unit_price) || 0;
    const qty = item.quantity ?? 0;
    setSelectedReturns((prev) => {
      const next = { ...prev };
      if (next[pid]) {
        delete next[pid];
        return next;
      }
      next[pid] = {
        product_id: pid,
        quantity: qty,
        price,
        returnQuantity: 1,
      };
      return next;
    });
  };

  const setReturnQuantity = (productId: number, value: number) => {
    const entry = selectedReturns[productId];
    if (!entry) return;
    const clamped = Math.max(1, Math.min(entry.quantity, value));
    setSelectedReturns((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], returnQuantity: clamped },
    }));
  };

  const selectedList = useMemo(
    () => Object.values(selectedReturns).filter((r) => r.returnQuantity >= 1),
    [selectedReturns],
  );

  const totalReturnedAmount = useMemo(
    () => selectedList.reduce((sum, r) => sum + r.returnQuantity * r.price, 0),
    [selectedList],
  );

  const handleSubmit = async () => {
    if (!fetchedSale) {
      toast.error("ابحث عن الفاتورة أولاً");
      return;
    }
    if (selectedList.length === 0) {
      toast.error("اختر صنفاً واحداً على الأقل للإرجاع");
      return;
    }
    if (!phoneNumber || phoneNumber.trim() === "") {
      toast.error("رقم الهاتف مطلوب");
      return;
    }
    if (!reason || reason.trim() === "") {
      toast.error("سبب المردود مطلوب");
      return;
    }
    const items: SimpleSaleReturnItemInput[] = selectedList.map((r) => ({
      product_id: r.product_id,
      quantity: r.returnQuantity,
      price: r.price,
    }));
    const payload: CreateSaleReturnData = {
      sale_id: fetchedSale.id,
      phone_number: phoneNumber.trim() || null,
      reason: reason.trim() || null,
      shift_id: shiftId ?? undefined,
      returned_payment_method: paymentMethod,
      items,
    };
    try {
      setSubmitting(true);
      await saleReturnService.createSaleReturn(payload);
      toast.success("تم إنشاء مردود المبيعات بنجاح");
      setFetchedSale(null);
      setSaleIdInput("");
      setSelectedReturns({});
      setPhoneNumber("");
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

  const resetSaleSection = () => {
    setFetchedSale(null);
    setSaleIdInput("");
    setSaleLoadError(null);
    setSelectedReturns({});
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1, pt: 2 }}>
        <Box display="flex" alignItems="center" gap={1} fontSize="1.1rem">
          <PackageMinus size={20} color={theme.palette.primary.main} />
          إنشاء مردود مبيعات
        </Box>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          backgroundColor: alpha(theme.palette.background.default, 0.5),
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Sale Search Card */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                gutterBottom
                display="flex"
                alignItems="center"
                gap={1}
                mb={1}
              >
                <Receipt size={16} />
                البحث عن الفاتورة
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  flexWrap: "wrap",
                  mt: 2,
                }}
              >
                <TextField
                  size="small"
                  label="رقم الفاتورة"
                  value={saleIdInput}
                  onChange={(e) => {
                    setSaleIdInput(e.target.value);
                    setSaleLoadError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSale()}
                  sx={{ minWidth: 150, flex: 1 }}
                  placeholder="رقم الفاتورة"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon size={16} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearchSale}
                  disabled={saleLoading || !saleIdInput.trim()}
                  sx={{ p: "8px 24px", minWidth: 100 }}
                >
                  {saleLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "بحث"
                  )}
                </Button>
                {fetchedSale && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={resetSaleSection}
                    sx={{ p: "8px 16px" }}
                  >
                    تغيير الفاتورة
                  </Button>
                )}
              </Box>
              {saleLoadError && (
                <Typography
                  variant="body2"
                  color="error"
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  mt={2}
                >
                  <AlertCircle size={16} />
                  {saleLoadError}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Items Return Context */}
          {fetchedSale && (
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: alpha(theme.palette.primary.main, 0.3),
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  color="primary.main"
                >
                  فاتورة #{fetchedSale.id}
                  {fetchedSale.client_name &&
                    ` — العميل: ${fetchedSale.client_name}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  تاريخ: {fetchedSale.sale_date} — إجمالي:{" "}
                  {Number(fetchedSale.total_amount ?? 0).toFixed(2)}
                </Typography>
              </Box>

              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ p: 1.5, pb: 0.5 }}
                >
                  اختر الأصناف المراد إرجاعها:
                </Typography>
                <Divider />

                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {(fetchedSale.items ?? []).map((item, index, arr) => {
                    const pid = item.product_id;
                    const selected = selectedReturns[pid];
                    const price = Number(item.unit_price) || 0;
                    const returnedQty = item.returned_quantity || 0;
                    const maxQty = (item.quantity ?? 0) - returnedQty;

                    if (maxQty <= 0) return null; // Hide if fully returned

                    return (
                      <React.Fragment key={item.id ?? pid}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 2,
                            bgcolor: selected
                              ? alpha(theme.palette.primary.main, 0.02)
                              : "transparent",
                            transition: "background-color 0.2s",
                          }}
                        >
                          <Checkbox
                            checked={!!selected}
                            onChange={() => toggleItemSelected(item)}
                            color="primary"
                          />
                          <Box flex={1}>
                            <Typography
                              variant="body2"
                              fontWeight={selected ? 600 : 400}
                            >
                              {item.product?.name ??
                                item.product_name ??
                                `#${pid}`}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              مباع: {maxQty}{" "}
                              {returnedQty > 0
                                ? `(إرجاع سابق: ${returnedQty})`
                                : ""}{" "}
                              × {price.toFixed(2)}
                            </Typography>
                          </Box>

                          {selected && (
                            <TextField
                              size="small"
                              type="number"
                              label="الكمية المرتجعة"
                              value={selected.returnQuantity}
                              onChange={(e) =>
                                setReturnQuantity(
                                  pid,
                                  Number(e.target.value) || 0,
                                )
                              }
                              inputProps={{ min: 1, max: maxQty, step: 1 }}
                              sx={{ width: 120, bgcolor: "background.paper" }}
                            />
                          )}
                        </Box>
                        {index < arr.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </Box>
                {selectedList.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    p={3}
                    textAlign="center"
                  >
                    يرجى تحديد الأصناف المراد إرجاعها لكي تستمر
                  </Typography>
                )}
                {selectedList.length > 0 && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha(theme.palette.grey[100], 0.5),
                      borderTop: "1px solid",
                      borderColor: "divider",
                      textAlign: "left",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="primary.main"
                    >
                      إجمالي المردود: {totalReturnedAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Return specifics */}
          {fetchedSale && selectedList.length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  gutterBottom
                  mb={1.5}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  تفاصيل المردود
                </Typography>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 1.5,
                    }}
                  >
                    <Box flex={1}>
                      <TextField
                        size="small"
                        label="رقم الهاتف"
                        value={phoneNumber}
                        required
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="رقم هاتف العميل للتواصل"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Phone size={16} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>

                    <Box flex={1}>
                      <FormControl size="small" fullWidth>
                        <InputLabel id="returned-payment-method-label">
                          طريقة السداد للمردود
                        </InputLabel>
                        <Select
                          labelId="returned-payment-method-label"
                          value={paymentMethod}
                          label="طريقة السداد للمردود"
                          onChange={(e) =>
                            setPaymentMethod(
                              e.target.value as
                                | "cash"
                                | "bankak"
                                | "fawry"
                                | "ocash",
                            )
                          }
                          startAdornment={
                            <InputAdornment position="start" sx={{ pl: 1 }}>
                              <CreditCard size={16} />
                            </InputAdornment>
                          }
                        >
                          <MenuItem value="cash">نقدي</MenuItem>
                          <MenuItem value="bankak">بنكك</MenuItem>
                          <MenuItem value="fawry">فوري</MenuItem>
                          <MenuItem value="ocash">أوكاش</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>

                  <Box>
                    <FormControl size="small" fullWidth required>
                      <InputLabel id="return-reason-label">
                        سبب الإرجاع
                      </InputLabel>
                      <Select
                        labelId="return-reason-label"
                        label="سبب الإرجاع"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start" sx={{ pl: 1 }}>
                            <FileText size={16} />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="خطأ تقني / في السيستم">
                          خطأ تقني / في السيستم
                        </MenuItem>
                        <MenuItem value="إلغاء من العميل">
                          إلغاء من العميل
                        </MenuItem>
                        <MenuItem value="تالف / معيب">تالف / معيب</MenuItem>
                        <MenuItem value="خطأ في الطلب">
                          خطأ في الطلب / صنف خاطئ
                        </MenuItem>
                        <MenuItem value="أخرى">أخرى</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 1.5, px: 2, bgcolor: "background.paper" }}>
        <Button
          onClick={handleDialogClose}
          disabled={submitting}
          color="inherit"
          sx={{ fontWeight: 600 }}
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            submitting ||
            !fetchedSale ||
            selectedList.length === 0 ||
            !phoneNumber.trim() ||
            !reason
          }
          sx={{ fontWeight: 600, px: 3 }}
        >
          {submitting ? "جاري الحفظ..." : "تأكيد واسترجاع"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SalesReturnDialog;
