import React, { useMemo } from "react";
import { formatNumber, CURRENCY_DECIMALS } from "@/constants";
import { useSalesReport } from "@/hooks/useSalesReport";
import { useSettings } from "@/context/SettingsContext";
import { ReportFilterValues } from "./ReportFilters";
import { useQuery } from "@tanstack/react-query";
import expenseService from "@/services/expenseService";
import { usePaymentStats } from "@/hooks/usePaymentStats";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { parseActivePaymentMethods } from "@/lib/paymentMethods";

interface ReportStatsProps {
  filterValues: ReportFilterValues;
}

export const ReportStats: React.FC<ReportStatsProps> = ({ filterValues }) => {
  const { t } = useTranslation("reports");
  const { getSetting } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";
  const currencyDecimals = CURRENCY_DECIMALS[getSetting("currency_code", "SDG")] ?? 0;
  const activePaymentMethods = parseActivePaymentMethods(
    getSetting("pos_active_payment_methods"),
  );
  // Bank/electronic tile stays visible if bankak, bank_transfer, or card is active,
  // since those all roll into the "bankak" bucket below.
  const showMethod = (method: "cash" | "bankak" | "fawry" | "ocash") =>
    method === "bankak"
      ? activePaymentMethods.some((m) =>
          ["bankak", "bank_transfer", "card"].includes(m),
        )
      : activePaymentMethods.includes(method);

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
    // Bank/electronic bucket: bankak plus bank_transfer/card rolled in, since
    // those don't get their own stat tile (see ShiftResource's equivalent rollup).
    const totalBankak =
      (byMethod["bankak"] ?? 0) + (byMethod["bank_transfer"] ?? 0) + (byMethod["card"] ?? 0);
    const totalFawry = byMethod["fawry"] ?? 0;
    const totalOcash = byMethod["ocash"] ?? 0;

    return {
      totalSales: reportData?.total || data.length,
      totalAmount: data.reduce((s, sale) => s + Number(sale.total_amount), 0),
      totalPaid: paymentStats?.total ?? 0,
      totalDue: data.reduce((s, sale) => s + Number(sale.due_amount || 0), 0),
      totalCash,
      totalBankak,
      totalFawry,
      totalOcash,
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
    { label: t("totalSales"), value: stats.totalAmount, sub: t("operationsCountSuffix", { count: stats.totalSales }), color: "text-violet-600" },
    { label: t("totalPaidLabel"), value: stats.totalPaid, color: "text-emerald-600" },
    showMethod("cash") && { label: t("paymentMethodCash"), value: stats.totalCash, color: "text-green-600" },
    showMethod("bankak") && { label: t("paymentMethodBankElectronic"), value: stats.totalBankak, color: "text-blue-600" },
    showMethod("fawry") && { label: t("paymentMethodFawry"), value: stats.totalFawry, color: "text-orange-500" },
    showMethod("ocash") && { label: t("paymentMethodOcash"), value: stats.totalOcash, color: "text-purple-500" },
    { label: t("totalDue"), value: stats.totalDue, color: stats.totalDue > 0 ? "text-red-600" : "text-emerald-600" },
    { label: t("expensesLabel"), value: stats.totalExpenses, color: "text-rose-600" },
  ].filter(Boolean) as { label: string; value: number; sub?: string; color: string }[];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col justify-center px-3 py-2 rounded-lg border bg-card min-w-[110px]"
        >
          <span className="text-xs text-muted-foreground leading-tight">{item.label}</span>
          <span className={`text-sm font-bold tabular-nums ${item.color}`}>
            {formatNumber(item.value, currencyDecimals)}
          </span>
          {item.sub && (
            <span className="text-xs text-muted-foreground">{item.sub}</span>
          )}
        </div>
      ))}
    </div>
  );
};
