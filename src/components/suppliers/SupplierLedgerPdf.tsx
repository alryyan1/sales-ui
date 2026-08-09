import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image as PdfImage,
} from "@react-pdf/renderer";
import { SupplierLedger } from "../../services/supplierPaymentService";
import { AppSettings } from "../../services/settingService";
import { formatNumber } from "@/constants";
import { format } from "date-fns";

import { getPdfFont } from "@/utils/pdfFontRegistry";
import { useTranslation } from "react-i18next";

const styles = StyleSheet.create({
  page: {
    padding: 30, // Standard A4 margin
    // fontFamily: "Amiri",
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
    alignItems: "flex-end", // Right align for Arabic
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
  metaColumn: {
    width: "48%",
    alignItems: "flex-end",
  },
  metaRow: {
    flexDirection: "row-reverse",
    marginBottom: 4,
    width: "100%",
    justifyContent: "flex-start",
  },
  metaLabel: {
    fontWeight: "bold",
    width: 80,
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
    padding: 6,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    padding: 6,
    fontSize: 9,
  },
  // Columns
  colDate: { width: "15%", textAlign: "center" },
  colType: { width: "10%", textAlign: "center" },
  colDesc: { width: "25%", textAlign: "right" },
  colDebit: { width: "12%", textAlign: "left" },
  colCredit: { width: "12%", textAlign: "left" },
  colBalance: { width: "14%", textAlign: "left" },
  colRef: { width: "12%", textAlign: "center" },

  summarySection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    width: "50%",
    borderTopWidth: 1,
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
  },
  summaryValue: {
    textAlign: "left",
    fontWeight: "bold",
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

interface SupplierLedgerPdfProps {
  ledger: SupplierLedger;
  settings?: AppSettings | null;
}

export const SupplierLedgerPdf: React.FC<SupplierLedgerPdfProps> = ({
  ledger,
  settings,
}) => {
  const { t } = useTranslation(["suppliers"]);
  const currencySymbol = settings?.currency_symbol || "OMR";

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "purchase":
        return t("suppliers:ledgerPdf.typePurchase");
      case "payment":
        return t("suppliers:ledgerPdf.typePayment");
      default:
        return type;
    }
  };

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
                {settings?.company_name || t("suppliers:ledgerPdf.defaultCompanyName")}
              </Text>
              {settings?.company_address && (
                <Text style={styles.companyDetail}>
                  {settings.company_address}
                </Text>
              )}
              {settings?.company_phone && (
                <Text style={styles.companyDetail}>
                  {t("suppliers:ledgerPdf.phoneLabelInline")}{settings.company_phone}
                </Text>
              )}
              {settings?.tax_number && (
                <Text style={styles.companyDetail}>
                  {t("suppliers:ledgerPdf.taxNumberLabelInline")}{settings.tax_number}
                </Text>
              )}
            </View>
          </View>
        )}

        <Text style={styles.title}>{t("suppliers:ledgerPdf.title")}</Text>

        {/* Supplier Meta */}
        <View style={styles.metaSection}>
          <View style={styles.metaColumn}>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{ledger.supplier.name}</Text>
              <Text style={styles.metaLabel}>{t("suppliers:ledgerPdf.supplierLabel")}</Text>
            </View>
            {ledger.supplier.phone && (
              <View style={styles.metaRow}>
                <Text style={styles.metaValue}>{ledger.supplier.phone}</Text>
                <Text style={styles.metaLabel}>{t("suppliers:ledgerPdf.phoneLabel")}</Text>
              </View>
            )}
            {ledger.supplier.email && (
              <View style={styles.metaRow}>
                <Text style={styles.metaValue}>{ledger.supplier.email}</Text>
                <Text style={styles.metaLabel}>{t("suppliers:ledgerPdf.emailLabel")}</Text>
              </View>
            )}
            {ledger.supplier.contact_person && (
              <View style={styles.metaRow}>
                <Text style={styles.metaValue}>
                  {ledger.supplier.contact_person}
                </Text>
                <Text style={styles.metaLabel}>{t("suppliers:ledgerPdf.contactPersonLabel")}</Text>
              </View>
            )}
          </View>
          <View style={styles.metaColumn}>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>
                {format(new Date(), "yyyy-MM-dd")}
              </Text>
              <Text style={styles.metaLabel}>{t("suppliers:ledgerPdf.printDateLabel")}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>{t("suppliers:ledgerPdf.colDate")}</Text>
            <Text style={styles.colType}>{t("suppliers:ledgerPdf.colType")}</Text>
            <Text style={styles.colDesc}>{t("suppliers:ledgerPdf.colDesc")}</Text>
            <Text style={styles.colDebit}>{t("suppliers:ledgerPdf.colDebit")}</Text>
            <Text style={styles.colCredit}>{t("suppliers:ledgerPdf.colCredit")}</Text>
            <Text style={styles.colBalance}>{t("suppliers:ledgerPdf.colBalance")}</Text>
            <Text style={styles.colRef}>{t("suppliers:ledgerPdf.colRef")}</Text>
          </View>
          {ledger.ledger_entries.map((entry, index) => (
            <View key={entry.id || index} style={styles.tableRow}>
              <Text style={styles.colDate}>
                {format(new Date(entry.date), "yyyy-MM-dd")}
              </Text>
              <Text style={styles.colType}>{getTypeLabel(entry.type)}</Text>
              <Text style={styles.colDesc}>{entry.description}</Text>
              <Text style={styles.colDebit}>
                {entry.debit > 0 ? `${formatNumber(entry.debit)} ${currencySymbol}` : "-"}
              </Text>
              <Text style={styles.colCredit}>
                {entry.credit > 0 ? `${formatNumber(entry.credit)} ${currencySymbol}` : "-"}
              </Text>
              <Text
                style={[
                  styles.colBalance,
                  { color: entry.balance > 0 ? "#dc2626" : "#16a34a" },
                ]}
              >
                {formatNumber(entry.balance)} {currencySymbol}
              </Text>
              <Text style={styles.colRef}>{entry.reference || "-"}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={{ flex: 1 }} />
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {formatNumber(ledger.summary.total_purchases)} {currencySymbol}
              </Text>
              <Text style={styles.summaryLabel}>{t("suppliers:ledgerPdf.totalPurchasesLabel")}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>
                {formatNumber(ledger.summary.total_payments)} {currencySymbol}
              </Text>
              <Text style={styles.summaryLabel}>{t("suppliers:ledgerPdf.totalPaymentsLabel")}</Text>
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
                    color: ledger.summary.balance > 0 ? "#dc2626" : "#16a34a",
                  },
                ]}
              >
                {formatNumber(ledger.summary.balance)} {currencySymbol}
              </Text>
              <Text style={styles.summaryLabel}>{t("suppliers:ledgerPdf.currentBalanceLabel")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{t("suppliers:ledgerPdf.footerText")}</Text>
        </View>
      </Page>
    </Document>
  );
};
