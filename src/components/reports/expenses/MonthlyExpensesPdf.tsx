import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
} from "@react-pdf/renderer";
import { format, parseISO } from "date-fns";
import { PDF_FONTS } from "@/utils/pdfFontRegistry";
import { formatNumber } from "@/constants";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: PDF_FONTS.ARIAL,
    fontSize: 9,
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1e40af",
    borderBottomStyle: "solid",
  },
  headerContent: {
    textAlign: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 9,
    color: "#4b5563",
    marginBottom: 4,
    lineHeight: 1.5,
  },
  summarySection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1e40af",
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
  },
  tableContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#6b7280",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#ffffff",
  },
  tableRowAlternate: {
    backgroundColor: "#f9fafb",
  },
  colDate: {
    width: "25%",
    textAlign: "right",
    fontSize: 8,
    color: "#374151",
  },
  colTotal: {
    width: "25%",
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
  },
  colCash: {
    width: "25%",
    textAlign: "center",
    fontSize: 9,
    color: "#059669",
  },
  colBank: {
    width: "25%",
    textAlign: "center",
    fontSize: 9,
    color: "#1e40af",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 7,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
});

interface DailyExpenseEntry {
  date: string;
  total: number;
  cash_total: number;
  bank_total: number;
  expenses: any[];
}

interface MonthlyExpensesPdfProps {
  year: number;
  month: number;
  monthName: string;
  dailyBreakdown: DailyExpenseEntry[];
  monthSummary: {
    total: number;
    cash_total: number;
    bank_total: number;
  };
}

export const MonthlyExpensesPdf: React.FC<MonthlyExpensesPdfProps> = ({
  year,
  month,
  monthName,
  dailyBreakdown,
  monthSummary,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>تقرير المصروفات الشهري</Text>
            <Text style={styles.subtitle}>
              {monthName} {year}
            </Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>ملخص الشهر</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>إجمالي المصروفات:</Text>
            <Text style={styles.summaryValue}>
              {formatNumber(monthSummary.total)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>المصروفات النقدية:</Text>
            <Text style={[styles.summaryValue, { color: "#059669" }]}>
              {formatNumber(monthSummary.cash_total)}
            </Text>
          </View>
          <View style={styles.summaryRowLast}>
            <Text style={styles.summaryLabel}>المصروفات البنكية:</Text>
            <Text style={[styles.summaryValue, { color: "#1e40af" }]}>
              {formatNumber(monthSummary.bank_total)}
            </Text>
          </View>
        </View>

        {/* Daily Breakdown Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDate]}>التاريخ</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>
              الإجمالي
            </Text>
            <Text style={[styles.tableHeaderText, styles.colCash]}>نقدي</Text>
            <Text style={[styles.tableHeaderText, styles.colBank]}>بنكي</Text>
          </View>

          {dailyBreakdown.map((day, index) => {
            const formattedDate = format(parseISO(day.date), "yyyy-MM-dd");
            return (
              <View
                key={day.date}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.tableRowAlternate,
                ]}
              >
                <Text style={styles.colDate}>{formattedDate}</Text>
                <Text style={styles.colTotal}>
                  {formatNumber(day.total)}
                </Text>
                <Text style={styles.colCash}>
                  {formatNumber(day.cash_total)}
                </Text>
                <Text style={styles.colBank}>
                  {formatNumber(day.bank_total)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          تم إنشاء التقرير في {format(new Date(), "yyyy-MM-dd HH:mm")}
        </Text>
      </Page>
    </Document>
  );
};

