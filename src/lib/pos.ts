import type { Product } from "@/services/productService";
import type { Payment } from "@/services/saleService";

export const PRODUCT_SEARCH_INPUT_ID = "pos-product-search-input";

/** Preselected payment method for a new payment line and for the "quick pay" shortcut. */
export const DEFAULT_PAYMENT_METHOD: Payment["method"] = "bankak";

export function resolveUnitPrice(product: Product, usdFactor: number): number {
  const basePrice = Number(product.last_sale_price_per_sellable_unit ?? product.sale_price ?? 0);
  return product.last_purchase_currency === "USD" ? basePrice * usdFactor : basePrice;
}

export function stockOf(product: Product): number {
  // Services aren't stocked and are always sellable — treat as unlimited so every
  // stock-availability check/filter that reads stockOf() passes for them automatically.
  if (product.is_service) return Infinity;
  return product.current_stock_quantity ?? product.stock_quantity ?? 0;
}
