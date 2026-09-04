import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Search,
  AlertCircle,
  Phone,
  FileText,
  CreditCard,
  RotateCcw,
  X,
  History,
  Minus,
  Plus,
  Receipt,
  User as UserIcon,
  CalendarDays,
} from "lucide-react";
import saleReturnService, {
  CreateSaleReturnData,
  SimpleSaleReturnItemInput,
} from "@/services/saleReturnService";
import saleService, { Sale, SaleItem } from "@/services/saleService";
import { formatNumber } from "@/constants";
import { toast } from "sonner";
import { PastSalesSearchDialog } from "./PastSalesSearchDialog";
import { useSettings } from "@/context/SettingsContext";
import {
  parseActivePaymentMethods,
  resolveDefaultActiveMethod,
  type PaymentMethod,
} from "@/lib/paymentMethods";

interface SalesReturnDialogProps {
  open: boolean;
  onClose: () => void;
  shiftId: number | null;
}

interface ReturnRow {
  product_id: number;
  maxQty: number;
  price: number;
  returnQuantity: number;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدي",
  bankak: "بنكك",
  fawry: "فوري",
  ocash: "أوكاش",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة",
};

const RETURN_REASONS = [
  "خطأ تقني / في السيستم",
  "إلغاء من العميل",
  "تالف / معيب",
  "خطأ في الطلب / صنف خاطئ",
  "أخرى",
];

const availableQty = (item: SaleItem): number =>
  (item.quantity ?? 0) - (item.returned_quantity ?? 0);

export const SalesReturnDialog: React.FC<SalesReturnDialogProps> = ({
  open,
  onClose,
  shiftId,
}) => {
  const [saleIdInput, setSaleIdInput] = useState("");
  const [fetchedSale, setFetchedSale] = useState<Sale | null>(null);
  const [saleLoadError, setSaleLoadError] = useState<string | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [rows, setRows] = useState<Record<number, ReturnRow>>({});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [pastSalesDialogOpen, setPastSalesDialogOpen] = useState(false);

  const { getSetting } = useSettings();
  const activePaymentMethods = parseActivePaymentMethods(getSetting("pos_active_payment_methods"));
  const paymentMethodOptions = activePaymentMethods.map((value) => ({
    value,
    label: PAYMENT_METHOD_LABELS[value],
  }));

  useEffect(() => {
    if (!open) {
      setSaleIdInput("");
      setFetchedSale(null);
      setSaleLoadError(null);
      setRows({});
      setPhoneNumber("");
      setReason("");
      setPaymentMethod(resolveDefaultActiveMethod(activePaymentMethods, "cash"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the selection valid if the active-methods setting narrows while the dialog is open.
  useEffect(() => {
    setPaymentMethod((prev) => resolveDefaultActiveMethod(activePaymentMethods, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePaymentMethods.join(",")]);

  const returnableItems = useMemo(
    () => (fetchedSale?.items ?? []).filter((i) => availableQty(i) > 0),
    [fetchedSale],
  );

  const performSearchSale = async (id: number): Promise<void> => {
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
      setRows({});
    } catch {
      setFetchedSale(null);
      setSaleLoadError("لا توجد فاتورة بهذا الرقم");
    } finally {
      setSaleLoading(false);
    }
  };

  const handleSearchSale = async (): Promise<void> => {
    await performSearchSale(Number(saleIdInput.trim()));
  };

  const handleSelectPastSale = (id: number): void => {
    setSaleIdInput(id.toString());
    performSearchSale(id);
  };

  const toggleRow = (item: SaleItem): void => {
    const pid = item.product_id;
    const max = availableQty(item);
    setRows((prev) => {
      const next = { ...prev };
      if (next[pid]) {
        delete next[pid];
      } else {
        next[pid] = {
          product_id: pid,
          maxQty: max,
          price: Number(item.unit_price) || 0,
          returnQuantity: max,
        };
      }
      return next;
    });
  };

  const setRowQuantity = (productId: number, value: number): void => {
    setRows((prev) => {
      const entry = prev[productId];
      if (!entry) {
        return prev;
      }
      const clamped = Math.max(1, Math.min(entry.maxQty, Math.floor(value) || 1));
      return { ...prev, [productId]: { ...entry, returnQuantity: clamped } };
    });
  };

  const allSelected =
    returnableItems.length > 0 &&
    returnableItems.every((i) => rows[i.product_id]);

  const toggleSelectAll = (): void => {
    if (allSelected) {
      setRows({});
      return;
    }
    const next: Record<number, ReturnRow> = {};
    returnableItems.forEach((item) => {
      const max = availableQty(item);
      next[item.product_id] = {
        product_id: item.product_id,
        maxQty: max,
        price: Number(item.unit_price) || 0,
        returnQuantity: max,
      };
    });
    setRows(next);
  };

  const selectedList = useMemo(
    () => Object.values(rows).filter((r) => r.returnQuantity >= 1),
    [rows],
  );

  const totalRefund = useMemo(
    () => selectedList.reduce((sum, r) => sum + r.returnQuantity * r.price, 0),
    [selectedList],
  );

  const totalUnits = useMemo(
    () => selectedList.reduce((sum, r) => sum + r.returnQuantity, 0),
    [selectedList],
  );

  const canSubmit =
    !submitting &&
    !!fetchedSale &&
    selectedList.length > 0 &&
    phoneNumber.trim() !== "" &&
    reason.trim() !== "";

  const handleSubmit = async (): Promise<void> => {
    if (!fetchedSale) {
      toast.error("ابحث عن الفاتورة أولاً");
      return;
    }
    if (selectedList.length === 0) {
      toast.error("اختر صنفاً واحداً على الأقل للإرجاع");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("رقم الهاتف مطلوب");
      return;
    }
    if (!reason.trim()) {
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
      onClose();
    } catch (err: unknown) {
      const friendly =
        (err as { friendlyMessage?: string })?.friendlyMessage ||
        "فشل إنشاء مردود المبيعات. حاول مرة أخرى.";
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = (): void => {
    if (submitting) {
      return;
    }
    onClose();
  };

  const resetSaleSection = (): void => {
    setFetchedSale(null);
    setSaleIdInput("");
    setSaleLoadError(null);
    setRows({});
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, overflow: "hidden", height: fetchedSale ? "90vh" : "auto" },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 3,
            py: 1.75,
            bgcolor: "error.main",
            color: "error.contrastText",
          }}
        >
          <RotateCcw size={20} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
            إنشاء مردود مبيعات
          </Typography>
          <IconButton
            size="small"
            onClick={handleDialogClose}
            disabled={submitting}
            sx={{ color: "inherit" }}
          >
            <X size={18} />
          </IconButton>
        </Box>

        <DialogContent
          sx={{ p: 0, display: "flex", flexDirection: "column", bgcolor: "background.default" }}
        >
          {/* Step 1 — Sale Search */}
          {!fetchedSale && (
            <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
              <Receipt
                size={40}
                style={{ opacity: 0.35, marginBottom: 12 }}
              />
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                ابحث عن الفاتورة المراد الإرجاع منها
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
                أدخل رقم الفاتورة أو اختر من الفواتير السابقة
              </Typography>

              <Stack
                direction="row"
                gap={1}
                sx={{ maxWidth: 460, mx: "auto" }}
              >
                <TextField
                  size="small"
                  autoFocus
                  placeholder="رقم الفاتورة..."
                  value={saleIdInput}
                  onChange={(e) => {
                    setSaleIdInput(e.target.value);
                    setSaleLoadError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSale()}
                  sx={{ flex: 1, bgcolor: "background.paper" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={15} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearchSale}
                  disabled={saleLoading || !saleIdInput.trim()}
                  sx={{ textTransform: "none", minWidth: 84 }}
                >
                  {saleLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    "بحث"
                  )}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setPastSalesDialogOpen(true)}
                  startIcon={<History size={15} />}
                  sx={{
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    "& .MuiButton-startIcon": { ml: "4px" },
                  }}
                >
                  سابقة
                </Button>
              </Stack>

              {saleLoadError && (
                <Alert
                  severity="error"
                  icon={<AlertCircle size={16} />}
                  sx={{ mt: 2, maxWidth: 460, mx: "auto", py: 0.25 }}
                >
                  {saleLoadError}
                </Alert>
              )}
            </Box>
          )}

          {fetchedSale && (
            <>
              {/* Invoice summary strip */}
              <Box
                sx={{
                  px: 3,
                  py: 1.5,
                  bgcolor: "background.paper",
                  borderBottom: 1,
                  borderColor: "divider",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 3 },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Receipt size={15} />
                  <Typography variant="body2" fontWeight={700}>
                    فاتورة #{fetchedSale.id}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                  <UserIcon size={13} />
                  <Typography variant="caption">
                    {fetchedSale.client_name ?? fetchedSale.client?.name ?? "عميل نقدي"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                  <CalendarDays size={13} />
                  <Typography variant="caption">{fetchedSale.sale_date}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                  <Typography variant="caption">
                    الإجمالي: {formatNumber(fetchedSale.total_amount, 2)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }} />
                <Button
                  size="small"
                  color="inherit"
                  onClick={resetSaleSection}
                  startIcon={<Search size={13} />}
                  sx={{ textTransform: "none", "& .MuiButton-startIcon": { ml: "4px" } }}
                >
                  تغيير الفاتورة
                </Button>
              </Box>

              {/* Items table */}
              <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ display: "block", mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                  الأصناف
                </Typography>

                {returnableItems.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    كل أصناف هذه الفاتورة تم إرجاعها بالكامل.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined" dir="ltr" sx={{ borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "background.default" } }}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={allSelected}
                              indeterminate={selectedList.length > 0 && !allSelected}
                              onChange={toggleSelectAll}
                            />
                          </TableCell>
                          <TableCell>الصنف</TableCell>
                          <TableCell align="center">سعر الوحدة</TableCell>
                          <TableCell align="center">مباع</TableCell>
                          <TableCell align="center">أُرجع سابقاً</TableCell>
                          <TableCell align="center">متاح للإرجاع</TableCell>
                          <TableCell align="center" sx={{ minWidth: 140 }}>
                            كمية الإرجاع
                          </TableCell>
                          <TableCell align="right">قيمة المردود</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(fetchedSale.items ?? []).map((item) => {
                          const pid = item.product_id;
                          const price = Number(item.unit_price) || 0;
                          const sold = item.quantity ?? 0;
                          const returnedBefore = item.returned_quantity ?? 0;
                          const maxQty = sold - returnedBefore;
                          const row = rows[pid];
                          const isReturned = maxQty <= 0;

                          return (
                            <TableRow
                              key={item.id ?? pid}
                              hover={!isReturned}
                              onClick={() => !isReturned && toggleRow(item)}
                              selected={!!row}
                              sx={{
                                cursor: isReturned ? "default" : "pointer",
                                opacity: isReturned ? 0.5 : 1,
                              }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  size="small"
                                  checked={!!row}
                                  disabled={isReturned}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => toggleRow(item)}
                                />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 220 }}>
                                <Typography
                                  variant="body2"
                                  fontSize="0.82rem"
                                  fontWeight={row ? 700 : 400}
                                  noWrap
                                  dir="auto"
                                >
                                  {item.product?.name ?? item.product_name ?? `#${pid}`}
                                </Typography>
                                {isReturned && (
                                  <Typography variant="caption" color="text.secondary">
                                    أُرجع بالكامل
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">{formatNumber(price, 2)}</TableCell>
                              <TableCell align="center">{sold}</TableCell>
                              <TableCell align="center">
                                {returnedBefore > 0 ? returnedBefore : "—"}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={maxQty > 0 ? maxQty : 0}
                                  size="small"
                                  color={maxQty > 0 ? "default" : "error"}
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: "0.72rem" }}
                                />
                              </TableCell>
                              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                {row ? (
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={0.5}
                                  >
                                    <IconButton
                                      size="small"
                                      disabled={row.returnQuantity <= 1}
                                      onClick={() =>
                                        setRowQuantity(pid, row.returnQuantity - 1)
                                      }
                                    >
                                      <Minus size={13} />
                                    </IconButton>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={row.returnQuantity}
                                      onChange={(e) =>
                                        setRowQuantity(pid, Number(e.target.value))
                                      }
                                      inputProps={{
                                        min: 1,
                                        max: maxQty,
                                        step: 1,
                                        style: { textAlign: "center", padding: "4px" },
                                      }}
                                      sx={{ width: 54 }}
                                    />
                                    <IconButton
                                      size="small"
                                      disabled={row.returnQuantity >= maxQty}
                                      onClick={() =>
                                        setRowQuantity(pid, row.returnQuantity + 1)
                                      }
                                    >
                                      <Plus size={13} />
                                    </IconButton>
                                  </Stack>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">
                                    —
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {row ? (
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color="error.main"
                                    dir="ltr"
                                  >
                                    {formatNumber(row.returnQuantity * price, 2)}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">
                                    —
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Details */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ display: "block", mt: 3, mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                  تفاصيل المردود
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1.5}
                  sx={{ bgcolor: "background.paper", p: 2, borderRadius: 1.5, border: 1, borderColor: "divider" }}
                >
                  <TextField
                    size="small"
                    label="رقم الهاتف"
                    value={phoneNumber}
                    required
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="رقم هاتف العميل"
                    sx={{ flex: 1 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone size={14} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl size="small" sx={{ flex: 1 }} required>
                    <InputLabel>طريقة رد المبلغ</InputLabel>
                    <Select
                      value={paymentMethod}
                      label="طريقة رد المبلغ"
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as PaymentMethod)
                      }
                      startAdornment={
                        <InputAdornment position="start" sx={{ pl: 1 }}>
                          <CreditCard size={14} />
                        </InputAdornment>
                      }
                    >
                      {paymentMethodOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: 1.4 }} required>
                    <InputLabel>سبب الإرجاع</InputLabel>
                    <Select
                      value={reason}
                      label="سبب الإرجاع"
                      onChange={(e) => setReason(e.target.value)}
                      startAdornment={
                        <InputAdornment position="start" sx={{ pl: 1 }}>
                          <FileText size={14} />
                        </InputAdornment>
                      }
                    >
                      {RETURN_REASONS.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Box>
            </>
          )}
        </DialogContent>

        {/* Footer */}
        {fetchedSale && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              px: 3,
              py: 1.5,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Stack direction="row" spacing={3} sx={{ flex: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  الأصناف
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {selectedList.length}
                  {totalUnits > 0 && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {" "}
                      ({totalUnits} وحدة)
                    </Typography>
                  )}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  إجمالي المبلغ المسترد
                </Typography>
                <Typography variant="h6" fontWeight={800} color="error.main" dir="ltr">
                  {formatNumber(totalRefund, 2)}
                </Typography>
              </Box>
            </Stack>

            <Button
              onClick={handleDialogClose}
              disabled={submitting}
              color="inherit"
              sx={{ textTransform: "none" }}
            >
              إلغاء
            </Button>
            <Tooltip
              title={
                !canSubmit && !submitting
                  ? "اختر صنفاً وأدخل رقم الهاتف وسبب الإرجاع"
                  : ""
              }
            >
              <span>
                <Button
                  onClick={handleSubmit}
                  variant="contained"
                  color="error"
                  disabled={!canSubmit}
                  startIcon={
                    submitting ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <RotateCcw size={15} />
                    )
                  }
                  sx={{ textTransform: "none", "& .MuiButton-startIcon": { ml: "6px" } }}
                >
                  {submitting ? "جاري الحفظ..." : "تأكيد المردود"}
                </Button>
              </span>
            </Tooltip>
          </Box>
        )}
      </Dialog>

      <PastSalesSearchDialog
        open={pastSalesDialogOpen}
        onClose={() => setPastSalesDialogOpen(false)}
        onSelectSale={handleSelectPastSale}
      />
    </>
  );
};

export default SalesReturnDialog;
