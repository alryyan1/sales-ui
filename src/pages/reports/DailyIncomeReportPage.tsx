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
import { useNavigate } from "react-router-dom";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";

// MUI Components
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  Grid,
  IconButton,
  Divider,
  Chip,
} from "@mui/material";

// Lucide Icons
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  FileText,
  Download,
  FileSpreadsheet,
} from "lucide-react";

import apiClient from "@/lib/axios";
import { formatCurrency, formatDate } from "@/constants";
import { toast } from "sonner";

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

// Register Arial Font
Font.register({
  family: "Arial",
  fonts: [
    {
      src: "/fonts/ARIAL.ttf",
    },
  ],
});

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Arial",
    direction: "rtl",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #1976d2",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1976d2",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  summarySection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1976d2",
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    padding: 8,
    borderBottom: "1 solid #1976d2",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1 solid #ddd",
  },
  tableCell: {
    fontSize: 10,
    padding: 4,
    flex: 1,
    textAlign: "center",
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "bold",
    padding: 4,
    flex: 1,
    textAlign: "center",
    color: "#1976d2",
  },
  totalRow: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderTop: "2 solid #1976d2",
    marginTop: 5,
  },
  totalCell: {
    fontSize: 12,
    fontWeight: "bold",
    padding: 4,
    flex: 1,
    textAlign: "center",
    color: "#1976d2",
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTop: "1 solid #ddd",
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
});

// PDF Document Component
const DailyIncomeReportPDF: React.FC<{
  data: MonthlyRevenueReportData;
}> = ({ data }) => {
  const totalIncome = data.daily_breakdown.reduce(
    (sum, row) => sum + row.total_payments_recorded_on_day,
    0
  );

  const paymentMethods = Object.keys(data.month_summary.total_payments_by_method);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>تقرير المبيعات الشهري</Text>
          <Text style={pdfStyles.subtitle}>
            شهر: {data.month_name} {data.year}
          </Text>
          <Text style={pdfStyles.subtitle}>
            تاريخ التوليد: {format(new Date(), "yyyy-MM-dd HH:mm", { locale: arSA })}
          </Text>
        </View>

        {/* Summary Section */}
        <View style={pdfStyles.summarySection}>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>إجمالي الدخل:</Text>
            <Text style={pdfStyles.summaryValue}>
              {formatCurrency(
                Object.values(data.month_summary.total_payments_by_method).reduce(
                  (a, b) => a + b,
                  0
                )
              )}
            </Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>إجمالي المبيعات (الفواتير):</Text>
            <Text style={pdfStyles.summaryValue}>
              {formatCurrency(data.month_summary.total_revenue)}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={pdfStyles.table}>
          {/* Table Header */}
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.tableHeaderCell, { flex: 1.2 }]}>التاريخ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>اليوم</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: 1.3 }]}>إجمالي الدخل</Text>
            {paymentMethods.map((method) => (
              <Text key={method} style={pdfStyles.tableHeaderCell}>
                {method}
              </Text>
            ))}
          </View>

          {/* Table Rows */}
          {data.daily_breakdown.map((row) => (
            <View key={row.date} style={pdfStyles.tableRow}>
              <Text style={[pdfStyles.tableCell, { flex: 1.2 }]}>{formatDate(row.date)}</Text>
              <Text style={[pdfStyles.tableCell, { flex: 1 }]}>{row.day_of_week}</Text>
              <Text style={[pdfStyles.tableCell, { flex: 1.3 }]}>
                {formatCurrency(row.total_payments_recorded_on_day)}
              </Text>
              {paymentMethods.map((method) => (
                <Text key={`${row.date}-${method}`} style={pdfStyles.tableCell}>
                  {formatCurrency(row.payments_by_method[method] || 0)}
                </Text>
              ))}
            </View>
          ))}

          {/* Total Row */}
          <View style={pdfStyles.totalRow}>
            <Text style={[pdfStyles.totalCell, { flex: 1.2 }]}>الإجمالي</Text>
            <Text style={[pdfStyles.totalCell, { flex: 1 }]}></Text>
            <Text style={[pdfStyles.totalCell, { flex: 1.3 }]}>
              {formatCurrency(totalIncome)}
            </Text>
            {paymentMethods.map((method) => (
              <Text key={`sum-${method}`} style={pdfStyles.totalCell}>
                {formatCurrency(
                  data.daily_breakdown.reduce(
                    (sum, row) => sum + (row.payments_by_method[method] || 0),
                    0
                  )
                )}
              </Text>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>تم إنشاء هذا التقرير تلقائياً من نظام إدارة المبيعات</Text>
        </View>
      </Page>
    </Document>
  );
};

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

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
    } catch (error: any) {
      console.error("Error fetching monthly sales report:", error);
      toast.error("خطأ", {
        description: error?.message || "حدث خطأ أثناء جلب التقرير",
      });
      setReportData(null);
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

  // Generate and Download PDF
  const handleGeneratePdf = async () => {
    if (!reportData) {
      toast.error("خطأ", { description: "لا توجد بيانات لتصديرها" });
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const doc = <DailyIncomeReportPDF data={reportData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `تقرير_المبيعات_الشهري_${reportData.month_name}_${reportData.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("نجح", { description: "تم إنشاء ملف PDF بنجاح" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("خطأ", {
        description: "حدث خطأ أثناء إنشاء ملف PDF",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!reportData) {
      toast.error("خطأ", { description: "لا توجد بيانات لتصديرها" });
      return;
    }

    try {
      setIsExportingExcel(true);
      const params = new URLSearchParams();
      params.append("month", String(selectedMonth));
      params.append("year", String(selectedYear));

      // Try monthly-revenue-excel endpoint
      const response = await apiClient.get(
        `/reports/monthly-revenue-excel?${params.toString()}`,
        {
          responseType: "blob",
        }
      );

      // Create blob URL and download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `تقرير_المبيعات_الشهري_${reportData.month_name}_${reportData.year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("نجح", { description: "تم تصدير ملف Excel بنجاح" });
    } catch (error: any) {
      console.error("Error exporting Excel:", error);
      const errorMessage =
        error?.response?.status === 404
          ? "Endpoint غير موجود. يرجى إنشاء /api/reports/monthly-revenue-excel في الـ backend"
          : error?.response?.data?.message ||
            error?.message ||
            "حدث خطأ أثناء تصدير ملف Excel";
      toast.error("خطأ", {
        description: errorMessage,
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3, lg: 4 }, minHeight: "100vh", pb: 10 }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ md: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{
                border: 1,
                borderColor: "divider",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              <ArrowLeft size={20} />
            </IconButton>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              تقرير المبيعات الشهري
            </Typography>
          </Stack>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ pl: 7, mt: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              عرض تفاصيل المبيعات الشهرية مع التوزيع اليومي.
            </Typography>
            {reportData && (
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={
                    isExportingExcel ? (
                      <CircularProgress size={16} />
                    ) : (
                      <FileSpreadsheet size={18} />
                    )
                  }
                  onClick={handleExportExcel}
                  disabled={isExportingExcel || !reportData}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  {isExportingExcel ? "جاري التصدير..." : "تصدير Excel"}
                </Button>
                <Button
                  variant="contained"
                  startIcon={
                    isGeneratingPdf ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <FileText size={18} />
                    )
                  }
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf || !reportData}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 500,
                  }}
                >
                  {isGeneratingPdf ? "جاري الإنشاء..." : "تصدير PDF"}
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>

        {/* Filters */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            boxShadow: 1,
          }}
        >
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
            >
              <Calendar size={18} style={{ opacity: 0.6 }} />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={String(selectedMonth)}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  sx={{
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "divider",
                    },
                  }}
                >
                  {months.map((m) => (
                    <MenuItem key={m} value={String(m)}>
                      {format(new Date(2000, m - 1, 1), "MMMM", {
                        locale: arSA,
                      })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Divider orientation="vertical" flexItem />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={String(selectedYear)}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  sx={{
                    borderRadius: 2,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "divider",
                    },
                  }}
                >
                  {years.map((y) => (
                    <MenuItem key={y} value={String(y)}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 400,
          }}
        >
          <CircularProgress />
        </Box>
      ) : reportData ? (
        <Stack spacing={3}>
          {/* Summary Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 2,
                  border: 1,
                  borderColor: "success.light",
                  bgcolor: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(46, 125, 50, 0.1)' 
                    : 'rgba(46, 125, 50, 0.05)',
                }}
              >
                <CardHeader
                  sx={{
                    pb: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600 }}
                    >
                      إجمالي الدخل
                    </Typography>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: "success.main",
                        color: "white",
                      }}
                    >
                      <DollarSign size={20} />
                    </Box>
                  </Stack>
                </CardHeader>
                <CardContent>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: "success.main",
                      mb: 0.5,
                    }}
                  >
                    {formatCurrency(
                      Object.values(
                        reportData.month_summary.total_payments_by_method
                      ).reduce((a, b) => a + b, 0)
                    )}
                  </Typography>
                  <Chip
                    label={`شهر ${reportData.month_name}`}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 2,
                  border: 1,
                  borderColor: "primary.light",
                  bgcolor: (theme) => theme.palette.mode === 'dark' 
                    ? 'rgba(25, 118, 210, 0.1)' 
                    : 'rgba(25, 118, 210, 0.05)',
                }}
              >
                <CardHeader
                  sx={{
                    pb: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600 }}
                    >
                      إجمالي المبيعات
                    </Typography>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: "primary.main",
                        color: "white",
                      }}
                    >
                      <TrendingUp size={20} />
                    </Box>
                  </Stack>
                </CardHeader>
                <CardContent>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: "primary.main",
                      mb: 0.5,
                    }}
                  >
                    {formatCurrency(reportData.month_summary.total_revenue)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    قيمة الفواتير الصادرة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: 2,
                }}
              >
                <CardHeader
                  sx={{
                    pb: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600 }}
                    >
                      أعلى طريقة دفع
                    </Typography>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: "action.hover",
                      }}
                    >
                      <CreditCard size={20} />
                    </Box>
                  </Stack>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const methods =
                      reportData.month_summary.total_payments_by_method;
                    const topMethod = Object.entries(methods).sort(
                      ([, a], [, b]) => b - a
                    )[0];
                    return topMethod ? (
                      <Stack spacing={1}>
                        <Chip
                          label={topMethod[0]}
                          sx={{
                            textTransform: "capitalize",
                            fontWeight: 600,
                            alignSelf: "flex-start",
                          }}
                        />
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 700, mt: 1 }}
                        >
                          {formatCurrency(topMethod[1])}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        لا توجد بيانات
                      </Typography>
                    );
                  })()}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Chart Section */}
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 2,
            }}
          >
            <CardHeader
              sx={{
                pb: 2,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                اتجاه المبيعات اليومية
              </Typography>
            </CardHeader>
            <CardContent sx={{ pt: 3 }}>
              <Box sx={{ height: 400, width: "100%" }}>
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
                            <Box sx={{ bgcolor: "background.paper", p: 1, borderRadius: 1, border: 1, borderColor: "divider", boxShadow: 2 }}>
                              <Grid container spacing={1}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>
                                    التاريخ
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {label}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>
                                    الدخل
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                                    {formatCurrency(Number(payload[0].value))}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="income"
                      fill="#16a34a"
                      radius={[4, 4, 0, 0]}
                      name="الدخل"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 2,
            }}
          >
            <CardHeader
              sx={{
                pb: 2,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  تفاصيل المبيعات اليومية
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  توزيع يومي للمبيعات وطرق الدفع.
                </Typography>
              </Stack>
            </CardHeader>
            <CardContent sx={{ p: 0 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                    >
                      التاريخ
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                    >
                      اليوم
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                    >
                      إجمالي الدخل
                    </TableCell>
                    {Object.keys(
                      reportData.month_summary.total_payments_by_method
                    ).map((method) => (
                      <TableCell
                        key={method}
                        align="center"
                        sx={{
                          fontWeight: 600,
                          py: 2.5,
                          fontSize: "1rem",
                          textTransform: "capitalize",
                        }}
                      >
                        {method}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.daily_breakdown.map((row) => (
                    <TableRow
                      key={row.date}
                      sx={{
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 500, py: 2.5, fontSize: "1rem" }}
                      >
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2.5 }}>
                        <Chip
                          label={row.day_of_week}
                          size="medium"
                          variant="outlined"
                          sx={{ fontSize: "0.95rem" }}
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 700,
                          color: "success.main",
                          py: 2.5,
                          fontSize: "1rem",
                        }}
                      >
                        {formatCurrency(row.total_payments_recorded_on_day)}
                      </TableCell>
                      {Object.keys(
                        reportData.month_summary.total_payments_by_method
                      ).map((method) => (
                        <TableCell
                          key={`${row.date}-${method}`}
                          align="center"
                          sx={{ py: 2.5, fontSize: "1rem" }}
                        >
                          {formatCurrency(row.payments_by_method[method] || 0)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {/* Sum Row */}
                  {reportData.daily_breakdown.length > 0 && (
                    <TableRow
                      sx={{
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(25, 118, 210, 0.2)"
                            : "rgba(25, 118, 210, 0.08)",
                        "& .MuiTableCell-root": {
                          borderTop: 2,
                          borderColor: "primary.main",
                        },
                      }}
                    >
                      <TableCell
                        align="center"
                        colSpan={2}
                        sx={{
                          fontWeight: 700,
                          py: 2.5,
                          fontSize: "1.1rem",
                          color: "primary.main",
                        }}
                      >
                        الإجمالي
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 700,
                          py: 2.5,
                          fontSize: "1.1rem",
                          color: "success.main",
                        }}
                      >
                        {formatCurrency(
                          reportData.daily_breakdown.reduce(
                            (sum, row) =>
                              sum + row.total_payments_recorded_on_day,
                            0
                          )
                        )}
                      </TableCell>
                      {Object.keys(
                        reportData.month_summary.total_payments_by_method
                      ).map((method) => (
                        <TableCell
                          key={`sum-${method}`}
                          align="center"
                          sx={{
                            fontWeight: 700,
                            py: 2.5,
                            fontSize: "1.1rem",
                            color: "text.primary",
                          }}
                        >
                          {formatCurrency(
                            reportData.daily_breakdown.reduce(
                              (sum, row) =>
                                sum + (row.payments_by_method[method] || 0),
                              0
                            )
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                  {reportData.daily_breakdown.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={
                          3 +
                          Object.keys(
                            reportData.month_summary.total_payments_by_method
                          ).length
                        }
                        align="center"
                        sx={{ py: 8, fontSize: "1rem" }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          لا توجد بيانات متاحة لهذا الشهر.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: 2,
            textAlign: "center",
            py: 8,
          }}
        >
          <CardContent>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              لا توجد بيانات متاحة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              يرجى اختيار شهر وسنة لعرض التقرير.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};


export default DailyIncomeReportPage;
