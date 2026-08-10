// src/lib/saleStatus.ts
// Small, framework-free helpers shared between the sales list rows and the
// sale details drawer. Every field read here is real (Sale has no literal
// "status" column — it was dropped server-side — so this derives a
// meaningful status purely from is_returned/is_quote/paid/due amounts).
import type { TFunction } from "i18next";
import type { Sale } from "@/services/saleService";

export type SaleStatusKind = "returned" | "quote" | "paid" | "partial" | "unpaid";

export interface SaleStatusInfo {
  kind: SaleStatusKind;
  label: string;
  variant: "secondary" | "outline" | "success" | "warning" | "destructive";
}

export function getSaleStatus(
  sale: Pick<Sale, "is_returned" | "is_quote" | "total_amount" | "paid_amount" | "due_amount">
): SaleStatusInfo {
  if (sale.is_returned) return { kind: "returned", label: "مرتجعة", variant: "secondary" };
  if (sale.is_quote) return { kind: "quote", label: "تسعيرة", variant: "outline" };

  const total = Number(sale.total_amount ?? 0);
  const paid = Number(sale.paid_amount ?? 0);
  const due = Number(sale.due_amount ?? Math.max(0, total - paid));

  if (due <= 0.009 && total > 0) return { kind: "paid", label: "مدفوعة بالكامل", variant: "success" };
  if (paid > 0) return { kind: "partial", label: "دفع جزئي", variant: "warning" };
  return { kind: "unpaid", label: "غير مدفوعة", variant: "destructive" };
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  bankak: "بنكك",
  fawry: "فوري",
  ocash: "أوكاش",
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

// i18next-aware variants, for callers that have a `t` bound to the "sales"
// namespace (see src/locales/{ar,en}/sales.json) — the plain versions above
// stay as-is for callers that haven't been converted yet.
const SALE_STATUS_KEY: Record<SaleStatusKind, string> = {
  returned: "saleStatusReturned",
  quote: "saleStatusQuote",
  paid: "saleStatusPaid",
  partial: "saleStatusPartial",
  unpaid: "saleStatusUnpaid",
};

export function translateSaleStatus(t: TFunction, kind: SaleStatusKind): string {
  return t(SALE_STATUS_KEY[kind]);
}

const PAYMENT_METHOD_KEY: Record<string, string> = {
  cash: "paymentMethodCash",
  bankak: "paymentMethodBankak",
  fawry: "paymentMethodFawry",
  ocash: "paymentMethodOcash",
};

export function translatePaymentMethod(t: TFunction, method: string | null | undefined): string {
  if (!method) return "—";
  const key = PAYMENT_METHOD_KEY[method];
  return key ? t(key) : method;
}
