// src/pages/clients/ClientLedgerPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pdf } from "@react-pdf/renderer";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Stack,
  Paper,
  Divider,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  X,
} from "lucide-react";

import clientLedgerService, {
  ClientLedger,
  ClientLedgerEntry,
} from "@/services/clientLedgerService";
import { ClientLedgerPdf } from "@/components/clients/ClientLedgerPdf";
import { OfflineInvoiceA4Pdf } from "@/components/pos/OfflineInvoiceA4Pdf";
import saleService from "@/services/saleService";
import { OfflineSale, OfflineSaleItem } from "@/services/db";
import { useSettings } from "@/context/SettingsContext";

const ClientLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = Number(id);

  const { settings } = useSettings();
  const [ledger, setLedger] = useState<ClientLedger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleDate, setSettleDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [settleMethod, setSettleMethod] = useState<string>("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [fetchingSaleId, setFetchingSaleId] = useState<number | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleSaleClick = async (entry: ClientLedgerEntry) => {
    if (entry.type !== "sale" || !entry.sale_id) return;

    setFetchingSaleId(entry.sale_id);
    setError(null);

    try {
      // Fetch full sale details including items
      const sale = await saleService.getSale(entry.sale_id);

      if (!sale) {
        throw new Error("لم يتم العثور على بيانات العملية");
      }

      // Map Sale to OfflineSale format for the PDF component
      const offlineSale: OfflineSale = {
        ...sale,
        tempId: String(sale.id),
        offline_created_at: new Date(sale.created_at).getTime(),
        is_synced: true,
        items: (sale.items || []).map((item) => ({
          ...item,
          product_name: item.product_name || item.product?.name,
          unit_price: Number(item.unit_price),
        })) as OfflineSaleItem[],
        status: (sale.status as any) || "completed",
        client_id: sale.client_id,
        client_name: sale.client_name || sale.client?.name,
      };

      // Create the PDF document
      const doc = (
        <OfflineInvoiceA4Pdf
          sale={offlineSale}
          items={offlineSale.items}
          settings={settings}
          userName={sale.user_name || ""}
        />
      );

      // Generate blob
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      // Create blob URL
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfDialogOpen(true);
    } catch (err: any) {
      console.error("Error generating invoice PDF:", err);
      setError(err.message || "فشل في إنشاء فاتورة PDF");
    } finally {
      setFetchingSaleId(null);
    }
  };

  const fetchLedger = async () => {
    if (!clientId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientLedgerService.getLedger(clientId);
      setLedger(data);
    } catch (err) {
      setError(clientLedgerService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Clean up PDF URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDownloadPdf = async () => {
    if (!ledger) return;

    setIsGeneratingPdf(true);
    try {
      // Create the PDF document
      const doc = (
        <ClientLedgerPdf
          ledger={ledger}
          settings={settings}
          companyName={settings?.company_name || "اسم الشركة"}
        />
      );

      // Generate blob
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      // Create blob URL and open in new tab
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("فشل في إنشاء ملف PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSettle = async () => {
    if (!clientId) return;
    const amountNum = parseFloat(settleAmount);
    if (!amountNum || amountNum <= 0) {
      setError("المبلغ غير صالح");
      return;
    }
    setIsSubmitting(true);
    try {
      await clientLedgerService.settleDebt(clientId, {
        amount: amountNum,
        payment_date: settleDate,
        method: settleMethod,
        reference_number: reference || undefined,
        notes: notes || undefined,
      });
      setSettleDialogOpen(false);
      setSettleAmount("");
      setReference("");
      setNotes("");
      await fetchLedger();
    } catch (e) {
      setError(clientLedgerService.getErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (
    type: ClientLedgerEntry["type"]
  ): "error" | "success" | "default" => {
    switch (type) {
      case "sale":
        return "error";
      case "payment":
        return "success";
      default:
        return "default";
    }
  };

  const getTypeLabel = (type: ClientLedgerEntry["type"]) => {
    switch (type) {
      case "sale":
        return "عملية بيع";
      case "payment":
        return "دفعة";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }} color="text.secondary">
          جاري التحميل...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>خطأ</AlertTitle>
          {error}
          <Button
            onClick={fetchLedger}
            sx={{ mt: 2 }}
            variant="outlined"
            size="small"
          >
            إعادة المحاولة
          </Button>
        </Alert>
      </Box>
    );
  }

  if (!ledger) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">كشف الحساب غير متوفر لهذا العميل.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <IconButton onClick={() => navigate("/clients")} size="small">
          <ArrowLeft />
        </IconButton>
        <Stack direction={"column"}>
          <Typography variant="h4" fontWeight="bold" sx={{ flex: 1 }}>
            كشف حساب العميل {ledger.client.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ledger.client.phone}
          </Typography>
        </Stack>
        <Button
          variant="outlined"
          startIcon={
            isGeneratingPdf ? <CircularProgress size={16} /> : <FileText />
          }
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          sx={{
            textTransform: "none",
            "& .MuiButton-startIcon": { marginLeft: "12px" },
          }}
        >
          {isGeneratingPdf ? "جاري الإنشاء..." : "فتح PDF"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<Wallet />}
          onClick={() => setSettleDialogOpen(true)}
        >
          تسوية الدين
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "error.50",
                  color: "error.main",
                }}
              >
                <TrendingUp size={24} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  إجمالي المبيعات
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {ledger.summary.total_sales.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "success.50",
                  color: "success.main",
                }}
              >
                <TrendingDown size={24} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  إجمالي الدفعات
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {ledger.summary.total_payments.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor:
                    ledger.summary.balance > 0 ? "error.50" : "success.50",
                  color:
                    ledger.summary.balance > 0 ? "error.main" : "success.main",
                }}
              >
                <DollarSign size={24} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  الرصيد الحالي
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  color={
                    ledger.summary.balance > 0 ? "error.main" : "success.main"
                  }
                >
                  {ledger.summary.balance.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Ledger Table */}
      <Card
        sx={{
          height: "calc(100vh - 120px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            حركات الحساب
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ flex: 1, overflow: "auto" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell align="center">التاريخ</TableCell>
                  <TableCell align="center">النوع</TableCell>
                  <TableCell align="center">الوصف</TableCell>
                  <TableCell align="center">مدين</TableCell>
                  <TableCell align="center">دائن</TableCell>
                  <TableCell align="center">الرصيد</TableCell>
                  <TableCell align="center">المرجع</TableCell>
                  <TableCell align="center">ملاحظات</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledger.ledger_entries.map((entry, index) => (
                  <TableRow
                    key={entry.id}
                    sx={{
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                      bgcolor:
                        index % 2 === 0 ? "background.paper" : "action.hover",
                    }}
                  >
                    <TableCell align="center">
                      {format(new Date(entry.date), "yyyy-MM-dd")}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={getTypeLabel(entry.type)}
                        color={getTypeColor(entry.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">{entry.description}</TableCell>
                    <TableCell align="center" dir="ltr">
                      {entry.debit > 0 ? entry.debit.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell align="center" dir="ltr">
                      {entry.credit > 0 ? entry.credit.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell align="center" dir="ltr">
                      <Typography
                        fontWeight="bold"
                        color={
                          entry.balance > 0 ? "error.main" : "success.main"
                        }
                      >
                        {entry.balance.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {entry.reference || "-"}
                    </TableCell>
                    <TableCell align="center">{entry.notes || "-"}</TableCell>
                    <TableCell align="center">
                      {entry.type === "sale" && entry.sale_id ? (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleSaleClick(entry)}
                          disabled={fetchingSaleId !== null}
                          startIcon={
                            fetchingSaleId === entry.sale_id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Receipt size={16} />
                            )
                          }
                          sx={{ minWidth: "fit-content" }}
                        >
                          {fetchingSaleId === entry.sale_id
                            ? "جاري التحميل..."
                            : "طباعه الفاتوره"}
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {ledger.ledger_entries.length === 0 && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  color: "text.secondary",
                }}
              >
                <Typography>لا توجد حركات في كشف الحساب.</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: "90vh", display: "flex", flexDirection: "column" },
        }}
      >
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
          <Typography variant="h6" fontWeight="bold">
            معاينة الفاتورة
          </Typography>
          <IconButton onClick={() => setPdfDialogOpen(false)} size="small">
            <X size={20} />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0, flex: 1, overflow: "hidden" }}>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title="Invoice PDF"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Settle Debt Dialog */}
      <Dialog
        open={settleDialogOpen}
        onClose={() => setSettleDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>تسوية دين العميل</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="المبلغ"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              placeholder="أدخل المبلغ المدفوع"
            />
            <TextField
              label="تاريخ الدفع"
              type="date"
              fullWidth
              value={settleDate}
              onChange={(e) => setSettleDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>طريقة الدفع</InputLabel>
              <Select
                value={settleMethod}
                label="طريقة الدفع"
                onChange={(e) => setSettleMethod(e.target.value)}
              >
                <MenuItem value="cash">نقدًا</MenuItem>
                <MenuItem value="bank_transfer">تحويل بنكي</MenuItem>
                <MenuItem value="visa">فيزا</MenuItem>
                <MenuItem value="mastercard">ماستركارد</MenuItem>
                <MenuItem value="mada">مدى</MenuItem>
                <MenuItem value="other">أخرى</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="المرجع (اختياري)"
              fullWidth
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="رقم الشيك، رقم العملية، إلخ"
            />
            <TextField
              label="ملاحظات (اختياري)"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setSettleDialogOpen(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSettle}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {isSubmitting ? "جاري التسوية..." : "تأكيد التسوية"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientLedgerPage;
