import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image as PdfImage,
} from "@react-pdf/renderer";
import { SupplierSummary } from "@/services/supplierService";
import { AppSettings } from "@/services/settingService";
import { formatNumber } from "@/constants";
import { format } from "date-fns";
import { getPdfFont } from "@/utils/pdfFontRegistry";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    flexDirection: "column",
  },
  header: {
    marginBottom: 20,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 20,
  },
  companyInfo: {
    alignItems: "flex-end",
    width: "60%",
  },
  logoContainer: {
    width: "30%",
    alignItems: "flex-start",
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1a1a1a",
  },
  companyDetail: {
    fontSize: 9,
    color: "#555",
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    textDecoration: "underline",
    color: "#333",
  },
  metaSection: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 15,
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: "row-reverse",
    marginBottom: 4,
    width: "100%",
    justifyContent: "flex-start",
  },
  metaLabel: {
    fontWeight: "bold",
    width: 100,
    textAlign: "right",
    marginLeft: 10,
    fontSize: 9,
    color: "#666",
  },
  metaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 10,
  },
  table: {
    width: "100%",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    padding: 8,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    padding: 8,
    fontSize: 9,
  },
  colName: { width: "35%", textAlign: "right" },
  colDebit: { width: "20%", textAlign: "left" },
  colCredit: { width: "20%", textAlign: "left" },
  colBalance: { width: "25%", textAlign: "left" },
  summarySection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    width: "50%",
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    textAlign: "right",
    fontWeight: "bold",
    color: "#4b5563",
    fontSize: 10,
  },
  summaryValue: {
    textAlign: "left",
    fontWeight: "bold",
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 10,
  },
});

interface SupplierSummaryLedgerPdfProps {
  suppliers: SupplierSummary[];
  settings?: AppSettings | null;
}

const currencySymbol = "SDG";

export const SupplierSummaryLedgerPdf: React.FC<
  SupplierSummaryLedgerPdfProps
> = ({ suppliers, settings }) => {
  const totals = suppliers.reduce(
    (acc, supplier) => ({
      totalDebit: acc.totalDebit + supplier.total_debit,
      totalCredit: acc.totalCredit + supplier.total_credit,
      totalBalance: acc.totalBalance + supplier.balance,
    }),
    { totalDebit: 0, totalCredit: 0, totalBalance: 0 }
  );

  return (
    <Document>
      <Page
        size="A4"
        style={[styles.page, { fontFamily: getPdfFont(settings) }]}
      >
        {/* Header */}
        {settings?.invoice_branding_type === "header" &&
        settings?.company_header_url ? (
          <View style={{ marginBottom: 20 }}>
            <PdfImage
              src={settings.company_header_url}
              style={{ width: "100%", height: 100, objectFit: "cover" }}
            />
          </View>
        ) : (
          <View
            style={[
              styles.header,
              {
                flexDirection:
                  settings?.logo_position === "left"
                    ? ("row" as const)
                    : ("row-reverse" as const),
              },
            ]}
          >
            <View style={styles.logoContainer}>
              {settings?.company_logo_url ? (
                <PdfImage
                  src={settings.company_logo_url}
                  style={[
                    styles.logo,
                    {
                      width: settings.logo_width || 60,
                      height: settings.logo_height || 60,
                    },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>
                {settings?.company_name || "اسم الشركة"}
              </Text>
              {settings?.company_address && (
                <Text style={styles.companyDetail}>
                  {settings.company_address}
                </Text>
              )}
              {settings?.company_phone && (
                <Text style={styles.companyDetail}>
                  هاتف: {settings.company_phone}
                </Text>
              )}
              {settings?.tax_number && (
                <Text style={styles.companyDetail}>
                  الرقم الضريبي: {settings.tax_number}
                </Text>
              )}
            </View>
          </View>
        )}

        <Text style={styles.title}>
          ملخص كشف حساب الموردين / Suppliers Summary Ledger
        </Text>

        {/* Meta */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaValue}>
              {format(new Date(), "yyyy-MM-dd")}
            </Text>
            <Text style={styles.metaLabel}>تاريخ الطباعة:</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaValue}>{suppliers.length}</Text>
            <Text style={styles.metaLabel}>عدد الموردين:</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colBalance}>الرصيد</Text>
            <Text style={styles.colCredit}>إجمالي الدائن</Text>
            <Text style={styles.colDebit}>إجمالي المدين</Text>
            <Text style={styles.colName}>اسم المورد</Text>
          </View>
          {suppliers.map((supplier, index) => (
            <View key={supplier.id || index} style={styles.tableRow}>
              <Text
                style={[
                  styles.colBalance,
                  {
                    color: supplier.balance > 0 ? "#dc2626" : "#16a34a",
                    fontWeight: supplier.balance !== 0 ? "bold" : "normal",
                  },
                ]}
              >
                {formatNumber(supplier.balance)} {currencySymbol}
              </Text>
              <Text style={styles.colCredit}>
                {formatNumber(supplier.total_credit)} {currencySymbol}
              </Text>
              <Text style={styles.colDebit}>
                {formatNumber(supplier.total_debit)} {currencySymbol}
              </Text>
              <Text style={styles.colName}>{supplier.name}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={{ flex: 1 }} />
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {formatNumber(totals.totalDebit)} {currencySymbol}
              </Text>
              <Text style={styles.summaryLabel}>إجمالي المدين:</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {formatNumber(totals.totalCredit)} {currencySymbol}
              </Text>
              <Text style={styles.summaryLabel}>إجمالي الدائن:</Text>
            </View>
            <View
              style={[
                styles.summaryRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: "#eee",
                  marginTop: 4,
                  paddingTop: 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.summaryValue,
                  {
                    fontSize: 12,
                    color: totals.totalBalance > 0 ? "#dc2626" : "#16a34a",
                  },
                ]}
              >
                {formatNumber(totals.totalBalance)} {currencySymbol}
              </Text>
              <Text style={styles.summaryLabel}>إجمالي الرصيد:</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>نسخة إلكترونية - تم إصدارها بواسطة النظام</Text>
        </View>
      </Page>
    </Document>
  );
};

