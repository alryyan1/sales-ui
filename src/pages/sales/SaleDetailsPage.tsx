// src/pages/SaleDetailsPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// MUI Components (or shadcn/Tailwind equivalents)
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent"; // Added import
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

// Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Services and Types
import saleService, { Sale } from "../../services/saleService"; // Import Sale type and service
import dayjs from "dayjs";
import { formatCurrency, formatDate, formatNumber } from "@/constants";
import { useAuthorization } from "@/hooks/useAuthorization";
import { Banknote, CircleDollarSign, CreditCard, History, UndoIcon } from "lucide-react";
import { CardTitle } from "@/components/ui/card";
import { TableHeader } from "@/components/ui/table";
import { Card, CardHeader } from "@mui/material";
import { Separator } from "@/components/ui/separator";

// Helpers (Assuming these exist and are imported)

const SaleDetailsPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common", "products", "clients"]); // Load necessary namespaces
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Get the 'id' parameter
  const { can } = useAuthorization();
  // State
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSaleDetails = async (saleId: number) => {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching details for sale ID: ${saleId}`);
      try {
        // Fetch the specific sale, including items and related data
        // Ensure backend's show() eager loads 'client', 'user', 'items.product'
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

    const numericId = Number(id);
    if (id && !isNaN(numericId) && numericId > 0) {
      fetchSaleDetails(numericId);
    } else {
      setError(t("sales:invalidId") || "Invalid Sale ID."); // Add key
      setIsLoading(false);
    }
  }, [id, t]); // Dependency array
  // Determine if a return can be created for this sale
  const canCreateReturn =
    sale?.status === "completed" && can("create-sale-returns"); // Example condition
  // --- Render Logic ---
 const getPaymentMethodIcon = (method: string) => {
        switch (method.toLowerCase()) {
            case 'cash': return <Banknote className="h-4 w-4 text-green-600" />;
            case 'visa':
            case 'mastercard': return <CreditCard className="h-4 w-4 text-blue-600" />;
            case 'bank_transfer': return <History className="h-4 w-4 text-purple-600" />; // Or another icon
            default: return <CircleDollarSign  className="h-4 w-4 text-muted-foreground" />;
        }
    };
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
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/sales")}
        >
          {t("sales:backToList")}
        </Button>
      </Box>
    ); // Add key
  }

  if (!sale) {
    return (
      <Box sx={{ p: 3 }}>
        
        <Typography>{t("sales:notFound")}</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/sales")}
        >
          {t("sales:backToList")}
        </Button>
      </Box>
    ); // Add key
  }

  // Display Sale Details
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }} className="dark:bg-gray-950 pb-10">
      {/* Back Button & Title */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton
          onClick={() => navigate("/sales")}
          sx={{ mr: 1 }}
          aria-label={t("common:back") || "Back"}
        >
          <ArrowBackIcon className="dark:text-gray-300" />
        </IconButton>
        <Typography
          variant="h4"
          component="h1"
          className="text-gray-800 dark:text-gray-100 font-semibold"
        >
          {t("sales:detailsTitle")} #{sale.id} {/* Add key */}
        </Typography>
        {/* Maybe add a Print button here later */}
        {/* <Button variant="outlined" size="small" sx={{ ml: 'auto' }}>Print</Button> */}
        {/* --- Create Return Button --- */}
        {canCreateReturn && (
          <Button
            variant="contained"
            color="secondary" // Or choose an appropriate color
            startIcon={<UndoIcon />}
            onClick={() =>
              navigate(`/sales/return/add`, {
                state: {
                  originalSaleId: sale.id,
                  originalSaleInvoice: sale.invoice_number,
                },
              })
            }
            // Or if originalSaleIdParam is from URL: navigate(`/sales/${sale.id}/return/add`)
          >
            {t("sales:createReturnButton")} {/* Add key: "إنشاء مرتجع" */}
          </Button>
        )}
      </Box>

      {/* Main Details Card */}
      <Paper
        sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}
        elevation={2}
        className="dark:bg-gray-800"
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              className="dark:text-gray-400"
            >
              {t("clients:client")}
            </Typography>
            <Typography
              variant="body1"
              fontWeight="medium"
              className="dark:text-gray-100"
            >
              {sale.client_name || t("common:n/a")}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              className="dark:text-gray-400"
            >
              {t("sales:saleDate")}
            </Typography>
            <Typography
              variant="body1"
              fontWeight="medium"
              className="dark:text-gray-100"
            >
              {dayjs(sale?.sale_date).format("YYYY-MM-DD")}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              className="dark:text-gray-400"
            >
              {t("sales:invoice")}
            </Typography>
            <Typography
              variant="body1"
              fontWeight="medium"
              className="dark:text-gray-100"
            >
              {sale.invoice_number || "---"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              className="dark:text-gray-400"
            >
              {t("sales:status")}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={t(`sales:status_${sale?.status}`)}
                size="small"
                color={
                  sale?.status === "completed"
                    ? "success"
                    : sale?.status === "pending"
                    ? "warning"
                    : sale?.status === "draft"
                    ? "info"
                    : "default"
                }
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              className="dark:text-gray-400"
            >
              {t("common:recordedBy")}
            </Typography>
            <Typography
              variant="body1"
              fontWeight="medium"
              className="dark:text-gray-100"
            >
              {sale.user_name || t("common:n/a")}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography
              variant="overline"
              color="text.secondary"
              className="dark:text-gray-400"
            >
              {t("common:recordedDate")}
            </Typography>
            <Typography
              variant="body1"
              fontWeight="medium"
              className="dark:text-gray-100"
            >
              {dayjs(sale.created_at).format("YYYY-MM-DD")}
            </Typography>
          </Grid>
          {sale.notes && (
            <Grid item xs={12}>
              <Typography
                variant="overline"
                color="text.secondary"
                className="dark:text-gray-400"
              >
                {t("sales:notesLabel")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}
                className="dark:text-gray-200"
              >
                {sale.notes}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Items Table */}
      <Typography
        variant="h6"
        component="h2"
        sx={{ mb: 2 }}
        className="text-gray-800 dark:text-gray-100"
      >
        {t("sales:itemsSectionTitle")}
      </Typography>
      <TableContainer
        component={Paper}
        elevation={1}
        className="dark:bg-gray-800"
      >
        <Table size="small">
          <TableHead
            sx={{ backgroundColor: "action.hover" }}
            className="dark:bg-gray-700"
          >
            <TableRow>
              <TableCell className="dark:text-gray-300">
                {t("sales:product")}
              </TableCell>
              <TableCell className="dark:text-gray-300">
                {t("products:sku")}
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                {t("sales:quantity")}
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                {t("sales:unitPrice")}
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                {t("sales:totalPrice")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sale.items?.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell className="dark:text-gray-100">
                  {item.product_name ||
                    `(${t("common:product")} ID: ${item.product_id})`}
                </TableCell>
                <TableCell className="dark:text-gray-100">
                  {item.product_sku || "---"}
                </TableCell>
                <TableCell align="right" className="dark:text-gray-100">
                  {item.quantity}
                </TableCell>
                <TableCell align="right" className="dark:text-gray-100">
                  {formatNumber(item.unit_price)}
                </TableCell>
                <TableCell align="right" className="dark:text-gray-100">
                  {formatNumber(item.total_price)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
            {/* --- Payments Section --- */}
            <Card className="dark:bg-gray-800 mb-6 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-gray-800 dark:text-gray-100">{t('sales:paymentsMadeTitle')}</CardTitle> {/* Add key */}
                    {/* Optional: Add Payment Button if not fully paid and allowed */}
                    {/* {sale.due_amount && Number(sale.due_amount) > 0 && can('add-sale-payment') && (
                        <Button size="sm" onClick={() => navigate(`/sales/${sale.id}/add-payment`)}>
                            <PlusCircle className="me-2 h-4 w-4"/> {t('sales:addPaymentButton')}
                        </Button>
                    )} */}
                </CardHeader>
                <CardContent className="p-0">
                    {sale.payments && sale.payments.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 text-center">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                              <th className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('sales:paymentDate')}</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('sales:paymentMethod')}</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('sales:paymentAmount')}</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('sales:paymentReference')}</th>
                              <th className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">{t('common:recordedBy')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.payments.map((payment) => (
                              <tr key={payment.id} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">{formatDate(payment.payment_date)}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                                <div className="flex items-center justify-center gap-2">
                                  {getPaymentMethodIcon(payment.method)}
                                  {t(`paymentMethods:${payment.method}`, { defaultValue: payment.method })}
                                </div>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">{formatCurrency(payment.amount)}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{payment.reference_number || '---'}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{payment.user_name || t('common:n/a')}</td>
                              </tr>
                              ))}
                            </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="p-4 text-sm text-muted-foreground dark:text-gray-400">{t('sales:noPaymentsRecorded')}</p> 
                    )}
                </CardContent>
            </Card>
            {/* --- End Payments Section --- */}

       {/* Totals Section (remains the same, uses sale.total_amount, sale.paid_amount, sale.due_amount) */}
             <div className="flex justify-end mt-6">
                <Card className="w-full max-w-sm dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="p-4 space-y-2">
                         <div className="flex justify-between items-center">
                             <Typography variant="body1" className="dark:text-gray-300">{t('sales:grandTotal')}:</Typography>
                             <Typography variant="body1" fontWeight="bold" className="dark:text-gray-100">{formatCurrency(sale.total_amount)}</Typography>
                         </div>
                         <div className="flex justify-between items-center">
                             <Typography variant="body1" className="dark:text-gray-300">{t('sales:totalPaid')}:</Typography>
                             <Typography variant="body1" fontWeight="medium" className="dark:text-gray-100">{formatCurrency(sale.paid_amount)}</Typography>
                         </div>
                         <Separator className="my-1 dark:bg-gray-700"/>
                         <div className="flex justify-between items-center">
                             <Typography variant="h6" component="p" className="font-semibold dark:text-gray-100">{t('sales:amountDue')}:</Typography>
                             <Typography variant="h6" component="p" className={`font-bold ${Number(sale.due_amount) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatCurrency(sale.due_amount)}
                            </Typography>
                         </div>
                    </CardContent>
                </Card>
             </div>
        
    </Box>
  );
};

export default SaleDetailsPage;
