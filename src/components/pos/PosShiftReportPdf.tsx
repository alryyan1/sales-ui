import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { OfflineSale } from "../../services/db";
import { Sale } from "../../services/saleService";
import { formatNumber } from "@/constants";

import { PDF_FONTS } from "@/utils/pdfFontRegistry";
import { AppSettings } from "../../services/settingService";

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
  infoGrid: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  infoColumn: {
    width: "45%",
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1e40af",
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
    textAlign: "right",
  },
  summaryBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 15,
  },
  summaryColumn: {
    width: "48%",
    backgroundColor: "#ffffff",
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  summaryLabel: {
    fontWeight: "bold",
    fontSize: 9,
    color: "#374151",
  },
  summaryValue: {
    fontSize: 10,
    color: "#111827",
    fontWeight: "bold",
  },
  highlightValue: {
    fontSize: 11,
    color: "#1e40af",
    fontWeight: "bold",
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  headerRow: {
    flexDirection: "row-reverse",
    backgroundColor: "#6b7280", // gray color
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  rowAlternate: {
    backgroundColor: "#f9fafb",
  },
  col1: { width: "8%", textAlign: "right", fontSize: 8, color: "#6b7280" },
  col2: { width: "18%", textAlign: "right", fontSize: 8, color: "#374151" },
  col3: { width: "24%", textAlign: "right", fontSize: 8, color: "#374151" },
  col4: { 
    width: "12%", 
    textAlign: "center", 
    fontSize: 7,
    padding: 3,
    borderRadius: 3,
  },
  col5: { width: "18%", textAlign: "left", fontSize: 9, color: "#059669", fontWeight: "bold" },
  col6: { width: "20%", textAlign: "left", fontSize: 9, color: "#1e40af", fontWeight: "bold" },
  statusSynced: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  statusPending: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  paymentMethodRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  paymentMethodRowLast: {
    borderBottomWidth: 0,
  },
  emptyState: {
    textAlign: "center",
    padding: 20,
    color: "#9ca3af",
    fontSize: 9,
    // Removed fontStyle: "italic" to avoid Arial italic font error
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
  totalRow: {
    flexDirection: "row-reverse",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 2,
    backgroundColor: "#f9fafb",
    borderTopWidth: 2,
    borderTopColor: "#1e40af",
  },
  totalLabel: {
    color: "#111827",
    fontWeight: "bold",
    fontSize: 10,
  },
  totalValue: {
    color: "#1e40af",
    fontWeight: "bold",
    fontSize: 11,
  },
});

interface PosShiftReportPdfProps {
  sales: OfflineSale[] | Sale[];
  shift: {
    id: number;
    opened_at: string | null;
    closed_at: string | null;
    is_open: boolean;
  } | null;
  userName?: string;
  settings?: AppSettings | null;
}

export const PosShiftReportPdf: React.FC<PosShiftReportPdfProps> = ({
  sales,
  shift,
  userName,
  settings,
}) => {
  const currencySymbol = settings?.currency_symbol || "SDG";
  const formatDate = (dateStr: string | number | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-US");
  };

  // Helper function to check if sale is OfflineSale
  const isOfflineSale = (sale: OfflineSale | Sale): sale is OfflineSale => {
    return 'tempId' in sale || 'offline_created_at' in sale || 'is_synced' in sale;
  };

  // Calculations
  const totalSalesCount = sales.length;
  const totalRevenue = sales.reduce(
    (sum, s) => sum + Number(s.total_amount || 0),
    0
  );
  const totalPaid = sales.reduce(
    (sum, s) => sum + Number(s.paid_amount || 0),
    0
  );
  const totalDue = Math.max(0, totalRevenue - totalPaid);

  // Payment Breakdown
  const paymentMethods: Record<string, number> = {};
  sales.forEach((sale) => {
    (sale.payments || []).forEach((p) => {
      const method = p.method || "cash";
      paymentMethods[method] = (paymentMethods[method] || 0) + Number(p.amount);
    });
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Professional Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>تقرير الوردية</Text>
            <Text style={styles.subtitle}>
              Shift Report - {settings?.company_name || "Sales System"}
            </Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <Text style={styles.subtitle}>
                <Text style={{ fontWeight: "bold" }}>رقم الوردية:</Text> #{shift?.id || "غير محدد"}
              </Text>
            
              <Text style={styles.subtitle}>
                <Text style={{ fontWeight: "bold" }}>تاريخ الفتح:</Text> {formatDate(shift?.opened_at || null)}
              </Text>
            </View>
            <View style={styles.infoColumn}>
              {shift?.closed_at && (
                <Text style={styles.subtitle}>
                  <Text style={{ fontWeight: "bold" }}>تاريخ الإغلاق:</Text> {formatDate(shift.closed_at)}
                </Text>
              )}
              {userName && (
                <Text style={styles.subtitle}>
                  <Text style={{ fontWeight: "bold" }}>المستخدم:</Text> {userName}
                </Text>
              )}
              <Text style={styles.subtitle}>
                <Text style={{ fontWeight: "bold" }}>تاريخ التقرير:</Text> {new Date().toLocaleDateString("ar-EG")}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملخص المبيعات - Sales Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryColumn}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>عدد الفواتير:</Text>
                <Text style={styles.highlightValue}>{totalSalesCount}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabel}>إجمالي المبيعات:</Text>
                <Text style={styles.highlightValue}>
                  {formatNumber(totalRevenue)} {currencySymbol}
                </Text>
              </View>
            </View>
            <View style={styles.summaryColumn}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>إجمالي المدفوع:</Text>
                <Text style={[styles.highlightValue, { color: "#059669" }]}>
                  {formatNumber(totalPaid)} {currencySymbol}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabel}>المستحق (الآجل):</Text>
                <Text style={[styles.highlightValue, { color: totalDue > 0 ? "#dc2626" : "#059669" }]}>
                  {formatNumber(totalDue)} {currencySymbol}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payments Section */}
        {Object.entries(paymentMethods).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تفاصيل المدفوعات - Payment Methods</Text>
            <View style={styles.summaryBox}>
              {Object.entries(paymentMethods).map(([method, amount], index, array) => (
                <View 
                  key={method} 
                  style={[
                    styles.paymentMethodRow,
                    index === array.length - 1 ? styles.paymentMethodRowLast : {}
                  ]}
                >
                  <Text style={styles.summaryLabel}>
                    {method === "cash"
                      ? "نقدي - Cash"
                      : method === "card"
                      ? "شبكة - Card"
                      : method}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatNumber(amount)} {currencySymbol}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sales Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>قائمة الفواتير - Sales List</Text>
          
          {sales.length > 0 ? (
            <View style={styles.tableContainer}>
              <View style={styles.headerRow}>
                <Text style={[styles.col1, styles.headerText]}>#</Text>
                <Text style={[styles.col2, styles.headerText]}>التوقيت</Text>
                <Text style={[styles.col3, styles.headerText]}>العميل</Text>
                <Text style={[styles.col4, styles.headerText]}>الحالة</Text>
                <Text style={[styles.col6, styles.headerText]}>الإجمالي</Text>
                <Text style={[styles.col5, styles.headerText]}>المدفوع</Text>
              </View>

              {sales.map((sale, i) => {
                const saleId = isOfflineSale(sale) ? (sale.id || sale.tempId) : sale.id;
                const saleDate = isOfflineSale(sale) 
                  ? sale.offline_created_at 
                  : (sale.created_at ? new Date(sale.created_at).getTime() : Date.now());
                const isSynced = isOfflineSale(sale) ? sale.is_synced : true;
                
                return (
                  <View 
                    key={i} 
                    style={[styles.row, i % 2 === 1 ? styles.rowAlternate : {}]}
                  >
                    <Text style={styles.col1}>
                      {String(saleId).substring(0, 8)}
                    </Text>
                    <Text style={styles.col2}>
                      {new Date(saleDate).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text style={styles.col3}>{sale.client_name || "عميل عام"}</Text>
                    <View style={[styles.col4, isSynced ? styles.statusSynced : styles.statusPending]}>
                      <Text style={{ fontSize: 7 }}>
                        {isSynced ? "✓ متزامن" : "⏳ معلق"}
                      </Text>
                    </View>
                    <Text style={styles.col5}>
                      {formatNumber(Number(sale.total_amount))} {currencySymbol}
                    </Text>
                    <Text style={styles.col6}>
                      {formatNumber(Number(sale.paid_amount))} {currencySymbol}
                    </Text>
                  </View>
                );
              })}
              
              {/* Total Row */}
              <View >
                {/* <Text style={[styles.col1, styles.totalLabel]}>{totalSalesCount}</Text> */}
                <Text style={[styles.col5, styles.totalLabel]}>المجموع الكلي:</Text>
                <Text style={[styles.col6, styles.totalValue]}>
                  {formatNumber(totalRevenue)} {currencySymbol}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.summaryBox}>
              <Text style={styles.emptyState}>
                لا توجد مبيعات في هذه الوردية
              </Text>
            </View>
          )}
        </View>

        {/* Professional Footer */}
        <View style={styles.footer}>
          <Text>
            تم استخراج التقرير بتاريخ {new Date().toLocaleString("en-US")} | 
            Report Generated: {new Date().toLocaleString("en-US")}
          </Text>
          {settings?.company_name && (
            <Text style={{ marginTop: 4 }}>
              {settings.company_name}
              {settings.company_address && ` - ${settings.company_address}`}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};
