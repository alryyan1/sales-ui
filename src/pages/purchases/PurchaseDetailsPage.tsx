// src/pages/PurchaseDetailsPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { toast } from "sonner";

// MUI Components (or shadcn/Tailwind equivalents)
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

// Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InventoryIcon from "@mui/icons-material/Inventory";
// Or Lucide icons if using shadcn
// import { ArrowLeft } from 'lucide-react';

// Services and Types
import purchaseService, { Purchase } from "../../services/purchaseService"; // Import Purchase type
import { formatCurrency } from "@/constants";
import { formatDate } from "date-fns";
import dayjs from "dayjs";

// Helper to format currency

const PurchaseDetailsPage: React.FC = () => {
  // Removed useTranslation
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Get the 'id' parameter from the URL

  // State
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchaseDetails = async (purchaseId: number) => {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching details for purchase ID: ${purchaseId}`);
      try {
        // Fetch the specific purchase, including items
        // Ensure the backend's show() method eager loads 'items.product' etc.
        const data = await purchaseService.getPurchase(purchaseId);
        setPurchase(data);
      } catch (err) {
        console.error(`Failed to fetch purchase ${purchaseId}:`, err);
        const errorMsg = purchaseService.getErrorMessage(err);
        setError(errorMsg);
        toast.error("خطأ", { description: errorMsg });
        // Optional: Navigate back or to a not-found page on error
        // navigate('/purchases');
      } finally {
        setIsLoading(false);
      }
    };

    // Validate the ID from the URL
    const numericId = Number(id);
    if (id && !isNaN(numericId) && numericId > 0) {
      fetchPurchaseDetails(numericId);
    } else {
      setError("معرف شراء غير صالح."); // Add translation key
      setIsLoading(false);
      // Optionally navigate away if ID is invalid
      // navigate('/404');
    }
  }, [id, navigate]); // Dependency array includes id

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
        <Typography sx={{ ml: 2 }}>جاري التحميل...</Typography>
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
          onClick={() => navigate("/purchases")}
        >
          العودة للقائمة {/* Add key */}
        </Button>
      </Box>
    );
  }

  if (!purchase) {
    // Should ideally be caught by error state, but handle just in case
    return (
      <Box sx={{ p: 3 }}>
        <Typography>لم يتم العثور على الشراء</Typography> {/* Add key */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/purchases")}
        >
          العودة للقائمة
        </Button>
      </Box>
    );
  }

  // Display Purchase Details
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }} className="dark:bg-gray-950 pb-10">
      {/* Back Button & Title */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton
          onClick={() => navigate("/purchases")}
          sx={{ mr: 1 }}
          aria-label={t("common:back") || "Back"}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h4"
          component="h1"
          className="text-gray-800 dark:text-gray-100 font-semibold"
        >
          {t("purchases:detailsTitle")} {/* Add key */} #{purchase.id}
        </Typography>
      </Box>

      {/* Main Details Card */}
      <Paper
        sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}
        elevation={2}
        className="dark:bg-gray-800"
      >
        <Grid container spacing={3}>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              المورد
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {purchase.supplier_name || "---"}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              تاريخ الشراء
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {dayjs(purchase.purchase_date).format("YYYY-MM-DD")}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              المرجع
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {purchase.reference_number || "---"}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              الحالة
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={
                  {
                    received: "تم الاستلام",
                    pending: "معلق",
                    ordered: "تم الطلب",
                  }[purchase.status] || purchase.status
                }
                size="small"
                color={
                  purchase.status === "received"
                    ? "success"
                    : purchase.status === "pending"
                    ? "warning"
                    : "default"
                }
              />
            </Box>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              سجل بواسطة
            </Typography>{" "}
            {/* Add key */}
            <Typography variant="body1" fontWeight="medium">
              {purchase.user_name || "---"}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              تاريخ التسجيل
            </Typography>{" "}
            {/* Add key */}
            <Typography variant="body1" fontWeight="medium">
              {dayjs(purchase.created_at).format("YYYY-MM-DD")}
            </Typography>
          </Grid>
          {purchase.notes && (
            <Grid xs={12}>
              <Typography variant="overline" color="text.secondary">
                ملاحظات
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}
              >
                {purchase.notes}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Items Table */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6" component="h2">
          العناصر
        </Typography>
        <Button
          variant="contained"
          startIcon={<InventoryIcon />}
          onClick={() => navigate(`/purchases/${purchase.id}/items`)}
        >
          إدارة العناصر
        </Button>
      </Box>
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
              <TableCell className="dark:text-gray-300">المنتج</TableCell>
              <TableCell className="dark:text-gray-300">SKU</TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                الكمية
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                تكلفة الوحدة
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                التكلفة الإجمالية
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchase.items?.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell className="dark:text-gray-100">
                  {item.product_name || `(منتج ID: ${item.product_id})`}
                </TableCell>
                <TableCell className="dark:text-gray-100">
                  {item.product_sku || "---"}
                </TableCell>
                <TableCell align="right" className="dark:text-gray-100">
                  {item.quantity}
                </TableCell>
                <TableCell align="right" className="dark:text-gray-100">
                  {formatCurrency(item.unit_cost)}
                </TableCell>
                <TableCell align="right" className="dark:text-gray-100">
                  {formatCurrency(item.total_cost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Grand Total */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mt: 3,
          p: 2,
          backgroundColor: "grey.100",
        }}
        className="dark:bg-gray-700 rounded"
      >
        <Typography
          variant="h6"
          component="p"
          fontWeight="bold"
          className="text-gray-800 dark:text-gray-100"
        >
          المجموع الكلي: {formatCurrency(purchase.total_amount)}
        </Typography>
      </Box>
    </Box>
  );
};

export default PurchaseDetailsPage;
