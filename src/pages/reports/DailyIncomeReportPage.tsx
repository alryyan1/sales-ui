import React, { useState, useEffect, useCallback } from "react";
import { format, getMonth, getYear } from "date-fns";
import { arSA } from "date-fns/locale";
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
  Typography,
  Select,
  MenuItem,
  FormControl,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";

// Lucide Icons
import { ArrowLeft, Calendar, FileText, FileSpreadsheet } from "lucide-react";

import apiClient from "@/lib/axios";
import { formatCurrency, formatDateDDMMYYYY } from "@/constants";
import {
  useFormatCurrency,
  useCurrencySymbol,
} from "@/hooks/useFormatCurrency";
import { toast } from "sonner";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

// --- Types ---
interface DailyReportEntry {
  date: string;
  total_sales: number;
  total_paid: number;
  total_cash: number;
  total_bank: number;
  total_expense: number;
  net: number;
}
interface MonthSummary {
  total_sales: number;
  total_paid: number;
  total_cash: number;
  total_bank: number;
  total_expense: number;
  net: number;
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
    fontSize: 10,
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
  currencySymbol?: string;
}> = ({ data, currencySymbol = "SDG" }) => {
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
            تاريخ التوليد:{" "}
            {format(new Date(), "yyyy-MM-dd HH:mm", { locale: arSA })}
          </Text>
        </View>

        {/* Table */}
        <View style={pdfStyles.table}>
          {/* Table Header */}
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.tableHeaderCell}>التاريخ</Text>
            <Text style={pdfStyles.tableHeaderCell}>إجمالي المبيعات</Text>
            <Text style={pdfStyles.tableHeaderCell}>إجمالي المدفوع</Text>
            <Text style={pdfStyles.tableHeaderCell}>إجمالي النقدي</Text>
            <Text style={pdfStyles.tableHeaderCell}>إجمالي البنكي</Text>
            <Text style={pdfStyles.tableHeaderCell}>إجمالي المصروفات</Text>
            <Text style={pdfStyles.tableHeaderCell}>صافي</Text>
          </View>

          {/* Table Rows */}
          {data.daily_breakdown.map((row) => (
            <View key={row.date} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.tableCell}>
                {formatDateDDMMYYYY(row.date)}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {formatCurrency(row.total_sales, undefined, currencySymbol)}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {formatCurrency(row.total_paid, undefined, currencySymbol)}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {formatCurrency(row.total_cash, undefined, currencySymbol)}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {formatCurrency(row.total_bank, undefined, currencySymbol)}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {formatCurrency(row.total_expense, undefined, currencySymbol)}
              </Text>
              <Text style={pdfStyles.tableCell}>
                {formatCurrency(row.net, undefined, currencySymbol)}
              </Text>
            </View>
          ))}

          {/* Total Row */}
          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.totalCell}>الإجمالي</Text>
            <Text style={pdfStyles.totalCell}>
              {formatCurrency(
                data.month_summary.total_sales,
                undefined,
                currencySymbol,
              )}
            </Text>
            <Text style={pdfStyles.totalCell}>
              {formatCurrency(
                data.month_summary.total_paid,
                undefined,
                currencySymbol,
              )}
            </Text>
            <Text style={pdfStyles.totalCell}>
              {formatCurrency(
                data.month_summary.total_cash,
                undefined,
                currencySymbol,
              )}
            </Text>
            <Text style={pdfStyles.totalCell}>
              {formatCurrency(
                data.month_summary.total_bank,
                undefined,
                currencySymbol,
              )}
            </Text>
            <Text style={pdfStyles.totalCell}>
              {formatCurrency(
                data.month_summary.total_expense,
                undefined,
                currencySymbol,
              )}
            </Text>
            <Text style={pdfStyles.totalCell}>
              {formatCurrency(
                data.month_summary.net,
                undefined,
                currencySymbol,
              )}
            </Text>
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
  const formatCurrency = useFormatCurrency();
  const currencySymbol = useCurrencySymbol();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    getMonth(currentDate) + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    getYear(currentDate),
  );
  const [reportData, setReportData] = useState<MonthlyRevenueReportData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [chartType, setChartType] = useState<
    "sales_vs_paid" | "cash_vs_bank" | "expense_vs_net"
  >("sales_vs_paid");

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("month", String(selectedMonth));
      params.append("year", String(selectedYear));

      const response = await apiClient.get<{ data: MonthlyRevenueReportData }>(
        `/reports/monthly-revenue?${params.toString()}`,
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
    (_, i) => getYear(currentDate) - 2 + i,
  );
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate and Download PDF
  const handleGeneratePdf = async () => {
    if (!reportData) {
      toast.error("خطأ", { description: "لا توجد بيانات لتصديرها" });
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const doc = (
        <DailyIncomeReportPDF
          data={reportData}
          currencySymbol={currencySymbol}
        />
      );
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
        },
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
    <Box>
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
            <Stack direction="row" spacing={1.5} alignItems="center">
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Infographics Section */}
          {reportData.daily_breakdown.length > 0 && (
            <Card sx={{ borderRadius: 3, boxShadow: 1 }}>
              <CardContent>
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="center"
                  sx={{ mb: 4 }}
                >
                  <Button
                    variant={
                      chartType === "sales_vs_paid" ? "contained" : "outlined"
                    }
                    onClick={() => setChartType("sales_vs_paid")}
                  >
                    المبيعات مقابل المدفوع
                  </Button>
                  <Button
                    variant={
                      chartType === "cash_vs_bank" ? "contained" : "outlined"
                    }
                    onClick={() => setChartType("cash_vs_bank")}
                  >
                    النقدي مقابل البنكي
                  </Button>
                  <Button
                    variant={
                      chartType === "expense_vs_net" ? "contained" : "outlined"
                    }
                    onClick={() => setChartType("expense_vs_net")}
                  >
                    المصروفات مقابل الصافي
                  </Button>
                </Stack>

                <Box sx={{ height: 400, width: "100%", direction: "ltr" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "sales_vs_paid" ? (
                      <BarChart
                        data={reportData.daily_breakdown}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => dayjs(date).format("DD/MM")}
                        />
                        <YAxis />
                        <Tooltip
                          wrapperStyle={{
                            direction: "rtl",
                            textAlign: "right",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) =>
                            dayjs(label).format("DD/MM/YYYY")
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="total_sales"
                          name="المبيعات"
                          fill="#1976d2"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="total_paid"
                          name="المدفوع"
                          fill="#2e7d32"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    ) : chartType === "cash_vs_bank" ? (
                      <BarChart
                        data={reportData.daily_breakdown}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => dayjs(date).format("DD/MM")}
                        />
                        <YAxis />
                        <Tooltip
                          wrapperStyle={{
                            direction: "rtl",
                            textAlign: "right",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) =>
                            dayjs(label).format("DD/MM/YYYY")
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="total_cash"
                          name="النقدي"
                          fill="#ed6c02"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="total_bank"
                          name="البنكي"
                          fill="#9c27b0"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    ) : (
                      <LineChart
                        data={reportData.daily_breakdown}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => dayjs(date).format("DD/MM")}
                        />
                        <YAxis />
                        <Tooltip
                          wrapperStyle={{
                            direction: "rtl",
                            textAlign: "right",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) =>
                            dayjs(label).format("DD/MM/YYYY")
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="total_expense"
                          name="المصروفات"
                          stroke="#d32f2f"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="net"
                          name="الصافي"
                          stroke="#2e7d32"
                          strokeWidth={2}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Table Section */}
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: 2,
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <TableContainer sx={{ maxHeight: "60vh", overflow: "auto" }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 600,
                          py: 2.5,
                          fontSize: "1rem",
                          bgcolor: "grey.50",
                        }}
                      >
                        التاريخ
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        إجمالي المبيعات
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        إجمالي المدفوع
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        إجمالي النقدي
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        إجمالي البنكي
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        إجمالي المصروفات
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        صافي
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.daily_breakdown.map((row) => {
                      const isToday = dayjs().format("YYYY-MM-DD") === row.date;
                      return (
                        <TableRow
                          key={row.date}
                          sx={{
                            bgcolor: isToday
                              ? "rgba(25, 118, 210, 0.08)"
                              : "inherit",
                            "&:hover": {
                              bgcolor: isToday
                                ? "rgba(25, 118, 210, 0.15)"
                                : "action.hover",
                            },
                            transition: "background-color 0.2s ease",
                          }}
                        >
                          <TableCell
                            align="center"
                            sx={{ fontWeight: 500, py: 2.5, fontSize: "1rem" }}
                          >
                            {dayjs(row.date).format("DD/MM/YYYY")}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ py: 2.5, fontSize: "1rem" }}
                          >
                            {formatCurrency(row.total_sales)}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ py: 2.5, fontSize: "1rem" }}
                          >
                            {formatCurrency(row.total_paid)}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ py: 2.5, fontSize: "1rem" }}
                          >
                            {formatCurrency(row.total_cash)}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ py: 2.5, fontSize: "1rem" }}
                          >
                            {formatCurrency(row.total_bank)}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ py: 2.5, fontSize: "1rem" }}
                          >
                            {formatCurrency(row.total_expense)}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 700,
                              py: 2.5,
                              fontSize: "1rem",
                              color: "success.main",
                            }}
                          >
                            {formatCurrency(row.net)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                          }}
                        >
                          {formatCurrency(reportData.month_summary.total_sales)}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 700,
                            py: 2.5,
                            fontSize: "1.1rem",
                          }}
                        >
                          {formatCurrency(reportData.month_summary.total_paid)}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 700,
                            py: 2.5,
                            fontSize: "1.1rem",
                          }}
                        >
                          {formatCurrency(reportData.month_summary.total_cash)}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 700,
                            py: 2.5,
                            fontSize: "1.1rem",
                          }}
                        >
                          {formatCurrency(reportData.month_summary.total_bank)}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 700,
                            py: 2.5,
                            fontSize: "1.1rem",
                          }}
                        >
                          {formatCurrency(
                            reportData.month_summary.total_expense,
                          )}
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
                          {formatCurrency(reportData.month_summary.net)}
                        </TableCell>
                      </TableRow>
                    )}
                    {reportData.daily_breakdown.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
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
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
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
