import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Skeleton,
} from "@mui/material";
import {
  TrendingUp,
  Percent,
  CheckCircle2,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { formatNumber } from "@/constants";
import { useSalesReport } from "@/hooks/useSalesReport";
import { useSettings } from "@/context/SettingsContext";
import { ReportFilterValues } from "./ReportFilters";

interface ReportStatsProps {
  filterValues: ReportFilterValues;
}

export const ReportStats: React.FC<ReportStatsProps> = ({ filterValues }) => {
  const { getSetting } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  // Fetch all data for stats (without pagination limit ideally, but API might limit it)
  // For accurate stats over a date range, we usually need a separate "summary" endpoint
  // or fetch a large limit. Since the current implementation fetched paginated data
  // in SalesReportPage and calculated stats on *that*, we will replicate that behavior
  // or implies the user accepts stats for the *current view* or wants *total* stats.
  // IMPORTANT: The previous implementation in SalesReportPage seemed to calculate stats based on `reportData.data`
  // which is just the *current page* if paginated. That seems wrong for "Total Sales" etc unless limit was high.
  // The original code had `limit: 25`. So stats were only for 26 items?
  // User might want stats for ALL filtered data.
  // Use a high limit for stats or check if API supports summary.
  // Replicating original behavior: usage of useSalesReport with same filters.

  const { data: reportData, isLoading } = useSalesReport({
    page: 1, // Stats usually aggregations, but if backend returns paginated...
    startDate: filterValues.startDate,
    endDate: filterValues.endDate,
    clientId: filterValues.clientId ? Number(filterValues.clientId) : null,
    userId: filterValues.userId ? Number(filterValues.userId) : null,
    shiftId: filterValues.shiftId ? Number(filterValues.shiftId) : null,
    limit: 1000, // Fetch reasonable number for stats
    posMode,
  });

  const summaryStats = useMemo(() => {
    const data = reportData?.data || [];

    const totalSales = reportData?.total || data.length;
    const totalAmount = data.reduce(
      (sum, sale) => sum + Number(sale.total_amount),
      0
    );
    const totalPaid = data.reduce(
      (sum, sale) => sum + Number(sale.paid_amount),
      0
    );
    const totalDue = data.reduce(
      (sum, sale) => sum + Number(sale.due_amount || 0),
      0
    );
    const totalDiscount = data.reduce(
      (sum, sale) => sum + Number(sale.discount_amount || 0),
      0
    );

    const totalRefund = data.reduce((sum, sale) => {
      if (!sale.payments) return sum;
      return (
        sum +
        sale.payments
          .filter((p) => (p.method as string) === "refund")
          .reduce((pSum, p) => pSum + Math.abs(Number(p.amount)), 0)
      );
    }, 0);

    const totalNet = totalAmount - totalRefund;

    const totalCash = data.reduce((sum, sale) => {
      if (!sale.payments) return sum;
      return (
        sum +
        sale.payments
          .filter((p) => p.method === "cash")
          .reduce((pSum, p) => pSum + Number(p.amount), 0)
      );
    }, 0);

    const totalBank = data.reduce((sum, sale) => {
      if (!sale.payments) return sum;
      return (
        sum +
        sale.payments
          .filter((p) =>
            ["visa", "mastercard", "mada", "bank_transfer"].includes(p.method)
          )
          .reduce((pSum, p) => pSum + Number(p.amount), 0)
      );
    }, 0);

    return {
      totalSales,
      totalAmount,
      totalPaid,
      totalDue,
      totalCash,
      totalBank,
      totalDiscount,
      totalRefund,
      totalNet,
    };
  }, [reportData]);

  if (isLoading) {
    return (
      <Stack spacing={3} sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(6, 1fr)",
            },
            gap: 2.5,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={100}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Box>
      </Stack>
    );
  }

  // If no stats (shouldn't happen with default), return null or empty state
  // But we want to show zeros if no data
  if (!summaryStats) return null;

  return (
    <Stack spacing={3} sx={{ mb: 3 }}>
      {/* Row 1: Amount, Discount, Paid, Refund, Net, SalesCount */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(1, 1fr)",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(6, 1fr)",
          },
          gap: 2.5,
        }}
      >
        {/* Total Amount */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <CardContent sx={{ p: 1, textAlign: "center" }}>
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  color: "primary.main",
                  p: 1,
                  bgcolor: "primary.lighter",
                  borderRadius: "50%",
                }}
              >
                <TrendingUp size={24} />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                  gutterBottom
                >
                  إجمالي المبيعات
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatNumber(summaryStats.totalAmount)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Discount */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <CardContent sx={{ p: 1, textAlign: "center" }}>
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  color: "warning.main",
                  p: 1,
                  bgcolor: "warning.lighter",
                  borderRadius: "50%",
                }}
              >
                <Percent size={24} />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                  gutterBottom
                >
                  الخصم
                </Typography>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  {formatNumber(summaryStats.totalDiscount)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Paid */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <CardContent sx={{ p: 1, textAlign: "center" }}>
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  color: "success.main",
                  p: 1,
                  bgcolor: "success.lighter",
                  borderRadius: "50%",
                }}
              >
                <CheckCircle2 size={24} />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                  gutterBottom
                >
                  المدفوع
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {formatNumber(summaryStats.totalPaid)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Typography variant="caption" color="text.secondary">
                  نقد:{" "}
                  <Box
                    component="span"
                    sx={{ fontWeight: 600, color: "success.main" }}
                  >
                    {formatNumber(summaryStats.totalCash)}
                  </Box>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  بنك:{" "}
                  <Box
                    component="span"
                    sx={{ fontWeight: 600, color: "primary.main" }}
                  >
                    {formatNumber(summaryStats.totalBank)}
                  </Box>
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Refund */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <CardContent sx={{ p: 1, textAlign: "center" }}>
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  color: "error.main",
                  p: 1,
                  bgcolor: "error.lighter",
                  borderRadius: "50%",
                }}
              >
                <RotateCcw size={24} />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                  gutterBottom
                >
                  المرتجع
                </Typography>
                <Typography variant="h5" fontWeight={700} color="error.main">
                  {formatNumber(summaryStats.totalRefund)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Sales Count */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <CardContent sx={{ p: 1, textAlign: "center" }}>
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  color: "text.secondary",
                  p: 1,
                  bgcolor: "action.hover",
                  borderRadius: "50%",
                }}
              >
                <ShoppingCart size={24} />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                  gutterBottom
                >
                  عدد العمليات
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {summaryStats.totalSales}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
};
