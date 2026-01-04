import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image as PdfImage,
} from "@react-pdf/renderer";
import { Purchase, PurchaseItem } from "../../services/purchaseService";
import { AppSettings } from "../../services/settingService";
import { formatNumber } from "@/constants";

import { getPdfFont } from "@/utils/pdfFontRegistry";

const styles = StyleSheet.create({
  page: {
    padding: 30, // Standard A4 margin
    // fontFamily: "Amiri",
    fontSize: 12,
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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1a1a1a",
  },
  companyDetail: {
    fontSize: 10,
    color: "#555",
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    textDecoration: "underline",
    color: "#333",
  },
  metaSection: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 4,
  },
  metaColumn: {
    width: "48%",
    alignItems: "flex-end", // Right align
  },
  metaRow: {
    flexDirection: "row-reverse",
    marginBottom: 5,
    width: "100%",
    justifyContent: "flex-start",
  },
  metaLabel: {
    fontWeight: "bold",
    width: 80,
    textAlign: "right",
    marginLeft: 10,
    fontSize: 10,
    color: "#666",
  },
  metaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
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
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    padding: 8,
    fontSize: 10,
  },
  colSeq: { width: "5%", textAlign: "center" },
  colProduct: { width: "45%", textAlign: "right" },
  colQty: { width: "15%", textAlign: "center" },
  colCost: { width: "15%", textAlign: "left" },
  colTotal: { width: "20%", textAlign: "left" },

  summarySection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    width: "40%",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 5,
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
  grandTotal: {
    fontSize: 14,
    color: "#2563eb",
    borderTopWidth: 2,
    borderTopColor: "#bfdbfe",
    marginTop: 5,
    paddingTop: 5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 9,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 10,
  },
});

interface PurchasePdfProps {
  purchase: Purchase;
  items: PurchaseItem[]; // Pass separate items array if pagination/filtering is involved, otherwise use purchase.items
  settings?: AppSettings | null;
}

export const PurchasePdf: React.FC<PurchasePdfProps> = ({
  purchase,
  items,
  settings,
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-EG");
  };

  // Calculate totals from the passed items (which might be the full list or filtered)
  // Usually for PDF we want ALL items.
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalCost = items.reduce(
    (acc, item) => acc + item.quantity * Number(item.unit_cost),
    0
  );
  const currencySymbol = settings?.currency_symbol || "SDG";

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

        <Text style={styles.title}>طلب مشتريات / Purchase Order</Text>

        <View style={styles.metaSection}>
          <View style={styles.metaColumn}>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>
                {purchase.supplier_name || "—"}
              </Text>
              <Text style={styles.metaLabel}>المورد:</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>
                {purchase.status === "received"
                  ? "مستلم"
                  : purchase.status === "ordered"
                  ? "تم الطلب"
                  : "قيد الانتظار"}
              </Text>
              <Text style={styles.metaLabel}>الحالة:</Text>
            </View>
          </View>

          <View style={styles.metaColumn}>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>#{purchase.id}</Text>
              <Text style={styles.metaLabel}>رقم الطلب:</Text>
            </View>
            {purchase.reference_number && (
              <View style={styles.metaRow}>
                <Text style={styles.metaValue}>
                  {purchase.reference_number}
                </Text>
                <Text style={styles.metaLabel}>المرجع:</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>
                {formatDate(purchase.purchase_date)}
              </Text>
              <Text style={styles.metaLabel}>التاريخ:</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colSeq}>#</Text>
            <Text style={styles.colProduct}>المنتج</Text>
            <Text style={styles.colQty}>الكمية</Text>
            <Text style={styles.colCost}>التكلفة</Text>
            <Text style={styles.colTotal}>الإجمالي</Text>
          </View>

          {items.map((item, index) => {
            const rowTotal = Number(item.unit_cost) * item.quantity;
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colSeq}>{index + 1}</Text>
                <Text style={styles.colProduct}>
                  {item.product_name || `Product ${item.product_id}`}
                </Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colCost}>
                  {formatNumber(Number(item.unit_cost))} {currencySymbol}
                </Text>
                <Text style={styles.colTotal}>{formatNumber(rowTotal)} {currencySymbol}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={{ flex: 1 }} />
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{totalQuantity}</Text>
              <Text style={styles.summaryLabel}>إجمالي الأصناف:</Text>
            </View>
            <View style={[styles.summaryRow, styles.grandTotal]}>
              <Text style={styles.summaryValue}>{formatNumber(totalCost)} {currencySymbol}</Text>
              <Text style={styles.summaryLabel}>إجمالي التكلفة:</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>نسخة إلكترونية - تم إصدارها بواسطة النظام</Text>
        </View>
      </Page>
    </Document>
  );
};
