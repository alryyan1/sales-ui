// src/lib/posCart.ts
// Pure, framework-free domain model for building a POS sale entirely client-side.
// Nothing in this file makes a network call — the cart only becomes a real
// server Sale when buildCreateSaleData()'s payload is sent through saleService.createSale().
import type { Product } from "@/services/productService";
import type { Client } from "@/services/clientService";
import type { CreateSaleData, Payment } from "@/services/saleService";

export type DiscountType = "percentage" | "fixed";

export interface DraftCartItem {
  localId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  purchaseItemId?: number | null;
  saleItemId?: number | null;
}

export interface DraftTicket {
  id: string;
  label: number;
  items: DraftCartItem[];
  client: Client | null;
  discountType: DiscountType;
  discountAmount: number;
  notes: string | null;
  createdAt: number;
}

export interface DraftTotals {
  subtotal: number;
  discountAmount: number;
  total: number;
}

export function createDraftTicket(label: number): DraftTicket {
  return {
    id: crypto.randomUUID(),
    label,
    items: [],
    client: null,
    discountType: "percentage",
    discountAmount: 0,
    notes: null,
    createdAt: Date.now(),
  };
}

export function computeDraftTotals(
  ticket: Pick<DraftTicket, "items" | "discountType" | "discountAmount">
): DraftTotals {
  const subtotal = ticket.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const rawDiscount =
    ticket.discountType === "percentage"
      ? subtotal * (ticket.discountAmount / 100)
      : ticket.discountAmount;
  const discountAmount = Math.min(Math.max(0, rawDiscount), subtotal);
  const total = Math.max(0, subtotal - discountAmount);
  return { subtotal, discountAmount, total };
}

export function buildCreateSaleData(
  ticket: DraftTicket,
  paymentLines: Array<{ method: Payment["method"]; amount: number }>,
  opts: { shiftId: number | null; saleDate: string }
): CreateSaleData {
  const { total } = computeDraftTotals(ticket);
  const paidTotal = paymentLines.reduce((sum, l) => sum + l.amount, 0);
  const status: CreateSaleData["status"] = paidTotal + 0.009 >= total ? "completed" : "pending";

  return {
    client_id: ticket.client?.id ?? null,
    sale_date: opts.saleDate,
    status,
    notes: ticket.notes,
    shift_id: opts.shiftId,
    discount_type: ticket.discountType,
    discount_amount: ticket.discountAmount,
    items: ticket.items.map((item) => ({
      product_id: item.product.id,
      purchase_item_id: item.purchaseItemId ?? null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    payments: paymentLines
      .filter((l) => l.amount > 0)
      .map((l) => ({ method: l.method, amount: l.amount, payment_date: opts.saleDate })),
  };
}
