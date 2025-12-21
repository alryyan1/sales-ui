import React, { useState, useEffect, useCallback } from "react";
import { format, getMonth, getYear } from "date-fns";
import { arSA } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import apiClient from "@/lib/axios";
import { formatCurrency, formatDate } from "@/constants";

// --- Types ---
interface DailyPaymentMethods {
  [method: string]: number;
}
interface DailyReportEntry {
  date: string;
  day_of_week: string;
  total_revenue: number; // Invoiced amount
  total_paid_at_sale_creation: number;
  total_payments_recorded_on_day: number; // Actual Income
  payments_by_method: DailyPaymentMethods;
}
interface MonthSummary {
  total_revenue: number;
  total_paid: number;
  total_payments_by_method: DailyPaymentMethods;
}
interface MonthlyRevenueReportData {
  year: number;
  month: number;
  month_name: string;
  daily_breakdown: DailyReportEntry[];
  month_summary: MonthSummary;
}

const DailyIncomeReportPage: React.FC = () => {
  // const { t, i18n } = useTranslation(["reports", "common", "months"]);
  const navigate = useNavigate();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    getMonth(currentDate) + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    getYear(currentDate)
  );
  const [reportData, setReportData] = useState<MonthlyRevenueReportData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("month", String(selectedMonth));
      params.append("year", String(selectedYear));

      const response = await apiClient.get<{ data: MonthlyRevenueReportData }>(
        `/reports/monthly-revenue?${params.toString()}`
      );
      setReportData(response.data.data);
    } catch (error) {
      console.error("Error fetching daily income report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const years = Array.from(
    { length: 5 },
    (_, i) => getYear(currentDate) - 2 + i
  );
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Chart Data Preparation
  const chartData =
    reportData?.daily_breakdown.map((day) => ({
      name: format(new Date(day.date), "d MMM", { locale: arSA }),
      date: day.date,
      income: day.total_payments_recorded_on_day,
      revenue: day.total_revenue,
    })) || [];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50/50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="-ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              تقرير الدخل اليومي
            </h1>
          </div>
          <p className="text-muted-foreground">
            عرض تفاصيل الدخل اليومي لشهر محدد.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1 rounded-lg border shadow-sm">
          <Select
            value={String(selectedMonth)}
            onValueChange={(val) => setSelectedMonth(Number(val))}
          >
            <SelectTrigger className="w-[140px] border-0 focus:ring-0">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="الشهر" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {format(new Date(2000, m - 1, 1), "MMMM", {
                    locale: arSA,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800" />
          <Select
            value={String(selectedYear)}
            onValueChange={(val) => setSelectedYear(Number(val))}
          >
            <SelectTrigger className="w-[100px] border-0 focus:ring-0">
              <SelectValue placeholder="السنة" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  إجمالي الدخل
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    Object.values(
                      reportData.month_summary.total_payments_by_method
                    ).reduce((a, b) => a + b, 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  لشهر {reportData.month_name}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  إجمالي المبيعات (الفواتير)
                </CardTitle>
                <BarChart3Icon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(reportData.month_summary.total_revenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  قيمة الفواتير الصادرة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  أعلى طريقة دفع
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const methods =
                    reportData.month_summary.total_payments_by_method;
                  const topMethod = Object.entries(methods).sort(
                    ([, a], [, b]) => b - a
                  )[0];
                  return topMethod ? (
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold capitalize">
                        {topMethod[0]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(topMethod[1])}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      لا توجد بيانات
                    </span>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Chart Section */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>اتجاه الدخل اليومي</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    التاريخ
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {label}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    الدخل
                                  </span>
                                  <span className="font-bold text-green-600">
                                    {formatCurrency(Number(payload[0].value))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="income"
                      fill="#16a34a" // Green for income
                      radius={[4, 4, 0, 0]}
                      name="الدخل"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الدخل اليومي</CardTitle>
              <CardDescription>توزيع يومي للدخل وطرق الدفع.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>اليوم</TableHead>
                    <TableHead className="text-right">إجمالي الدخل</TableHead>
                    {/* Dynamic Payment Method Headers */}
                    {Object.keys(
                      reportData.month_summary.total_payments_by_method
                    ).map((method) => (
                      <TableHead key={method} className="text-right capitalize">
                        {method}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.daily_breakdown.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="font-medium">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.day_of_week}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(row.total_payments_recorded_on_day)}
                      </TableCell>
                      {Object.keys(
                        reportData.month_summary.total_payments_by_method
                      ).map((method) => (
                        <TableCell
                          key={`${row.date}-${method}`}
                          className="text-right"
                        >
                          {formatCurrency(row.payments_by_method[method] || 0)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {reportData.daily_breakdown.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={
                          3 +
                          Object.keys(
                            reportData.month_summary.total_payments_by_method
                          ).length
                        }
                        className="text-center h-24 text-muted-foreground"
                      >
                        لا توجد بيانات متاحة لهذا الشهر.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          لا توجد بيانات متاحة
        </div>
      )}
    </div>
  );
};

// Simple Icon component helper if needed, or import
function BarChart3Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

export default DailyIncomeReportPage;
