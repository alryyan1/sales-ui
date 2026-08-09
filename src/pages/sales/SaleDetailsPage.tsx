// src/pages/sales/SaleDetailsPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";

// Lucide Icons
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  FileText,
  User,
  Calendar,
  Printer,
} from "lucide-react";

// Services and Types
import saleService, { Sale } from "../../services/saleService";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import dayjs from "dayjs";
import { url } from "@/constants";
import { useTranslation } from "react-i18next";

const SaleDetailsPage: React.FC = () => {
  const { t, i18n } = useTranslation(["sales", "common"]);
  const paymentMethodLabels: Record<string, string> = {
    cash: t("sales:detailsPage.paymentMethodLabels.cash"),
    visa: t("sales:detailsPage.paymentMethodLabels.visa"),
    mastercard: t("sales:detailsPage.paymentMethodLabels.mastercard"),
    bank_transfer: t("sales:detailsPage.paymentMethodLabels.bank_transfer"),
    mada: t("sales:detailsPage.paymentMethodLabels.mada"),
    other: t("sales:detailsPage.paymentMethodLabels.other"),
    store_credit: t("sales:detailsPage.paymentMethodLabels.store_credit"),
  };
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // State
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    const fetchSaleDetails = async (saleId: number) => {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching details for sale ID: ${saleId}`);
      try {
        const data = await saleService.getSale(saleId);
        setSale(data);
      } catch (err) {
        console.error(`Failed to fetch sale ${saleId}:`, err);
        const errorMsg = saleService.getErrorMessage(err);
        setError(errorMsg);
        toast.error(t("common:error"), { description: errorMsg });
      } finally {
        setIsLoading(false);
      }
    };

    // Validate the ID from the URL
    const numericId = Number(id);
    if (id && !isNaN(numericId) && numericId > 0) {
      fetchSaleDetails(numericId);
    } else {
      setError(t("sales:invalidId"));
      setIsLoading(false);
    }
  }, [id]);

  // Calculate payment status
  const getPaymentStatus = (sale: Sale) => {
    const total = Number(sale.total_amount);
    const paid = Number(sale.paid_amount);

    if (paid >= total && total > 0) {
      return { label: t("sales:detailsPage.fullyPaid"), color: "success" as const };
    } else if (paid > 0) {
      return { label: t("sales:detailsPage.partiallyPaid"), color: "warning" as const };
    } else {
      return { label: t("sales:detailsPage.unpaid"), color: "error" as const };
    }
  };

  // Calculate subtotal from items
  const calculateSubtotal = () => {
    if (!sale?.items) return 0;
    return sale.items.reduce((sum, item) => {
      const itemTotal =
        Number(item.total_price || item.unit_price) * Number(item.quantity);
      return sum + itemTotal;
    }, 0);
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 200px)",
          p: 3,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>{t("common:loading")}</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowLeft size={20} />}
          onClick={() => navigate("/sales/pos-blank")}
        >
          {t("sales:backToList")}
        </Button>
      </Box>
    );
  }

  if (!sale) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{t("sales:notFound")}</Typography>
        <Button
          startIcon={<ArrowLeft size={20} />}
          onClick={() => navigate("/sales/pos-blank")}
        >
          {t("sales:backToList")}
        </Button>
      </Box>
    );
  }

  const paymentStatus = getPaymentStatus(sale);
  const subtotal = calculateSubtotal();
  const discountAmount = Number(sale.discount_amount || 0);
  const totalAmount = Number(sale.total_amount);
  const paidAmount = Number(sale.paid_amount);
  const dueAmount = totalAmount - paidAmount;

  // Display Sale Details
  return (
    <Box
      sx={{ p: { xs: 1, sm: 2, md: 3 }, direction: i18n.dir() }}
      className="dark:bg-gray-950 pb-10"
    >
      {/* Back Button & Title */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton
          onClick={() => navigate("/sales/pos-blank")}
          sx={{ mr: 1 }}
          aria-label={t("sales:detailsPage.back")}
        >
          <ArrowLeft size={24} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            component="h1"
            className="text-gray-800 dark:text-gray-100 font-semibold"
          >
            {t("sales:detailsPage.title", { id: sale.id })}
          </Typography>
          {sale.number && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("sales:detailsPage.orderNumberColon", { number: sale.number })}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<Printer size={20} />}
          onClick={async () => {
            try {
              const token = localStorage.getItem("authToken");
              // const token = localStorage.getItem('authToken');
              const pdfUrl = `${url}/sales/${sale.id}/invoice-pdf`;

              // Fetch PDF as blob
              const response = await fetch(pdfUrl, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                throw new Error("Failed to fetch invoice");
              }

              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);

              // Open in new window for printing
              const printWindow = window.open(blobUrl, "_blank");

              if (printWindow) {
                printWindow.onload = () => {
                  printWindow.print();
                };
              } else {
                // Fallback: download if popup blocked
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = `${t("sales:detailsPage.invoiceFilenamePrefix")}_${sale.invoice_number || sale.id}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
              }
            } catch (error) {
              console.error("Failed to open invoice:", error);
              toast.error(t("sales:detailsPage.openInvoiceFailed"));
            }
          }}
          sx={{ ml: 2 }}
        >
          {t("sales:printInvoice")}
        </Button>
      </Box>

      {/* Main Details Card */}
      <Paper
        sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}
        elevation={2}
        className="dark:bg-gray-800"
      >
        <Grid container spacing={3}>
          <Grid xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <User size={14} />
              {t("sales:client")}
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {sale.client_name || t("sales:detailsPage.unspecifiedClient")}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Calendar size={14} />
              {t("sales:saleDate")}
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {dayjs(sale.sale_date).format("YYYY-MM-DD")}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <FileText size={14} />
              {t("sales:invoice")}
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {sale.invoice_number || "---"}
            </Typography>
          </Grid>
          {sale.number && (
            <Grid xs={12} sm={6} md={4}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <ShoppingCart size={14} />
                {t("sales:detailsPage.orderNumber")}
              </Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
                {sale.number}
              </Typography>
            </Grid>
          )}
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              {t("sales:detailsPage.recordedBy")}
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {sale.user_name || "---"}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              {t("sales:detailsPage.recordedDate")}
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {dayjs(sale.created_at).format("YYYY-MM-DD HH:mm")}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              {t("sales:detailsPage.paymentStatusLabel")}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={paymentStatus.label}
                size="small"
                color={paymentStatus.color}
              />
            </Box>
          </Grid>
          {sale.notes && (
            <Grid xs={12}>
              <Typography variant="overline" color="text.secondary">
                {t("sales:detailsPage.notes")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}
                className="dark:text-gray-300"
              >
                {sale.notes}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Items Table */}
      <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        {t("sales:saleItems")}
      </Typography>
      <TableContainer
        component={Paper}
        elevation={1}
        className="dark:bg-gray-800"
        sx={{ mb: 3 }}
      >
        <Table size="small">
          <TableHead
            sx={{ backgroundColor: "action.hover" }}
            className="dark:bg-gray-700"
          >
            <TableRow>
              <TableCell className="dark:text-gray-300">{t("sales:product")}</TableCell>
              <TableCell className="dark:text-gray-300">SKU</TableCell>
              <TableCell align="center" className="dark:text-gray-300">
                {t("sales:quantity")}
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                {t("sales:unitPrice")}
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                {t("sales:detailsPage.total")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sale.items && sale.items.length > 0 ? (
              sale.items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell className="dark:text-gray-100">
                    {item.product_name || t("sales:detailsPage.productIdFallback", { id: item.product_id })}
                    {item.batch_number_sold && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {t("sales:detailsPage.batchColon", { batch: item.batch_number_sold })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell className="dark:text-gray-100">
                    {item.product_sku || "---"}
                  </TableCell>
                  <TableCell align="center" className="dark:text-gray-100">
                    {item.quantity}
                  </TableCell>
                  <TableCell align="right" className="dark:text-gray-100">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell align="right" className="dark:text-gray-100">
                    {formatCurrency(
                      Number(item.total_price || item.unit_price) *
                        Number(item.quantity),
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  align="center"
                  className="dark:text-gray-400"
                >
                  {t("sales:detailsPage.noItems")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payments Table */}
      <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        {t("sales:paymentsMadeTitle")}
      </Typography>
      <TableContainer
        component={Paper}
        elevation={1}
        className="dark:bg-gray-800"
        sx={{ mb: 3 }}
      >
        <Table size="small">
          <TableHead
            sx={{ backgroundColor: "action.hover" }}
            className="dark:bg-gray-700"
          >
            <TableRow>
              <TableCell className="dark:text-gray-300">{t("sales:paymentMethod")}</TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                {t("sales:detailsPage.amount")}
              </TableCell>
              <TableCell className="dark:text-gray-300">{t("sales:paymentDate")}</TableCell>
              <TableCell className="dark:text-gray-300">{t("sales:paymentReference")}</TableCell>
              <TableCell className="dark:text-gray-300">{t("sales:detailsPage.notes")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sale.payments && sale.payments.length > 0 ? (
              sale.payments.map((payment) => (
                <TableRow key={payment.id} hover>
                  <TableCell className="dark:text-gray-100">
                    {paymentMethodLabels[payment.method] || payment.method}
                  </TableCell>
                  <TableCell align="right" className="dark:text-gray-100">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="dark:text-gray-100">
                    {dayjs(payment.payment_date).format("YYYY-MM-DD")}
                  </TableCell>
                  <TableCell className="dark:text-gray-100">
                    {payment.reference_number || "---"}
                  </TableCell>
                  <TableCell className="dark:text-gray-100">
                    {payment.notes || "---"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  align="center"
                  className="dark:text-gray-400"
                >
                  {t("sales:noPaymentsRecorded")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Section */}
      <Paper elevation={2} className="dark:bg-gray-800" sx={{ p: 3 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
          {t("sales:detailsPage.summary")}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body1" color="text.secondary">
              {t("sales:detailsPage.subtotalColon")}
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatCurrency(subtotal)}
            </Typography>
          </Box>
          {discountAmount > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body1" color="text.secondary">
                {t("sales:discount")}{" "}
                {sale.discount_type === "percentage"
                  ? `(${discountAmount}%)`
                  : ""}
                :
              </Typography>
              <Typography variant="body1" fontWeight="medium" color="error">
                - {formatCurrency(discountAmount)}
              </Typography>
            </Box>
          )}
          <Divider />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {t("sales:detailsPage.totalColon")}
            </Typography>
            <Typography
              variant="h6"
              fontWeight="bold"
              className="dark:text-gray-100"
            >
              {formatCurrency(totalAmount)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <DollarSign size={16} />
              {t("sales:detailsPage.paidColon")}
            </Typography>
            <Typography
              variant="body1"
              fontWeight="medium"
              color="success.main"
            >
              {formatCurrency(paidAmount)}
            </Typography>
          </Box>
          {dueAmount > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body1" color="text.secondary">
                {t("sales:detailsPage.remainingColon")}
              </Typography>
              <Typography
                variant="body1"
                fontWeight="medium"
                color="error.main"
              >
                {formatCurrency(dueAmount)}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default SaleDetailsPage;
