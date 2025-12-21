// src/pages/reports/MonthlyRevenueReportPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, getYear, getMonth } from "date-fns"; // Date functions
import { arSA } from "date-fns/locale"; // Import locales for date-fns

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Filter,
  AlertCircle,
  ArrowLeft,
  Banknote,
  CreditCard,
} from "lucide-react";

// API Client & Types
import apiClient, { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDate } from "@/constants"; // Your formatters

// --- Types for Report Data ---
interface DailyPaymentMethods {
  [method: string]: number; // e.g., { cash: 100, visa: 50 }
}
interface DailyReportEntry {
  date: string; // YYYY-MM-DD
  day_of_week: string; // Localized day name
  total_revenue: number;
  total_paid_at_sale_creation: number; // From Sale record's initial paid_amount
  total_payments_recorded_on_day: number; // From payments table for that day
  payments_by_method: DailyPaymentMethods;
}
interface MonthSummary {
  total_revenue: number;
  total_paid: number; // Sum of Sale.paid_amount (initial payments)
  total_payments_by_method: DailyPaymentMethods; // Sum of all payments by method for the month
}
interface MonthlyRevenueReportData {
  year: number;
  month: number;
  month_name: string; // Localized month name
  daily_breakdown: DailyReportEntry[];
  month_summary: MonthSummary;
}

// --- Zod Schema for Filter Form ---
const currentYear = new Date().getFullYear();
const monthReportFilterSchema = z.object({
  // Represent month as 1-12 for API, but Date object for DatePicker if used
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(currentYear + 1), // Allow next year for planning
  // Optional filters like clientId, userId can be added
});
type MonthReportFilterValues = z.infer<typeof monthReportFilterSchema>;

// --- Component ---
const MonthlyRevenueReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [reportData, setReportData] = useState<MonthlyRevenueReportData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Form ---
  // Get initial month/year from URL or default to current month
  const initialMonth = searchParams.get("month")
    ? parseInt(searchParams.get("month")!)
    : getMonth(new Date()) + 1; // date-fns month is 0-indexed
  const initialYear = searchParams.get("year")
    ? parseInt(searchParams.get("year")!)
    : getYear(new Date());

  const form = useForm<MonthReportFilterValues>({
    resolver: zodResolver(monthReportFilterSchema),
    defaultValues: {
      month: initialMonth,
      year: initialYear,
    },
  });
  const { control, handleSubmit, reset, watch, formState } = form;
  const watchedMonth = watch("month");
  const watchedYear = watch("year");

  // --- Data Fetching ---
  const fetchReport = useCallback(async (filters: MonthReportFilterValues) => {
    setIsLoading(true);
    setError(null);
    setReportData(null);
    try {
      const params = new URLSearchParams();
      params.append("month", String(filters.month));
      params.append("year", String(filters.year));
      // Add other filters from 'filters' object if implemented

      const response = await apiClient.get<{
        data: MonthlyRevenueReportData;
      }>(`/reports/monthly-revenue?${params.toString()}`);
      setReportData(response.data.data);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error("خطأ", { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Effect to Fetch Report When Filters/Page Change from URL or Form ---
  useEffect(() => {
    // Sync form with URL params on load/change
    const urlMonth = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : getMonth(new Date()) + 1;
    const urlYear = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : getYear(new Date());
    reset({ month: urlMonth, year: urlYear }); // Reset form to URL values

    // Fetch if month and year are valid
    if (urlMonth && urlYear) {
      fetchReport({ month: urlMonth, year: urlYear });
    }
  }, [searchParams, fetchReport, reset]);

  // --- Filter Form Submit ---
  const onFilterSubmit: SubmitHandler<MonthReportFilterValues> = (data) => {
    const newParams = new URLSearchParams();
    newParams.set("month", String(data.month));
    newParams.set("year", String(data.year));
    // Add other filters
    setSearchParams(newParams); // This will trigger the useEffect above to refetch
  };

  // --- Helper for month/year select options ---
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i); // Last 5 years + next 4
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const dateFnsLocale = arSA;

  const getPaymentMethodIcon = (method: string) => {
    // Example: Return a Lucide icon component based on payment method
    switch (method) {
      case "cash":
        return <Banknote className="inline h-4 w-4 mr-1" />;
      case "visa":
      case "credit_card":
        return <CreditCard className="inline h-4 w-4 mr-1" />;
      // Add more cases as needed
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center mb-6 gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          تقرير الإيرادات الشهرية
        </h1>
      </div>
      {/* Filter Form Card */}
      <Card className="dark:bg-gray-900 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">الفلاتر</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onFilterSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                <FormField
                  control={control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الشهر*</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={String(field.value)}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الشهر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {format(new Date(2000, m - 1, 1), "MMMM", {
                                locale: dateFnsLocale,
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage>
                        {formState.errors.month?.message
                          ? formState.errors.month.message
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السنة*</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={String(field.value)}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر السنة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage>
                        {formState.errors.year?.message
                          ? formState.errors.year.message
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                {/* Add other filters (Client, User) here if needed */}
                <div className="flex items-end gap-2">
                  {/* Buttons aligned */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Filter className="me-2 h-4 w-4" />
                    )}
                    توليد التقرير
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {/* Loading/Error States */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {!isLoading && error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Report Results Section */}
      {!isLoading && !error && reportData && (
        <>
          {/* Month Summary Card */}
          <Card className="dark:bg-gray-900 mb-6">
            <CardHeader>
              <CardTitle>ملخص شهر {reportData.month_name}</CardTitle>
              {/* Add key */}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium text-muted-foreground">
                  إجمالي الإيرادات (المبيعات):
                </span>
                {/* Add key */}
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(reportData.month_summary.total_revenue)}
                </span>
              </div>
              {/* <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{t('reports:totalPaidAtSaleMonth')}:</span>
                                <span className="font-medium">{formatCurrency(reportData.month_summary.total_paid)}</span>
                             </div> */}
              <Separator className="my-2 dark:bg-gray-700" />
              <p className="text-sm font-semibold text-muted-foreground">
                إجمالي المدفوعات حسب الطريقة:
              </p>
              {/* Add key */}
              {Object.keys(reportData.month_summary.total_payments_by_method)
                .length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm pl-4">
                  {Object.entries(
                    reportData.month_summary.total_payments_by_method
                  ).map(([method, total]) => (
                    <div key={method} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">
                        {method}:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pl-4">
                  لا توجد مدفوعات لهذه الفترة.
                </p>
              )}
              {/* Add key */}
            </CardContent>
          </Card>

          {/* Daily Breakdown Table */}
          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>التفاصيل اليومية</CardTitle>
            </CardHeader>
            {/* Add key */}
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="dark:text-gray-300">
                      التاريخ
                    </TableHead>
                    <TableHead className="dark:text-gray-300">اليوم</TableHead>
                    <TableHead className="text-right dark:text-gray-300">
                      الإيرادات
                    </TableHead>
                    {/* Add key */}
                    {/* Display unique payment methods found in the month as columns */}
                    {Object.keys(
                      reportData.month_summary.total_payments_by_method
                    ).map((method) => (
                      <TableHead
                        key={method}
                        className="text-right dark:text-gray-300 capitalize"
                      >
                        {method}
                      </TableHead>
                    ))}
                    <TableHead className="text-right dark:text-gray-300">
                      إجمالي المدفوعات
                    </TableHead>
                    {/* Add key */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.daily_breakdown.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={
                          4 +
                          Object.keys(
                            reportData.month_summary.total_payments_by_method
                          ).length
                        }
                        className="h-24 text-center text-muted-foreground"
                      >
                        لا توجد بيانات لهذا الشهر
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Add key */}
                  {reportData.daily_breakdown.map((day) => (
                    <TableRow key={day.date} className="dark:border-gray-700">
                      <TableCell className="font-medium dark:text-gray-100">
                        {formatDate(day.date)}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        {day.day_of_week}
                      </TableCell>
                      <TableCell className="text-right dark:text-gray-100">
                        {formatCurrency(day.total_revenue)}
                      </TableCell>
                      {Object.keys(
                        reportData.month_summary.total_payments_by_method
                      ).map((method) => (
                        <TableCell
                          key={`${day.date}-${method}`}
                          className="text-right dark:text-gray-100"
                        >
                          {formatCurrency(day.payments_by_method[method] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold dark:text-gray-100">
                        {formatCurrency(day.total_payments_recorded_on_day)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Pagination not typically used for this type of monthly summary report, but could be if daily breakdown becomes very long */}
        </>
      )}
      {!isLoading && !error && !reportData && (
        <div className="text-center py-10 text-muted-foreground">
          يرجى اختيار الشهر والسنة لعرض التقرير.
        </div>
      )}
      {/* Add key */}
    </div>
  );
};

export default MonthlyRevenueReportPage;
