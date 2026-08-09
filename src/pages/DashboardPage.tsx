import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BranchDetailsDrawer from "./BranchDetailsDrawer";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Users,
  Warehouse,
  CircleDollarSign,
  TrendingUp,
  FileText,
  CalendarDays,
  Trophy,
  TrendingDown,
  RefreshCw,
  Package,
  Clock,
  RotateCcw,
  ShoppingCart,
  Timer,
  ChevronLeft,
} from "lucide-react";

import apiClient, { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatNumber } from "@/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SalesSummary {
  today_amount: number;
  this_month_amount: number;
  filtered_amount?: number;
  filtered_count?: number;
  today_count: number;
  this_month_count: number;
}
interface EntitiesSummary {
  total_clients: number;
  total_suppliers: number;
  total_warehouses: number;
}
interface ProfitSummary {
  filtered_profit: number;
  filtered_net_revenue: number;
  filtered_expenses: number;
  filtered_returns: number;
}
interface InventorySummary {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  inventory_value: number;
}
interface PurchasesSummary {
  cash: number;
  bank: number;
  deferred: number;
  total: number;
}
interface DashboardSummaryData {
  sales: SalesSummary;
  entities: EntitiesSummary;
  profit: ProfitSummary;
  inventory: InventorySummary;
  purchases_summary: PurchasesSummary;
}

interface BranchData {
  id: number;
  name: string;
  total_sales: number;
  total_returns: number;
  total_profit: number;
  invoices_count: number;
  contribution_percentage: number;
}
interface BranchesComparisonData {
  branches: BranchData[];
  best_branch: BranchData | null;
  worst_branch: BranchData | null;
  total_sales: number;
}
interface TimeseriesPoint { label: string; total_sales: number; invoices_count: number; }
interface TopProduct { name: string; total_qty: number; total_revenue: number; }
interface AlertsData {
  low_stock: Array<{ id: number; name: string; stock: number; alert_level: number }>;
  overdue_invoices: Array<{ id: number; number: number; sale_date: string; client_name: string; due_amount: number }>;
  high_returns_branches: Array<{ id: number; name: string; total_sales: number; total_returns: number; return_rate: number }>;
  low_performing_branches: Array<{ id: number; name: string; total_sales: number; performance_pct: number }>;
}
type Period = "daily" | "weekly" | "monthly";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, Record<string, string>> = {
  ar: {
    "01":"يناير","02":"فبراير","03":"مارس","04":"أبريل",
    "05":"مايو","06":"يونيو","07":"يوليو","08":"أغسطس",
    "09":"سبتمبر","10":"أكتوبر","11":"نوفمبر","12":"ديسمبر",
  },
  en: {
    "01":"Jan","02":"Feb","03":"Mar","04":"Apr",
    "05":"May","06":"Jun","07":"Jul","08":"Aug",
    "09":"Sep","10":"Oct","11":"Nov","12":"Dec",
  },
};
const monthLabel = (key: string, lng: string) => {
  const [,m]=key.split("-");
  return (MONTH_NAMES[lng] ?? MONTH_NAMES.ar)[m] ?? key;
};
const CHART_COLORS = ["#6366f1","#10b981","#f59e0b","#3b82f6","#ef4444","#06b6d4"];
const BRANCH_BAR_COLORS = ["bg-indigo-500","bg-emerald-500","bg-amber-500","bg-blue-500","bg-rose-500"];

// ── Sub-components ────────────────────────────────────────────────────────────

/** KPI card with colored left border */
const KpiCard: React.FC<{
  label: string; value: string; sub?: React.ReactNode;
  icon: React.ReactNode; color: string; onClick?: () => void; loading?: boolean;
}> = ({ label, value, sub, icon, color, onClick, loading }) => (
  <Card onClick={onClick}
    className={`relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm
      transition-all duration-200 ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""}`}>
    <div className={`absolute right-0 inset-y-0 w-1 ${color}`} />
    <CardContent className="p-4 pr-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
          {loading
            ? <Skeleton className="h-7 w-28 mt-2 rounded dark:bg-gray-800" />
            : <p className="text-[22px] font-bold text-gray-800 dark:text-gray-100 mt-1 leading-none tabular-nums">{value}</p>
          }
          {!loading && sub && <div className="mt-2">{sub}</div>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

/** Horizontal mini-stat (used in purchases strip) */
const MiniStat: React.FC<{ label: string; value: string; color: string; icon: React.ReactNode }> = ({ label, value, color, icon }) => (
  <div className="flex items-center gap-3 flex-1 min-w-0">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color} bg-opacity-10`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums truncate">{value}</p>
    </div>
  </div>
);

/** Section header with optional right content */
const SectionHeader: React.FC<{ title: string; desc?: string; right?: React.ReactNode }> = ({ title, desc, right }) => (
  <div className="flex items-center justify-between mb-3">
    <div>
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h2>
      {desc && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>}
    </div>
    {right}
  </div>
);

/** Contribution progress bar */
const ContribBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div className="flex items-center gap-2 min-w-[100px]">
    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct,100)}%` }} />
    </div>
    <span className="text-[11px] font-semibold tabular-nums text-gray-400 w-8 text-left">{pct}%</span>
  </div>
);

/** Chart tooltip */
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {p.dataKey === "invoices_count" ? formatNumber(p.value) : formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Alert item card */
const AlertItemCard: React.FC<{
  title: string; icon: React.ReactNode; accent: string;
  count: number; loading?: boolean; children: React.ReactNode;
}> = ({ title, icon, accent, count, loading, children }) => {
  const { t } = useTranslation("dashboard");
  return (
    <Card className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{title}</span>
        </div>
        {count > 0 && (
          <span className="text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {count}
          </span>
        )}
      </div>
      <Separator className="dark:bg-gray-800" />
      <div className="px-4 py-3">
        {loading
          ? <div className="space-y-2">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-7 w-full rounded dark:bg-gray-800"/>)}</div>
          : count === 0
            ? <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">{t("noAlerts")}</p>
            : <div className="space-y-2">{children}</div>
        }
      </div>
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const direction = i18n.dir();

  // Build YYYY-MM-DD from local date parts (not toISOString, which shifts to UTC
  // and rolls back to the previous day/month in timezones ahead of UTC, e.g. Oman UTC+4).
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const firstOfMonth = toLocalDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const lastOfMonth  = toLocalDateStr(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate,   setEndDate]   = useState(lastOfMonth);
  const [period,    setPeriod]    = useState<Period>("monthly");

  const [summaryData,   setSummaryData]   = useState<DashboardSummaryData | null>(null);
  const [branchesData,  setBranchesData]  = useState<BranchesComparisonData | null>(null);
  const [timeseries,    setTimeseries]    = useState<TimeseriesPoint[]>([]);
  const [topProducts,   setTopProducts]   = useState<TopProduct[]>([]);
  const [alertsData,    setAlertsData]    = useState<AlertsData | null>(null);

  const [loadSummary,    setLoadSummary]    = useState(true);
  const [loadBranches,   setLoadBranches]   = useState(true);
  const [loadTimeseries, setLoadTimeseries] = useState(true);
  const [loadProducts,   setLoadProducts]   = useState(true);
  const [loadAlerts,     setLoadAlerts]     = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedBranchName, setSelectedBranchName] = useState<string | undefined>();

  const openBranchDrawer = useCallback((id: number, name: string) => {
    setSelectedBranchId(id);
    setSelectedBranchName(name);
    setDrawerOpen(true);
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoadSummary(true); setError(null);
    try {
      const q = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const r = await apiClient.get<{data:DashboardSummaryData}>(`/dashboard/summary?${q}`);
      setSummaryData(r.data.data);
    } catch(e) { const m=getErrorMessage(e); setError(m); toast.error(t("common:error"),{description:m}); }
    finally { setLoadSummary(false); }
  }, [startDate, endDate]);

  const fetchBranches = useCallback(async () => {
    setLoadBranches(true);
    try {
      const q = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const r = await apiClient.get<{data:BranchesComparisonData}>(`/dashboard/branches-comparison?${q}`);
      setBranchesData(r.data.data);
    } catch { /**/ } finally { setLoadBranches(false); }
  }, [startDate, endDate]);

  const fetchTimeseries = useCallback(async (p: Period) => {
    setLoadTimeseries(true);
    try {
      const r = await apiClient.get<{data:TimeseriesPoint[]}>(`/dashboard/sales-timeseries?period=${p}`);
      setTimeseries(r.data.data);
    } catch { setTimeseries([]); } finally { setLoadTimeseries(false); }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadProducts(true);
    try {
      const q = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const r = await apiClient.get<{data:TopProduct[]}>(`/dashboard/top-products?${q}`);
      setTopProducts(r.data.data);
    } catch { setTopProducts([]); } finally { setLoadProducts(false); }
  }, [startDate, endDate]);

  const fetchAlerts = useCallback(async () => {
    setLoadAlerts(true);
    try {
      const r = await apiClient.get<{data:AlertsData}>("/dashboard/alerts");
      setAlertsData(r.data.data);
    } catch { /**/ } finally { setLoadAlerts(false); }
  }, []);

  useEffect(() => { fetchSummary(); fetchBranches(); fetchProducts(); fetchAlerts(); },
    [fetchSummary, fetchBranches, fetchProducts, fetchAlerts]);
  useEffect(() => { fetchTimeseries(period); }, [period, fetchTimeseries]);

  const refresh = () => { fetchSummary(); fetchBranches(); fetchProducts(); fetchAlerts(); fetchTimeseries(period); };

  const invoicesCount = summaryData?.sales.filtered_count ?? summaryData?.sales.this_month_count ?? 0;
  const chartData = timeseries.map(p => ({ ...p, label: period==="monthly" ? monthLabel(p.label, i18n.language) : p.label }));

  if (!loadSummary && error) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("fetchErrorTitle")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Button onClick={refresh} variant="outline" className="mt-4">{t("common:retry")}</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={direction}>
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">

        {/* ━━━━━━━━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t("pageTitle")}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t("pageSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 shadow-sm text-sm">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <input type="date" value={startDate} max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none w-28 text-xs" />
              <span className="text-gray-300 dark:text-gray-600">—</span>
              <input type="date" value={endDate} min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none w-28 text-xs" />
            </div>
            <Button variant="outline" size="icon" onClick={refresh}
              className="h-9 w-9 border-gray-200 dark:border-gray-800 dark:bg-gray-900 shadow-sm">
              <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          </div>
        </div>

        {/* ━━━━━━━━━━ KPI CARDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard label={t("kpiSalesToday")}
            value={formatCurrency(summaryData?.sales.today_amount ?? 0)}
            sub={<span className="text-[11px] text-gray-400">{t("invoiceUnit", { count: formatNumber(summaryData?.sales.today_count ?? 0) })}</span>}
            icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
            color="bg-blue-500" onClick={() => navigate("/sales")} loading={loadSummary} />

          <KpiCard label={t("kpiSalesMonth")}
            value={formatCurrency(summaryData?.sales.this_month_amount ?? 0)}
            sub={<span className="text-[11px] text-gray-400">{t("invoiceUnit", { count: formatNumber(summaryData?.sales.this_month_count ?? 0) })}</span>}
            icon={<CircleDollarSign className="h-4 w-4 text-indigo-600" />}
            color="bg-indigo-500" onClick={() => navigate("/sales")} loading={loadSummary} />

          <KpiCard label={t("kpiNetSales")}
            value={formatCurrency(summaryData?.profit.filtered_profit ?? 0)}
            sub={summaryData ? (
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-100 dark:border-emerald-800">
                  {t("revenueLabel", { amount: formatCurrency(summaryData.profit.filtered_net_revenue) })}
                </span>
                {summaryData.profit.filtered_expenses > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 font-medium border border-red-100 dark:border-red-800">
                    {t("expensesLabel", { amount: formatCurrency(summaryData.profit.filtered_expenses) })}
                  </span>
                )}
                {summaryData.profit.filtered_returns > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 font-medium border border-orange-100 dark:border-orange-800">
                    {t("returnsLabel", { amount: formatCurrency(summaryData.profit.filtered_returns) })}
                  </span>
                )}
              </div>
            ) : undefined}
            icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
            color="bg-emerald-500" loading={loadSummary} />

          <KpiCard label={t("kpiInvoicesCount")}
            value={formatNumber(invoicesCount)}
            sub={<span className="text-[11px] text-gray-400">{t("forSelectedPeriod")}</span>}
            icon={<FileText className="h-4 w-4 text-amber-600" />}
            color="bg-amber-500" onClick={() => navigate("/sales")} loading={loadSummary} />

          <KpiCard label={t("kpiClientsCount")}
            value={formatNumber(summaryData?.entities.total_clients ?? 0)}
            sub={<span className="text-[11px] text-gray-400">{t("totalRegistered")}</span>}
            icon={<Users className="h-4 w-4 text-purple-600" />}
            color="bg-purple-500" onClick={() => navigate("/clients")} loading={loadSummary} />

          <KpiCard label={t("kpiBranchesCount")}
            value={formatNumber(summaryData?.entities.total_warehouses ?? 0)}
            sub={<span className="text-[11px] text-gray-400">{t("activeBranches")}</span>}
            icon={<Warehouse className="h-4 w-4 text-rose-600" />}
            color="bg-rose-500" onClick={() => navigate("/admin/warehouses")} loading={loadSummary} />
        </div>

        {/* ━━━━━━━━━━ PURCHASES STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <ShoppingCart className="h-3.5 w-3.5" />
                {t("purchasesSummaryTitle")}
              </div>
              <Separator orientation="vertical" className="h-8 hidden sm:block dark:bg-gray-800" />
              {loadSummary ? (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 flex-1">
                  <Skeleton className="h-8 w-full sm:w-32 rounded dark:bg-gray-800" />
                  <Skeleton className="h-8 w-full sm:w-32 rounded dark:bg-gray-800" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 flex-1 w-full">
                  <MiniStat label={t("totalPurchases")} value={formatCurrency(summaryData?.purchases_summary.total ?? 0)}
                    color="bg-violet-500" icon={<ShoppingCart className="h-3.5 w-3.5 text-violet-600" />} />
                  <Separator orientation="vertical" className="h-8 hidden sm:block dark:bg-gray-800" />
                  <MiniStat label={t("deferredUnpaid")} value={formatCurrency(summaryData?.purchases_summary.deferred ?? 0)}
                    color="bg-red-500" icon={<Timer className="h-3.5 w-3.5 text-red-500" />} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ━━━━━━━━━━ SALES TIMESERIES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-0">
            <SectionHeader
              title={t("salesOverTimeTitle")}
              desc={t("salesOverTimeDesc")}
              right={
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  {(["daily","weekly","monthly"] as Period[]).map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors
                        ${period===p ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                      {p==="daily"?t("periodDaily"):p==="weekly"?t("periodWeekly"):t("periodMonthly")}
                    </button>
                  ))}
                </div>
              }
            />
          </CardHeader>
          <CardContent className="px-3 pt-2 pb-3">
            {loadTimeseries
              ? <Skeleton className="h-56 w-full rounded-lg dark:bg-gray-800" />
              : chartData.length === 0
                ? <div className="h-56 flex items-center justify-center text-sm text-gray-400">{t("noData")}</div>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top:6, right:12, left:0, bottom:0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.08}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize:11, fill:"#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="l" tickFormatter={v=>formatNumber(v)} tick={{ fontSize:10, fill:"#9ca3af" }} tickLine={false} axisLine={false} width={52} />
                      <YAxis yAxisId="r" orientation="right" tickFormatter={v=>String(v)} tick={{ fontSize:10, fill:"#9ca3af" }} tickLine={false} axisLine={false} width={26} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11, paddingTop:8 }} />
                      <Line yAxisId="l" type="monotone" dataKey="total_sales" name={t("salesLineLabel")}
                        stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r:4, fill:"#6366f1" }} />
                      <Line yAxisId="r" type="monotone" dataKey="invoices_count" name={t("invoicesLineLabel")}
                        stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r:4, fill:"#10b981" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )
            }
          </CardContent>
        </Card>

        {/* ━━━━━━━━━━ BRANCH CHART + TOP PRODUCTS ━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="grid gap-4 lg:grid-cols-5">

          {/* Branch grouped chart */}
          <Card className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-0">
              <SectionHeader title={t("branchSalesProfitTitle")} desc={t("forSelectedPeriod")} />
            </CardHeader>
            <CardContent className="px-3 pt-2 pb-3">
              {loadBranches
                ? <Skeleton className="h-48 w-full rounded-lg dark:bg-gray-800" />
                : !branchesData || branchesData.branches.length === 0
                  ? <div className="h-48 flex items-center justify-center text-sm text-gray-400">{t("noData")}</div>
                  : (
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart
                        data={branchesData.branches.map(b=>({ name:b.name, total_sales:b.total_sales, total_profit:b.total_profit }))}
                        margin={{ top:4, right:12, left:0, bottom:0 }} barCategoryGap="28%" barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize:11, fill:"#9ca3af" }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={v=>formatNumber(v)} tick={{ fontSize:10, fill:"#9ca3af" }} tickLine={false} axisLine={false} width={52} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11, paddingTop:8 }} />
                        <Bar dataKey="total_sales" name={t("salesLineLabel")} fill="#6366f1" radius={[4,4,0,0]} />
                        <Bar dataKey="total_profit" name={t("netSalesLegend")} fill="#10b981" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
              }
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-0">
              <SectionHeader title={t("topProductsTitle")} desc={t("topProductsDesc")} />
            </CardHeader>
            <CardContent className="px-5 pt-2 pb-4">
              {loadProducts
                ? <div className="space-y-3">{[...Array(6)].map((_,i)=><Skeleton key={i} className="h-8 w-full rounded dark:bg-gray-800" />)}</div>
                : topProducts.length === 0
                  ? <div className="py-8 text-center text-sm text-gray-400">{t("noData")}</div>
                  : (
                    <div className="space-y-2.5">
                      {topProducts.map((p, i) => {
                        const pct = topProducts[0].total_revenue > 0 ? Math.round((p.total_revenue/topProducts[0].total_revenue)*100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2.5">
                            <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600 w-4 text-center flex-shrink-0">{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between mb-1">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{p.name}</span>
                                <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0 mr-1">{formatCurrency(p.total_revenue)}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
              }
            </CardContent>
          </Card>
        </div>

        {/* ━━━━━━━━━━ BRANCH COMPARISON TABLE ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-0">
            <SectionHeader
              title={t("branchComparisonTitle")}
              desc={t("branchComparisonDesc")}
              right={
                branchesData && !loadBranches && (
                  <div className="flex gap-2">
                    {branchesData.best_branch && (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                        <Trophy className="h-3 w-3" /> {t("bestBranchWithName", { name: branchesData.best_branch.name })}
                      </div>
                    )}
                    {branchesData.worst_branch && (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800">
                        <TrendingDown className="h-3 w-3" /> {t("worstBranchWithName", { name: branchesData.worst_branch.name })}
                      </div>
                    )}
                  </div>
                )
              }
            />
          </CardHeader>
          <CardContent className="px-4 pt-2 pb-3">
            {loadBranches
              ? <div className="space-y-2">{[...Array(3)].map((_,i)=><Skeleton key={i} className="h-11 w-full rounded dark:bg-gray-800" />)}</div>
              : !branchesData || branchesData.branches.length === 0
                ? <div className="py-10 text-center text-sm text-gray-400"><Warehouse className="h-8 w-8 mx-auto mb-2 text-gray-200 dark:text-gray-700" />{t("noData")}</div>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-100 dark:border-gray-800 hover:bg-transparent">
                        {["#",t("tableColBranch"),t("tableColSales"),t("tableColNetSales"),t("tableColInvoices"),t("tableColContribution")].map((h,i) => (
                          <TableHead key={i} className={`text-start text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${i===0?"w-7 ps-2":""} ${i===5?"min-w-[120px]":""}`}>
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchesData.branches.map((b, idx) => {
                        const isBest  = branchesData.best_branch?.id === b.id;
                        const isWorst = branchesData.worst_branch?.id === b.id && branchesData.branches.length > 1;
                        return (
                          <TableRow key={b.id}
                            onClick={() => openBranchDrawer(b.id, b.name)}
                            className={`border-gray-50 dark:border-gray-800/60 text-xs transition-colors cursor-pointer
                              ${isBest ? "bg-emerald-50/40 dark:bg-emerald-900/10 hover:bg-emerald-50/70 dark:hover:bg-emerald-900/20"
                              : isWorst ? "bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50/70 dark:hover:bg-red-900/20"
                              : "hover:bg-gray-50/80 dark:hover:bg-gray-800/40"}`}>
                            <TableCell className="ps-2 pe-0 text-gray-300 dark:text-gray-600 font-bold tabular-nums">{idx+1}</TableCell>
                            <TableCell className="font-semibold text-gray-700 dark:text-gray-200 py-3">
                              <div className="flex items-center gap-1.5 group">
                                <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{b.name}</span>
                                {isBest && <Badge className="text-[9px] h-4 px-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 font-semibold">{t("bestBranch")}</Badge>}
                                {isWorst && <Badge className="text-[9px] h-4 px-1 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 border-0 font-semibold">{t("worstBranch")}</Badge>}
                                <ChevronLeft className="h-3 w-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{formatCurrency(b.total_sales)}</TableCell>
                            <TableCell className={`font-semibold tabular-nums ${b.total_profit>=0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                              {formatCurrency(b.total_profit)}
                            </TableCell>
                            <TableCell className="text-gray-500 dark:text-gray-400 tabular-nums">{formatNumber(b.invoices_count)}</TableCell>
                            <TableCell><ContribBar pct={b.contribution_percentage} color={BRANCH_BAR_COLORS[idx % BRANCH_BAR_COLORS.length]} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )
            }
          </CardContent>
        </Card>

        {/* ━━━━━━━━━━ ALERTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("alertsTitle")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <AlertItemCard title={t("alertLowStock")} accent="bg-orange-50 dark:bg-orange-900/20"
              icon={<Package className="h-3.5 w-3.5 text-orange-600" />}
              count={alertsData?.low_stock.length ?? 0} loading={loadAlerts}>
              {alertsData?.low_stock.map(item => (
                <div key={item.id} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{item.name}</span>
                  <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 tabular-nums flex-shrink-0">
                    {formatNumber(item.stock)}<span className="text-gray-300 mx-0.5">/</span>{formatNumber(item.alert_level)}
                  </span>
                </div>
              ))}
            </AlertItemCard>

            <AlertItemCard title={t("alertLowPerforming")} accent="bg-red-50 dark:bg-red-900/20"
              icon={<TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              count={alertsData?.low_performing_branches.length ?? 0} loading={loadAlerts}>
              {alertsData?.low_performing_branches.map(b => (
                <div key={b.id} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{b.name}</span>
                  <span className="text-[10px] font-semibold text-red-500 tabular-nums flex-shrink-0">{t("performancePct", { pct: b.performance_pct })}</span>
                </div>
              ))}
            </AlertItemCard>

            <AlertItemCard title={t("alertOverdueInvoices")} accent="bg-amber-50 dark:bg-amber-900/20"
              icon={<Clock className="h-3.5 w-3.5 text-amber-600" />}
              count={alertsData?.overdue_invoices.length ?? 0} loading={loadAlerts}>
              {alertsData?.overdue_invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-2 py-0.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{inv.client_name}</p>
                    <p className="text-[10px] text-gray-400">#{inv.number}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums flex-shrink-0">
                    {formatCurrency(inv.due_amount)}
                  </span>
                </div>
              ))}
            </AlertItemCard>

            <AlertItemCard title={t("alertHighReturns")} accent="bg-purple-50 dark:bg-purple-900/20"
              icon={<RotateCcw className="h-3.5 w-3.5 text-purple-600" />}
              count={alertsData?.high_returns_branches.length ?? 0} loading={loadAlerts}>
              {alertsData?.high_returns_branches.map(b => (
                <div key={b.id} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{b.name}</span>
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 tabular-nums flex-shrink-0">{t("returnsPct", { pct: b.return_rate })}</span>
                </div>
              ))}
            </AlertItemCard>

          </div>
        </div>

      </div>

      <BranchDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        warehouseId={selectedBranchId}
        startDate={startDate}
        endDate={endDate}
        branchName={selectedBranchName}
      />
    </div>
  );
};

export default DashboardPage;
