import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
  Image as PdfImage,
} from "@react-pdf/renderer";
import { OfflineSale, OfflineSaleItem } from "../../services/db";
import { AppSettings } from "../../services/settingService";
import { formatNumber } from "@/constants";

// Register Arabic Font
Font.register({
  family: "Amiri",
  fonts: [
    { src: "/fonts/Amiri-Regular.ttf" },
    {
      src: "/fonts/Amiri-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30, // Standard A4 margin
    fontFamily: "Amiri",
    fontSize: 12,
  },
  header: {
    marginBottom: 20,
    flexDirection: "row-reverse", // Logo left, text right (in RTL context visually opposite)
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
  invoiceTitle: {
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
  colPrice: { width: "15%", textAlign: "left" }, // LTR numbers
  colTotal: { width: "20%", textAlign: "left" }, // LTR numbers

  summarySection: {
    marginTop: 20,
    flexDirection: "row", // Standard row for LTR alignment of summary box? No, keep it RTL
    justifyContent: "flex-end", // Move summary to left (visually left in RTL means flex-start? no flex-end is right side)
    // In RTL PDF: flex-start is Right, flex-end is Left.
    // We want summary on the LEFT (standard invoice) or RIGHT?
    // Arabic invoices usually have totals on the Left or Right? Let's put it on the Left (visually).
    // So justifyContent: 'flex-end'
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
    color: "#2563eb", // Primary blue
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

interface OfflineInvoiceA4PdfProps {
  sale: OfflineSale;
  items: OfflineSaleItem[];
  userName?: string;
  settings?: AppSettings | null;
}

export const OfflineInvoiceA4Pdf: React.FC<OfflineInvoiceA4PdfProps> = ({
  sale,
  items,
  userName,
  settings,
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ar-EG");
  };

  // Calculate totals
  const subtotal = items.reduce((acc, item) => {
    const price = Number(item.unit_price);
    const qty = item.quantity;
    const total = price * qty;
    return acc + total;
  }, 0);

  const discountAmount = Number(sale.discount_amount || 0);
  const totalAmount = Number(sale.total_amount || 0);
  const taxAmount = 0; // If you have tax logic, add here

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {/* Header Logic: Full Header Image vs Standard Logo/Text */}
        {settings?.invoice_branding_type === "header" &&
        settings?.company_header_url ? (
          <View style={{ marginBottom: 20 }}>
            {/* Full Width Header Image */}
            <PdfImage
              src={settings.company_header_url}
              style={{ width: "100%", height: 100, objectFit: "cover" }}
            />
          </View>
        ) : (
          /* Standard Header */
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
            {/* Unified Render Order: Logo -> Info 
                If Direction is Row (Left matches): Logo (Left), Info (Right)
                If Direction is Row-Reverse (Right matches): Logo (Right), Info (Left)
            */}
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

        <Text style={styles.invoiceTitle}>فاتورة مبيعات / Tax Invoice</Text>

        {/* Client & Invoice Meta */}
        <View style={styles.metaSection}>
          <View style={styles.metaColumn}>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>
                {sale.client_name || "عميل نقدي"}
              </Text>
              <Text style={styles.metaLabel}>العميل:</Text>
            </View>
            {/* Add client specific details if available in sale object or passed prop */}
          </View>

          <View style={styles.metaColumn}>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>#{sale.tempId || sale.id}</Text>
              <Text style={styles.metaLabel}>رقم الفاتورة:</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>
                {formatDate(sale.offline_created_at)}
              </Text>
              <Text style={styles.metaLabel}>التاريخ:</Text>
            </View>
            {userName && (
              <View style={styles.metaRow}>
                <Text style={styles.metaValue}>{userName}</Text>
                <Text style={styles.metaLabel}>بواسطة:</Text>
              </View>
            )}
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colSeq}>#</Text>
            <Text style={styles.colProduct}>المنتج</Text>
            <Text style={styles.colQty}>الكمية</Text>
            <Text style={styles.colPrice}>سعر الوحدة</Text>
            <Text style={styles.colTotal}>الإجمالي</Text>
          </View>

          {items.map((item, index) => {
            const rowTotal = Number(item.unit_price) * item.quantity;
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colSeq}>{index + 1}</Text>
                <Text style={styles.colProduct}>
                  {item.product_name || `Product ${item.product_id}`}
                </Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>
                  {formatNumber(Number(item.unit_price))}
                </Text>
                <Text style={styles.colTotal}>{formatNumber(rowTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary Footer */}
        <View style={styles.summarySection}>
          <View style={{ flex: 1 }} />{" "}
          {/* Spacer to push summary to left/right */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{formatNumber(subtotal)}</Text>
              <Text style={styles.summaryLabel}>المجموع الفرعي:</Text>
            </View>

            {discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>
                  {formatNumber(discountAmount)}
                </Text>
                <Text style={styles.summaryLabel}>الخصم:</Text>
              </View>
            )}

            {taxAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>
                  {formatNumber(taxAmount)}
                </Text>
                <Text style={styles.summaryLabel}>الضريبة:</Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.grandTotal]}>
              <Text style={styles.summaryValue}>
                {formatNumber(totalAmount)}
              </Text>
              <Text style={styles.summaryLabel}>الإجمالي النهائي:</Text>
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
