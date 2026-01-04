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
import { ArrowLeft, ShoppingCart, DollarSign, FileText, User, Calendar, Printer } from "lucide-react";

// Services and Types
import saleService, { Sale } from "../../services/saleService";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import dayjs from "dayjs";

// Payment method labels in Arabic
const paymentMethodLabels: Record<string, string> = {
  cash: 'نقدي',
  visa: 'فيزا',
  mastercard: 'ماستركارد',
  bank_transfer: 'تحويل بنكي',
  mada: 'مدى',
  other: 'أخرى',
  store_credit: 'رصيد متجر',
};

const SaleDetailsPage: React.FC = () => {
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
        toast.error("خطأ", { description: errorMsg });
      } finally {
        setIsLoading(false);
      }
    };

    // Validate the ID from the URL
    const numericId = Number(id);
    if (id && !isNaN(numericId) && numericId > 0) {
      fetchSaleDetails(numericId);
    } else {
      setError("معرف بيع غير صالح.");
      setIsLoading(false);
    }
  }, [id]);

  // Calculate payment status
  const getPaymentStatus = (sale: Sale) => {
    const total = Number(sale.total_amount);
    const paid = Number(sale.paid_amount);
    
    if (paid >= total && total > 0) {
      return { label: 'مدفوع بالكامل', color: 'success' as const };
    } else if (paid > 0) {
      return { label: 'مدفوع جزئياً', color: 'warning' as const };
    } else {
      return { label: 'غير مدفوع', color: 'error' as const };
    }
  };

  // Calculate subtotal from items
  const calculateSubtotal = () => {
    if (!sale?.items) return 0;
    return sale.items.reduce((sum, item) => {
      const itemTotal = Number(item.total_price || item.unit_price) * Number(item.quantity);
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
          startIcon={<ArrowLeft size={20} />}
          onClick={() => navigate("/sales/pos")}
        >
          العودة للقائمة
        </Button>
      </Box>
    );
  }

  if (!sale) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>لم يتم العثور على البيع</Typography>
        <Button
          startIcon={<ArrowLeft size={20} />}
          onClick={() => navigate("/sales/pos")}
        >
          العودة للقائمة
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
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, direction: 'rtl' }} className="dark:bg-gray-950 pb-10">
      {/* Back Button & Title */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton
          onClick={() => navigate("/sales/pos")}
          sx={{ mr: 1 }}
          aria-label="رجوع"
        >
          <ArrowLeft size={24} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            component="h1"
            className="text-gray-800 dark:text-gray-100 font-semibold"
          >
            تفاصيل البيع #{sale.id}
          </Typography>
          {sale.sale_order_number && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              رقم الطلب: {sale.sale_order_number}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<Printer size={20} />}
          onClick={async () => {
            try {
              const token = localStorage.getItem('authToken');
              const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/sales-api/public';
              const url = `${VITE_API_BASE_URL}/api/sales/${sale.id}/invoice-pdf`;
              
              // Fetch PDF as blob
              const response = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                throw new Error('Failed to fetch invoice');
              }

              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              
              // Open in new window for printing
              const printWindow = window.open(blobUrl, '_blank');
              
              if (printWindow) {
                printWindow.onload = () => {
                  printWindow.print();
                };
              } else {
                // Fallback: download if popup blocked
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `فاتورة_${sale.invoice_number || sale.id}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
              }
            } catch (error) {
              console.error('Failed to open invoice:', error);
              toast.error('فشل فتح الفاتورة');
            }
          }}
          sx={{ ml: 2 }}
        >
          طباعة الفاتورة
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
            <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <User size={14} />
              العميل
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {sale.client_name || "عميل غير محدد"}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Calendar size={14} />
              تاريخ البيع
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {dayjs(sale.sale_date).format("YYYY-MM-DD")}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FileText size={14} />
              رقم الفاتورة
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {sale.invoice_number || "---"}
            </Typography>
          </Grid>
          {sale.sale_order_number && (
            <Grid xs={12} sm={6} md={4}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ShoppingCart size={14} />
                رقم الطلب
              </Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
                {sale.sale_order_number}
              </Typography>
            </Grid>
          )}
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              سجل بواسطة
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {sale.user_name || "---"}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              تاريخ التسجيل
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
              {dayjs(sale.created_at).format("YYYY-MM-DD HH:mm")}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Typography variant="overline" color="text.secondary">
              حالة الدفع
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
                ملاحظات
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
        عناصر البيع
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
              <TableCell className="dark:text-gray-300">المنتج</TableCell>
              <TableCell className="dark:text-gray-300">SKU</TableCell>
              <TableCell align="center" className="dark:text-gray-300">
                الكمية
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                سعر الوحدة
              </TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                الإجمالي
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sale.items && sale.items.length > 0 ? (
              sale.items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell className="dark:text-gray-100">
                    {item.product_name || `(منتج ID: ${item.product_id})`}
                    {item.batch_number_sold && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        دفعة: {item.batch_number_sold}
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
                    {formatCurrency(Number(item.total_price || item.unit_price) * Number(item.quantity))}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" className="dark:text-gray-400">
                  لا توجد عناصر
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payments Table */}
      <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        المدفوعات
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
              <TableCell className="dark:text-gray-300">طريقة الدفع</TableCell>
              <TableCell align="right" className="dark:text-gray-300">
                المبلغ
              </TableCell>
              <TableCell className="dark:text-gray-300">تاريخ الدفع</TableCell>
              <TableCell className="dark:text-gray-300">رقم المرجع</TableCell>
              <TableCell className="dark:text-gray-300">ملاحظات</TableCell>
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
                <TableCell colSpan={5} align="center" className="dark:text-gray-400">
                  لا توجد مدفوعات
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Section */}
      <Paper
        elevation={2}
        className="dark:bg-gray-800"
        sx={{ p: 3 }}
      >
        <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
          الملخص
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body1" color="text.secondary">
              المجموع الفرعي:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatCurrency(subtotal)}
            </Typography>
          </Box>
          {discountAmount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body1" color="text.secondary">
                الخصم {sale.discount_type === 'percentage' ? `(${discountAmount}%)` : ''}:
              </Typography>
              <Typography variant="body1" fontWeight="medium" color="error">
                - {formatCurrency(discountAmount)}
              </Typography>
            </Box>
          )}
          <Divider />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" fontWeight="bold">
              الإجمالي:
            </Typography>
            <Typography variant="h6" fontWeight="bold" className="dark:text-gray-100">
              {formatCurrency(totalAmount)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DollarSign size={16} />
              المدفوع:
            </Typography>
            <Typography variant="body1" fontWeight="medium" color="success.main">
              {formatCurrency(paidAmount)}
            </Typography>
          </Box>
          {dueAmount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body1" color="text.secondary">
                المتبقي:
              </Typography>
              <Typography variant="body1" fontWeight="medium" color="error.main">
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

