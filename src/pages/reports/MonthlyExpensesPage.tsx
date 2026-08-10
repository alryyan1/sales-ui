import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, getMonth, getYear } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";

// MUI Components
import {
  Box,
  Button,
  Typography,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  Grid,
} from "@mui/material";

// Lucide Icons
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

import apiClient from "@/lib/axios";
import { formatNumber } from "@/constants";
import { useMonthlyExpenses } from "@/hooks/useMonthlyExpenses";
import DailyExpensesTable from "@/components/reports/expenses/DailyExpensesTable";
import DayExpensesDialog from "@/components/reports/expenses/DayExpensesDialog";
import { exportMonthlyExpensesPdf } from "@/services/exportService";
import { Expense } from "@/services/expenseService";
import { webUrl } from "@/constants";

const MonthlyExpensesPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    getMonth(currentDate) + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    getYear(currentDate),
  );
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [selectedDayExpenses, setSelectedDayExpenses] = useState<Expense[]>([]);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const {
    data: reportData,
    isLoading,
    error,
  } = useMonthlyExpenses({
    year: selectedYear,
    month: selectedMonth,
  });

  const handleDayClick = (date: string, expenses: Expense[]) => {
    setSelectedDayDate(date);
    setSelectedDayExpenses(expenses);
    setDayDialogOpen(true);
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      params.append("month", String(selectedMonth));
      params.append("year", String(selectedYear));

      const excelUrl = `${webUrl}/reports/monthly-expenses-excel?${params.toString()}`;
      window.open(excelUrl, "_blank");
      toast.success(t("excelOpenedNewTab"));
    } catch (error: any) {
      console.error("Error exporting Excel:", error);
      toast.error(tCommon("error"), {
        description: error?.message || t("errorExportingExcelDefault"),
      });
    }
  };

  const handleExportPdf = async () => {
    setIsPdfLoading(true);
    try {
      await exportMonthlyExpensesPdf(selectedYear, selectedMonth);
    } catch (error: any) {
      toast.error(tCommon("error"), {
        description: error?.message || t("errorExportingPdfDefault"),
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    format(new Date(2000, i, 1), "MMMM", {
      locale: language === "ar" ? arSA : enUS,
    }),
  );

  const years = Array.from({ length: 10 }, (_, i) => getYear(currentDate) - i);

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
        <Box sx={{ maxWidth: "100%", px: { xs: 2, sm: 3, lg: 4 }, py: 2.5 }}>
          <Stack direction="column" spacing={3}>
            {/* Top Bar: Title & Actions */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={2}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton
                  onClick={() => navigate("/dashboard")}
                  size="small"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    transition: "all 0.15s ease",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  {direction === "rtl" ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                </IconButton>
                <Box>
                  <Typography
                    variant="h6"
                    component="h1"
                    sx={{ fontWeight: 600, lineHeight: 1.3 }}
                  >
                    {t("monthlyExpensesReportTitle")}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.25 }}
                  >
                    {t("monthlyExpensesReportSubtitle")}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" gap={1} spacing={2}>
                <Button
                  onClick={handleExportExcel}
                  variant="outlined"
                  size="small"
                  startIcon={<FileSpreadsheet size={16} />}
                  disabled={isLoading || !reportData}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    px: 2.5,
                    py: 1,
                    fontWeight: 500,
                  }}
                >
                  {t("exportExcelButton")}
                </Button>
                <Button
                  onClick={handleExportPdf}
                  variant="contained"
                  size="small"
                  startIcon={
                    isPdfLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <FileText size={16} />
                    )
                  }
                  disabled={isLoading || !reportData || isPdfLoading}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    px: 2.5,
                    py: 1,
                    fontWeight: 500,
                    boxShadow: "none",
                    "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" },
                  }}
                >
                  {t("exportPdf")}
                </Button>
              </Stack>
            </Stack>

            {/* Month/Year Selectors */}
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>{t("monthLabel")}</InputLabel>
                <Select
                  value={selectedMonth}
                  label={t("monthLabel")}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {monthNames.map((name, index) => (
                    <MenuItem key={index + 1} value={index + 1}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>{t("yearLabel")}</InputLabel>
                <Select
                  value={selectedYear}
                  label={t("yearLabel")}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: "1400px",
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
          py: 3,
        }}
      >
        {/* Summary Cards */}
        {reportData && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("totalExpensesColumn")}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatNumber(reportData.month_summary.total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("cashExpensesLabel")}
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {formatNumber(reportData.month_summary.cash_total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t("bankExpensesLabel")}
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {formatNumber(reportData.month_summary.bank_total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="error">
              {t("errorLoadingDataGeneric")}
            </Typography>
          </Box>
        )}

        {/* Daily Expenses Table */}
        {reportData && !isLoading && (
          <DailyExpensesTable
            dailyBreakdown={reportData.daily_breakdown}
            onDayClick={handleDayClick}
          />
        )}
      </Box>

      {/* Day Expenses Dialog */}
      <DayExpensesDialog
        open={dayDialogOpen}
        onClose={() => {
          setDayDialogOpen(false);
          setSelectedDayDate(null);
          setSelectedDayExpenses([]);
        }}
        date={selectedDayDate}
        expenses={selectedDayExpenses}
      />
    </Box>
  );
};

export default MonthlyExpensesPage;
