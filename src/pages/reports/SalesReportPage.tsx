// src/pages/reports/SalesReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";

// shadcn/ui Components
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
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Icons
import {
  Loader2,
  Filter,
  X,
  FileText,
  Download,
  BarChart3,
  Users,
  DollarSign,
  ArrowLeft,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
} from "lucide-react";

// Services and Types
import saleService, { Sale } from "@/services/saleService";
import clientService, { Client } from "@/services/clientService";
import productService, { Product } from "@/services/productService";
import { PaginatedResponse } from "@/services/clientService";

// Helpers
import { formatNumber } from "@/constants";

// --- Zod Schema for Filter Form ---
const reportFilterSchema = z
  .object({
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    clientId: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    productId: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      !data.endDate || !data.startDate || data.endDate >= data.startDate,
    {
      message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
      path: ["endDate"],
    }
  );

type ReportFilterValues = z.infer<typeof reportFilterSchema>;

// --- Component ---
const SalesReportPage: React.FC = () => {
  // Removed useTranslation
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [reportData, setReportData] = useState<PaginatedResponse<Sale> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  // --- Initialize Form with URL Search Params ---
  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      startDate:
        searchParams.get("startDate") ||
        format(startOfMonth(new Date()), "yyyy-MM-dd"),
      endDate:
        searchParams.get("endDate") ||
        format(endOfMonth(new Date()), "yyyy-MM-dd"),
      clientId: searchParams.get("clientId") || null,
      userId: searchParams.get("userId") || null,
      status: searchParams.get("status") || null,
      productId: searchParams.get("productId") || null,
    },
  });
  const { control, handleSubmit, reset, watch } = form;

  // --- Fetch Filter Data ---
  const fetchFilterData = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const [clientsResponse, productsResponse] = await Promise.all([
        clientService.getClients(),
        productService.getProducts(),
      ]);
      setClients(clientsResponse.data);
      setProducts(productsResponse.data);
    } catch (error) {
      console.error("Error loading filters:", error);
      toast.error("خطأ", {
        description: "حدث خطأ أثناء تحميل الفلاتر",
      });
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // --- Fetch Report Data ---
  const fetchReport = useCallback(
    async (filters: ReportFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await saleService.getSalesReport(
          page,
          filters.startDate
            ? format(filters.startDate, "yyyy-MM-dd")
            : undefined,
          filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : undefined,
          filters.clientId ? Number(filters.clientId) : undefined,
          filters.userId ? Number(filters.userId) : undefined,
          filters.status || undefined,
          25
        );
        setReportData(data);
      } catch (err) {
        const errorMsg = saleService.getErrorMessage(err);
        setError(errorMsg);
        toast.error("خطأ", { description: errorMsg });
        setReportData(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // --- Current Filters and Page ---
  const currentFilters = useMemo(
    () => ({
      startDate:
        searchParams.get("startDate") ||
        format(startOfMonth(new Date()), "yyyy-MM-dd"),
      endDate:
        searchParams.get("endDate") ||
        format(endOfMonth(new Date()), "yyyy-MM-dd"),
      clientId: searchParams.get("clientId") || null,
      userId: searchParams.get("userId") || null,
      status: searchParams.get("status") || null,
      productId: searchParams.get("productId") || null,
    }),
    [searchParams]
  );

  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  useEffect(() => {
    reset({
      startDate: currentFilters.startDate,
      endDate: currentFilters.endDate,
      clientId: currentFilters.clientId,
      userId: currentFilters.userId,
      status: currentFilters.status,
      productId: currentFilters.productId,
    });
    fetchReport(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchReport, reset]);

  // --- Filter Handlers ---
  const onFilterSubmit: SubmitHandler<ReportFilterValues> = (data) => {
    const newParams = new URLSearchParams();
    if (data.startDate) {
      newParams.set("startDate", data.startDate);
    }
    if (data.endDate) {
      newParams.set("endDate", data.endDate);
    }
    if (data.clientId) newParams.set("clientId", data.clientId);
    if (data.userId) newParams.set("userId", data.userId);
    if (data.status) newParams.set("status", data.status);
    if (data.productId) newParams.set("productId", data.productId);
    newParams.set("page", "1");

    setSearchParams(newParams);
  };

  const clearFilters = () => {
    reset({
      startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      clientId: null,
      userId: null,
      status: null,
      productId: null,
    });
    setSearchParams({ page: "1" });
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  // --- Quick Date Presets ---
  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (preset) {
      case "today": {
        startDate = today;
        endDate = today;
        break;
      }
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday;
        endDate = yesterday;
        break;
      }
      case "thisWeek": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startDate = startOfWeek;
        endDate = today;
        break;
      }
      case "thisMonth": {
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      }
      case "lastMonth": {
        startDate = startOfMonth(subMonths(today, 1));
        endDate = endOfMonth(subMonths(today, 1));
        break;
      }
      default:
        return;
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.set("startDate", format(startDate, "yyyy-MM-dd"));
    newParams.set("endDate", format(endDate, "yyyy-MM-dd"));
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  // --- Download PDF ---
  const handleDownloadPdf = () => {
    const currentFilterValues = watch();
    const params = new URLSearchParams();

    if (currentFilterValues.startDate) {
      params.append(
        "start_date",
        format(currentFilterValues.startDate, "yyyy-MM-dd")
      );
    }
    if (currentFilterValues.endDate) {
      params.append(
        "end_date",
        format(currentFilterValues.endDate, "yyyy-MM-dd")
      );
    }
    if (currentFilterValues.clientId) {
      params.append("client_id", String(currentFilterValues.clientId));
    }
    if (currentFilterValues.userId) {
      params.append("user_id", String(currentFilterValues.userId));
    }
    if (currentFilterValues.status) {
      params.append("status", currentFilterValues.status);
    }

    const pdfUrl = `${
      import.meta.env.VITE_API_BASE_URL
    }/reports/sales/pdf?${params.toString()}`;
    window.open(pdfUrl, "_blank");
    toast.info("جاري بدء تحميل PDF...");
  };

  // --- Calculate Summary Stats ---
  const summaryStats = useMemo(() => {
    if (!reportData?.data) return null;

    const totalSales = reportData.data.length;
    const totalAmount = reportData.data.reduce(
      (sum, sale) => sum + Number(sale.total_amount),
      0
    );
    const totalPaid = reportData.data.reduce(
      (sum, sale) => sum + Number(sale.paid_amount),
      0
    );
    const totalDue = reportData.data.reduce(
      (sum, sale) => sum + Number(sale.due_amount || 0),
      0
    );
    const completedSales = reportData.data.filter(
      (sale) => sale.status === "completed"
    ).length;

    return {
      totalSales,
      totalAmount,
      totalPaid,
      totalDue,
      completedSales,
      completionRate: totalSales > 0 ? (completedSales / totalSales) * 100 : 0,
    };
  }, [reportData]);

  // --- Get Status Badge ---
  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      completed: {
        variant: "default" as const,
        className:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      },
      pending: {
        variant: "secondary" as const,
        className:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      },
      draft: {
        variant: "outline" as const,
        className:
          "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      },
      cancelled: {
        variant: "destructive" as const,
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    const statusLabels: Record<string, string> = {
      completed: "مكتمل",
      pending: "معلق",
      draft: "مسودة",
      cancelled: "ملغي",
    };
    return (
      <Badge variant={config.variant} className={config.className}>
        {statusLabels[status as string] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  تقرير المبيعات
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  عرض وتصدير تقارير المبيعات
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {!isLoading && reportData && reportData.data.length > 0 && (
                <Button onClick={handleDownloadPdf} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  تصدير PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Date Presets */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "today", label: "اليوم" },
              { key: "yesterday", label: "أمس" },
              { key: "thisWeek", label: "هذا الأسبوع" },
              { key: "thisMonth", label: "هذا الشهر" },
              { key: "lastMonth", label: "الشهر الماضي" },
            ].map((preset) => (
              <Button
                key={preset.key}
                variant="ghost"
                size="sm"
                onClick={() => applyDatePreset(preset.key)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Table */}
          <div className="lg:col-span-3">
            {/* Summary Stats */}
            {summaryStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          إجمالي العمليات
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {summaryStats.totalSales}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          إجمالي المبيعات
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatNumber(summaryStats.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          إجمالي المستحق
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatNumber(summaryStats.totalDue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-900 rounded-lg"
                  >
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Results */}
            {!isLoading && !error && reportData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>النتائج</CardTitle>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {`عرض ${(currentPage - 1) * 25 + 1}-${Math.min(
                        currentPage * 25,
                        reportData.total
                      )} من ${reportData.total}`}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData.data.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                        لا توجد مبيعات
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        جرب تعديل الفلاتر
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>التاريخ</TableHead>
                              <TableHead>الفاتورة</TableHead>
                              <TableHead>العميل</TableHead>
                              <TableHead>المستخدم</TableHead>
                              <TableHead>الحالة</TableHead>
                              <TableHead className="text-right">
                                المبلغ الإجمالي
                              </TableHead>
                              <TableHead className="text-right">
                                المدفوع
                              </TableHead>
                              <TableHead className="text-right">
                                المستحق
                              </TableHead>
                              <TableHead className="text-right">
                                الإجراءات
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportData.data.map((sale) => (
                              <TableRow
                                key={sale.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <TableCell className="font-medium">
                                  {format(
                                    parseISO(sale.sale_date),
                                    "MMM dd, yyyy"
                                  )}
                                </TableCell>
                                <TableCell>
                                  {sale.invoice_number || (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {sale.client_name || (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {sale.user_name || (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(sale.status)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatNumber(sale.total_amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatNumber(sale.paid_amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={
                                      Number(sale.due_amount) > 0
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-green-600 dark:text-green-400"
                                    }
                                  >
                                    {formatNumber(sale.due_amount || 0)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled
                                    title="غير متاح"
                                  >
                                    <Eye className="h-4 w-4 opacity-50" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {reportData.last_page > 1 && (
                        <div className="flex items-center justify-between mt-6">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {`عرض ${(currentPage - 1) * 25 + 1}-${Math.min(
                              currentPage * 25,
                              reportData.total
                            )} من ${reportData.total}`}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              السابق
                            </Button>

                            <div className="flex items-center space-x-1">
                              {Array.from(
                                { length: Math.min(5, reportData.last_page) },
                                (_, i) => {
                                  const page = i + 1;
                                  return (
                                    <Button
                                      key={page}
                                      variant={
                                        currentPage === page
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() => handlePageChange(page)}
                                      className="w-8 h-8"
                                    >
                                      {page}
                                    </Button>
                                  );
                                }
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === reportData.last_page}
                            >
                              التالي
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>الفلاتر</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={handleSubmit(onFilterSubmit)}
                    className="space-y-4"
                  >
                    {/* Start Date */}
                    <FormField
                      control={control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ البدء</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* End Date */}
                    <FormField
                      control={control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الانتهاء</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Client Select */}
                    <FormField
                      control={control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("clients:client")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? ""}
                            disabled={loadingFilters}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("reports:allClients")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=" ">
                                {t("reports:allClients")}
                              </SelectItem>
                              {clients.map((client) => (
                                <SelectItem
                                  key={client.id}
                                  value={String(client.id)}
                                >
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* User Select */}
                    <FormField
                      control={control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("users:user")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? ""}
                            disabled={loadingFilters}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("reports:allUsers")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=" ">
                                {t("reports:allUsers")}
                              </SelectItem>
                              {/* User selection temporarily disabled */}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Product Select */}
                    <FormField
                      control={control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("products:product")}</FormLabel>
                          <Popover
                            open={productSearchOpen}
                            onOpenChange={setProductSearchOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={productSearchOpen}
                                  className="w-full justify-between"
                                  disabled={loadingFilters}
                                >
                                  {field.value
                                    ? products.find(
                                        (product) =>
                                          String(product.id) === field.value
                                      )?.name
                                    : t("reports:allProducts")}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput
                                  placeholder={t("products:searchProducts")}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {t("products:noProductsFound")}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    <CommandItem
                                      value=""
                                      onSelect={() => {
                                        field.onChange("");
                                        setProductSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          !field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {t("reports:allProducts")}
                                    </CommandItem>
                                    {products.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={product.name}
                                        onSelect={() => {
                                          field.onChange(String(product.id));
                                          setProductSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === String(product.id)
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {product.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status Select */}
                    <FormField
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("sales:status")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("reports:allStatuses")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=" ">
                                {t("reports:allStatuses")}
                              </SelectItem>
                              <SelectItem value="completed">
                                {t("sales:status_completed")}
                              </SelectItem>
                              <SelectItem value="pending">
                                {t("sales:status_pending")}
                              </SelectItem>
                              <SelectItem value="draft">
                                {t("sales:status_draft")}
                              </SelectItem>
                              <SelectItem value="cancelled">
                                {t("sales:status_cancelled")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Filter className="mr-2 h-4 w-4" />
                        )}
                        {t("common:applyFilters")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearFilters}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <X className="mr-2 h-4 w-4" />
                        {t("common:clearFilters")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReportPage;
