import React, { useState, useMemo } from "react";
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
  Checkbox,
  Divider,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
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
  CheckCircle2,
} from "lucide-react";
import saleReturnService, {
  CreateSaleReturnData,
  SimpleSaleReturnItemInput,
} from "@/services/saleReturnService";
import saleService, { Sale, SaleItem } from "@/services/saleService";
import { toast } from "sonner";
import { PastSalesSearchDialog } from "./PastSalesSearchDialog";

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
  const [selectedReturns, setSelectedReturns] = useState<Record<number, SelectedReturn>>({});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bankak" | "fawry" | "ocash">("cash");
  const [submitting, setSubmitting] = useState(false);
  const [pastSalesDialogOpen, setPastSalesDialogOpen] = useState(false);

  const handleSelectPastSale = (id: number) => {
    setSaleIdInput(id.toString());
    performSearchSale(id);
  };

  const performSearchSale = async (id: number) => {
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

  const handleSearchSale = async () => {
    const id = Number(saleIdInput.trim());
    await performSearchSale(id);
  };

  const toggleItemSelected = (item: SaleItem) => {
    const pid = item.product_id;
    const price = Number(item.unit_price) || 0;
    const qty = item.quantity ?? 0;
    setSelectedReturns((prev) => {
      const next = { ...prev };
      if (next[pid]) { delete next[pid]; return next; }
      next[pid] = { product_id: pid, quantity: qty, price, returnQuantity: 1 };
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
    if (!fetchedSale) { toast.error("ابحث عن الفاتورة أولاً"); return; }
    if (selectedList.length === 0) { toast.error("اختر صنفاً واحداً على الأقل للإرجاع"); return; }
    if (!phoneNumber.trim()) { toast.error("رقم الهاتف مطلوب"); return; }
    if (!reason.trim()) { toast.error("سبب المردود مطلوب"); return; }

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
    } catch (err: unknown) {
      const friendly =
        (err as { friendlyMessage?: string })?.friendlyMessage ||
        "فشل إنشاء مردود المبيعات. حاول مرة أخرى.";
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = () => { if (submitting) return; onClose(); };

  const resetSaleSection = () => {
    setFetchedSale(null);
    setSaleIdInput("");
    setSaleLoadError(null);
    setSelectedReturns({});
  };

  const canSubmit =
    !submitting &&
    !!fetchedSale &&
    selectedList.length > 0 &&
    phoneNumber.trim() !== "" &&
    reason.trim() !== "";

  return (
    <>
      <Dialog
        open={open}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}
      >
        {/* Header */}
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          px: 2.5, py: 1.5,
          borderBottom: 1, borderColor: "divider",
        }}>
          <RotateCcw size={18} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
            إنشاء مردود مبيعات
          </Typography>
          <IconButton size="small" onClick={handleDialogClose} disabled={submitting}>
            <X size={16} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column" }}>

          {/* Step 1 — Sale Search */}
          <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <FileText size={12} /> البحث عن الفاتورة
            </Typography>

            <Stack direction="row" gap={1}>
              <TextField
                size="small"
                placeholder="رقم الفاتورة..."
                value={saleIdInput}
                onChange={(e) => { setSaleIdInput(e.target.value); setSaleLoadError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSale()}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={14} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button variant="contained" size="small" onClick={handleSearchSale}
                disabled={saleLoading || !saleIdInput.trim()}
                sx={{ textTransform: "none", minWidth: 72 }}>
                {saleLoading ? <CircularProgress size={14} color="inherit" /> : "بحث"}
              </Button>
              <Button variant="outlined" size="small" onClick={() => setPastSalesDialogOpen(true)}
                startIcon={<History size={14} />}
                sx={{ textTransform: "none", "& .MuiButton-startIcon": { ml: "4px" } }}>
                سابقة
              </Button>
            </Stack>

            {saleLoadError && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1, color: "error.main" }}>
                <AlertCircle size={14} />
                <Typography variant="caption" color="error">{saleLoadError}</Typography>
              </Box>
            )}

            {fetchedSale && (
              <Box sx={{
                mt: 1.5, display: "flex", alignItems: "center", gap: 1,
                px: 1.5, py: 1, bgcolor: "success.50", borderRadius: 1.5,
                border: 1, borderColor: "success.200",
              }}>
                <CheckCircle2 size={15} color="var(--mui-palette-success-main)" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} fontSize="0.8rem">
                    فاتورة #{fetchedSale.id}
                    {fetchedSale.client_name && ` — ${fetchedSale.client_name}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fetchedSale.sale_date} · إجمالي: {Number(fetchedSale.total_amount ?? 0).toFixed(2)}
                  </Typography>
                </Box>
                <Button size="small" color="inherit" onClick={resetSaleSection}
                  sx={{ textTransform: "none", fontSize: "0.72rem", minWidth: 0, px: 1 }}>
                  تغيير
                </Button>
              </Box>
            )}
          </Box>

          {/* Step 2 — Items */}
          {fetchedSale && (
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Box sx={{ px: 2.5, pt: 1.5, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                  الأصناف المراد إرجاعها
                </Typography>
                {selectedList.length > 0 && (
                  <Chip label={`${selectedList.length} أصناف`} size="small" color="primary"
                    sx={{ height: 18, fontSize: "0.68rem" }} />
                )}
              </Box>
              <Divider />
              <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
                {(fetchedSale.items ?? []).map((item) => {
                  const pid = item.product_id;
                  const selected = selectedReturns[pid];
                  const price = Number(item.unit_price) || 0;
                  const returnedQty = item.returned_quantity || 0;
                  const maxQty = (item.quantity ?? 0) - returnedQty;
                  if (maxQty <= 0) return null;

                  return (
                    <Box
                      key={item.id ?? pid}
                      onClick={() => toggleItemSelected(item)}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5,
                        px: 2, py: 1, cursor: "pointer",
                        bgcolor: selected ? "primary.50" : "transparent",
                        borderBottom: "1px solid", borderColor: "divider",
                        transition: "background 0.15s",
                        "&:last-child": { borderBottom: 0 },
                        "&:hover": { bgcolor: selected ? "primary.50" : "action.hover" },
                      }}
                    >
                      <Checkbox
                        checked={!!selected}
                        size="small"
                        sx={{ p: 0 }}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontSize="0.82rem" fontWeight={selected ? 600 : 400} noWrap dir="auto">
                          {item.product?.name ?? item.product_name ?? `#${pid}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          الكمية: {maxQty}
                          {returnedQty > 0 && ` (مرتجع سابقاً: ${returnedQty})`}
                          &nbsp;·&nbsp;{price.toFixed(2)} / وحدة
                        </Typography>
                      </Box>
                      {selected && (
                        <TextField
                          size="small"
                          type="number"
                          label="الكمية"
                          value={selected.returnQuantity}
                          onChange={(e) => setReturnQuantity(pid, Number(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          inputProps={{ min: 1, max: maxQty, step: 1 }}
                          sx={{ width: 90 }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>

              {selectedList.length > 0 && (
                <Box sx={{
                  px: 2.5, py: 1.5,
                  bgcolor: "background.default",
                  borderTop: 1, borderColor: "divider",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <Typography variant="caption" color="text.secondary">إجمالي المردود</Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="error.main" dir="ltr">
                    {totalReturnedAmount.toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Step 3 — Details */}
          {fetchedSale && selectedList.length > 0 && (
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1.5 }}>
                تفاصيل المردود
              </Typography>

              <Stack spacing={1.5}>
                <Stack direction="row" gap={1.5}>
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
                        <InputAdornment position="start"><Phone size={14} /></InputAdornment>
                      ),
                    }}
                  />
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>طريقة السداد</InputLabel>
                    <Select
                      value={paymentMethod}
                      label="طريقة السداد"
                      onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                      startAdornment={
                        <InputAdornment position="start" sx={{ pl: 1 }}>
                          <CreditCard size={14} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="cash">نقدي</MenuItem>
                      <MenuItem value="bankak">بنكك</MenuItem>
                      <MenuItem value="fawry">فوري</MenuItem>
                      <MenuItem value="ocash">أوكاش</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <FormControl size="small" fullWidth required>
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
                    <MenuItem value="خطأ تقني / في السيستم">خطأ تقني / في السيستم</MenuItem>
                    <MenuItem value="إلغاء من العميل">إلغاء من العميل</MenuItem>
                    <MenuItem value="تالف / معيب">تالف / معيب</MenuItem>
                    <MenuItem value="خطأ في الطلب">خطأ في الطلب / صنف خاطئ</MenuItem>
                    <MenuItem value="أخرى">أخرى</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          )}
        </DialogContent>

        {/* Footer */}
        <Box sx={{
          display: "flex", justifyContent: "flex-end", gap: 1,
          px: 2.5, py: 1.5,
          borderTop: 1, borderColor: "divider",
          bgcolor: "background.paper",
        }}>
          <Button onClick={handleDialogClose} disabled={submitting} color="inherit"
            size="small" sx={{ textTransform: "none" }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="small"
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={13} color="inherit" /> : <RotateCcw size={14} />}
            sx={{ textTransform: "none", "& .MuiButton-startIcon": { ml: "6px" } }}
          >
            {submitting ? "جاري الحفظ..." : "تأكيد المردود"}
          </Button>
        </Box>
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
