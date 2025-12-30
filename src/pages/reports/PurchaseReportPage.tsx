// src/pages/reports/PurchaseReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth } from "date-fns";

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
  Skeleton,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

// Lucide Icons
import {
  ArrowLeft,
  Filter,
  X,
  Eye,
  Package,
  DollarSign,
  TrendingUp,
  FileText,
} from "lucide-react";

// Services and Types
import purchaseService, { Purchase } from "../../services/purchaseService";
import { getErrorMessage } from "../../lib/axios";
import supplierService, { Supplier } from "../../services/supplierService";

// Helpers
import { formatNumber } from "@/constants";
import dayjs from "dayjs";
import { PaginatedResponse } from "@/services/clientService";

// --- Zod Schema for Filter Form ---
const reportFilterSchema = z
  .object({
    startDate: z.date().nullable().optional(),
    endDate: z.date().nullable().optional(),
    supplierId: z.string().nullable().optional(), // Filter by supplier
    // userId: z.string().nullable().optional(),
    status: z.string().nullable().optional(), // Purchase statuses
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
const PurchaseReportPage: React.FC = () => {
  // Removed useTranslation
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [reportData, setReportData] =
    useState<PaginatedResponse<Purchase> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Filter options state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // For supplier dropdown
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // --- Form ---
  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : startOfMonth(new Date()),
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : new Date(),
      supplierId: searchParams.get("supplierId") || null,
      status: searchParams.get("status") || null,
    },
  });
  const { control, handleSubmit, reset } = form;

  // --- Fetch Data for Filters (Suppliers) ---
  const fetchSuppliersForFilter = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const response = await supplierService.getSuppliers(1, "", 9999);
      setSuppliers(response.data);
    } catch (err) {
      toast.error("خطأ", {
        description: supplierService.getErrorMessage(err),
      });
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliersForFilter();
  }, [fetchSuppliersForFilter]);

  // --- Fetch Report Data ---
  const fetchReport = useCallback(
    async (filters: ReportFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = {
          page,
          startDate: filters.startDate
            ? format(filters.startDate, "yyyy-MM-dd")
            : "",
          endDate: filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : "",
          supplier_id: filters.supplierId || "", // Use supplier_id
          status: filters.status || "",
        };
        // Use purchaseService to get data
        const data = await purchaseService.getPurchases(
          params.page,
          "",
          params.status,
          params.startDate,
          params.endDate,
          Number(params.supplier_id)
          // Adjust service call signature if needed
        );
        setReportData(data);
      } catch (err: any) {
        const errorMsg = getErrorMessage(err) || "حدث خطأ أثناء جلب البيانات";
        setError(errorMsg);
        toast.error("خطأ", { description: errorMsg });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // --- Effect to Fetch Report When Filters/Page Change ---
  const currentFilters = useMemo(
    () => ({
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : null,
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : null,
      supplierId: searchParams.get("supplierId") || null, // Use supplierId
      status: searchParams.get("status") || null,
    }),
    [searchParams]
  );
  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  useEffect(() => {
    reset({
      startDate: currentFilters.startDate ?? null, // Handle null for reset
      endDate: currentFilters.endDate ?? null,
      supplierId: currentFilters.supplierId,
      status: currentFilters.status,
    });
    fetchReport(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchReport, reset]);

  // --- Filter Form Submit Handler ---
  const onFilterSubmit: SubmitHandler<ReportFilterValues> = (data) => {
    const newParams = new URLSearchParams();
    if (data.startDate)
      newParams.set("startDate", format(data.startDate, "yyyy-MM-dd"));
    if (data.endDate)
      newParams.set("endDate", format(data.endDate, "yyyy-MM-dd"));
    if (data.supplierId) newParams.set("supplierId", data.supplierId); // Use supplierId
    if (data.status) newParams.set("status", data.status);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  // --- Clear Filters Handler ---
  const clearFilters = () => {
    reset({
      startDate: startOfMonth(new Date()),
      endDate: new Date(),
      supplierId: null,
      status: null /* userId: null */,
    }); // Reset form to defaults
    setSearchParams({ page: "1" }); // Reset URL params (triggers refetch via useEffect)
  };

  // --- Pagination Handler ---
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams); // Update URL, triggers useEffect
  };

  // --- Calculate Summary Stats ---
  const summaryStats = useMemo(() => {
    if (!reportData?.data) return null;

    const totalPurchases = reportData.data.length;
    const totalAmount = reportData.data.reduce(
      (sum, purchase) => sum + Number(purchase.total_amount || 0),
      0
    );
    const pendingCount = reportData.data.filter(
      (purchase) => purchase.status === "pending"
    ).length;

    return {
      totalPurchases,
      totalAmount,
      pendingCount,
    };
  }, [reportData]);

  // --- Render Page ---
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
                  تقرير المشتريات
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  عرض وتتبع المشتريات
                </Typography>
              </Box>
            </Stack>
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
                {/* Total Purchases Card */}
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
                            إجمالي المشتريات
                          </Typography>
                          <Box
                            sx={{
                              color: "primary.main",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Package size={20} />
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
                          {summaryStats.totalPurchases}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                {/* Total Amount Card */}
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
                            إجمالي المبلغ
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

                {/* Pending Count Card */}
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
                      borderColor: summaryStats.pendingCount > 0 ? "warning.light" : "divider",
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
                            المعلقة
                          </Typography>
                          <Box
                            sx={{
                              color: summaryStats.pendingCount > 0 ? "warning.main" : "success.main",
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
                            color: summaryStats.pendingCount > 0 ? "warning.dark" : "success.main",
                            lineHeight: 1,
                          }}
                        >
                          {summaryStats.pendingCount}
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
                      label={`${(currentPage - 1) * 15 + 1}-${Math.min(
                        currentPage * 15,
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
                        لا توجد مشتريات
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
                              <TableCell>المرجع</TableCell>
                              <TableCell>المورد</TableCell>
                              <TableCell>سجل بواسطة</TableCell>
                              <TableCell align="center">الحالة</TableCell>
                              <TableCell align="right">المبلغ الإجمالي</TableCell>
                              <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {reportData.data.map((purchase) => (
                              <TableRow
                                key={purchase.id}
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
                                  {dayjs(purchase.purchase_date).format("YYYY-MM-DD")}
                                </TableCell>
                                <TableCell>
                                  {purchase.reference_number || (
                                    <Typography component="span" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {purchase.supplier_name || (
                                    <Typography component="span" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {purchase.user_name || (
                                    <Typography component="span" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={
                                      {
                                        received: "تم الاستلام",
                                        pending: "معلق",
                                        ordered: "تم الطلب",
                                      }[purchase.status] || purchase.status
                                    }
                                    size="small"
                                    color={
                                      purchase.status === "received"
                                        ? "success"
                                        : purchase.status === "pending"
                                        ? "warning"
                                        : "default"
                                    }
                                  />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 500 }}>
                                  {formatNumber(purchase.total_amount)}
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    onClick={() => navigate(`/purchases/${purchase.id}/edit`)}
                                    size="small"
                                    sx={{
                                      border: "1px solid",
                                      borderColor: "divider",
                                      borderRadius: 1.5,
                                    }}
                                  >
                                    <Eye size={16} />
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
                        <DatePicker
                          label="تاريخ البدء"
                          value={field.value ?? null}
                          onChange={field.onChange}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: "small",
                              error: !!fieldState.error,
                              helperText: fieldState.error?.message,
                            },
                          }}
                        />
                      )}
                    />

                    {/* End Date */}
                    <Controller
                      control={control}
                      name="endDate"
                      render={({ field, fieldState }) => (
                        <DatePicker
                          label="تاريخ الانتهاء"
                          value={field.value ?? null}
                          onChange={field.onChange}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: "small",
                              error: !!fieldState.error,
                              helperText: fieldState.error?.message,
                            },
                          }}
                        />
                      )}
                    />

                    {/* Supplier Select */}
                    <Controller
                      control={control}
                      name="supplierId"
                      render={({ field, fieldState }) => (
                        <FormControl fullWidth size="small" error={!!fieldState.error}>
                          <InputLabel>المورد</InputLabel>
                          <Select
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            label="المورد"
                            disabled={loadingSuppliers || isLoading}
                          >
                            <MenuItem value="">جميع الموردين</MenuItem>
                            {suppliers.map((s) => (
                              <MenuItem key={s.id} value={String(s.id)}>
                                {s.name}
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
                            disabled={isLoading}
                          >
                            <MenuItem value="">جميع الحالات</MenuItem>
                            <MenuItem value="received">تم الاستلام</MenuItem>
                            <MenuItem value="pending">معلق</MenuItem>
                            <MenuItem value="ordered">تم الطلب</MenuItem>
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

export default PurchaseReportPage;
