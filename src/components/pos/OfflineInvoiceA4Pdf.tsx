import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image as PdfImage,
  Font,
} from "@react-pdf/renderer";
import { OfflineSale, OfflineSaleItem } from "../../services/db";
import { AppSettings } from "../../services/settingService";
import { formatNumber } from "@/constants";
import { getPdfFont } from "@/utils/pdfFontRegistry";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica", // Default to Helvetica for English, ideally use a font that supports both if needed
  },
  headerContainer: {
    flexDirection: "column",
    marginBottom: 10,
  },
  logoContainer: {
    alignItems: "flex-start",
    marginBottom: 20,
    height: 60,
  },
  logo: {
    height: "100%",
    objectFit: "contain",
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoColLeft: {
    width: "35%",
    alignItems: "flex-start",
  },
  infoColCenter: {
    width: "30%",
    alignItems: "center",
  },
  infoColRight: {
    width: "35%",
    alignItems: "flex-end",
    textAlign: "right",
  },
  boldText: {
    fontWeight: "bold",
    fontSize: 10,
    marginBottom: 4,
  },
  normalText: {
    fontSize: 10,
    marginBottom: 4,
  },
  companyName: {
    fontWeight: "bold",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginTop: 5,
    marginBottom: 10,
  },
  table: {
    width: "100%",
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    paddingVertical: 5,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    paddingVertical: 5,
    alignItems: "center",
  },
  colIndex: {
    width: "8%",
    textAlign: "center",
    borderRightWidth: 1,
    borderColor: "#000",
    height: "100%",
  },
  colItem: {
    width: "52%",
    textAlign: "left",
    paddingLeft: 5,
    borderRightWidth: 1,
    borderColor: "#000",
  },
  colQty: {
    width: "10%",
    textAlign: "center",
    borderRightWidth: 1,
    borderColor: "#000",
  },
  colPrice: {
    width: "15%",
    textAlign: "center",
    borderRightWidth: 1,
    borderColor: "#000",
  },
  colTotal: { width: "15%", textAlign: "center" },

  // Cells in row need matching height? Flex handles it but borders are tricky.
  // Simplified table without vertical borders inside for cleaner code if exact match not strictly "pixel perfect" on borders,
  // but image shows borders. We will try to simulate.

  summaryContainer: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  summaryBox: {
    width: "40%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingHorizontal: 2,
  },
  greenBox: {
    backgroundColor: "#a7f3d0", // Light green
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "heavy", // Assuming bold equivalent
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  summaryValueBlue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "blue",
  },
  timestampFooter: {
    position: "absolute",
    bottom: 30,
    left: 30,
    fontSize: 9,
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
  const currencySymbol = ""; // Image shows no symbol, just numbers

  // Helpers
  const formatMoney = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const subTotal = items.reduce(
    (acc, i) => acc + Number(i.unit_price) * i.quantity,
    0
  );
  const total = Number(sale.total_amount || 0);
  const paid = Number(sale.paid_amount || 0);
  const lastDue = 0; // Placeholder as we don't have this in sale state
  const currentDue = limitSub(total + lastDue, paid);

  function limitSub(a: number, b: number) {
    const res = a - b;
    return res > 0 ? res : 0;
  }

  // Format Date
  const dateObj = new Date(sale.sale_date || sale.offline_created_at);
  const dateStr = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = dateObj.toLocaleString("en-GB", { hour12: false }); // for footer

  return (
    <Document>
      <Page
        size="A4"
        style={[styles.page, { fontFamily: getPdfFont(settings) }]}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          {/* Logo Top Center */}
          <View style={styles.logoContainer}>
            {settings?.company_logo_url && (
              <PdfImage src={settings.company_logo_url} style={styles.logo} />
            )}
          </View>

          <View style={styles.infoSection}>
            {/* Left: Customer Info */}
            <View style={styles.infoColLeft}>
              <Text style={styles.boldText}>
                Customer: {sale.client_name || "Walk-in Customer"}
              </Text>
              <Text style={styles.boldText}>
                Number: {sale.id || sale.tempId}
              </Text>
            </View>

            {/* Center: Sales info */}
            <View style={styles.infoColCenter}>
              <Text style={styles.boldText}>Sales Cash</Text>
              <Text style={styles.boldText}>{dateStr}</Text>
            </View>

            {/* Right: Company Info */}
            <View style={styles.infoColRight}>
              <Text style={styles.companyName}>
                {settings?.company_name || "Company Name"}
              </Text>
              <Text style={styles.normalText}>Enterprises</Text>
              <Text style={styles.normalText}>
                {settings?.company_address || "Address Line"}
              </Text>
              <Text style={styles.boldText}>
                {settings?.company_phone || "+0000000000"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />
        </View>

        {/* Table Section */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colIndex, { borderRightWidth: 0 }]}>#</Text>
            <View
              style={{ width: 1, backgroundColor: "#000", height: "100%" }}
            />
            <Text style={[styles.colItem, { borderRightWidth: 0 }]}>Item</Text>
            <View
              style={{ width: 1, backgroundColor: "#000", height: "100%" }}
            />
            <Text style={[styles.colQty, { borderRightWidth: 0 }]}>Qty</Text>
            <View
              style={{ width: 1, backgroundColor: "#000", height: "100%" }}
            />
            <Text style={[styles.colPrice, { borderRightWidth: 0 }]}>
              Price
            </Text>
            <View
              style={{ width: 1, backgroundColor: "#000", height: "100%" }}
            />
            <Text style={styles.colTotal}>Total</Text>
          </View>

          {/* Table Rows */}
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.colIndex, { borderRightWidth: 0 }]}>
                {idx + 1}
              </Text>
              <View
                style={{
                  width: 1,
                  backgroundColor: "#000",
                  height: "150%",
                  marginTop: -5,
                  marginBottom: -5,
                }}
              />

              <Text style={[styles.colItem, { borderRightWidth: 0 }]}>
                {item.product_name}
              </Text>
              <View
                style={{
                  width: 1,
                  backgroundColor: "#000",
                  height: "150%",
                  marginTop: -5,
                  marginBottom: -5,
                }}
              />

              <Text style={[styles.colQty, { borderRightWidth: 0 }]}>
                {item.quantity}
              </Text>
              <View
                style={{
                  width: 1,
                  backgroundColor: "#000",
                  height: "150%",
                  marginTop: -5,
                  marginBottom: -5,
                }}
              />

              <Text style={[styles.colPrice, { borderRightWidth: 0 }]}>
                {formatMoney(Number(item.unit_price))}
              </Text>
              <View
                style={{
                  width: 1,
                  backgroundColor: "#000",
                  height: "150%",
                  marginTop: -5,
                  marginBottom: -5,
                }}
              />

              <Text style={styles.colTotal}>
                {formatMoney(Number(item.unit_price) * item.quantity)}
              </Text>
            </View>
          ))}
          {/* Empty rows filler if needed, but let's skip for simple refactor */}
        </View>

        {/* Summary Footer */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            {/* Last Due */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Last Due</Text>
              <View
                style={[
                  styles.greenBox,
                  { marginBottom: 0, width: 80, justifyContent: "center" },
                ]}
              >
                <Text style={styles.summaryValueBlue}>{lastDue}</Text>
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: "#000", marginBottom: 5 }}
            />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Invoice Total</Text>
              <Text style={styles.summaryValue}>{formatMoney(total)}</Text>
            </View>

            <View
              style={{ height: 1, backgroundColor: "#000", marginBottom: 5 }}
            />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{formatMoney(total)}</Text>
            </View>

            <View
              style={{ height: 1, backgroundColor: "#000", marginBottom: 5 }}
            />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>paid</Text>
              <Text style={styles.summaryValue}>{formatMoney(paid)}</Text>
            </View>

            <View
              style={{ height: 1, backgroundColor: "#000", marginBottom: 5 }}
            />

            {/* Current Due */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Current Due</Text>
              <View
                style={[
                  styles.greenBox,
                  { marginBottom: 0, width: 80, justifyContent: "center" },
                ]}
              >
                <Text style={styles.summaryValueBlue}>
                  {formatMoney(currentDue)}
                </Text>
              </View>
            </View>
            <View
              style={{ height: 1, backgroundColor: "#000", marginBottom: 5 }}
            />
          </View>
        </View>

        {/* Footer Timestamp */}
        <Text style={styles.timestampFooter}>{timeStr}</Text>
      </Page>
    </Document>
  );
};
