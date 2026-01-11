import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, getMonth, getYear } from "date-fns";
import { toast } from "sonner";

// MUI Components
import {
  Box,
  Button,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
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
  Download,
  FileText,
  FileSpreadsheet,
  X,
} from "lucide-react";

import apiClient from "@/lib/axios";
import { formatNumber } from "@/constants";
import { useMonthlyExpenses } from "@/hooks/useMonthlyExpenses";
import DailyExpensesTable from "@/components/reports/expenses/DailyExpensesTable";
import DayExpensesDialog from "@/components/reports/expenses/DayExpensesDialog";
import { MonthlyExpensesPdf } from "@/components/reports/expenses/MonthlyExpensesPdf";
import { PDFViewer } from "@react-pdf/renderer";
import { Expense } from "@/services/expenseService";

const MonthlyExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    getMonth(currentDate) + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    getYear(currentDate)
  );
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [selectedDayExpenses, setSelectedDayExpenses] = useState<Expense[]>([]);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  const { data: reportData, isLoading, error } = useMonthlyExpenses({
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

      const excelUrl = `${
        import.meta.env.VITE_API_BASE_URL
      }/reports/monthly-expenses-excel?${params.toString()}`;
      window.open(excelUrl, "_blank");
      toast.success("تم فتح ملف Excel في تبويب جديد");
    } catch (error: any) {
      console.error("Error exporting Excel:", error);
      toast.error("خطأ", {
        description: error?.message || "حدث خطأ أثناء تصدير ملف Excel",
      });
    }
  };

  const handleExportPdf = () => {
    if (reportData) {
      setPdfDialogOpen(true);
    }
  };

  const monthNames = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) => getYear(currentDate) - i
  );

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
                  <ArrowLeft size={18} />
                </IconButton>
                <Box>
                  <Typography
                    variant="h6"
                    component="h1"
                    sx={{ fontWeight: 600, lineHeight: 1.3 }}
                  >
                    تقرير المصروفات الشهري
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.25 }}
                  >
                    عرض وتصدير تقارير المصروفات الشهرية
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
                  تصدير Excel
                </Button>
                <Button
                  onClick={handleExportPdf}
                  variant="contained"
                  size="small"
                  startIcon={<FileText size={16} />}
                  disabled={isLoading || !reportData}
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
                  تصدير PDF
                </Button>
              </Stack>
            </Stack>

            {/* Month/Year Selectors */}
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>الشهر</InputLabel>
                <Select
                  value={selectedMonth}
                  label="الشهر"
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
                <InputLabel>السنة</InputLabel>
                <Select
                  value={selectedYear}
                  label="السنة"
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
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    إجمالي المصروفات
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
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    المصروفات النقدية
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatNumber(reportData.month_summary.cash_total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    المصروفات البنكية
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
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
              حدث خطأ أثناء تحميل البيانات
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

      {/* PDF Dialog */}
      <Dialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">تقرير المصروفات الشهري - PDF</Typography>
          <IconButton onClick={() => setPdfDialogOpen(false)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: "80vh", p: 0 }}>
          {reportData && (
            <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
              <MonthlyExpensesPdf
                year={reportData.year}
                month={reportData.month}
                monthName={reportData.month_name}
                dailyBreakdown={reportData.daily_breakdown}
                monthSummary={reportData.month_summary}
              />
            </PDFViewer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MonthlyExpensesPage;

