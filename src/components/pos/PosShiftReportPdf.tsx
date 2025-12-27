import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { OfflineSale } from "../../services/db";
import { formatNumber } from "@/constants";

import { getPdfFont } from "@/utils/pdfFontRegistry";
import { AppSettings } from "../../services/settingService";

const styles = StyleSheet.create({
  page: {
    padding: 20,
    // fontFamily: "Amiri",
    fontSize: 10,
    flexDirection: "column",
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: "#555",
    marginBottom: 2,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    backgroundColor: "#f3f4f6",
    padding: 5,
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 5,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row-reverse",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 5,
    fontWeight: "bold",
  },
  col1: { width: "10%", textAlign: "right" }, // ID
  col2: { width: "20%", textAlign: "right" }, // Date
  col3: { width: "25%", textAlign: "right" }, // Client
  col4: { width: "15%", textAlign: "center" }, // Status
  col5: { width: "15%", textAlign: "center" }, // Payment
  col6: { width: "15%", textAlign: "left" }, // Total

  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  summaryLabel: {
    fontWeight: "bold",
  },
  summaryValue: {},
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

interface PosShiftReportPdfProps {
  sales: OfflineSale[];
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
  const formatDate = (dateStr: string | number | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ar-EG");
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
      <Page
        size="A4"
        style={[styles.page, { fontFamily: getPdfFont(settings) }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>تقرير الوردية</Text>
          <Text style={styles.subtitle}>
            رقم الوردية: #{shift?.id || "غير محدد"}
          </Text>
          <Text style={styles.subtitle}>
            الحالة: {shift?.is_open ? "مفتوحة" : "مغلقة"}
          </Text>
          <Text style={styles.subtitle}>
            تاريخ الفتح: {formatDate(shift?.opened_at || null)}
          </Text>
          {shift?.closed_at && (
            <Text style={styles.subtitle}>
              تاريخ الإغلاق: {formatDate(shift.closed_at)}
            </Text>
          )}
          {userName && (
            <Text style={styles.subtitle}>المستخدم: {userName}</Text>
          )}
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملخص المبيعات</Text>
          <View
            style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}
          >
            <View style={{ width: "45%" }}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>عدد الفواتير:</Text>
                <Text style={styles.summaryValue}>{totalSalesCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>إجمالي المبيعات:</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(totalRevenue)}
                </Text>
              </View>
            </View>
            <View style={{ width: "45%" }}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>إجمالي المدفوع:</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(totalPaid)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>المستحق (الآجل):</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(totalDue)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل المدفوعات</Text>
          {Object.entries(paymentMethods).length > 0 ? (
            Object.entries(paymentMethods).map(([method, amount]) => (
              <View key={method} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {method === "cash"
                    ? "نقدي"
                    : method === "card"
                    ? "شبكة"
                    : method}
                  :
                </Text>
                <Text style={styles.summaryValue}>{formatNumber(amount)}</Text>
              </View>
            ))
          ) : (
            <Text style={{ textAlign: "center", color: "#777" }}>
              لا توجد مدفوعات
            </Text>
          )}
        </View>

        {/* Sales Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>قائمة الفواتير</Text>

          <View style={styles.headerRow}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>التوقيت</Text>
            <Text style={styles.col3}>العميل</Text>
            <Text style={styles.col4}>الحالة</Text>
            <Text style={styles.col5}>المدفوع</Text>
            <Text style={styles.col6}>الإجمالي</Text>
          </View>

          {sales.map((sale, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.col1}>
                {String(sale.id || sale.tempId).substring(0, 8)}
              </Text>
              <Text style={styles.col2}>
                {new Date(sale.offline_created_at).toLocaleTimeString("ar-EG")}
              </Text>
              <Text style={styles.col3}>{sale.client_name || "عميل عام"}</Text>
              <Text style={styles.col4}>
                {sale.is_synced ? "متزامن" : "معلق"}
              </Text>
              <Text style={styles.col5}>
                {formatNumber(Number(sale.paid_amount))}
              </Text>
              <Text style={styles.col6}>
                {formatNumber(Number(sale.total_amount))}
              </Text>
            </View>
          ))}
          {sales.length === 0 && (
            <Text style={{ textAlign: "center", padding: 10, color: "#777" }}>
              لا توجد مبيعات في هذه الوردية
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            تم استخراج التقرير بتاريخ {new Date().toLocaleString("ar-EG")}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
