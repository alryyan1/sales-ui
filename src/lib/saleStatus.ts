// src/lib/saleStatus.ts
// Small, framework-free helpers shared between the sales list rows and the
// sale details drawer. Every field read here is real (Sale has no literal
// "status" column — it was dropped server-side — so this derives a
// meaningful status purely from is_returned/is_quote/paid/due amounts).
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
