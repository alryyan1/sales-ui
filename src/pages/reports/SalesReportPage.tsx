// src/pages/reports/SalesReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
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

// MUI Components
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Pagination,
  Stack,
  Autocomplete,
  Skeleton,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import IconButton from "@mui/material/IconButton";

// Lucide Icons
import {
  ArrowLeft,
  Download,
  BarChart3,
  DollarSign,
  Users,
  Eye,
  FileText,
  Filter,
  X,
  TrendingUp,
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
    const statusConfig: Record<string, { label: string; color: "success" | "warning" | "default" | "error" }> = {
      completed: {
        label: "مكتمل",
        color: "success",
      },
      pending: {
        label: "معلق",
        color: "warning",
      },
      draft: {
        label: "مسودة",
        color: "default",
      },
      cancelled: {
        label: "ملغي",
        color: "error",
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ maxWidth: "1400px", mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => navigate("/dashboard")}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  transition: "all 0.15s ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <ArrowLeft size={18} />
              </IconButton>
              <Box>
                <Typography
                  variant="h6"
                  component="h1"
                  sx={{ fontWeight: 600, lineHeight: 1.3 }}
                >
                  تقرير المبيعات
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  عرض وتصدير تقارير المبيعات
                </Typography>
              </Box>
            </Stack>

            {!isLoading && reportData && reportData.data.length > 0 && (
              <Button
                onClick={handleDownloadPdf}
                variant="contained"
                size="small"
                startIcon={<Download size={16} />}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  px: 2.5,
                  py: 1,
                  fontWeight: 500,
                  boxShadow: "none",
                  "&:hover": {
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  },
                }}
              >
                تصدير PDF
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: "1400px", mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        {/* Quick Date Presets */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mb: 3,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {[
            { key: "today", label: "اليوم" },
            { key: "yesterday", label: "أمس" },
            { key: "thisWeek", label: "هذا الأسبوع" },
            { key: "thisMonth", label: "هذا الشهر" },
            { key: "lastMonth", label: "الشهر الماضي" },
          ].map((preset) => (
            <Chip
              key={preset.key}
              label={preset.label}
              onClick={() => applyDatePreset(preset.key)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: "primary.light",
                  borderColor: "primary.main",
                  color: "primary.main",
                },
              }}
            />
          ))}
        </Stack>

        {/* Two Column Layout */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            gap: 3,
            alignItems: "flex-start",
          }}
        >
          {/* Main Content - Table */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              width: { xs: "100%", lg: "auto" },
            }}
          >
            {/* Summary Stats */}
            {summaryStats && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2.5,
                  mb: 3,
                }}
              >
                {/* Total Operations Card */}
                <Box
                  sx={{
                    flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 14px)" },
                    minWidth: { xs: "100%", md: "240px" },
                  }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 3,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              fontWeight: 500,
                              fontSize: "0.875rem",
                            }}
                          >
                            إجمالي العمليات
                          </Typography>
                          <Box
                            sx={{
                              color: "primary.main",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <BarChart3 size={20} />
                          </Box>
                        </Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                            lineHeight: 1,
                          }}
                        >
                          {summaryStats.totalSales}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                {/* Total Sales Card */}
                <Box
                  sx={{
                    flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 14px)" },
                    minWidth: { xs: "100%", md: "240px" },
                  }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 3,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              fontWeight: 500,
                              fontSize: "0.875rem",
                            }}
                          >
                            إجمالي المبيعات
                          </Typography>
                          <Box
                            sx={{
                              color: "success.main",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <DollarSign size={20} />
                          </Box>
                        </Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                            lineHeight: 1,
                          }}
                        >
                          {formatNumber(summaryStats.totalAmount)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                {/* Total Due Card */}
                <Box
                  sx={{
                    flex: { xs: "1 1 100%", md: "1 1 calc(33.333% - 14px)" },
                    minWidth: { xs: "100%", md: "240px" },
                  }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      border: "1px solid",
                      borderColor: summaryStats.totalDue > 0 ? "warning.light" : "divider",
                      borderRadius: 3,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              fontWeight: 500,
                              fontSize: "0.875rem",
                            }}
                          >
                            إجمالي المستحق
                          </Typography>
                          <Box
                            sx={{
                              color: summaryStats.totalDue > 0 ? "warning.main" : "success.main",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <TrendingUp size={20} />
                          </Box>
                        </Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            color: summaryStats.totalDue > 0 ? "warning.dark" : "success.main",
                            lineHeight: 1,
                          }}
                        >
                          {formatNumber(summaryStats.totalDue)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}

            {/* Loading State */}
            {isLoading && (
              <Card
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    {[...Array(5)].map((_, i) => (
                      <Stack key={i} direction="row" spacing={2} alignItems="center">
                        <Skeleton variant="rounded" width={80} height={20} />
                        <Skeleton variant="rounded" width={100} height={20} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="60%" height={20} />
                        </Box>
                        <Skeleton variant="rounded" width={80} height={24} />
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: 1,
                }}
              >
                <AlertTitle sx={{ fontWeight: 600 }}>خطأ</AlertTitle>
                {error}
              </Alert>
            )}

            {/* Results */}
            {!isLoading && !error && reportData && (
              <Card
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <CardHeader
                  sx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    py: 2,
                    px: 2.5,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                    <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                      النتائج
                    </Typography>
                    <Chip
                      label={`${(currentPage - 1) * 25 + 1}-${Math.min(
                        currentPage * 25,
                        reportData.total
                      )} من ${reportData.total}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  </Stack>
                </CardHeader>
                <CardContent sx={{ p: 0 }}>
                  {reportData.data.length === 0 ? (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 6,
                        px: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "inline-flex",
                          p: 2,
                          bgcolor: "action.hover",
                          borderRadius: 3,
                          mb: 2,
                        }}
                      >
                        <FileText size={32} style={{ opacity: 0.4 }} />
                      </Box>
                      <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 600 }}>
                        لا توجد مبيعات
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        جرب تعديل الفلاتر
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ overflowX: "auto" }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow
                              sx={{
                                bgcolor: "action.hover",
                                "& .MuiTableCell-root": {
                                  fontWeight: 600,
                                  fontSize: "0.8125rem",
                                  py: 1.5,
                                  color: "text.secondary",
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                },
                              }}
                            >
                              <TableCell>التاريخ</TableCell>
                              <TableCell>الفاتورة</TableCell>
                              <TableCell>العميل</TableCell>
                              <TableCell>المستخدم</TableCell>
                              <TableCell>الحالة</TableCell>
                              <TableCell align="right">المبلغ الإجمالي</TableCell>
                              <TableCell align="right">المدفوع</TableCell>
                              <TableCell align="right">المستحق</TableCell>
                              <TableCell align="right">الإجراءات</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {reportData.data.map((sale) => (
                              <TableRow
                                key={sale.id}
                                hover
                                sx={{
                                  "&:last-child td": { border: 0 },
                                  "& .MuiTableCell-root": {
                                    py: 1.5,
                                    fontSize: "0.875rem",
                                  },
                                }}
                              >
                                <TableCell>
                                  {format(parseISO(sale.sale_date), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell>
                                  {sale.invoice_number || (
                                    <Typography component="span" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {sale.client_name || (
                                    <Typography component="span" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {sale.user_name || (
                                    <Typography component="span" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(sale.status)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 500 }}>
                                  {formatNumber(sale.total_amount)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatNumber(sale.paid_amount)}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography
                                    color={
                                      Number(sale.due_amount) > 0
                                        ? "error.main"
                                        : "success.main"
                                    }
                                  >
                                    {formatNumber(sale.due_amount || 0)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    disabled
                                    title="غير متاح"
                                    sx={{
                                      width: 36,
                                      height: 36,
                                      border: 1,
                                      borderColor: "divider",
                                      borderRadius: 1.5,
                                    }}
                                  >
                                    <Eye size={16} style={{ opacity: 0.5 }} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>

                      {/* Pagination */}
                      {reportData.last_page > 1 && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 2.5,
                            borderTop: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Pagination
                            count={reportData.last_page}
                            page={currentPage}
                            onChange={(_, page) => handlePageChange(page)}
                            color="primary"
                            disabled={isLoading}
                            size="small"
                            sx={{
                              "& .MuiPaginationItem-root": {
                                borderRadius: 1.5,
                              },
                            }}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Filters Sidebar */}
          <Box
            sx={{
              width: { xs: "100%", lg: "320px" },
              flexShrink: 0,
            }}
          >
            <Card
              sx={{
                position: { lg: "sticky" },
                top: 24,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <CardHeader
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  py: 2,
                  px: 2.5,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Filter size={18} />
                  <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                    الفلاتر
                  </Typography>
                </Stack>
              </CardHeader>
              <CardContent sx={{ p: 2.5 }}>
                <Box component="form" onSubmit={handleSubmit(onFilterSubmit)}>
                  <Stack spacing={2}>
                    {/* Start Date */}
                    <Controller
                      control={control}
                      name="startDate"
                      render={({ field, fieldState }) => (
                        <TextField
                          type="date"
                          label="تاريخ البدء"
                          value={field.value || ""}
                          onChange={field.onChange}
                          fullWidth
                          size="small"
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    />

                    {/* End Date */}
                    <Controller
                      control={control}
                      name="endDate"
                      render={({ field, fieldState }) => (
                        <TextField
                          type="date"
                          label="تاريخ الانتهاء"
                          value={field.value || ""}
                          onChange={field.onChange}
                          fullWidth
                          size="small"
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    />

                    {/* Client Select */}
                    <Controller
                      control={control}
                      name="clientId"
                      render={({ field, fieldState }) => (
                        <FormControl fullWidth size="small" error={!!fieldState.error}>
                          <InputLabel>العميل</InputLabel>
                          <Select
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            label="العميل"
                            disabled={loadingFilters}
                          >
                            <MenuItem value="">الكل</MenuItem>
                            {clients.map((client) => (
                              <MenuItem key={client.id} value={String(client.id)}>
                                {client.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {fieldState.error && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                              {fieldState.error.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />

                    {/* User Select */}
                    <Controller
                      control={control}
                      name="userId"
                      render={({ field, fieldState }) => (
                        <FormControl fullWidth size="small" error={!!fieldState.error}>
                          <InputLabel>المستخدم</InputLabel>
                          <Select
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            label="المستخدم"
                            disabled={loadingFilters}
                          >
                            <MenuItem value="">الكل</MenuItem>
                            {/* User selection temporarily disabled */}
                          </Select>
                          {fieldState.error && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                              {fieldState.error.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />

                    {/* Product Select */}
                    <Controller
                      control={control}
                      name="productId"
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          options={products}
                          getOptionLabel={(option) => option.name || ""}
                          value={products.find((p) => String(p.id) === field.value) || null}
                          onChange={(_, newValue) => {
                            field.onChange(newValue ? String(newValue.id) : "");
                          }}
                          disabled={loadingFilters}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="المنتج"
                              size="small"
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />
                          )}
                          noOptionsText="لا توجد منتجات"
                        />
                      )}
                    />

                    {/* Status Select */}
                    <Controller
                      control={control}
                      name="status"
                      render={({ field, fieldState }) => (
                        <FormControl fullWidth size="small" error={!!fieldState.error}>
                          <InputLabel>الحالة</InputLabel>
                          <Select
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            label="الحالة"
                          >
                            <MenuItem value="">كل الحالات</MenuItem>
                            <MenuItem value="completed">مكتمل</MenuItem>
                            <MenuItem value="pending">معلق</MenuItem>
                            <MenuItem value="draft">مسودة</MenuItem>
                            <MenuItem value="cancelled">ملغي</MenuItem>
                          </Select>
                          {fieldState.error && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                              {fieldState.error.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />

                    <Stack spacing={1.5} sx={{ pt: 2 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isLoading}
                        fullWidth
                        startIcon={isLoading ? <CircularProgress size={16} /> : <Filter size={16} />}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          py: 1.25,
                          fontWeight: 600,
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: 4,
                          },
                        }}
                      >
                        تطبيق الفلاتر
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={clearFilters}
                        disabled={isLoading}
                        fullWidth
                        startIcon={<X size={16} />}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          py: 1.25,
                          fontWeight: 500,
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: 2,
                          },
                        }}
                      >
                        مسح الفلاتر
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SalesReportPage;
