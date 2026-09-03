// src/lib/scheduledSaleCart.ts
// Builds a CreateScheduledSaleData payload from the same DraftTicket domain model
// used by the POS cart (src/lib/posCart.ts). The payload differs enough from
// buildCreateSaleData (no payments/shift_id, scheduled_at instead of sale_date) to
// warrant its own small builder rather than bolting onto posCart.ts.
import type { DraftTicket } from "@/lib/posCart";
import type { CreateScheduledSaleData } from "@/services/scheduledSaleService";

export function buildCreateScheduledSaleData(
  ticket: DraftTicket,
  scheduledAt: string, // ISO datetime
): CreateScheduledSaleData {
  return {
    client_id: ticket.client?.id ?? 0,
    scheduled_at: scheduledAt,
    discount_type: ticket.discountType,
    discount_amount: ticket.discountAmount || null,
    notes: ticket.notes,
    items: ticket.items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
  };
}
