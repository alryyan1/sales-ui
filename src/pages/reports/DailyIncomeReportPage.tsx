import React, { useState, useEffect, useCallback } from "react";
import { format, getMonth, getYear } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";

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
import { ArrowLeft, ArrowRight, Calendar, FileText, FileSpreadsheet } from "lucide-react";

import apiClient from "@/lib/axios";
import { exportMonthlyRevenuePdf } from "@/services/exportService";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
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

const DailyIncomeReportPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const navigate = useNavigate();
  const formatCurrency = useFormatCurrency();

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
      toast.error(tCommon("error"), {
        description: error?.message || t("errorFetchingReportDefault"),
      });
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, t, tCommon]);

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
      toast.error(tCommon("error"), { description: t("noDataToExport") });
      return;
    }

    try {
      setIsGeneratingPdf(true);
      await exportMonthlyRevenuePdf(selectedYear, selectedMonth);
      toast.success(tCommon("success"), { description: t("pdfCreatedSuccess") });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(tCommon("error"), {
        description: t("errorGeneratingPdfFile"),
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!reportData) {
      toast.error(tCommon("error"), { description: t("noDataToExport") });
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
      link.download = `${t("excelFilenameBase")}_${reportData.month_name}_${reportData.year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(tCommon("success"), { description: t("excelExportedSuccess") });
    } catch (error: any) {
      console.error("Error exporting Excel:", error);
      const errorMessage =
        error?.response?.status === 404
          ? t("endpointNotFoundExcel")
          : error?.response?.data?.message ||
            error?.message ||
            t("errorExportingExcelDefault");
      toast.error(tCommon("error"), {
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
              {direction === "rtl" ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
            </IconButton>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              {t("dailyIncomeReportTitle")}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ paddingInlineStart: (theme) => theme.spacing(7), mt: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              {t("dailyIncomeReportSubtitle")}
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
                  {isExportingExcel ? t("exportingEllipsis") : t("exportExcelButton")}
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
                  {isGeneratingPdf ? t("generatingEllipsis") : t("exportPdf")}
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
                        locale: language === "ar" ? arSA : enUS,
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
                    {t("chartSalesVsPaid")}
                  </Button>
                  <Button
                    variant={
                      chartType === "cash_vs_bank" ? "contained" : "outlined"
                    }
                    onClick={() => setChartType("cash_vs_bank")}
                  >
                    {t("chartCashVsBank")}
                  </Button>
                  <Button
                    variant={
                      chartType === "expense_vs_net" ? "contained" : "outlined"
                    }
                    onClick={() => setChartType("expense_vs_net")}
                  >
                    {t("chartExpenseVsNet")}
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
                            direction,
                            textAlign: direction === "rtl" ? "right" : "left",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) =>
                            dayjs(label).format("DD/MM/YYYY")
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="total_sales"
                          name={t("salesLegend")}
                          fill="#1976d2"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="total_paid"
                          name={t("totalPaidLabel")}
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
                            direction,
                            textAlign: direction === "rtl" ? "right" : "left",
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) =>
                            dayjs(label).format("DD/MM/YYYY")
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="total_cash"
                          name={t("cashLegend")}
                          fill="#ed6c02"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="total_bank"
                          name={t("bankLegend")}
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
                            direction,
                            textAlign: direction === "rtl" ? "right" : "left",
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
                          name={t("expensesLabel")}
                          stroke="#d32f2f"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="net"
                          name={t("netLegend")}
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
                        {t("dateColumn")}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        {t("totalSales")}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        {t("totalPaidColumn")}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        {t("totalCashColumn")}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        {t("totalBankColumn")}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        {t("totalExpensesColumn")}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 600, py: 2.5, fontSize: "1rem" }}
                      >
                        {t("netColumn")}
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
                          {t("totalRowLabel")}
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
                            {t("noDataForThisMonth")}
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
              {t("noDataAvailable")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("selectMonthYearToViewReport")}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DailyIncomeReportPage;
