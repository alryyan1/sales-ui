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
import { useTranslation } from "react-i18next";

// ── Color palette ────────────────────────────────────────────────────────────
const C = {
  accent:     "#1e40af",   // blue-800
  accentLight:"#eff6ff",   // blue-50
  headerBg:   "#1e3a5f",   // dark navy
  headerText: "#ffffff",
  rowOdd:     "#f8fafc",   // slate-50
  rowEven:    "#ffffff",
  border:     "#e2e8f0",   // slate-200
  text:       "#1e293b",   // slate-800
  muted:      "#64748b",   // slate-500
  red:        "#dc2626",
  green:      "#16a34a",
  totalsRow:  "#f1f5f9",   // slate-100
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
    fontSize: 9,
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },

  // ── Accent stripe ─────────────────────────────────────────────────────────
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: C.accent,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  companyInfo: {
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 17,
    fontWeight: "bold",
    color: C.headerBg,
    marginBottom: 3,
  },
  companyDetail: {
    fontSize: 8,
    color: C.muted,
    marginBottom: 2,
    textAlign: "right",
  },
  logo: {
    objectFit: "contain",
  },

  // ── Title block ───────────────────────────────────────────────────────────
  titleBlock: {
    backgroundColor: C.accentLight,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: C.accent,
  },
  titleMeta: {
    alignItems: "flex-start",
    gap: 2,
  },
  titleMetaRow: {
    flexDirection: "row",
    gap: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: C.muted,
  },
  metaValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: C.text,
  },

  // ── Summary cards ─────────────────────────────────────────────────────────
  cardsRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    padding: 8,
    alignItems: "flex-end",
  },
  cardLabel: {
    fontSize: 8,
    color: C.muted,
    marginBottom: 3,
  },
  cardValue: {
    fontSize: 11,
    fontWeight: "bold",
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row-reverse",
    backgroundColor: C.headerBg,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row-reverse",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  totalsRow: {
    flexDirection: "row-reverse",
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: C.totalsRow,
    borderTopWidth: 1.5,
    borderTopColor: C.accent,
  },
  thNo:     { width: "6%",  textAlign: "center" },
  thName:   { width: "40%", textAlign: "right", paddingLeft: 12 },
  thDebit:  { width: "18%", textAlign: "center" },
  thCredit: { width: "18%", textAlign: "center" },
  thBal:    { width: "18%", textAlign: "center" },
  headText: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: C.headerText,
  },
  cellNo: {
    width: "6%",
    textAlign: "center",
    fontSize: 8,
    color: C.muted,
  },
  cellName: {
    width: "40%",
    textAlign: "right",
    fontSize: 9,
    color: C.text,
    paddingLeft: 12,
  },
  cellNum: {
    width: "18%",
    textAlign: "center",
    fontSize: 9,
  },
  totalLabel: {
    width: "46%",
    textAlign: "right",
    fontSize: 9.5,
    fontWeight: "bold",
    color: C.text,
    paddingLeft: 12,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7.5,
    color: C.muted,
  },
});

interface Props {
  suppliers: SupplierSummary[];
  settings?: AppSettings | null;
}

export const SupplierSummaryLedgerPdf: React.FC<Props> = ({ suppliers, settings }) => {
  const { t } = useTranslation(["reports"]);
  const currency = settings?.currency_symbol || "OMR";
  const fmt = (n: number) => `${formatNumber(n)} ${currency}`;

  const totals = suppliers.reduce(
    (acc, s) => ({
      debit:   acc.debit   + s.total_debit,
      credit:  acc.credit  + s.total_credit,
      balance: acc.balance + s.balance,
    }),
    { debit: 0, credit: 0, balance: 0 }
  );

  const printDate = format(new Date(), "yyyy-MM-dd");
  const useHeaderImage =
    settings?.invoice_branding_type === "header" && settings?.company_header_url;

  return (
    <Document>
      <Page size="A4" style={[styles.page, { fontFamily: getPdfFont(settings) }]}>
        {/* Top accent stripe */}
        <View style={styles.accentBar} fixed />

        {/* ── Company Header ── */}
        {useHeaderImage ? (
          <View style={{ marginBottom: 16 }}>
            <PdfImage
              src={settings!.company_header_url!}
              style={{ width: "100%", height: 90, objectFit: "cover" }}
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
            {settings?.company_logo_url && (
              <PdfImage
                src={settings.company_logo_url}
                style={[
                  styles.logo,
                  {
                    width:  settings.logo_width  || 55,
                    height: settings.logo_height || 55,
                  },
                ]}
              />
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>
                {settings?.company_name || t("reports:supplierSummaryPdf.defaultCompanyName")}
              </Text>
              {settings?.company_address && (
                <Text style={styles.companyDetail}>{settings.company_address}</Text>
              )}
              {settings?.company_phone && (
                <Text style={styles.companyDetail}>{t("reports:supplierSummaryPdf.phoneLabel")} {settings.company_phone}</Text>
              )}
              {settings?.tax_number && (
                <Text style={styles.companyDetail}>
                  {t("reports:supplierSummaryPdf.taxNumberLabel")} {settings.tax_number}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Title Block ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t("reports:supplierSummaryPdf.title")}</Text>
          <View style={styles.titleMeta}>
            <View style={styles.titleMetaRow}>
              <Text style={styles.metaValue}>{printDate}</Text>
              <Text style={styles.metaLabel}>{t("reports:supplierSummaryPdf.printDateLabel")}</Text>
            </View>
            <View style={styles.titleMetaRow}>
              <Text style={styles.metaValue}>{suppliers.length}</Text>
              <Text style={styles.metaLabel}>{t("reports:supplierSummaryPdf.suppliersCountLabel")}</Text>
            </View>
          </View>
        </View>

        {/* ── Summary Cards ── */}
        <View style={styles.cardsRow}>
          <View style={[styles.card, { borderColor: "#fecaca" }]}>
            <Text style={styles.cardLabel}>{t("reports:supplierSummaryPdf.totalDebit")}</Text>
            <Text style={[styles.cardValue, { color: C.red }]}>{fmt(totals.debit)}</Text>
          </View>
          <View style={[styles.card, { borderColor: "#bbf7d0" }]}>
            <Text style={styles.cardLabel}>{t("reports:supplierSummaryPdf.totalCredit")}</Text>
            <Text style={[styles.cardValue, { color: C.green }]}>{fmt(totals.credit)}</Text>
          </View>
          <View style={[styles.card, { borderColor: "#bfdbfe" }]}>
            <Text style={styles.cardLabel}>{t("reports:supplierSummaryPdf.netBalance")}</Text>
            <Text
              style={[
                styles.cardValue,
                { color: totals.balance > 0 ? C.red : totals.balance < 0 ? C.green : C.muted },
              ]}
            >
              {fmt(totals.balance)}
            </Text>
          </View>
        </View>

        {/* ── Table ── */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHead} fixed>
            <Text style={[styles.headText, styles.thBal]}>{t("reports:supplierSummaryPdf.colBalance")}</Text>
            <Text style={[styles.headText, styles.thCredit]}>{t("reports:supplierSummaryPdf.colCredit")}</Text>
            <Text style={[styles.headText, styles.thDebit]}>{t("reports:supplierSummaryPdf.colDebit")}</Text>
            <Text style={[styles.headText, styles.thName]}>{t("reports:supplierSummaryPdf.colSupplier")}</Text>
            <Text style={[styles.headText, styles.thNo]}>{t("reports:supplierSummaryPdf.colNumber")}</Text>
          </View>

          {/* Rows */}
          {suppliers.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.tableRow,
                { backgroundColor: i % 2 === 0 ? C.rowEven : C.rowOdd },
              ]}
              wrap={false}
            >
              <Text
                style={[
                  styles.cellNum,
                  {
                    color:
                      s.balance > 0 ? C.red : s.balance < 0 ? C.green : C.muted,
                    fontWeight: s.balance !== 0 ? "bold" : "normal",
                  },
                ]}
              >
                {fmt(s.balance)}
              </Text>
              <Text style={[styles.cellNum, { color: C.green }]}>
                {fmt(s.total_credit)}
              </Text>
              <Text style={[styles.cellNum, { color: C.red }]}>
                {fmt(s.total_debit)}
              </Text>
              <Text style={styles.cellName}>{s.name}</Text>
              <Text style={styles.cellNo}>{i + 1}</Text>
            </View>
          ))}

          {/* Totals row */}
          <View style={styles.totalsRow} wrap={false}>
            <Text
              style={[
                styles.cellNum,
                {
                  fontWeight: "bold",
                  fontSize: 9.5,
                  color: totals.balance > 0 ? C.red : totals.balance < 0 ? C.green : C.muted,
                },
              ]}
            >
              {fmt(totals.balance)}
            </Text>
            <Text style={[styles.cellNum, { fontWeight: "bold", fontSize: 9.5, color: C.green }]}>
              {fmt(totals.credit)}
            </Text>
            <Text style={[styles.cellNum, { fontWeight: "bold", fontSize: 9.5, color: C.red }]}>
              {fmt(totals.debit)}
            </Text>
            <Text style={[styles.totalLabel]}>{t("reports:supplierSummaryPdf.total")}</Text>
            <Text style={[styles.cellNo]} />
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {settings?.company_name || t("reports:supplierSummaryPdf.defaultCompanyFallback")} {t("reports:supplierSummaryPdf.printedLabel")} {printDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              t("reports:supplierSummaryPdf.pageLabel", { page: pageNumber, total: totalPages })
            }
          />
        </View>
      </Page>
    </Document>
  );
};
