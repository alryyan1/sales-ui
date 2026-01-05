import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { OfflineSale, OfflineSaleItem } from "../../services/db";
import { AppSettings } from "../../services/settingService";
import { formatNumber } from "@/constants";

import { getPdfFont } from "@/utils/pdfFontRegistry";

const styles = StyleSheet.create({
  page: {
    padding: 10,
    // fontFamily will be set dynamically in the component
    fontSize: 10, // Small font for thermal receipt
    width: "80mm", // Standard thermal paper width
  },
  header: {
    marginBottom: 10,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 5,
    objectFit: "contain",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "bold",

  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderStyle: "dashed",
    marginVertical: 5,
    width: "100%",
  },
  row: {
    display: "flex",
    flexDirection: "row-reverse", // RTL Layout: Reverse row direction
    justifyContent: "space-between",
    marginBottom: 2,
  },
  col: {
    // flex: 1,
  },
  colName: {
    flex: 2,
    textAlign: "right",
  },
  colQty: {
    flex: 1,
    textAlign: "center",
  },
  colPrice: {
    flex: 1,
    textAlign: "left", // Numbers LTR usually, but in RTL layout "left" is visually left
  },
  totalRow: {
    display: "flex",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 5,
    fontWeight: "bold",
    fontSize: 12,
  },
  label: {
    textAlign: "right",
  },
  value: {
    textAlign: "left",
  },
  footer: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
  sectionConfig: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end", // Align all content to right for RTL
    width: "100%",
  },
});

interface PosInvoicePdfProps {
  sale: OfflineSale;
  shiftId?: number;
  userName?: string;
  items: OfflineSaleItem[];
  settings?: AppSettings | null;
}

export const PosInvoicePdf: React.FC<PosInvoicePdfProps> = ({
  sale,
  userName,
  items,
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
  const taxAmount = 0; // Assumed 0 or included
  const currencySymbol = settings?.currency_symbol || "SDG";

  return (
    <Document>
      {/* 80mm width is approx 227 points. Height is variable, setting a long height to simulate continuous roll */}
      <Page
        size={[227, 800]}
        style={[styles.page, { fontFamily: getPdfFont(settings) }]}
      >
        {/* Header */}
        <View style={styles.header}>
          {settings?.company_logo_url && (
            <Image
              src={settings.company_logo_url}
              style={[
                styles.logo,
                {
                  width: settings.logo_width || 50,
                  height: settings.logo_height || 50,
                },
              ]}
            />
          )}
          <Text style={styles.title}>
            {settings?.company_name || "Del Pasta Invoice"}
          </Text>
          {settings?.company_address && (
            <Text style={styles.subtitle}>{settings.company_address}</Text>
          )}
          {settings?.company_phone && (
            <Text style={styles.subtitle}>{settings.company_phone}</Text>
          )}
          {settings?.tax_number && (
            <Text style={styles.subtitle}>الضريبي: {settings.tax_number}</Text>
          )}
          <Text style={styles.subtitle}>
            رقم الفاتورة: #{sale.is_synced && sale.id ? sale.id : sale.tempId}
          </Text>
          <Text style={styles.subtitle}>
            {formatDate(sale.offline_created_at)}
          </Text>
          {userName && <Text style={styles.subtitle}>الكاشير: {userName}</Text>}
        </View>

        <View style={styles.divider} />

        {/* Column Headers */}
        <View style={[styles.row, { fontWeight: "bold", fontSize: 9 }]}>
          <Text style={styles.colName}>المنتج</Text>
          <Text style={styles.colQty}>الكمية</Text>
          <Text style={styles.colPrice}>السعر</Text>
        </View>

        <View style={styles.divider} />

        {/* Items */}
        {items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.colName}>
              {item.product_name || `Item ${index + 1}`}
            </Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>
              {formatNumber(Number(item.unit_price) * item.quantity)} {currencySymbol}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text style={styles.label}>المجموع:</Text>
          <Text style={styles.value}>{formatNumber(subtotal)} {currencySymbol}</Text>
        </View>

        {taxAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>الضريبة:</Text>
            <Text style={styles.value}>{formatNumber(taxAmount)} {currencySymbol}</Text>
          </View>
        )}

        {discountAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>الخصم:</Text>
            <Text style={styles.value}>{formatNumber(discountAmount)} {currencySymbol}</Text>
          </View>
        )}

        <View style={[styles.totalRow, { fontSize: 14 }]}>
          <Text style={styles.label}>الإجمالي:</Text>
          <Text style={styles.value}>{formatNumber(totalAmount)} {currencySymbol}</Text>
        </View>

        <View style={styles.divider} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text>شكراً لزيارتكم</Text>
          {settings?.company_phone && <Text>{settings.company_phone}</Text>}
          <Text>زورونا مرة أخرى</Text>
        </View>
      </Page>
    </Document>
  );
};
