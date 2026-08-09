import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

// MUI
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

// Lucide icons
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Building2,
  Phone,
  FileText,
  Printer,
  CreditCard,
  BarChart3,
  CheckCircle2,
  User2,
  ShoppingCart,
  ExternalLink,
  DollarSign,
} from "lucide-react";

import supplierPaymentService, {
  SupplierLedger,
  LedgerEntry,
} from "@/services/supplierPaymentService";
import exportService from "@/services/exportService";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { PurchasePaymentsDialog } from "@/components/suppliers/PurchasePaymentsDialog";
import { toast } from "sonner";
import { formatNumber } from "@/constants";
import alpha from "@mui/material/styles/alpha";

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconColor: string;
  valueColor?: string;
  sub?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, iconColor, valueColor = "text.primary", sub }) => (
  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
      <Box flex={1} minWidth={0}>
        <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" mb={0.5}>
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={700} color={valueColor} lineHeight={1}>
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          bgcolor: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Stack>
  </Paper>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const SupplierLedgerPage: React.FC = () => {
  const { t, i18n } = useTranslation(["suppliers", "common"]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatCurrency = useFormatCurrency();
  const supplierId = Number(id);

  const [ledger, setLedger] = useState<SupplierLedger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | number>("");

  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMethod, setBulkMethod] = useState("cash");
  const [bulkDate, setBulkDate] = useState("");
  const [bulkRef, setBulkRef] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const selectedEntry = ledger?.ledger_entries.find(
    (e) => (e.purchase_id || e.id) === selectedPurchaseId
  );
  const selectedPurchasePayments = selectedEntry?.payments ?? [];
  const selectedPurchaseAmount = selectedEntry?.debit ?? 0;

  const fetchLedger = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supplierPaymentService.getLedger(supplierId);
      setLedger(data);
    } catch (err) {
      setError(supplierPaymentService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    if (supplierId) fetchLedger();
  }, [supplierId, fetchLedger]);

  const handleViewPayments = (entry: LedgerEntry) => {
    setSelectedPurchaseId(entry.purchase_id || entry.id);
    setIsPaymentsDialogOpen(true);
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportService.exportSupplierLedgerPdf(supplierId);
      toast.success(t("suppliers:ledgerPage.exportStarted"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("suppliers:ledgerPage.exportFailed");
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const openBulkPay = () => {
    setBulkAmount(ledger ? String(ledger.summary.balance) : "");
    setBulkMethod("cash");
    setBulkDate(format(new Date(), "yyyy-MM-dd"));
    setBulkRef("");
    setBulkPayOpen(true);
  };

  const handleBulkPay = async () => {
    const amount = parseFloat(bulkAmount);
    if (!bulkDate || isNaN(amount) || amount <= 0) return;
    setBulkLoading(true);
    try {
      const res = await supplierPaymentService.settleDebt(supplierId, {
        amount,
        method: bulkMethod,
        payment_date: bulkDate,
        reference_number: bulkRef || undefined,
      });
      const { payments_created, total_applied, remaining_unapplied } = res.result;
      toast.success(
        t("suppliers:ledgerPage.bulkPaySuccess", { count: payments_created, applied: total_applied.toLocaleString() }) +
        (remaining_unapplied > 0 ? t("suppliers:ledgerPage.bulkPayRemaining", { remaining: remaining_unapplied.toLocaleString() }) : "")
      );
      setBulkPayOpen(false);
      fetchLedger();
    } catch (err) {
      toast.error(supplierPaymentService.getErrorMessage(err));
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box sx={{  bgcolor: "grey.50", p: 3 }} dir={i18n.dir()}>
        <Stack direction="row" justifyContent="space-between" mb={3}>
          <Skeleton variant="rounded" width={260} height={36} />
          <Skeleton variant="rounded" width={120} height={36} />
        </Stack>
        <Grid container spacing={2} mb={3}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={6} lg={3} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !ledger) {
    return (
      <Box sx={{  bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }} dir={i18n.dir()}>
        <Paper variant="outlined" sx={{ maxWidth: 380, width: "100%", p: 4, borderRadius: 3, textAlign: "center" }}>
          <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "error.50", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
            <AlertCircle size={28} color="#ef4444" />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} mb={0.5}>{t("suppliers:ledgerPage.loadFailedTitle")}</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>{error || t("suppliers:ledgerPage.loadFailedDesc")}</Typography>
          <Button variant="contained" fullWidth onClick={() => navigate("/suppliers")} disableElevation sx={{ borderRadius: 2 }}>
            {t("suppliers:ledgerPage.backToSuppliers")}
          </Button>
        </Paper>
      </Box>
    );
  }

  const { supplier, summary, ledger_entries } = ledger;
  const isInDebt = summary.balance > 0;

  return (
    <Box sx={{  bgcolor: "grey.50" }} dir={i18n.dir()}>

      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        square
        sx={{ borderBottom: 1, borderColor: "divider", position: "sticky", top: 0, zIndex: 30, bgcolor: "background.paper" }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, lg: 3 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" height={56}>
            {/* Breadcrumb */}
            <Stack direction="row" alignItems="center" gap={1}>
              <IconButton size="small" onClick={() => navigate("/suppliers")} sx={{ mr: 0.5 }}>
                <ArrowLeft size={18} />
              </IconButton>
              <Breadcrumbs separator="›" sx={{ fontSize: 14 }}>
                <Typography
                  component="span"
                  fontSize={14}
                  color="text.secondary"
                  sx={{ cursor: "pointer", "&:hover": { color: "text.primary" } }}
                  onClick={() => navigate("/suppliers")}
                >
                  {t("suppliers:ledgerPage.breadcrumbSuppliers")}
                </Typography>
                <Typography component="span" fontSize={14} fontWeight={600} color="text.primary">
                  {supplier.name}
                </Typography>
                <Typography component="span" fontSize={14} color="text.secondary">
                  {t("suppliers:ledgerPage.breadcrumbLedger")}
                </Typography>
              </Breadcrumbs>
            </Stack>

            {/* Header Buttons */}
            <Stack direction="row" gap={1}>
              <Button
                variant="contained"
                color="error"
                size="small"
                disableElevation
                onClick={openBulkPay}
                startIcon={<DollarSign size={14} />}
                sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 600 }}
              >
                {t("suppliers:ledgerPage.settleAll")}
              </Button>
              <Button
                variant="contained"
                size="small"
                disableElevation
                disabled={isExporting}
                onClick={handleExportPdf}
                startIcon={isExporting ? <CircularProgress size={14} color="inherit" /> : <Printer size={14} />}
                sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 600 }}
              >
                {t("suppliers:ledgerPage.exportPdf")}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, lg: 3 }, py: 3 }}>
        <Stack spacing={3}>

          {/* ── Supplier Info ──────────────────────────────────────────── */}
          {/* <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={2}>
              <Box
                sx={{
                  width: 56, height: 56, borderRadius: 2,
                  bgcolor: "indigo.50", border: "1px solid",
                  borderColor: "indigo.100",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  bgcolor: "#eef2ff",
                }}
              >
                <Building2 size={26} color="#6366f1" />
              </Box>

              <Box flex={1} minWidth={0}>
                <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>{supplier.name}</Typography>
                  <Chip
                    label="نشط"
                    size="small"
                    icon={<CheckCircle2 size={12} />}
                    sx={{ bgcolor: "#f0fdf4", color: "#15803d", fontWeight: 600, fontSize: 11, height: 22, "& .MuiChip-icon": { color: "#16a34a" } }}
                  />
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={2}>
                  {supplier.contact_person && (
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <User2 size={14} color="#94a3b8" />
                      <Typography variant="body2" color="text.secondary">{supplier.contact_person}</Typography>
                    </Stack>
                  )}
                  {supplier.phone && (
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Phone size={14} color="#94a3b8" />
                      <Typography variant="body2" color="text.secondary">{supplier.phone}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>

              <Box textAlign="right" flexShrink={0}>
                <Typography variant="caption" color="text.disabled" display="block">كشف حساب مورد</Typography>
                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                  #{String(supplierId).padStart(5, "0")}
                </Typography>
              </Box>
            </Stack>
          </Paper> */}

          {/* ── Summary Cards ──────────────────────────────────────────── */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {/* Total Purchases */}
            <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
              <StatCard
                label={t("suppliers:ledgerPage.totalPurchases")}
                value={`${formatNumber((summary.total_purchases ?? 0).toFixed(2))} OMR`}
                icon={<TrendingUp size={20} color="#4f46e5" />}
                iconColor="#eef2ff"
              />
            </Box>

            {/* Total Payments */}
            <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
              <StatCard
                label={t("suppliers:ledgerPage.totalPayments")}
                value={formatCurrency(summary.total_payments)}
                icon={<TrendingDown size={20} color="#16a34a" />}
                iconColor="#f0fdf4"
                valueColor="success.dark"
              />
            </Box>

            {/* Balance */}
            <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
              <StatCard
                label={t("suppliers:ledgerPage.dueBalance")}
                value={formatCurrency(summary.balance)}
                icon={<CreditCard size={20} color={isInDebt ? "#dc2626" : "#16a34a"} />}
                iconColor={isInDebt ? "#fef2f2" : "#f0fdf4"}
                valueColor={isInDebt ? "error.main" : "success.dark"}
                sub={
                  <Typography variant="caption" color={isInDebt ? "error.main" : "success.dark"} fontWeight={500}>
                    {isInDebt ? t("suppliers:ledgerPage.amountsDue") : t("suppliers:ledgerPage.noAmountsDue")}
                  </Typography>
                }
              />
            </Box>
          </Box>

          {/* ── Also a Client Banner ───────────────────────────────────── */}
          {supplier.is_client && supplier.client_id && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "primary.light", bgcolor: "#eff6ff" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <ShoppingCart size={18} color="#2563eb" />
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {t("suppliers:ledgerPage.alsoClientTitle")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("suppliers:ledgerPage.alsoClientDesc")}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/clients/${supplier.client_id}/ledger`)}
                  startIcon={<ExternalLink size={14} />}
                  sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 600, flexShrink: 0 }}
                >
                  {t("suppliers:ledgerPage.salesLedgerButton")}
                </Button>
              </Stack>
            </Paper>
          )}

          {/* ── Ledger Table ───────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            {/* Table Toolbar */}
            {(() => {
              const purchaseEntries = ledger_entries.filter((e) => e.type === "purchase");
              return (
                <>
                  <Stack direction="row" alignItems="center" gap={1} px={2.5} py={1.75} borderBottom="1px solid" borderColor="divider">
                    <FileText size={16} color="#94a3b8" />
                    <Typography variant="body2" fontWeight={600} color="text.primary">{t("suppliers:ledgerPage.invoicesTitle")}</Typography>
                    {purchaseEntries.length > 0 && (
                      <Chip label={purchaseEntries.length} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 600 }} />
                    )}
                  </Stack>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.50" }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary" }}>{t("suppliers:ledgerPage.colCode")}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>{t("suppliers:ledgerPage.colDate")}</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>{t("suppliers:ledgerPage.colInvoiceTotal")}</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>{t("suppliers:ledgerPage.colTotalPaid")}</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>{t("suppliers:ledgerPage.colBalance")}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>{t("suppliers:ledgerPage.colPayments")}</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {purchaseEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                              <Stack alignItems="center" gap={1.5} color="text.disabled">
                                <FileText size={40} color="#e2e8f0" />
                                <Typography variant="body2" fontWeight={500}>{t("suppliers:ledgerPage.noTransactions")}</Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ) : (
                          purchaseEntries.map((entry) => {
                            const due = Number(entry.debit) - Number(entry.credit);
                            return (
                              <TableRow
                                key={entry.id}
                                hover
                                sx={{ "&:last-child td": { borderBottom: 0 } }}
                              >
                                <TableCell>
                                  <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                    #{entry.purchase_id}
                                  </Typography>
                                </TableCell>

                                {/* Date */}
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                  <Typography variant="caption" fontWeight={600} display="block" color="text.primary">
                                    {format(new Date(entry.date), "dd/MM/yyyy")}
                                  </Typography>
                                </TableCell>

                                {/* Debit — purchase total */}
                                <TableCell align="left" sx={{ whiteSpace: "nowrap" }}>
                                  <Typography variant="body2" fontWeight={600} color="text.primary">
                                    {formatCurrency(entry.debit)}
                                  </Typography>
                                </TableCell>

                                {/* Credit — total paid for this purchase */}
                                <TableCell align="left" sx={{ whiteSpace: "nowrap" }}>
                                  {entry.credit > 0 ? (
                                    <Typography variant="body2" fontWeight={600} color="success.dark">
                                      {formatCurrency(entry.credit)}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.disabled">—</Typography>
                                  )}
                                </TableCell>

                                {/* Balance — remaining due for this purchase */}
                                <TableCell align="left" sx={{ whiteSpace: "nowrap" }}>
                                  <Typography variant="body2" fontWeight={700} color={due > 0 ? "error.main" : "success.dark"}>
                                    {formatCurrency(due)}
                                  </Typography>
                                </TableCell>

                                {/* Action */}
                                <TableCell align="center">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleViewPayments(entry)}
                                    startIcon={<Wallet size={13} />}
                                    sx={{ borderRadius: 1.5, textTransform: "none", fontSize: 12, fontWeight: 600, py: 0.3, minWidth: 0 }}
                                  >
                                    {t("suppliers:ledgerPage.paymentsButton")}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>

                      {/* Footer totals */}
                      {purchaseEntries.length > 0 && (
                        <TableFooter>
                          <TableRow sx={{ bgcolor: "grey.50", "& td": { borderTop: "2px solid", borderTopColor: "divider", fontWeight: 700, py: 1.5 } }}>
                            <TableCell align="right" colSpan={2} sx={{ fontSize: 12, color: "text.secondary" }}>{t("suppliers:ledgerPage.totalRow")}</TableCell>
                            <TableCell align="left" sx={{ fontSize: 13, color: "text.primary" }}>
                              {formatNumber((summary.total_purchases ?? 0).toFixed(2))} OMR
                            </TableCell>
                            <TableCell align="left" sx={{ fontSize: 13, color: "success.dark" }}>{formatCurrency(summary.total_payments)}</TableCell>
                            <TableCell align="left" sx={{ fontSize: 13, color: isInDebt ? "error.main" : "success.dark" }}>{formatCurrency(summary.balance)}</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  </TableContainer>
                </>
              );
            })()}
          </Paper>

        </Stack>
      </Box>

      {/* ── Bulk Payment Dialog ───────────────────────────────────────── */}
      <Dialog open={bulkPayOpen} onClose={() => !bulkLoading && setBulkPayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <DollarSign size={18} />
            {t("suppliers:ledgerPage.bulkPayTitle")}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={0.5}>
            {ledger && (
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "error.50", border: "1px solid", borderColor: "error.light" }}>
                <Typography variant="caption" color="text.secondary" display="block">{t("suppliers:ledgerPage.dueBalance")}</Typography>
                <Typography variant="subtitle1" fontWeight={700} color="error.main">
                  {formatCurrency(ledger.summary.balance)}
                </Typography>
              </Box>
            )}
            <TextField
              label={t("suppliers:ledgerPage.amountLabel")}
              type="number"
              size="small"
              fullWidth
              required
              value={bulkAmount}
              onChange={(e) => setBulkAmount(e.target.value)}
              inputProps={{ min: 0.01, step: "0.01" }}
            />
            <FormControl size="small" fullWidth required>
              <InputLabel>{t("suppliers:ledgerPage.paymentMethodLabel")}</InputLabel>
              <Select
                value={bulkMethod}
                label={t("suppliers:ledgerPage.paymentMethodLabel")}
                onChange={(e) => setBulkMethod(e.target.value)}
              >
                <MenuItem value="cash">{t("suppliers:ledgerPage.methodCash")}</MenuItem>
                <MenuItem value="bank_transfer">{t("suppliers:ledgerPage.methodBankTransfer")}</MenuItem>
                <MenuItem value="visa">{t("suppliers:ledgerPage.methodVisa")}</MenuItem>
                <MenuItem value="other">{t("suppliers:ledgerPage.methodOther")}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t("suppliers:ledgerPage.paymentDateLabel")}
              type="date"
              size="small"
              fullWidth
              required
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t("suppliers:ledgerPage.referenceOptional")}
              size="small"
              fullWidth
              value={bulkRef}
              onChange={(e) => setBulkRef(e.target.value)}
              placeholder={t("suppliers:ledgerPage.referencePlaceholder")}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setBulkPayOpen(false)}
            disabled={bulkLoading}
            sx={{ borderRadius: 1.5, textTransform: "none" }}
          >
            {t("common:cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            disableElevation
            disabled={bulkLoading || !bulkAmount || !bulkDate}
            onClick={handleBulkPay}
            startIcon={bulkLoading ? <CircularProgress size={14} color="inherit" /> : <DollarSign size={14} />}
            sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 600, minWidth: 110 }}
          >
            {bulkLoading ? t("suppliers:ledgerPage.savingEllipsis") : t("suppliers:ledgerPage.confirmPayment")}
          </Button>
        </DialogActions>
      </Dialog>

      <PurchasePaymentsDialog
        open={isPaymentsDialogOpen}
        onClose={() => setIsPaymentsDialogOpen(false)}
        purchaseId={selectedPurchaseId}
        payments={selectedPurchasePayments}
        purchaseAmount={selectedPurchaseAmount}
        supplierId={supplierId}
        onSuccess={fetchLedger}
      />
    </Box>
  );
};

export default SupplierLedgerPage;
