import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
} from "@react-pdf/renderer";
import { PDF_FONTS } from "@/utils/pdfFontRegistry";
import { formatNumber } from "@/constants";
import { Sale } from "@/services/saleService";
import { useTranslation } from "react-i18next";

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
  colId: {
    width: "10%",
    textAlign: "center",
    fontSize: 8,
    color: "#374151",
  },
  colDate: {
    width: "15%",
    textAlign: "right",
    fontSize: 8,
    color: "#374151",
  },
  colClient: {
    width: "20%",
    textAlign: "right",
    fontSize: 8,
    color: "#374151",
  },
  colTotal: {
    width: "15%",
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
  },
  colPaid: {
    width: "15%",
    textAlign: "center",
    fontSize: 9,
    color: "#059669",
  },
  colDiscount: {
    width: "15%",
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
    color: "#dc2626",
  },
  colType: {
    width: "10%",
    textAlign: "center",
    fontSize: 8,
    color: "#6b7280",
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

interface SalesWithDiscountsPdfProps {
  sales: Sale[];
  startDate: string;
  endDate: string;
  totals: {
    totalAmount: number;
    totalPaid: number;
    totalDiscount: number;
    totalDue: number;
  };
}

export const SalesWithDiscountsPdf: React.FC<SalesWithDiscountsPdfProps> = ({
  sales,
  startDate,
  endDate,
  totals,
}) => {
  const { t, i18n } = useTranslation(["reports"]);
  const dateLocale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t("reports:salesWithDiscountsPage.pdfTitle")}</Text>
            <Text style={styles.subtitle}>
              {t("reports:salesWithDiscountsPage.pdfPeriod", { start: formatDate(startDate), end: formatDate(endDate) })}
            </Text>
            <Text style={styles.subtitle}>
              {t("reports:salesWithDiscountsPage.pdfTotalCount", { count: sales.length })}
            </Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{t("reports:salesWithDiscountsPage.pdfSummaryTitle")}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("reports:salesWithDiscountsPage.pdfTotalSales")}</Text>
            <Text style={styles.summaryValue}>
              {formatNumber(totals.totalAmount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("reports:salesWithDiscountsPage.pdfTotalPaid")}</Text>
            <Text style={[styles.summaryValue, { color: "#059669" }]}>
              {formatNumber(totals.totalPaid)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("reports:salesWithDiscountsPage.pdfTotalDiscount")}</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>
              {formatNumber(totals.totalDiscount)}
            </Text>
          </View>
          <View style={styles.summaryRowLast}>
            <Text style={styles.summaryLabel}>{t("reports:salesWithDiscountsPage.pdfTotalDue")}</Text>
            <Text style={styles.summaryValue}>
              {formatNumber(totals.totalDue)}
            </Text>
          </View>
        </View>

        {/* Sales Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colType]}>{t("reports:salesWithDiscountsPage.colType")}</Text>
            <Text style={[styles.tableHeaderText, styles.colDiscount]}>
              {t("reports:salesWithDiscountsPage.colDiscount")}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colPaid]}>
              {t("reports:salesWithDiscountsPage.colPaid")}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>
              {t("reports:salesWithDiscountsPage.colTotal")}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colClient]}>
              {t("reports:salesWithDiscountsPage.colClient")}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colDate]}>{t("reports:salesWithDiscountsPage.colDate")}</Text>
            <Text style={[styles.tableHeaderText, styles.colId]}>#</Text>
          </View>

          {sales.map((sale, index) => (
            <View
              key={sale.id}
              style={[
                styles.tableRow,
                index % 2 === 1 && styles.tableRowAlternate,
              ]}
            >
              <Text style={styles.colId}>#{sale.id}</Text>
              <Text style={styles.colDate}>{formatDate(sale.sale_date)}</Text>
              <Text style={styles.colClient}>
                {sale.client_name || "-"}
              </Text>
              <Text style={styles.colTotal}>
                {formatNumber(Number(sale.total_amount))}
              </Text>
              <Text style={styles.colPaid}>
                {formatNumber(Number(sale.paid_amount))}
              </Text>
              <Text style={styles.colDiscount}>
                {formatNumber(
                  Number((sale.discount_amount as number | string | undefined) || 0)
                )}
              </Text>
              <Text style={styles.colType}>
                {(sale.discount_type as string | undefined) || "-"}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {t("reports:salesWithDiscountsPage.pdfGeneratedOn")}{" "}
          {new Date().toLocaleDateString(dateLocale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </Page>
    </Document>
  );
};

