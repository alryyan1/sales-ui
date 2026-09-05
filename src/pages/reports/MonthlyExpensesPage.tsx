// src/pages/reports/MonthlyExpensesPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, getMonth, getYear } from "date-fns";
import { arSA, enUS as enUSLocale } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  ConfigProvider,
  Flex,
  Select,
  Space,
  Typography,
} from "antd";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import { getAntdThemeConfig } from "@/lib/antdTheme";
import {
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { formatNumber, webUrl } from "@/constants";
import { useMonthlyExpenses } from "@/hooks/useMonthlyExpenses";
import DailyExpensesTable from "@/components/reports/expenses/DailyExpensesTable";
import DayExpensesDialog from "@/components/reports/expenses/DayExpensesDialog";
import { exportMonthlyExpensesPdf } from "@/services/exportService";
import { Expense } from "@/services/expenseService";

const { Title, Text } = Typography;

const MonthlyExpensesPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(currentDate) + 1);
  const [selectedYear, setSelectedYear] = useState<number>(getYear(currentDate));
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [selectedDayExpenses, setSelectedDayExpenses] = useState<Expense[]>([]);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const {
    data: reportData,
    isLoading,
    error,
  } = useMonthlyExpenses({ year: selectedYear, month: selectedMonth });

  const handleDayClick = (date: string, expenses: Expense[]) => {
    setSelectedDayDate(date);
    setSelectedDayExpenses(expenses);
    setDayDialogOpen(true);
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams();
    params.append("month", String(selectedMonth));
    params.append("year", String(selectedYear));
    window.open(`${webUrl}/reports/monthly-expenses-excel?${params.toString()}`, "_blank");
    toast.success(t("excelOpenedNewTab"));
  };

  const handleExportPdf = async () => {
    setIsPdfLoading(true);
    try {
      await exportMonthlyExpensesPdf(selectedYear, selectedMonth);
    } catch (err) {
      toast.error(tCommon("error"), {
        description: err instanceof Error ? err.message : t("errorExportingPdfDefault"),
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: format(new Date(2000, i, 1), "MMMM", {
          locale: language === "ar" ? arSA : enUSLocale,
        }),
      })),
    [language]
  );

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => getYear(currentDate) - i).map((year) => ({
        value: year,
        label: String(year),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <ConfigProvider
      direction={direction}
      locale={language === "ar" ? arEG : enUS}
      theme={getAntdThemeConfig(resolvedTheme)}
    >
      <AntApp>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <Flex align="center" justify="space-between" gap={12} wrap>
            <Flex align="center" gap={12}>
              <Button
                type="text"
                icon={direction === "rtl" ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                onClick={() => navigate("/dashboard")}
              />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {t("monthlyExpensesReportTitle")}
                </Title>
                <Text type="secondary">{t("monthlyExpensesReportSubtitle")}</Text>
              </div>
            </Flex>
            <Space wrap>
              <Button
                icon={<FileSpreadsheet size={16} />}
                disabled={isLoading || !reportData}
                onClick={handleExportExcel}
              >
                {t("exportExcelButton")}
              </Button>
              <Button
                type="primary"
                icon={isPdfLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                disabled={isLoading || !reportData || isPdfLoading}
                onClick={handleExportPdf}
              >
                {t("exportPdf")}
              </Button>
            </Space>
          </Flex>

          {/* Filters */}
          <Card size="small">
            <Flex gap={12} wrap align="center">
              <Select
                style={{ width: 160 }}
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={monthOptions}
              />
              <Select
                style={{ width: 120 }}
                value={selectedYear}
                onChange={setSelectedYear}
                options={yearOptions}
              />
            </Flex>
          </Card>

          {/* Summary */}
          {reportData && (
            <Flex gap={12} wrap>
              <Card size="small" style={{ flex: "1 1 220px" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("totalExpensesColumn")}
                </Text>
                <div>
                  <Text strong style={{ fontSize: 20 }}>
                    {formatNumber(reportData.month_summary.total)}
                  </Text>
                </div>
              </Card>
              <Card size="small" style={{ flex: "1 1 220px" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("cashExpensesLabel")}
                </Text>
                <div>
                  <Text strong style={{ fontSize: 20, color: "#16a34a" }}>
                    {formatNumber(reportData.month_summary.cash_total)}
                  </Text>
                </div>
              </Card>
              <Card size="small" style={{ flex: "1 1 220px" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("bankExpensesLabel")}
                </Text>
                <div>
                  <Text strong style={{ fontSize: 20, color: "#2563eb" }}>
                    {formatNumber(reportData.month_summary.bank_total)}
                  </Text>
                </div>
              </Card>
            </Flex>
          )}

          {/* Error */}
          {error && <Alert type="error" showIcon message={t("errorLoadingDataGeneric")} />}

          {/* Daily table */}
          <Card size="small" styles={{ body: { padding: 0 } }}>
            <DailyExpensesTable
              dailyBreakdown={reportData?.daily_breakdown ?? []}
              loading={isLoading}
              onDayClick={handleDayClick}
            />
          </Card>
        </div>

        {/* Day expenses dialog */}
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
      </AntApp>
    </ConfigProvider>
  );
};

export default MonthlyExpensesPage;
