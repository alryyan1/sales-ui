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
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  Divider,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";

// Lucide Icons
import {
  ArrowLeft,
  Download,
  BarChart3,
  DollarSign,
  FileText,
  Filter,
  X,
  TrendingUp,
  Wallet,
  CreditCard,
} from "lucide-react";

// Services and Types
import saleService, { Sale } from "@/services/saleService";
import clientService, { Client } from "@/services/clientService";
import productService, { Product } from "@/services/productService";
import { PaginatedResponse } from "@/services/clientService";
import apiClient from "@/lib/axios";
import { PosShiftReportPdf } from "@/components/pos/PosShiftReportPdf";
import settingService, { AppSettings } from "@/services/settingService";
import { PDFViewer } from "@react-pdf/renderer";

// Helpers
import { formatNumber } from "@/constants";

// --- Zod Schema for Filter Form ---
const reportFilterSchema = z
  .object({
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    clientId: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    shiftId: z.string().nullable().optional(),
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
  const [shifts, setShifts] = useState<{ id: number; name?: string; shift_date?: string }[]>([]);
  const [currentShiftId, setCurrentShiftId] = useState<number | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [saleDetailsDialogOpen, setSaleDetailsDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);
  const [shiftReportDialogOpen, setShiftReportDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<{ id: number; opened_at: string | null; closed_at: string | null; is_open: boolean } | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

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
      shiftId: searchParams.get("shiftId") || null,
      productId: searchParams.get("productId") || null,
    },
  });
  const { control, handleSubmit, reset, watch } = form;

  // --- Fetch Filter Data ---
  const fetchFilterData = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const [clientsResponse, productsResponse, shiftsResponse, currentShiftResponse] = await Promise.all([
        clientService.getClients(),
        productService.getProducts(),
        apiClient.get("/shifts").catch(() => ({ data: { data: [] } })), // Fetch shifts list, handle error gracefully
        apiClient.get("/shifts/current").catch(() => ({ data: null })), // Fetch current shift, handle error gracefully
      ]);
      setClients(clientsResponse.data);
      setProducts(productsResponse.data);
      setShifts(shiftsResponse.data?.data || shiftsResponse.data || []);
      
      // Set current shift ID if available
      if (currentShiftResponse.data?.id) {
        setCurrentShiftId(currentShiftResponse.data.id);
      }
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
    // Fetch settings for PDF
    settingService.getSettings().then((response) => {
      setSettings(response);
    }).catch(() => {
      // Ignore errors
    });
  }, [fetchFilterData]);

  // --- Auto-select current shift on first load ---
  useEffect(() => {
    // Only auto-select if shiftId is not in URL params and currentShiftId is available
    if (!searchParams.get("shiftId") && currentShiftId !== null) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("shiftId", String(currentShiftId));
      setSearchParams(newParams, { replace: true });
    }
  }, [currentShiftId, searchParams, setSearchParams]);

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
          filters.shiftId ? Number(filters.shiftId) : undefined,
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
      shiftId: searchParams.get("shiftId") || null,
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
      shiftId: currentFilters.shiftId,
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
    if (data.shiftId) newParams.set("shiftId", data.shiftId);
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
      shiftId: null,
      productId: null,
    });
    setSearchParams({ page: "1" });
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };


  // --- Download PDF ---
  const handleDownloadPdf = async () => {
    const currentFilterValues = watch();
    
    // If shift is selected, use PosShiftReportPdf
    if (currentFilterValues.shiftId) {
      try {
        // Find shift from shifts list or fetch current shift
        const shiftId = Number(currentFilterValues.shiftId);
        const shiftFromList = shifts.find(s => s.id === shiftId);
        
        if (shiftFromList) {
          // Try to get full shift details from current shift if it matches
          const currentShiftResponse = await apiClient.get("/shifts/current").catch(() => ({ data: null }));
          const currentShift = currentShiftResponse.data?.data || currentShiftResponse.data;
          
          if (currentShift && currentShift.id === shiftId) {
            setSelectedShift({
              id: currentShift.id,
              opened_at: currentShift.opened_at,
              closed_at: currentShift.closed_at,
              is_open: currentShift.is_open || !currentShift.closed_at,
            });
          } else {
            // Use shift from list with estimated dates
            setSelectedShift({
              id: shiftFromList.id,
              opened_at: shiftFromList.shift_date ? `${shiftFromList.shift_date}T00:00:00` : null,
              closed_at: null,
              is_open: true,
            });
          }
          setShiftReportDialogOpen(true);
        } else {
          // Fallback to backend PDF
          handleBackendPdf();
        }
      } catch (error) {
        console.error("Error fetching shift:", error);
        // Fallback to backend PDF
        handleBackendPdf();
      }
    } else {
      // Use backend PDF for non-shift reports
      handleBackendPdf();
    }
  };

  const handleBackendPdf = () => {
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
    if (currentFilterValues.shiftId) {
      params.append("shift_id", String(currentFilterValues.shiftId));
    }

    const pdfUrl = `${
      import.meta.env.VITE_API_BASE_URL
    }/reports/sales/pdf?${params.toString()}`;
    window.open(pdfUrl, "_blank");
    toast.info("جاري فتح PDF في تبويب جديد...");
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

    // Calculate Cash and Bank totals from payments
    const totalCash = reportData.data.reduce((sum, sale) => {
      if (!sale.payments) return sum;
      return sum + sale.payments
        .filter((p) => p.method === "cash")
        .reduce((pSum, p) => pSum + Number(p.amount), 0);
    }, 0);

    const totalBank = reportData.data.reduce((sum, sale) => {
      if (!sale.payments) return sum;
      return sum + sale.payments
        .filter((p) => ["visa", "mastercard", "mada", "bank_transfer"].includes(p.method))
        .reduce((pSum, p) => pSum + Number(p.amount), 0);
    }, 0);

    return {
      totalSales,
      totalAmount,
      totalPaid,
      totalDue,
      totalCash,
      totalBank,
    };
  }, [reportData]);

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

                {/* Total Cash Card */}
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
                            إجمالي النقد
                          </Typography>
                          <Box
                            sx={{
                              color: "success.main",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Wallet size={20} />
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
                          {formatNumber(summaryStats.totalCash)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                {/* Total Bank Card */}
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
                            إجمالي البنك
                          </Typography>
                          <Box
                            sx={{
                              color: "primary.main",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <CreditCard size={20} />
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
                          {formatNumber(summaryStats.totalBank)}
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
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                <CardHeader
                  sx={{
                    borderBottom: "2px solid",
                    borderColor: "primary.main",
                    py: 2.5,
                    px: 3,
                    bgcolor: "grey.50",
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: "primary.main" }}>
                      النتائج
                    </Typography>
                    <Chip
                      label={`${(currentPage - 1) * 25 + 1}-${Math.min(
                        currentPage * 25,
                        reportData.total
                      )} من ${reportData.total}`}
                      size="small"
                      variant="filled"
                      color="primary"
                      sx={{ fontWeight: 600 }}
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
                        <Table size="medium" sx={{ minWidth: 900 }}>
                          <TableHead>
                            <TableRow
                              sx={{
                                bgcolor: "primary.main",
                                "& .MuiTableCell-root": {
                                  fontWeight: 700,
                                  fontSize: "0.875rem",
                                  py: 2,
                                  color: "white",
                                  borderBottom: "2px solid",
                                  borderColor: "primary.dark",
                                },
                              }}
                            >
                              <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>رقم البيع</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>التاريخ</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>العميل</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>المستخدم</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }} align="center">المدفوعات</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>الخصم</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>المبلغ الإجمالي</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>المدفوع</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>المستحق</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {reportData.data.map((sale) => (
                              <TableRow
                                key={sale.id}
                                hover
                                onClick={async () => {
                                  setLoadingSaleDetails(true);
                                  setSaleDetailsDialogOpen(true);
                                  try {
                                    const fullSale = await saleService.getSale(sale.id);
                                    setSelectedSale(fullSale);
                                  } catch (error) {
                                    console.error("Failed to fetch sale details:", error);
                                    toast.error("خطأ", {
                                      description: "فشل تحميل تفاصيل البيع",
                                    });
                                    setSaleDetailsDialogOpen(false);
                                  } finally {
                                    setLoadingSaleDetails(false);
                                  }
                                }}
                                sx={{
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  "&:hover": {
                                    bgcolor: "action.hover",
                                    transform: "translateX(-2px)",
                                  },
                                  "&:last-child td": { border: 0 },
                                  "& .MuiTableCell-root": {
                                    py: 2,
                                    fontSize: "0.875rem",
                                    borderBottom: "1px solid",
                                    borderColor: "divider",
                                  },
                                }}
                              >
                                <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>
                                  #{sale.id}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {format(parseISO(sale.sale_date), "yyyy-MM-dd")}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {sale.client_name ? (
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {sale.client_name}
                                    </Typography>
                                  ) : (
                                    <Typography component="span" color="text.secondary" variant="body2">
                                      عميل غير محدد
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {sale.user_name ? (
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {sale.user_name}
                                    </Typography>
                                  ) : (
                                    <Typography component="span" color="text.secondary" variant="body2">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  {sale.payments && sale.payments.length > 0 ? (
                                    <Chip
                                      label={`${sale.payments.length} ${sale.payments.length === 1 ? "دفعة" : "دفعات"}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        borderColor: "primary.main",
                                        color: "primary.main",
                                        fontWeight: 600,
                                      }}
                                    />
                                  ) : (
                                    <Typography component="span" color="text.secondary" variant="body2">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {sale.discount_amount && Number(sale.discount_amount) > 0 ? (
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: 600,
                                          color: "warning.main",
                                        }}
                                      >
                                        {formatNumber(sale.discount_amount)}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: "block", mt: 0.25 }}
                                      >
                                        {(sale as any).discount_type === "percentage" ? "%" : "ثابت"}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Typography component="span" color="text.secondary" variant="body2">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                                  {formatNumber(sale.total_amount)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 500, color: "success.main" }}>
                                  {formatNumber(sale.paid_amount)}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 600,
                                      color: Number(sale.due_amount) > 0 ? "error.main" : "success.main",
                                    }}
                                  >
                                    {formatNumber(sale.due_amount || 0)}
                                  </Typography>
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

                    {/* Shift Select */}
                    <Controller
                      control={control}
                      name="shiftId"
                      render={({ field, fieldState }) => (
                        <FormControl fullWidth size="small" error={!!fieldState.error}>
                          <InputLabel>الوردية</InputLabel>
                          <Select
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            label="الوردية"
                            disabled={loadingFilters}
                          >
                            <MenuItem value="">الكل</MenuItem>
                            {shifts.map((shift) => (
                              <MenuItem key={shift.id} value={String(shift.id)}>
                                {shift.name || `الوردية #${shift.id}`} {shift.shift_date ? `(${shift.shift_date})` : ""}
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

      {/* Sale Details Dialog */}
      <Dialog
        open={saleDetailsDialogOpen}
        onClose={() => {
          setSaleDetailsDialogOpen(false);
          setSelectedSale(null);
        }}
        maxWidth="md"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            pb: 2,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            تفاصيل البيع #{selectedSale?.id}
          </Typography>
          <IconButton
            onClick={() => {
              setSaleDetailsDialogOpen(false);
              setSelectedSale(null);
            }}
            size="small"
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {loadingSaleDetails ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedSale ? (
            <Stack spacing={3}>
              {/* Sale Info */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 1 }}>
                  معلومات البيع
                </Typography>
                <Paper elevation={0} sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">التاريخ:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {format(parseISO(selectedSale.sale_date), "yyyy-MM-dd")}
                      </Typography>
                    </Box>
                    {selectedSale.invoice_number && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">رقم الفاتورة:</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedSale.invoice_number}
                        </Typography>
                      </Box>
                    )}
                    {selectedSale.client_name && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">العميل:</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedSale.client_name}
                        </Typography>
                      </Box>
                    )}
                    {selectedSale.user_name && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">المستخدم:</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedSale.user_name}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Box>

              {/* Sale Items */}
              {selectedSale.items && selectedSale.items.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 1 }}>
                    العناصر ({selectedSale.items.length})
                  </Typography>
                  <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "action.hover" }}>
                          <TableCell sx={{ fontWeight: 600 }}>المنتج</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>الكمية</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>سعر الوحدة</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>الإجمالي</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedSale.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {item.product_name || item.product?.name || "غير معروف"}
                              </Typography>
                              {item.batch_number_sold && (
                                <Typography variant="caption" color="text.secondary">
                                  دفعة: {item.batch_number_sold}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{item.quantity}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{formatNumber(Number(item.unit_price))}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatNumber(Number(item.total_price || item.quantity * Number(item.unit_price)))}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              )}

              {/* Payments */}
              {selectedSale.payments && selectedSale.payments.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 1.5 }}>
                    المدفوعات ({selectedSale.payments.length})
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1.5,
                    }}
                  >
                    {selectedSale.payments.map((payment, index) => (
                      <Paper
                        key={payment.id || index}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          flex: "1 1 auto",
                          minWidth: "200px",
                          maxWidth: "100%",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                          <Chip
                            label={
                              payment.method === "cash"
                                ? "نقدي"
                                : payment.method === "visa"
                                ? "فيزا"
                                : payment.method === "mastercard"
                                ? "ماستركارد"
                                : payment.method === "bank_transfer"
                                ? "تحويل بنكي"
                                : payment.method === "mada"
                                ? "مدى"
                                : payment.method === "store_credit"
                                ? "رصيد متجر"
                                : payment.method === "other"
                                ? "أخرى"
                                : payment.method === "refund"
                                ? "استرداد"
                                : payment.method
                            }
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: "primary.main",
                              color: "primary.main",
                              fontSize: "0.7rem",
                              height: 24,
                            }}
                          />
                          <Typography variant="body1" fontWeight="bold" color="success.main">
                            {formatNumber(Number(payment.amount))}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
                          <Typography variant="caption" color="text.secondary">
                            {payment.payment_date ? (payment.payment_date.includes("T") ? format(parseISO(payment.payment_date), "yyyy-MM-dd") : payment.payment_date) : "-"}
                          </Typography>
                          {payment.reference_number && (
                            <>
                              <Typography variant="caption" color="text.secondary">•</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {payment.reference_number}
                              </Typography>
                            </>
                          )}
                          {payment.user_name && (
                            <>
                              <Typography variant="caption" color="text.secondary">•</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {payment.user_name}
                              </Typography>
                            </>
                          )}
                        </Box>
                        {payment.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", mt: 0.5, display: "block" }}>
                            {payment.notes}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Summary */}
              <Divider />
              <Box>
                <Stack spacing={1}>
                  {selectedSale.discount_amount && Number(selectedSale.discount_amount) > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body1" fontWeight="bold">الخصم:</Typography>
                      <Typography variant="body1" fontWeight="bold" color="warning.main">
                        {formatNumber(selectedSale.discount_amount)}
                        {selectedSale.discount_type === "percentage" ? " %" : ""}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body1" fontWeight="bold">المبلغ الإجمالي:</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatNumber(selectedSale.total_amount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body1" fontWeight="bold">المدفوع:</Typography>
                    <Typography variant="body1" fontWeight="bold" color="success.main">
                      {formatNumber(selectedSale.paid_amount)}
                    </Typography>
                  </Box>
                  {Number(selectedSale.due_amount || 0) > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body1" fontWeight="bold">المستحق:</Typography>
                      <Typography variant="body1" fontWeight="bold" color="warning.main">
                        {formatNumber(selectedSale.due_amount || 0)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Shift Report PDF Dialog */}
      <Dialog
        open={shiftReportDialogOpen}
        onClose={() => {
          setShiftReportDialogOpen(false);
          setSelectedShift(null);
        }}
        maxWidth="lg"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: 3,
            height: "90vh",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            pb: 2,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            تقرير الوردية #{selectedShift?.id}
          </Typography>
          <IconButton
            onClick={() => {
              setShiftReportDialogOpen(false);
              setSelectedShift(null);
            }}
            size="small"
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: "calc(90vh - 64px)", overflow: "hidden" }}>
          {reportData && reportData.data.length > 0 && selectedShift && (
            <PDFViewer width="100%" height="100%" showToolbar={true}>
              <PosShiftReportPdf
                sales={reportData.data}
                shift={selectedShift}
                userName={reportData.data[0]?.user_name || undefined}
                settings={settings}
              />
            </PDFViewer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SalesReportPage;
