// src/pages/SaleDetailsPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// MUI Components (or shadcn/Tailwind equivalents)
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";

// Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Services and Types
import saleService, { Sale } from "../../services/saleService"; // Import Sale type and service
import dayjs from "dayjs";
import { formatCurrency, formatDate, formatNumber } from "@/constants";
import { useAuthorization } from "@/hooks/useAuthorization";
import {
  Banknote,
  CircleDollarSign,
  CreditCard,
  History,
  Loader2,
  Printer,
  UndoIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/axios";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  // --- State for Thermal PDF Modal ---
    const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);
    const [thermalPdfUrl, setThermalPdfUrl] = useState<string | null>(null);
    const [loadingThermalPdf, setLoadingThermalPdf] = useState(false);

    // ... existing fetchDetails useEffect ...


    const handleShowThermalReceipt = async () => {
        if (!sale) return;
        setLoadingThermalPdf(true);
        setThermalPdfUrl(null); // Clear previous
        setIsThermalModalOpen(true); // Open modal immediately to show loader

        try {
            const response = await apiClient.get(`/sales/${sale.id}/thermal-invoice-pdf`, {
                responseType: 'blob', // <-- Important: Fetch as Blob
            });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            setThermalPdfUrl(fileURL);
        } catch (error) {
            console.error("Error fetching thermal receipt:", error);
            toast.error(t('common:error'), { description: t('sales:errorFetchingThermalReceipt') }); // Add key
            setIsThermalModalOpen(false); // Close modal on error
        } finally {
            setLoadingThermalPdf(false);
        }
    };
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
  const handlePrintInvoice = () => {
    if (!sale) return;
    // VITE_API_BASE_URL should be like http://localhost:8000 or http://localhost/sales-api
    const pdfUrl = `${import.meta.env.VITE_API_BASE_URL}/sales/${
      sale.id
    }/invoice-pdf`;
    window.open(pdfUrl, "_blank"); // Open PDF in a new tab
    toast.info(t("sales:invoiceGenerating")); // Add key
  };

  // Determine if a return can be created for this sale
  const canCreateReturn =
    sale?.status === "completed" && can("create-sale-returns"); // Example condition
  // --- Render Logic ---
  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash":
        return <Banknote className="h-4 w-4 text-green-600" />;
      case "visa":
      case "mastercard":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "bank_transfer":
        return <History className="h-4 w-4 text-purple-600" />; // Or another icon
      default:
        return <CircleDollarSign className="h-4 w-4 text-muted-foreground" />;
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
        <Button onClick={() => navigate("/sales")}>
          <ArrowBackIcon className="mr-2" />
          {t("sales:backToList")}
        </Button>
      </Box>
    ); // Add key
  }

  if (!sale) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{t("sales:notFound")}</Typography>
        <Button onClick={() => navigate("/sales")}>
          <ArrowBackIcon className="mr-2" />
          {t("sales:backToList")}
        </Button>
      </Box>
    ); // Add key
  }

  // Display Sale Details
  return (
    <Box>
      {/* Back Button & Title */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton
          onClick={() => navigate("/sales")}
          sx={{ mr: 1 }}
          aria-label={t("common:back") || "Back"}
        >
          <ArrowBackIcon className="" />
        </IconButton>
        <Typography variant="h4" component="h1" className="  font-semibold">
          {t("sales:detailsTitle")} #{sale.id} {/* Add key */}
        </Typography>
   
          <Card>
            <CardContent>
              <div className="flex flex-row justify-between items-center w-[450px]">
                {sale && sale.status !== "draft" && (
                  <Button onClick={handlePrintInvoice}>
                    <Printer className="me-2 h-4 w-4" />
                    {t("sales:printInvoice")}
                  </Button>
                )}
                <Button  size="sm" onClick={handleShowThermalReceipt}>
                  <Printer className="me-2 h-4 w-4" />
                  {t('sales:printThermalReceipt')}
                </Button>
              </div>
            </CardContent>
          </Card>
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
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography
                variant="overline"
                color="text.secondary"
                className=""
              >
                {t("clients:client")}
              </Typography>
              <Typography variant="body1" fontWeight="medium" className="">
                {sale.client_name || t("common:n/a")}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography
                variant="overline"
                color="text.secondary"
                className=""
              >
                {t("sales:saleDate")}
              </Typography>
              <Typography variant="body1" fontWeight="medium" className="">
                {dayjs(sale?.sale_date).format("YYYY-MM-DD")}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography
                variant="overline"
                color="text.secondary"
                className=""
              >
                {t("sales:invoice")}
              </Typography>
              <Typography variant="body1" fontWeight="medium" className="">
                {sale.invoice_number || "---"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography
                variant="overline"
                color="text.secondary"
                className=""
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
                className=""
              >
                {t("common:recordedBy")}
              </Typography>
              <Typography variant="body1" fontWeight="medium" className="">
                {sale.user_name || t("common:n/a")}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography
                variant="overline"
                color="text.secondary"
                className=""
              >
                {t("common:recordedDate")}
              </Typography>
              <Typography variant="body1" fontWeight="medium" className="">
                {dayjs(sale.created_at).format("YYYY-MM-DD")}
              </Typography>
            </Grid>
            {sale.notes && (
              <Grid item xs={12}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  className=""
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
        </CardContent>
      </Card>

      {/* Items Table */}
      <Typography variant="h6" component="h2" sx={{ mb: 2 }} className=" ">
        {t("sales:itemsSectionTitle")}
      </Typography>
      <Card className="mb-2">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="">{t("sales:product")}</TableCell>
                <TableCell className="">{t("products:sku")}</TableCell>
                <TableCell align="right" className="">
                  {t("sales:quantity")}
                </TableCell>
                <TableCell align="right" className="">
                  {t("sales:unitPrice")}
                </TableCell>
                <TableCell align="right" className="">
                  {t("sales:totalPrice")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="">
                    {item.product_name ||
                      `(${t("common:product")} ID: ${item.product_id})`}
                  </TableCell>
                  <TableCell className="">
                    {item.product_sku || "---"}
                  </TableCell>
                  <TableCell align="right" className="">
                    {item.quantity}
                  </TableCell>
                  <TableCell align="right" className="">
                    {formatNumber(item.unit_price)}
                  </TableCell>
                  <TableCell align="right" className="">
                    {formatNumber(item.total_price)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* --- Payments Section --- */}
      <Card className="dark:bg-gray-800 mb-6 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className=" ">{t("sales:paymentsMadeTitle")}</CardTitle>{" "}
          {/* Add key */}
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
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>
                    {t("sales:paymentDate")}
                    </TableCell>
                    <TableCell>
                    {t("sales:paymentMethod")}
                    </TableCell>
                    <TableCell>
                    {t("sales:paymentAmount")}
                    </TableCell>
                    <TableCell>
                    {t("sales:paymentReference")}
                    </TableCell>
                    <TableCell>
                    {t("common:recordedBy")}
                  </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">
                    {formatDate(payment.payment_date)}
                    </TableCell>
                    <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.method)}
                      {t(`paymentMethods:${payment.method}`, {
                      defaultValue: payment.method,
                      })}
                    </div>
                    </TableCell>
                    <TableCell className="text-sm">
                    {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                    {payment.reference_number || "---"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                    {payment.user_name || t("common:n/a")}
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
                </Table>
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground ">
              {t("sales:noPaymentsRecorded")}
            </p>
          )}
        </CardContent>
      </Card>
      {/* --- End Payments Section --- */}

      {/* Totals Section (remains the same, uses sale.total_amount, sale.paid_amount, sale.due_amount) */}
      <div className="flex justify-end mt-6">
        <Card className="w-full max-w-sm dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <Typography variant="body1" className="">
                {t("sales:grandTotal")}:
              </Typography>
              <Typography variant="body1" fontWeight="bold" className="">
                {formatCurrency(sale.total_amount)}
              </Typography>
            </div>
            <div className="flex justify-between items-center">
              <Typography variant="body1" className="">
                {t("sales:totalPaid")}:
              </Typography>
              <Typography variant="body1" fontWeight="medium" className="">
                {formatCurrency(sale.paid_amount)}
              </Typography>
            </div>
            <Separator className="my-1 dark:bg-gray-700" />
            <div className="flex justify-between items-center">
              <Typography variant="h6" component="p" className="font-semibold ">
                {t("sales:amountDue")}:
              </Typography>
              <Typography
                variant="h6"
                component="p"
                className={`font-bold ${
                  Number(sale.due_amount) > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {formatCurrency(sale.due_amount)}
              </Typography>
            </div>
          </CardContent>
        </Card>
      </div>
         {/* --- Thermal PDF Modal --- */}
            <Dialog open={isThermalModalOpen} onOpenChange={setIsThermalModalOpen}>
                <DialogContent className="sm:max-w-[350px] md:max-w-[450px] p-0 aspect-[80/100] overflow-hidden dark:bg-gray-800"> {/* Adjust width/aspect ratio */}
                    <DialogHeader className="p-4 border-b dark:border-gray-700">
                        <DialogTitle>{t('sales:thermalReceiptTitle')}</DialogTitle> {/* Add key */}
                         <DialogClose onClick={() => { if (thermalPdfUrl) URL.revokeObjectURL(thermalPdfUrl); }} /> {/* Revoke URL on close */}
                    </DialogHeader> 
                    <div className="p-2 h-[calc(100%-60px)] "> {/* Adjust height based on header */}
                      <p>i</p>
                        {loadingThermalPdf && (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        {thermalPdfUrl && !loadingThermalPdf && (
                            <iframe
                                src={thermalPdfUrl}
                                title={t('sales:thermalReceiptTitle')}
                                className="w-full h-full border-0"
                            />
                            // Or use <embed>
                            // <embed src={thermalPdfUrl} type="application/pdf" width="100%" height="100%" />
                        )}
                        {!loadingThermalPdf && !thermalPdfUrl && !error && ( // Handle case where PDF couldn't load but no network error
                            <div className="flex justify-center items-center h-full text-muted-foreground">
                                {t('sales:errorLoadingPdfPreview')} {/* Add key */}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
    </Box>
  );
};

export default SaleDetailsPage;
