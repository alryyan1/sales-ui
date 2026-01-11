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
  ShoppingCart,
  Wallet,
  Building2,
  Receipt,
} from "lucide-react";
import { formatNumber } from "@/constants";
import { useSalesReport } from "@/hooks/useSalesReport";
import { useSettings } from "@/context/SettingsContext";
import { ReportFilterValues } from "./ReportFilters";
import { useQuery } from "@tanstack/react-query";
import expenseService from "@/services/expenseService";

interface ReportStatsProps {
  filterValues: ReportFilterValues;
}

export const ReportStats: React.FC<ReportStatsProps> = ({ filterValues }) => {
  const { getSetting } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  const { data: reportData, isLoading } = useSalesReport({
    page: 1,
    startDate: filterValues.startDate,
    endDate: filterValues.endDate,
    clientId: filterValues.clientId ? Number(filterValues.clientId) : null,
    userId: filterValues.userId ? Number(filterValues.userId) : null,
    shiftId: filterValues.shiftId ? Number(filterValues.shiftId) : null,
    productId: filterValues.productId ? Number(filterValues.productId) : null,
    limit: 500, // Fetch a larger set for stats calculation
    posMode,
  });

  // Fetch expenses with the same filters
  const { data: expensesData, isLoading: isLoadingExpenses } = useQuery({
    queryKey: [
      "expenses-report",
      filterValues.startDate,
      filterValues.endDate,
      filterValues.userId,
    ],
    queryFn: async () => {
      return await expenseService.getExpenses(1, 1000, {
        date_from: filterValues.startDate || undefined,
        date_to: filterValues.endDate || undefined,
      });
    },
    enabled: !!filterValues.startDate && !!filterValues.endDate,
    refetchOnMount: true,
    staleTime: 0,
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

    // Calculate expenses
    const expenses = expensesData?.data || [];
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );
    const totalExpensesCash = expenses
      .filter((expense) => expense.payment_method === "cash")
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
    const totalExpensesBank = expenses
      .filter((expense) => expense.payment_method === "bank")
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

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
      totalExpenses,
      totalExpensesCash,
      totalExpensesBank,
    };
  }, [reportData, expensesData]);

  if (isLoading || isLoadingExpenses) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(1, 1fr)",
            sm: "repeat(2, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          gap: 3,
          mb: 4,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={160}
            sx={{ borderRadius: 4, bgcolor: "rgba(0,0,0,0.04)" }}
          />
        ))}
      </Box>
    );
  }

  const statCards = [
    {
      title: "إجمالي المبيعات",
      value: summaryStats.totalAmount,
      icon: <TrendingUp size={24} />,
      color: "#6366f1",
      gradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
      subtitle: `الصافي: ${formatNumber(summaryStats.totalNet)}`,
    },
    {
      title: "المدفوع",
      value: summaryStats.totalPaid,
      icon: <CheckCircle2 size={24} />,
      color: "#22c55e",
      gradient: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
      extra: (
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Wallet size={12} style={{ opacity: 0.7 }} />
            <Typography
              variant="caption"
              sx={{ opacity: 0.9, fontWeight: 600 }}
            >
              {formatNumber(summaryStats.totalCash)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Building2 size={12} style={{ opacity: 0.7 }} />
            <Typography
              variant="caption"
              sx={{ opacity: 0.9, fontWeight: 600 }}
            >
              {formatNumber(summaryStats.totalBank)}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      title: "المستحق",
      value: summaryStats.totalDue,
      icon: <ShoppingCart size={24} />,
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
      subtitle: `${summaryStats.totalSales} عملية`,
    },
    {
      title: "الخصم",
      value: summaryStats.totalDiscount,
      icon: <Percent size={24} />,
      color: "#ec4899",
      gradient: "linear-gradient(135deg, #ec4899 0%, #d946ef 100%)",
    },
    {
      title: "إجمالي المصروفات",
      value: summaryStats.totalExpenses,
      icon: <Receipt size={24} />,
      color: "#ef4444",
      gradient: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
      extra: (
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Wallet size={12} style={{ opacity: 0.7 }} />
            <Typography
              variant="caption"
              sx={{ opacity: 0.9, fontWeight: 600 }}
            >
              {formatNumber(summaryStats.totalExpensesCash)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Building2 size={12} style={{ opacity: 0.7 }} />
            <Typography
              variant="caption"
              sx={{ opacity: 0.9, fontWeight: 600 }}
            >
              {formatNumber(summaryStats.totalExpensesBank)}
            </Typography>
          </Box>
        </Stack>
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(1, 1fr)",
          sm: "repeat(2, 1fr)",
          lg: "repeat(5, 1fr)",
        },
        gap: 2.5,
        mb: 4,
      }}
    >
      {statCards.map((card, index) => (
        <Card
          key={index}
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 4,
            border: "1px solid rgba(255, 255, 255, 0.3)",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: "0 12px 40px 0 rgba(31, 38, 135, 0.12)",
              "& .icon-wrapper": {
                transform: "scale(1.1) rotate(5deg)",
              },
            },
          }}
        >
          {/* Decorative Gradient Blob */}
          <Box
            sx={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              background: card.gradient,
              opacity: 0.05,
              borderRadius: "50%",
              filter: "blur(20px)",
            }}
          />

          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={2.5}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                  }}
                >
                  {card.title}
                </Typography>
                <Box
                  className="icon-wrapper"
                  sx={{
                    p: 1.25,
                    borderRadius: 3,
                    background: card.gradient,
                    color: "white",
                    display: "flex",
                    transition: "transform 0.3s ease",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  {card.icon}
                </Box>
              </Stack>

              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: "text.primary",
                    fontSize: { xs: "1.75rem", lg: "1.85rem" },
                    lineHeight: 1,
                  }}
                >
                  {formatNumber(card.value)}
                </Typography>
                {card.subtitle && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "text.secondary",
                      fontWeight: 500,
                    }}
                  >
                    {card.subtitle}
                  </Typography>
                )}
                {card.extra}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};
