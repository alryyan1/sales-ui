import React, { useMemo } from "react";
import { formatNumber } from "@/constants";
import { useSalesReport } from "@/hooks/useSalesReport";
import { useSettings } from "@/context/SettingsContext";
import { ReportFilterValues } from "./ReportFilters";
import { useQuery } from "@tanstack/react-query";
import expenseService from "@/services/expenseService";
import { usePaymentStats } from "@/hooks/usePaymentStats";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface ReportStatsProps {
  filterValues: ReportFilterValues;
}

export const ReportStats: React.FC<ReportStatsProps> = ({ filterValues }) => {
  const { t } = useTranslation(["reports"]);
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
    limit: 500,
    posMode,
  });

  const { data: paymentStats, isLoading: isLoadingPayments } = usePaymentStats(
    {
      shift_id: filterValues.shiftId ? Number(filterValues.shiftId) : null,
      start_date: !filterValues.shiftId ? filterValues.startDate : null,
      end_date: !filterValues.shiftId ? filterValues.endDate : null,
      user_id: filterValues.userId ? Number(filterValues.userId) : null,
    },
    !!(filterValues.shiftId || filterValues.startDate)
  );

  const expensesQueryEnabled =
    posMode === "shift"
      ? !!filterValues.shiftId
      : !!filterValues.startDate && !!filterValues.endDate;

  const { data: expensesData, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["expenses-report", posMode, filterValues.shiftId, filterValues.startDate, filterValues.endDate],
    queryFn: async () => {
      if (posMode === "shift" && filterValues.shiftId) {
        return await expenseService.getExpenses(1, 1000, { shift_id: Number(filterValues.shiftId) });
      }
      return await expenseService.getExpenses(1, 1000, {
        date_from: filterValues.startDate || undefined,
        date_to: filterValues.endDate || undefined,
      });
    },
    enabled: expensesQueryEnabled,
    refetchOnMount: true,
    staleTime: 0,
  });

  const stats = useMemo(() => {
    const data = reportData?.data || [];
    const byMethod = paymentStats?.by_method ?? {};
    const expenses = expensesData?.data || [];

    const totalCash = byMethod["cash"] ?? 0;
    const totalBankTransfer = byMethod["bank_transfer"] ?? 0;
    const totalVisa = byMethod["visa"] ?? 0;

    return {
      totalSales: reportData?.total || data.length,
      totalAmount: data.reduce((s, sale) => s + Number(sale.total_amount), 0),
      totalPaid: paymentStats?.total ?? 0,
      totalDue: data.reduce((s, sale) => s + Number(sale.due_amount || 0), 0),
      totalCash,
      totalBankTransfer,
      totalVisa,
      totalExpenses: expenses.reduce((s, e) => s + Number(e.amount), 0),
    };
  }, [reportData, paymentStats, expensesData]);

  const loading = isLoading || isLoadingPayments || isLoadingExpenses;

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-36 rounded-lg" />
        ))}
      </div>
    );
  }

  const items = [
    { label: t("reports:salesReportPage.statTotalSales"), value: stats.totalAmount, sub: t("reports:salesReportPage.statSalesCount", { count: stats.totalSales }), color: "text-violet-600" },
    { label: t("reports:salesReportPage.statPaid"), value: stats.totalPaid, color: "text-emerald-600" },
    { label: t("reports:salesReportPage.statCash"), value: stats.totalCash, color: "text-green-600" },
    { label: t("reports:salesReportPage.statBankTransfer"), value: stats.totalBankTransfer, color: "text-blue-600" },
    { label: t("reports:salesReportPage.statVisa"), value: stats.totalVisa, color: "text-orange-500" },
    { label: t("reports:salesReportPage.statDue"), value: stats.totalDue, color: stats.totalDue > 0 ? "text-red-600" : "text-emerald-600" },
    { label: t("reports:salesReportPage.statExpenses"), value: stats.totalExpenses, color: "text-rose-600" },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col justify-center px-3 py-2 rounded-lg border bg-card min-w-[110px]"
        >
          <span className="text-xs text-muted-foreground leading-tight">{item.label}</span>
          <span className={`text-sm font-bold tabular-nums ${item.color}`}>
            {formatNumber(item.value, 2)}
          </span>
          {item.sub && (
            <span className="text-xs text-muted-foreground">{item.sub}</span>
          )}
        </div>
      ))}
    </div>
  );
};
