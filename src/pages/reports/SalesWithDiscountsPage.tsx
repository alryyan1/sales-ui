import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import saleService, { Sale as ApiSale } from "@/services/saleService";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Stack,
  CircularProgress,
} from "@mui/material";
import { formatNumber } from "@/constants";
import { SalesWithDiscountsPdfDialog } from "@/components/reports/sales/SalesWithDiscountsPdfDialog";

const SalesWithDiscountsPage: React.FC = () => {
  // Removed useTranslation
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [loading, setLoading] = useState(false);
  const toYmd = (d: Date) => d.toISOString().split("T")[0];
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [startDate, setStartDate] = useState<string>(toYmd(firstDay));
  const [endDate, setEndDate] = useState<string>(toYmd(lastDay));
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, startDate, endDate]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("has_discount", "1");
      params.append("per_page", String(perPage));
      params.append("page", String(page));
      const resp = await saleService.getSales(page, params.toString());
      const items = (resp.data as ApiSale[]).filter(
        (s) => Number((s as ApiSale).discount_amount || 0) > 0
      );
      setSales(items);
    } catch (e: any) {
      console.error("Failed to fetch discounted sales", e);
      const errorMsg = saleService.getErrorMessage
        ? saleService.getErrorMessage(e)
        : e?.message || "حدث خطأ أثناء جلب البيانات";
      toast.error("خطأ", { description: errorMsg });
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalAmount = sales.reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0
    );
    const totalPaid = sales.reduce(
      (sum, s) => sum + Number(s.paid_amount || 0),
      0
    );
    const totalDiscount = sales.reduce(
      (sum, s) =>
        sum + Number((s.discount_amount as number | string | undefined) || 0),
      0
    );
    return {
      totalAmount,
      totalPaid,
      totalDiscount,
      totalDue: totalAmount - totalPaid,
    };
  }, [sales]);

  const openPdf = () => {
    setIsPdfDialogOpen(true);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between">
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            تقرير المبيعات المخفضة
          </Typography>
          <Button onClick={openPdf} variant="outlined" size="small">
            معاينة PDF
          </Button>
        </Stack>
        <Stack direction="row" gap={1} spacing={2} alignItems="flex-end">
          <TextField
            type="date"
            label="البدء"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            label="الانتهاء"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <Button
            onClick={() => {
              setPage(1);
              fetchSales();
            }}
            disabled={loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading ? "جاري التحميل..." : "تصفية"}
          </Button>
        </Stack>

        {/* Discount summary cards */}
        <Stack direction="row" gap={1} spacing={2}>
          <Card>
            <CardContent sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                إجمالي الخصم
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
                {formatNumber(totals.totalDiscount)}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                العدد
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {formatNumber(sales.length)}
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">#</TableCell>
                    <TableCell align="center">التاريخ</TableCell>
                    <TableCell align="center">العميل</TableCell>
                    <TableCell align="center">المجموع</TableCell>
                    <TableCell align="center">المدفوع</TableCell>
                    <TableCell align="center">الخصم</TableCell>
                    <TableCell align="center">النوع</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          لا توجد مبيعات مخفضة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell align="center">#{s.id}</TableCell>
                        <TableCell align="center">
                          {(s as ApiSale).sale_date}
                        </TableCell>
                        <TableCell align="center">
                          {(s as ApiSale).client_name || "-"}
                        </TableCell>
                        <TableCell align="center">
                          {formatNumber(Number(s.total_amount))}
                        </TableCell>
                        <TableCell align="center" sx={{ color: "success.main" }}>
                          {formatNumber(Number(s.paid_amount))}
                        </TableCell>
                        <TableCell align="center" sx={{ color: "error.main" }}>
                          {formatNumber(
                            Number(
                              (s.discount_amount as number | string | undefined) || 0
                            )
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {(s.discount_type as string | undefined) || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      {/* PDF Dialog */}
      <SalesWithDiscountsPdfDialog
        open={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
        sales={sales}
        startDate={startDate}
        endDate={endDate}
        totals={totals}
      />
    </Box>
  );
};

export default SalesWithDiscountsPage;
