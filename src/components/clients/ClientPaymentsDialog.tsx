import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import { X, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import clientLedgerService, { ClientPayment } from "@/services/clientLedgerService";

const METHOD_LABELS: Record<string, string> = {
  cash: "كاش",
  bank_transfer: "تحويل بنكي",
  visa: "فيزا",
  other: "أخرى",
};

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
}

export const ClientPaymentsDialog: React.FC<Props> = ({ open, onClose, clientId, clientName }) => {
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await clientLedgerService.getPayments(clientId, dateFrom || undefined, dateTo || undefined);
      setPayments(res.payments);
      setTotal(res.total);
    } catch {
      toast.error("فشل تحميل المدفوعات");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, dateFrom, dateTo]);

  useEffect(() => {
    if (open) fetchPayments();
    else { setPayments([]); setTotal(0); setDateFrom(""); setDateTo(""); }
  }, [open]);

  // Re-fetch when filter changes (debounced)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(fetchPayments, 400);
    return () => clearTimeout(t);
  }, [dateFrom, dateTo, open]);

  const handlePrint = () => {
    const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const rows = payments.map((p, i) => `
      <tr>
        <td>${payments.length - i}</td>
        <td>${p.payment_date}</td>
        <td>${p.sale_id}</td>
        <td>${METHOD_LABELS[p.method] ?? p.method}</td>
        <td dir="ltr" style="text-align:right">${fmt(p.amount)}</td>
        <td>${p.reference_number ?? "—"}</td>
      </tr>`).join("");

    const filterNote = (dateFrom || dateTo)
      ? `<p style="font-size:12px;color:#666">الفترة: ${dateFrom || "—"} إلى ${dateTo || "—"}</p>`
      : "";

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>سجل مدفوعات — ${clientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; padding: 24px; direction: rtl; }
    h2 { font-size: 16px; margin-bottom: 4px; }
    p { margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f3f4f6; padding: 7px 10px; font-size: 12px; border: 1px solid #e5e7eb; text-align: right; }
    td { padding: 6px 10px; border: 1px solid #e5e7eb; font-size: 12px; }
    tr:nth-child(even) td { background: #f9fafb; }
    .total-row td { font-weight: 700; background: #f0fdf4; border-top: 2px solid #16a34a; }
    @media print { @page { margin: 15mm; } }
  </style>
</head>
<body>
  <h2>سجل مدفوعات العميل: ${clientName}</h2>
  ${filterNote}
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>تاريخ الدفع</th>
        <th>رقم الفاتورة</th>
        <th>طريقة الدفع</th>
        <th>المبلغ</th>
        <th>المرجع</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="4" style="text-align:left">الإجمالي (${payments.length} دفعة)</td>
        <td dir="ltr" style="text-align:right">${fmt(total)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank", "width=850,height=650");
    if (!win) { toast.error("تعذّر فتح نافذة الطباعة"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { maxHeight: "90vh", display: "flex", flexDirection: "column" } }}>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", gap: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          سجل المدفوعات — {clientName}
        </Typography>
        {!isLoading && (
          <Chip
            label={`${payments.length} دفعة`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 22, fontSize: "0.72rem" }}
          />
        )}
        <IconButton size="small" onClick={onClose}><X size={16} /></IconButton>
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>الفترة:</Typography>
        <TextField
          size="small"
          type="date"
          label="من"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 155 }}
        />
        <TextField
          size="small"
          type="date"
          label="إلى"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 155 }}
        />
        {(dateFrom || dateTo) && (
          <Button size="small" variant="text" onClick={() => { setDateFrom(""); setDateTo(""); }}
            sx={{ textTransform: "none", fontSize: "0.75rem" }}>
            مسح الفلتر
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={fetchPayments} disabled={isLoading} title="تحديث">
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, flex: 1, overflow: "auto" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6, gap: 1.5 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">جاري التحميل...</Typography>
          </Box>
        ) : payments.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="body2" color="text.secondary">لا توجد مدفوعات في هذه الفترة</Typography>
          </Box>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ "& th": { bgcolor: "grey.50", fontWeight: 700, fontSize: "0.75rem" } }}>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>تاريخ الدفع</TableCell>
                <TableCell>فاتورة</TableCell>
                <TableCell>طريقة الدفع</TableCell>
                <TableCell align="right">المبلغ</TableCell>
                <TableCell>المرجع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p, i) => (
                <TableRow key={p.id} sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell sx={{ fontSize: "0.75rem", color: "text.disabled" }}>{payments.length - i}</TableCell>
                  <TableCell sx={{ fontSize: "0.8rem" }}>{p.payment_date}</TableCell>
                  <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>#{p.sale_id}</TableCell>
                  <TableCell>
                    <Chip
                      label={METHOD_LABELS[p.method] ?? p.method}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: "0.7rem" }}
                    />
                  </TableCell>
                  <TableCell align="right" dir="ltr" sx={{ fontSize: "0.82rem", fontWeight: 600, color: "success.dark" }}>
                    {fmt(p.amount)}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                    {p.reference_number ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      {/* Footer with total + actions */}
      <Box sx={{ borderTop: 1, borderColor: "divider" }}>
        {payments.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2, py: 1, bgcolor: "grey.50" }}>
            <Typography variant="body2" color="text.secondary" ml={1}>الإجمالي:</Typography>
            <Typography variant="body2" fontWeight={700} color="success.dark" dir="ltr" sx={{ minWidth: 100, textAlign: "right" }}>
              {fmt(total)}
            </Typography>
          </Box>
        )}
        <Divider />
        <DialogActions sx={{ px: 2, py: 1 }}>
          <Button size="small" variant="outlined" onClick={onClose}>إغلاق</Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<Printer size={14} />}
            onClick={handlePrint}
            disabled={payments.length === 0}
            sx={{ "& .MuiButton-startIcon": { ml: "4px" } }}
          >
            طباعة / PDF
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
