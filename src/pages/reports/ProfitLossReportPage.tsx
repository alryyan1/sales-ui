// src/pages/reports/ProfitLossReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth } from "date-fns";

// Helper
import apiClient, { getErrorMessage } from "@/lib/axios";
import { formatNumber, formatCurrency } from "@/constants";

// MUI Components
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  Stack,
  Divider,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

// Icons
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ArrowBack as ArrowBackIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Print as PrintIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// --- Zod Schema for Filter Form ---
const profitLossFilterSchema = z
  .object({
    startDate: z.date({ required_error: "تاريخ البدء مطلوب" }),
    endDate: z.date({ required_error: "تاريخ الانتهاء مطلوب" }),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
    path: ["endDate"],
  });

type ProfitLossFilterValues = z.infer<typeof profitLossFilterSchema>;

// --- Type for Report Data ---
interface ProfitLossData {
  start_date: string;
  end_date: string;
  filters: Record<string, unknown>;
  revenue: number; // Net Revenue
  gross_revenue?: number;
  returns_value?: number;
  cost_of_goods_sold: number; // Net COGS
  gross_cogs?: number;
  returns_cost?: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
}

// --- Component ---
const ProfitLossReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [reportData, setReportData] = useState<ProfitLossData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Form ---
  const form = useForm<ProfitLossFilterValues>({
    resolver: zodResolver(profitLossFilterSchema),
    defaultValues: {
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : startOfMonth(new Date()),
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : new Date(),
    },
  });

  const { control, handleSubmit, reset } = form;

  // --- Fetch Report Data ---
  const fetchReport = useCallback(async (filters: ProfitLossFilterValues) => {
    setIsLoading(true);
    setError(null);
    setReportData(null);
    try {
      const params = new URLSearchParams();
      params.append("start_date", format(filters.startDate, "yyyy-MM-dd"));
      params.append("end_date", format(filters.endDate, "yyyy-MM-dd"));

      const response = await apiClient.get<{ data: ProfitLossData }>(
        `/reports/profit-loss?${params.toString()}`,
      );
      setReportData(response.data.data);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error("فشل تحميل التقرير", { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Effect to Sync URL & Fetch ---
  const currentFilters = useMemo(
    () => ({
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : startOfMonth(new Date()),
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : new Date(),
    }),
    [searchParams],
  );

  useEffect(() => {
    reset(currentFilters);
    const validationResult = profitLossFilterSchema.safeParse(currentFilters);
    if (validationResult.success) {
      fetchReport(validationResult.data);
    }
  }, [currentFilters, fetchReport, reset]);

  // --- Handlers ---
  const onFilterSubmit: SubmitHandler<ProfitLossFilterValues> = (data) => {
    const newParams = new URLSearchParams();
    newParams.set("startDate", format(data.startDate, "yyyy-MM-dd"));
    newParams.set("endDate", format(data.endDate, "yyyy-MM-dd"));
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    const defaultVals = {
      startDate: startOfMonth(new Date()),
      endDate: new Date(),
    };
    reset(defaultVals);
    setSearchParams({});
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
    if (!reportData) return [];
    return [
      {
        name: "الإيرادات",
        value: reportData.revenue,
        fill: "#10b981", // Emerald 500
      },
      {
        name: "التكاليف",
        value: reportData.cost_of_goods_sold,
        fill: "#f59e0b", // Amber 500
      },
      {
        name: "المصروفات",
        value: reportData.total_expenses,
        fill: "#ef4444", // Red 500
      },
      {
        name: "صافي الربح",
        value: reportData.net_profit,
        fill: reportData.net_profit >= 0 ? "#3b82f6" : "#ef4444", // Blue 500 or Red if loss
      },
    ];
  }, [reportData]);

  return (
    <Box
      sx={{
        bgcolor: "background.default",
        minHeight: "100vh",
        pb: 8,
        "@media print": { bgcolor: "white" },
      }}
    >
      {/* --- Header Section --- */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          pt: 2,
          pb: 2,
          px: { xs: 2, md: 4 },
          mb: 4,
          "@media print": { display: "none" },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate("/dashboard")} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                تقرير الأرباح والخسائر
              </Typography>
              <Typography variant="body2" color="text.secondary">
                نظرة شاملة على الأداء المالي للمنشأة
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="طباعة التقرير">
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{ textTransform: "none" }}
              >
                طباعة
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* --- Main Content --- */}
      <Box sx={{ px: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          {/* Filters (full width) */}
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: "background.paper",
              "@media print": { display: "none" },
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems="center"
              component="form"
              onSubmit={handleSubmit(onFilterSubmit)}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: 120,
                }}
              >
                <FilterIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={600}>
                  تصفية النتائج:
                </Typography>
              </Box>

              <Box sx={{ flex: 1, width: "100%" }}>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <DatePicker
                      label="من تاريخ"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: 1, width: "100%" }}>
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <DatePicker
                      label="إلى تاريخ"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              <Stack
                direction="row"
                spacing={1}
                width={{ xs: "100%", md: "auto" }}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={clearFilters}
                  startIcon={<ClearIcon />}
                  fullWidth
                >
                  مسح
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={
                    isLoading ? <CircularProgress size={20} /> : <FilterIcon />
                  }
                  fullWidth
                >
                  تحديث التقرير
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* Error State */}
          {error && (
            <Alert severity="error">
              <AlertTitle>خطأ</AlertTitle>
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }} color="text.secondary">
                جاري جلب البيانات المالية...
              </Typography>
            </Box>
          )}

          {/* Report Data */}
          {!isLoading && reportData && (
            <>
              {/* Date Header for Print/View */}
              <Typography
                variant="h6"
                align="center"
                gutterBottom
                sx={{ display: "none", "@media print": { display: "block" } }}
              >
                تقرير الأرباح والخسائر للفترة من
                {format(new Date(reportData.start_date), "yyyy-MM-dd")} إلى
                {format(new Date(reportData.end_date), "yyyy-MM-dd")}
              </Typography>

              {/* Summary Cards Row */}
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={3}
                alignItems="stretch"
              >
                {/* Revenue Card */}
                <Card
                  elevation={0}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderColor: "success.light",
                    bgcolor: "success.lighter",
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <TrendingUpIcon fontSize="small" color="success" />
                        إجمالي الإيرادات
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        color="success.main"
                      >
                        {formatNumber(reportData.revenue)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        مجموع المبيعات في الفترة المحددة
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Expenses Card */}
                <Card
                  elevation={0}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderColor: "error.light",
                    bgcolor: "error.lighter",
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <TrendingDownIcon fontSize="small" color="error" />
                        إجمالي التكاليف والمصروفات
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        color="error.main"
                      >
                        {formatNumber(
                          reportData.cost_of_goods_sold +
                            reportData.total_expenses,
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        تكلفة البضاعة + المصروفات التشغيلية
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Net Profit Card */}
                <Card
                  elevation={0}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderColor:
                      reportData.net_profit >= 0
                        ? "primary.light"
                        : "error.light",
                    bgcolor:
                      reportData.net_profit >= 0
                        ? "primary.lighter"
                        : "error.lighter",
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <TrophyIcon
                          fontSize="small"
                          color={
                            reportData.net_profit >= 0 ? "primary" : "error"
                          }
                        />
                        صافي الربح / الخسارة
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        color={
                          reportData.net_profit >= 0
                            ? "primary.main"
                            : "error.main"
                        }
                      >
                        {formatNumber(reportData.net_profit)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        الناتج النهائي للأعمال
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>

              {/* Main Detail & Chart Section Row */}
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={3}
                alignItems="start"
              >
                {/* Income Statement Table */}
                <Card
                  elevation={0}
                  variant="outlined"
                  sx={{ flex: 2, width: "100%" }}
                >
                  <CardHeader
                    title="قائمة الدخل التفصيلية"
                    subheader="تفاصيل الإيرادات والمصروفات"
                    avatar={<MoneyIcon color="action" />}
                  />
                  <Divider />
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ p: 0 }}>
                      {/* Revenue Section */}
                      <Box
                        sx={{
                          p: 3,
                          borderBottom: "1px dashed #eee",
                        }}
                      >
                        <Stack spacing={2}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              إجمالي المبيعات (Gross Sales)
                            </Typography>
                            <Typography variant="body2">
                              {formatNumber(
                                reportData.gross_revenue || reportData.revenue,
                              )}
                            </Typography>
                          </Box>

                          {(reportData.returns_value ?? 0) > 0 && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="error.main"
                                sx={{ pl: 2 }}
                              >
                                (-) مرتجعات المبيعات
                              </Typography>
                              <Typography variant="body2" color="error.main">
                                ({formatNumber(reportData.returns_value || 0)})
                              </Typography>
                            </Box>
                          )}

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              pt: 1,
                              borderTop: "1px solid #f0f0f0",
                            }}
                          >
                            <Typography fontWeight={600}>
                              = صافي الإيرادات (Net Revenue)
                            </Typography>
                            <Typography fontWeight={600} color="success.main">
                              {formatNumber(reportData.revenue)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>

                      {/* COGS Section */}
                      <Box
                        sx={{
                          p: 3,
                          borderBottom: "1px dashed #eee",
                          bgcolor: "background.default",
                        }}
                      >
                        <Stack spacing={2}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              تكلفة المبيعات (Gross COGS)
                            </Typography>
                            <Typography variant="body2">
                              (
                              {formatNumber(
                                reportData.gross_cogs ||
                                  reportData.cost_of_goods_sold,
                              )}
                              )
                            </Typography>
                          </Box>

                          {(reportData.returns_cost ?? 0) > 0 && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="success.main"
                                sx={{ pl: 2 }}
                              >
                                (+) تكلفة المرتجعات (تعود للمخزون)
                              </Typography>
                              <Typography variant="body2" color="success.main">
                                {formatNumber(reportData.returns_cost || 0)}
                              </Typography>
                            </Box>
                          )}

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              pt: 1,
                              borderTop: "1px solid #e0e0e0",
                            }}
                          >
                            <Typography fontWeight={500} color="text.secondary">
                              = (-) صافي تكلفة البضاعة المباعة
                            </Typography>
                            <Typography fontWeight={500} color="error.main">
                              ({formatNumber(reportData.cost_of_goods_sold)})
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>

                      {/* Gross Profit */}
                      <Box
                        sx={{
                          p: 3,
                          display: "flex",
                          justifyContent: "space-between",
                          borderBottom: "1px solid #eee",
                          bgcolor: "action.hover",
                        }}
                      >
                        <Typography fontWeight={700}>= مجمل الربح</Typography>
                        <Typography
                          fontWeight={700}
                          color={
                            reportData.gross_profit >= 0
                              ? "text.primary"
                              : "error.main"
                          }
                        >
                          {formatNumber(reportData.gross_profit)}
                        </Typography>
                      </Box>

                      {/* Expenses */}
                      <Box
                        sx={{
                          p: 3,
                          display: "flex",
                          justifyContent: "space-between",
                          borderBottom: "1px dashed #eee",
                          bgcolor: "background.default",
                        }}
                      >
                        <Typography color="text.secondary" sx={{ pl: 2 }}>
                          (-) المصروفات التشغيلية
                        </Typography>
                        <Typography color="warning.dark">
                          ({formatNumber(reportData.total_expenses)})
                        </Typography>
                      </Box>

                      {/* Net Profit */}
                      <Box
                        sx={{
                          p: 3,
                          display: "flex",
                          justifyContent: "space-between",
                          bgcolor:
                            reportData.net_profit >= 0
                              ? "success.lighter"
                              : "error.lighter",
                          borderTop: "2px solid",
                          borderColor:
                            reportData.net_profit >= 0
                              ? "success.main"
                              : "error.main",
                        }}
                      >
                        <Typography variant="h6" fontWeight={800}>
                          = صافي الربح
                        </Typography>
                        <Typography
                          variant="h5"
                          fontWeight={800}
                          color={
                            reportData.net_profit >= 0
                              ? "success.dark"
                              : "error.dark"
                          }
                        >
                          {formatCurrency(reportData.net_profit)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Chart Section */}
                <Card
                  elevation={0}
                  variant="outlined"
                  sx={{ flex: 1, width: "100%", minHeight: 400 }}
                >
                  <CardHeader title="التمثيل البياني" />
                  <Divider />
                  <CardContent
                    sx={{
                      height: 400,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          style={{ fontSize: "12px", fontFamily: "inherit" }}
                        />
                        <YAxis
                          tickFormatter={(val) => formatNumber(val)}
                          style={{ fontSize: "12px" }}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            "القيمة",
                          ]}
                          cursor={{ fill: "transparent" }}
                          contentStyle={{
                            borderRadius: 8,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            border: "none",
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Stack>
            </>
          )}

          {/* Empty State */}
          {!isLoading && !reportData && !error && (
            <Box sx={{ textAlign: "center", py: 10, opacity: 0.6 }}>
              <CalendarIcon
                sx={{ fontSize: 60, mb: 2, color: "action.active" }}
              />
              <Typography variant="h6" color="text.secondary">
                الرجاء اختيار الفترة الزمنية لعرض التقرير
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default ProfitLossReportPage;
