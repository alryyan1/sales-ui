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
} from "@mui/material";
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
    () =>
      selectedList.reduce(
        (sum, r) => sum + r.returnQuantity * r.price,
        0,
      ),
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
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
      <DialogTitle>مردود مبيعات</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Sale ID search */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <TextField
              size="small"
              label="رقم الفاتورة"
              value={saleIdInput}
              onChange={(e) => {
                setSaleIdInput(e.target.value);
                setSaleLoadError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSale()}
              sx={{ minWidth: 140 }}
              placeholder="مثال: 123"
            />
            <Button
              variant="contained"
              onClick={handleSearchSale}
              disabled={saleLoading}
              sx={{ textTransform: "none" }}
            >
              {saleLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "بحث"
              )}
            </Button>
            {fetchedSale && (
              <Button
                size="small"
                variant="text"
                onClick={resetSaleSection}
                sx={{ textTransform: "none" }}
              >
                تغيير الفاتورة
              </Button>
            )}
          </Box>
          {saleLoadError && (
            <Typography variant="body2" color="error">
              {saleLoadError}
            </Typography>
          )}

          {/* Sale summary and items */}
          {fetchedSale && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                فاتورة #{fetchedSale.id}
                {fetchedSale.client_name && ` — ${fetchedSale.client_name}`}
                {" — إجمالي: "}
                {Number(fetchedSale.total_amount ?? 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                اختر الأصناف المراد إرجاعها وحدد كمية الإرجاع:
              </Typography>
              {(fetchedSale.items ?? []).map((item) => {
                const pid = item.product_id;
                const selected = selectedReturns[pid];
                const price = Number(item.unit_price) || 0;
                const maxQty = item.quantity ?? 0;
                return (
                  <Box
                    key={item.id ?? pid}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                      py: 0.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={!!selected}
                      onChange={() => toggleItemSelected(item)}
                    />
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      {item.product?.name ?? item.product_name ?? `#${pid}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      مباع: {maxQty} × {price.toFixed(2)}
                    </Typography>
                    {selected && (
                      <TextField
                        size="small"
                        type="number"
                        label="كمية الإرجاع"
                        value={selected.returnQuantity}
                        onChange={(e) =>
                          setReturnQuantity(pid, Number(e.target.value) || 0)
                        }
                        inputProps={{ min: 1, max: maxQty, step: 1 }}
                        sx={{ width: 100 }}
                      />
                    )}
                  </Box>
                );
              })}
              {selectedList.length > 0 && (
                <Box sx={{ mt: 1, textAlign: "right" }}>
                  <Typography variant="body2" fontWeight={600}>
                    إجمالي قيمة الإرجاع: {totalReturnedAmount.toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Phone number */}
          <TextField
            size="small"
            label="رقم الهاتف"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="مثال: 249991961111"
            fullWidth
          />

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
          disabled={
            submitting || !fetchedSale || selectedList.length === 0
          }
        >
          {submitting ? "جاري الحفظ..." : "إنشاء مردود"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SalesReturnDialog;
