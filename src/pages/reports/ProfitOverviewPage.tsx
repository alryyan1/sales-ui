import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  RefreshCw,
  Wallet,
  Receipt,
  PackageMinus,
  TrendingUp,
  TrendingDown,
  FileText,
} from "lucide-react";

import apiClient, { getErrorMessage } from "@/lib/axios";
import { formatCurrency, toLocalYMD } from "@/constants";

interface ProfitSummaryData {
  start_date: string;
  end_date: string;
  total_sales_amount: number;
  paid_sales_amount: number;
  expenses_amount: number;
  cost_of_sales_amount: number;
  profit: number;
}

const firstOfMonthISO = () => {
  const d = new Date();
  return toLocalYMD(new Date(d.getFullYear(), d.getMonth(), 1));
};
const lastOfMonthISO = () => {
  const d = new Date();
  return toLocalYMD(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  sign?: "+" | "−";
  hint?: string;
  loading?: boolean;
}> = ({ label, value, icon, color, sign, hint, loading }) => (
  <Card className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
    <div className={`absolute right-0 inset-y-0 w-1 ${color}`} />
    <CardContent className="p-5 pr-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-32 mt-2 rounded dark:bg-gray-800" />
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1.5 leading-none tabular-nums">
                {sign && <span className="text-gray-400 dark:text-gray-500 me-1">{sign}</span>}
                {formatCurrency(value)}
              </p>
              {hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">{hint}</p>}
            </>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ProfitOverviewPage: React.FC = () => {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState(firstOfMonthISO());
  const [endDate, setEndDate] = useState(lastOfMonthISO());

  const [data, setData] = useState<ProfitSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const r = await apiClient.get<{ data: ProfitSummaryData }>(`/dashboard/profit-summary?${q}`);
      setData(r.data.data);
    } catch (e) {
      const m = getErrorMessage(e);
      setError(m);
      toast.error("خطأ", { description: m });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isProfit = (data?.profit ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* ━━━━━━━━━━ HEADER ━━━━━━━━━━ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="h-9 w-9 border-gray-200 dark:border-gray-800 dark:bg-gray-900 shadow-sm"
            >
              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">ملخص الأرباح</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                إجمالي المبيعات، المدفوع منها، المصروفات، وتكلفة المبيعات للفترة المحددة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 shadow-sm text-sm">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none w-28 text-xs"
              />
              <span className="text-gray-300 dark:text-gray-600">—</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none w-28 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              className="h-9 w-9 border-gray-200 dark:border-gray-800 dark:bg-gray-900 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ في جلب البيانات</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ━━━━━━━━━━ HERO PROFIT CARD ━━━━━━━━━━ */}
        <Card
          className={`overflow-hidden border shadow-sm ${
            loading
              ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              : isProfit
                ? "bg-gradient-to-l from-emerald-50 to-white dark:from-emerald-900/10 dark:to-gray-900 border-emerald-100 dark:border-emerald-900/40"
                : "bg-gradient-to-l from-red-50 to-white dark:from-red-900/10 dark:to-gray-900 border-red-100 dark:border-red-900/40"
          }`}
        >
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-1.5">
              {isProfit ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                صافي الأرباح
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-11 w-56 rounded dark:bg-gray-800" />
            ) : (
              <p
                className={`text-4xl font-extrabold tabular-nums leading-none ${
                  isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                }`}
              >
                {formatCurrency(data?.profit ?? 0)}
              </p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
              المبيعات المدفوعة − المصروفات − تكلفة المبيعات
            </p>
          </CardContent>
        </Card>

        {/* ━━━━━━━━━━ BREAKDOWN ━━━━━━━━━━ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="إجمالي المبيعات"
            value={data?.total_sales_amount ?? 0}
            icon={<FileText className="h-4 w-4 text-indigo-600" />}
            color="bg-indigo-500"
            hint="قيمة الفواتير كاملة (شامل الآجل)"
            loading={loading}
          />
          <StatCard
            label="إجمالي المبيعات المدفوعة"
            value={data?.paid_sales_amount ?? 0}
            icon={<Wallet className="h-4 w-4 text-blue-600" />}
            color="bg-blue-500"
            sign="+"
            loading={loading}
          />
          <StatCard
            label="المصروفات"
            value={data?.expenses_amount ?? 0}
            icon={<Receipt className="h-4 w-4 text-amber-600" />}
            color="bg-amber-500"
            sign="−"
            loading={loading}
          />
          <StatCard
            label="تكلفة المبيعات"
            value={data?.cost_of_sales_amount ?? 0}
            icon={<PackageMinus className="h-4 w-4 text-rose-600" />}
            color="bg-rose-500"
            sign="−"
            loading={loading}
          />
        </div>

        {!loading && data && (
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
            الفترة: {data.start_date} — {data.end_date}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfitOverviewPage;
