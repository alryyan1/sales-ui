// src/pages/clients/ClientLedgerPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
} from "@mui/material";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Edit,
  X,
  CreditCard,
  Truck,
  ExternalLink,
} from "lucide-react";

import clientLedgerService, {
  ClientLedger,
  ClientLedgerEntry,
} from "@/services/clientLedgerService";
import supplierPaymentService from "@/services/supplierPaymentService";
import { LedgerSaleEditorDialog } from "@/components/clients/LedgerSaleEditorDialog";
import { ClientPaymentsDialog } from "@/components/clients/ClientPaymentsDialog";
import { useSettings } from "@/context/SettingsContext";
import { uploadFileToFirebase } from "@/services/firebaseStorage";
import { toast } from "sonner";
import apiClient from "@/lib/axios";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

const ClientLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = Number(id);

  const { getSetting } = useSettings();
  const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;

  const [ledger, setLedger] = useState<ClientLedger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [fetchingSaleId, setFetchingSaleId] = useState<number | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [paymentsDialogOpen, setPaymentsDialogOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<{ product_id: number; product_name: string } | null>(null);

  const [payAllOpen, setPayAllOpen]         = useState(false);
  const [payAllAmount, setPayAllAmount]     = useState("");
  const [payAllMethod, setPayAllMethod]     = useState("cash");
  const [payAllDate, setPayAllDate]         = useState("");
  const [payAllRef, setPayAllRef]           = useState("");
  const [payAllLoading, setPayAllLoading]   = useState(false);

  const [supplierSummary, setSupplierSummary] = useState<{
    total_purchases: number;
    total_payments: number;
    balance: number;
  } | null>(null);
  const [isLoadingSupplierSummary, setIsLoadingSupplierSummary] = useState(false);

  const productOptions = useMemo(() => {
    const map = new Map<number, string>();
    ledger?.ledger_entries.forEach((e) =>
      e.items?.forEach((i) => {
        if (!map.has(i.product_id)) map.set(i.product_id, i.product_name);
      })
    );
    return Array.from(map.entries()).map(([product_id, product_name]) => ({ product_id, product_name }));
  }, [ledger]);

  const filteredEntries = useMemo(() =>
    selectedProduct
      ? (ledger?.ledger_entries ?? []).filter((e) => e.items?.some((i) => i.product_id === selectedProduct.product_id))
      : (ledger?.ledger_entries ?? []),
    [ledger, selectedProduct]
  );

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

  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!ledger?.client?.is_supplier || !ledger?.client?.supplier_id) {
      setSupplierSummary(null);
      return;
    }
    setIsLoadingSupplierSummary(true);
    supplierPaymentService
      .getLedger(ledger.client.supplier_id)
      .then((data) => setSupplierSummary(data.summary))
      .catch(() => setSupplierSummary(null))
      .finally(() => setIsLoadingSupplierSummary(false));
  }, [ledger?.client?.is_supplier, ledger?.client?.supplier_id]);

  const handleDownloadPdf = async () => {
    if (!ledger) return;
    setIsGeneratingPdf(true);
    try {
      const response = await apiClient.get(`/clients/${clientId}/ledger/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("فشل في إنشاء ملف PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!ledger) return;
    const phone = ledger.client.phone;
    if (!phone) {
      toast.error("لا يوجد رقم هاتف للعميل");
      return;
    }
    setIsSendingWhatsApp(true);
    const toastId = `ledger-wa-${clientId}`;
    try {
      const filename = `ledger_${clientId}.pdf`;

      toast.loading("جاري تحميل كشف الحساب...", { id: toastId });
      const pdfResponse = await apiClient.get(`/clients/${clientId}/ledger/pdf`, {
        responseType: "blob",
      });
      const pdfBlob = new Blob([pdfResponse.data], { type: "application/pdf" });

      toast.loading("جاري رفع الملف إلى Firebase...", { id: toastId });
      const storagePath = `ledgers/${firebaseCollectionName}/${filename}`;
      const downloadUrl = await uploadFileToFirebase(pdfBlob, storagePath);

      toast.loading("جاري إرسال الواتساب...", { id: toastId });
      await apiClient.post("/admin/whatsapp-cloud/send-template", {
        to: phone,
        template_name: "client_ledger",
        language_code: "ar",
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: { link: downloadUrl, filename },
              },
            ],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: ledger.client.name },
            ],
          },
        ],
      });

      toast.success("✅ تم إرسال كشف الحساب عبر واتساب", { id: toastId, duration: 4000 });
    } catch (err) {
      console.error("WhatsApp ledger send error:", err);
      toast.error("فشل إرسال كشف الحساب عبر واتساب", { id: toastId });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handlePayAll = async () => {
    if (!clientId) return;
    setPayAllLoading(true);
    try {
      await clientLedgerService.settleDebt(clientId, {
        amount: Number(payAllAmount),
        payment_date: payAllDate,
        method: payAllMethod,
        reference_number: payAllRef || undefined,
      });
      toast.success("تم سداد جميع المبيعات بنجاح");
      setPayAllOpen(false);
      fetchLedger();
    } catch (err) {
      toast.error(clientLedgerService.getErrorMessage(err));
    } finally {
      setPayAllLoading(false);
    }
  };

  const handleSaleClick = async (entry: ClientLedgerEntry) => {
    if (!entry.sale_id) return;
    setFetchingSaleId(entry.sale_id);
    try {
      const response = await apiClient.get(
        `/sales/${entry.sale_id}/a4-invoice-pdf/view`,
        { responseType: "blob" },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfDialogOpen(true);
    } catch (err: unknown) {
      console.error("Error loading A4 invoice:", err);
      toast.error("فشل تحميل فاتورة A4");
    } finally {
      setFetchingSaleId(null);
    }
  };


  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "40vh",
          gap: 2,
        }}
      >
        <CircularProgress size={28} />
        <Typography color="text.secondary">جاري التحميل...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>خطأ</AlertTitle>
          {error}
          <Button onClick={fetchLedger} sx={{ mt: 1 }} variant="outlined" size="small">
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

  const { summary, client, ledger_entries } = ledger;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, display: "flex", flexDirection: "column", gap: 1.5 }}>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton onClick={() => navigate("/clients")} size="small">
          <ArrowLeft size={18} />
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} noWrap>
            كشف حساب — {client.name}
          </Typography>
          {client.phone && (
            <Typography variant="caption" color="text.secondary">
              {client.phone}
            </Typography>
          )}
        </Box>
 {/* Also a Supplier Banner */}
      {client.is_supplier && client.supplier_id && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "warning.light", bgcolor: "#fffbeb" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Truck size={18} color="#d97706" />
              <Box>
                <Typography variant="body2" fontWeight={600} color="warning.dark">
                  هذا العميل مورد أيضاً
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  يمكنك عرض كشف حساب مشترياته
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="outlined"
              size="small"
              color="warning"
              onClick={() => navigate(`/suppliers/${client.supplier_id}/ledger`)}
              startIcon={<ExternalLink size={14} />}
              sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 600, flexShrink: 0 }}
            >
              كشف حساب المشتريات
            </Button>
          </Stack>
        </Paper>
      )}
        <Button
          variant="contained"
          color="error"
          size="small"
          startIcon={<DollarSign size={15} />}
          disabled={summary.balance <= 0}
          onClick={() => {
            setPayAllAmount(String(ledger.summary.balance));
            setPayAllDate(format(new Date(), "yyyy-MM-dd"));
            setPayAllMethod("cash");
            setPayAllRef("");
            setPayAllOpen(true);
          }}
          sx={{ textTransform: "none", "& .MuiButton-startIcon": { ml: "6px" } }}
        >
          سداد الكل
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CreditCard size={15} />}
          onClick={() => setPaymentsDialogOpen(true)}
          sx={{ textTransform: "none", "& .MuiButton-startIcon": { ml: "6px" } }}
        >
          المدفوعات
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={isGeneratingPdf ? <CircularProgress size={14} /> : <FileText size={15} />}
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          sx={{ textTransform: "none", "& .MuiButton-startIcon": { ml: "6px" } }}
        >
          {isGeneratingPdf ? "جاري الإنشاء..." : "PDF"}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={isSendingWhatsApp ? <CircularProgress size={14} /> : <WhatsAppIcon sx={{ fontSize: 16 }} />}
          onClick={handleSendWhatsApp}
          disabled={isSendingWhatsApp || !ledger?.client.phone}
          sx={{ textTransform: "none", color: "success.main", borderColor: "success.main", "&:hover": { borderColor: "success.dark", bgcolor: "success.50" }, "& .MuiButton-startIcon": { ml: "6px" } }}
        >
          {isSendingWhatsApp ? "جاري الإرسال..." : "واتساب"}
        </Button>
      </Box>

     

      {/* Net Balance Panel */}
      {client.is_supplier && client.supplier_id && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
            الرصيد الصافي (عميل + مورد)
          </Typography>
          {isLoadingSupplierSummary ? (
            <Stack direction="row" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">جاري تحميل بيانات المورد...</Typography>
            </Stack>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1.5,width:'600px' }}>
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: summary.balance > 0 ? "#fef2f2" : "#f0fdf4", border: "1px solid", borderColor: summary.balance > 0 ? "error.light" : "success.light" }}>
                <Typography variant="caption" color="text.secondary" display="block">رصيد المبيعات (يدين لنا)</Typography>
                <Typography variant="subtitle2" fontWeight={700} color={summary.balance > 0 ? "error.main" : "success.main"}>
                  {summary.balance.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: (supplierSummary?.balance ?? 0) > 0 ? "#fef2f2" : "#f0fdf4", border: "1px solid", borderColor: (supplierSummary?.balance ?? 0) > 0 ? "error.light" : "success.light" }}>
                <Typography variant="caption" color="text.secondary" display="block">رصيد المشتريات (ندين له)</Typography>
                <Typography variant="subtitle2" fontWeight={700} color={(supplierSummary?.balance ?? 0) > 0 ? "error.main" : "success.main"}>
                  {supplierSummary ? supplierSummary.balance.toLocaleString() : "—"}
                </Typography>
              </Box>
              {supplierSummary && (() => {
                const net = summary.balance - supplierSummary.balance;
                return (
                  <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: net > 0 ? "#fef2f2" : net < 0 ? "#f0fdf4" : "#f8fafc", border: "1px solid", borderColor: net > 0 ? "error.light" : net < 0 ? "success.light" : "divider" }}>
                    <Typography variant="caption" color="text.secondary" display="block">الصافي</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color={net > 0 ? "error.main" : net < 0 ? "success.main" : "text.secondary"}>
                      {net > 0 ? `+${net.toLocaleString()}` : net < 0 ? net.toLocaleString() : "متوازن"}
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          )}
        </Box>
      )}

      {!client.is_supplier && <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "200px 200px 200px",
          gap: 1.5,
        }}
      >
        {[
          {
            label: "إجمالي المبيعات",
            value: summary.total_sales.toLocaleString(),
            icon: <TrendingUp size={18} />,
            color: "error" as const,
          },
          {
            label: "إجمالي الدفعات",
            value: summary.total_payments.toLocaleString(),
            icon: <TrendingDown size={18} />,
            color: "success" as const,
          },
          {
            label: "الرصيد",
            value: summary.balance.toLocaleString(),
            icon: <DollarSign size={18} />,
            color: summary.balance > 0 ? ("error" as const) : ("success" as const),
          },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: "12px !important" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: `${color}.50`,
                    color: `${color}.main`,
                    display: "flex",
                  }}
                >
                  {icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {label}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} color={`${color}.main`} lineHeight={1.2}>
                    {value}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box> }
      {/* Summary Strip */}
     

      {/* Ledger Table */}
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          maxHeight: "calc(100vh - 260px)",
        }}
      >
        <CardContent
          sx={{
            p: "12px !important",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <Typography variant="subtitle2" fontWeight={700}>
               المبيعات
            </Typography>
            <Chip
              label={selectedProduct ? `${filteredEntries.length} / ${ledger_entries.length}` : ledger_entries.length}
              size="small"
              color={selectedProduct ? "primary" : "default"}
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
            <Box sx={{ flex: 1, minWidth: 160 }}>
              <Autocomplete
                size="small"
                
                options={productOptions}
                getOptionLabel={(o) => o.product_name}
                isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
                value={selectedProduct}
                onChange={(_, v) => setSelectedProduct(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="فلترة حسب المنتج..."
                    inputProps={{ ...params.inputProps, style: { fontSize: "0.78rem" } }}
                  />
                )}
                noOptionsText="لا توجد منتجات"
                clearOnEscape
                sx={{ width:200 }}
              />
            </Box>
          </Box>
          <Divider sx={{ mb: 1 }} />

          <Box sx={{ flex: 1, overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 36 }}>م</TableCell>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>تاريخ البيع / الإنشاء</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">الأصناف</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">الإجمالي</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">المدفوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">المتبقي</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEntries.map((entry, index) => (
                  <TableRow key={entry.id} hover sx={{ "&:last-child td": { border: 0 } }}>

                    <TableCell sx={{ fontSize: "0.75rem", color: "text.disabled", textAlign: "center" }}>
                      {(filteredEntries.length - index)}
                    </TableCell>

                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontSize="0.8rem">
                        {format(new Date(entry.date), "yyyy-MM-dd")}
                      </Typography>
                      {entry.created_at && (
                        <Typography variant="caption" color="text.disabled" display="block" fontSize="0.7rem">
                          {format(new Date(entry.created_at), "yyyy-MM-dd HH:mm")}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                      {entry.sale_id}
                    </TableCell>

                    <TableCell align="center">
                      {entry.items_count != null
                        ? <Chip label={entry.items_count} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.7rem" }} />
                        : "—"}
                    </TableCell>

                    <TableCell align="right" dir="ltr" sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                      {entry.total.toLocaleString()}
                    </TableCell>

                    <TableCell align="right" dir="ltr" sx={{ fontSize: "0.82rem", fontWeight: 600, color: entry.paid > 0 ? "success.main" : "text.disabled" }}>
                      {entry.paid > 0 ? entry.paid.toLocaleString() : "—"}
                    </TableCell>

                    <TableCell align="right" dir="ltr">
                      <Typography variant="body2" fontWeight={700} color={entry.due > 0 ? "error.main" : "success.main"}>
                        {entry.due > 0 ? entry.due.toLocaleString() : "✓"}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="طباعة الفاتورة">
                          <span>
                            <Button size="small" onClick={() => handleSaleClick(entry)}
                              disabled={fetchingSaleId !== null} color="primary">
                              {fetchingSaleId === entry.sale_id
                                ? <CircularProgress size={14} />
                                : 'طباعه فاتوره'}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="تعديل الفاتورة">
                          <IconButton size="small" color="secondary"
                            onClick={() => { setEditingSaleId(entry.sale_id); setEditorOpen(true); }}>
                            <Edit size={15} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredEntries.length === 0 && (
              <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                <Typography variant="body2">
                  {selectedProduct ? `لا توجد مبيعات تحتوي على "${selectedProduct.product_name}".` : "لا توجد حركات في كشف الحساب."}
                </Typography>
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
        PaperProps={{ sx: { height: "90vh", display: "flex", flexDirection: "column" } }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            معاينة الفاتورة
          </Typography>
          <IconButton onClick={() => setPdfDialogOpen(false)} size="small">
            <X size={18} />
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

      {/* Sale Editor Dialog */}
      <LedgerSaleEditorDialog
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingSaleId(null);
        }}
        saleId={editingSaleId}
        onSaleUpdated={fetchLedger}
      />

      {/* Payments Dialog */}
      {ledger && (
        <ClientPaymentsDialog
          open={paymentsDialogOpen}
          onClose={() => setPaymentsDialogOpen(false)}
          clientId={clientId}
          clientName={client.name}
        />
      )}

      {/* Pay All Dialog */}
      <Dialog
        open={payAllOpen}
        onClose={() => !payAllLoading && setPayAllOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
            سداد جميع المبيعات
          </Typography>
          <IconButton size="small" onClick={() => setPayAllOpen(false)} disabled={payAllLoading}>
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
              value={payAllAmount}
              onChange={(e) => setPayAllAmount(e.target.value)}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>طريقة الدفع</InputLabel>
              <Select
                label="طريقة الدفع"
                value={payAllMethod}
                onChange={(e) => setPayAllMethod(e.target.value)}
              >
                <MenuItem value="cash">كاش</MenuItem>
                <MenuItem value="bankak">بنكك</MenuItem>
                <MenuItem value="fawry">فوري</MenuItem>
                <MenuItem value="ocash">أوكاش</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="تاريخ الدفع"
              size="small"
              type="date"
              fullWidth
              value={payAllDate}
              onChange={(e) => setPayAllDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="رقم المرجع (اختياري)"
              size="small"
              fullWidth
              value={payAllRef}
              onChange={(e) => setPayAllRef(e.target.value)}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: "divider", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setPayAllOpen(false)}
            disabled={payAllLoading}
          >
            إلغاء
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={handlePayAll}
            disabled={payAllLoading || !payAllAmount || Number(payAllAmount) <= 0}
            startIcon={payAllLoading ? <CircularProgress size={14} color="inherit" /> : null}
          >
            تأكيد السداد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientLedgerPage;
