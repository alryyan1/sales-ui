import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Box,
  Stack,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Button,
  DialogActions,
} from "@mui/material";
import { X, ShoppingCart, Percent, TrendingUp, FileText, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Sale } from "@/services/saleService";
import { formatNumber } from "@/constants";
import { useSettings } from "@/context/SettingsContext";
import apiClient from "@/lib/axios";

interface SaleDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
  loading: boolean;
}

const SaleDetailsDialog: React.FC<SaleDetailsDialogProps> = ({
  open,
  onClose,
  sale,
  loading,
}) => {
  const { settings } = useSettings();
  const [a4PdfOpen, setA4PdfOpen] = useState(false);
  const [loadingThermal, setLoadingThermal] = useState(false);

  const handleA4Pdf = () => {
    if (sale) {
      setA4PdfOpen(true);
    }
  };

  const handleThermalPdf = async () => {
    if (!sale) return;

    setLoadingThermal(true);
    try {
      const response = await apiClient.get(
        `/sales/${sale.id}/thermal-invoice-pdf`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Open in new window for printing
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          // Clean up URL after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        };
      } else {
        // If popup blocked, clean up immediately
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to load thermal invoice:", error);
    } finally {
      setLoadingThermal(false);
    }
  };

  const handleCloseA4Pdf = () => {
    setA4PdfOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            pb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              تفاصيل البيع #{sale?.id}
            </Typography>
            {sale && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: "medium" }}
              >
                معلومات البيع
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : sale ? (
          <Stack sx={{mt:2}} spacing={3}>
            {/* Sale Info - Inline with title */}
            <Paper
              elevation={0}
              sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2,mt:2 }}
            >
              <Stack direction="row" spacing={4} justifyContent="space-between">
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    التاريخ:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {sale.sale_date
                      ? format(parseISO(sale.sale_date), "yyyy-MM-dd HH:mm")
                      : "---"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    العميل:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {sale.client?.name || sale.client_name || "عميل نقدي"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    بواسطة:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {sale.user?.name || sale.user_name || "---"}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Items Table */}
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                المنتجات
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.100" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>المنتج</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      الكمية
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      السعر
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      المجموع
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sale.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell dir="auto">{item.product_name}</TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="center">
                        {formatNumber(Number(item.unit_price))}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        {formatNumber(Number(item.subtotal))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* Financial Summary */}
            <Stack direction={'row'} gap={2} spacing={2}>
      <Box sx={{maxWidth:"300px"}}>
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                الملخص المالي
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, borderStyle: "dashed" }}
              >
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ShoppingCart size={16} color="#666" />
                      <Typography variant="body2">إجمالي المنتجات</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight="bold">
                      {formatNumber(Number(sale.total_amount))}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Percent size={16} color="#ed6c02" />
                      <Typography variant="body2">الخصم</Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="warning.main"
                    >
                      -{formatNumber(Number(sale.discount_amount || 0))}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TrendingUp size={18} color="#2e7d32" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        الإجمالي الصافي
                      </Typography>
                    </Stack>
                    <Typography
                      variant="subtitle1"
                      fontWeight="900"
                      color="primary.main"
                    >
                      {formatNumber(Number(sale.total_amount))}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mt: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      المسدد:
                    </Typography>
                    <Chip
                      label={formatNumber(Number(sale.paid_amount))}
                      color="success"
                      size="small"
                      variant="filled"
                      sx={{ fontWeight: "bold" }}
                    />
                  </Box>

                  {Number(sale.due_amount) > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        المتبقي:
                      </Typography>
                      <Chip
                        label={formatNumber(Number(sale.due_amount))}
                        color="error"
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: "bold" }}
                      />
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Box>
                {/* Payments List */}
                {sale.payments && sale.payments.length > 0 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  الدفعات
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.100" }}>
                      <TableCell sx={{ fontWeight: "bold" }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="center">
                        الطريقة
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="center">
                        المبلغ
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sale.payments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.payment_date
                            ? format(
                                parseISO(payment.payment_date),
                                "yyyy-MM-dd"
                              )
                            : "---"}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={payment.method}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold" }}>
                          {formatNumber(Number(payment.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
            </Stack>
      

        
          </Stack>
        ) : (
          <Typography align="center" color="text.secondary">
            لا توجد بيانات متاحة
          </Typography>
        )}
      </DialogContent>
      {sale && (
        <DialogActions sx={{ px: 3, pb: 2, borderTop: "1px solid", borderColor: "divider", pt: 2 ,gap:1 }}>
          <Button
            variant="outlined"
            startIcon={<FileText size={16} />}
            onClick={handleA4Pdf}
          >
            فاتورة A4
          </Button>
          <Button
            variant="contained"
            startIcon={<Printer size={16} />}
            onClick={handleThermalPdf}
            disabled={loadingThermal}
          >
            {loadingThermal ? "جاري التحميل..." : "فاتورة حرارية"}
          </Button>
        </DialogActions>
      )}
    </Dialog>

    {/* A4 PDF Dialog */}
    {sale && (
      <Dialog
        open={a4PdfOpen}
        onClose={handleCloseA4Pdf}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "90vh",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            pb: 2,
          }}
        >
          <Typography variant="h6">فاتورة A4 - #{sale.id}</Typography>
          <IconButton onClick={handleCloseA4Pdf} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography color="text.secondary">فاتورة A4 غير متاحة حالياً</Typography>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

export default SaleDetailsDialog;
