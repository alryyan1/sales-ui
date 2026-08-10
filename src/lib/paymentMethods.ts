// src/lib/paymentMethods.ts
// Single source of truth for payment method values, shared across sales,
// POS, returns, purchases, and expenses. Add new methods here first.

export const PAYMENT_METHODS = ["cash", "bankak", "fawry", "ocash", "bank_transfer", "card"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Methods that settle to a bank/electronic account rather than the cash drawer — mirrors backend config/payment_methods.php `bank`. */
export const BANK_PAYMENT_METHODS: readonly PaymentMethod[] = ["bankak", "fawry", "ocash", "bank_transfer", "card"];

export function isBankPaymentMethod(method: string | null | undefined): boolean {
  return !!method && (BANK_PAYMENT_METHODS as readonly string[]).includes(method);
}

/**
 * Parses the `pos_active_payment_methods` setting (a comma-separated list) into the
 * subset of PAYMENT_METHODS that are active. Falls back to all methods when the
 * setting is unset or resolves to an empty/invalid list, so the POS payment dialog
 * never ends up with zero selectable methods.
 */
export function parseActivePaymentMethods(raw: string | null | undefined): PaymentMethod[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m): m is PaymentMethod => (PAYMENT_METHODS as readonly string[]).includes(m));
  return parsed.length > 0 ? parsed : [...PAYMENT_METHODS];
}

/** Picks `preferred` if it's active, otherwise the first active method. */
export function resolveDefaultActiveMethod(
  activeMethods: readonly PaymentMethod[],
  preferred: PaymentMethod
): PaymentMethod {
  return activeMethods.includes(preferred) ? preferred : (activeMethods[0] ?? preferred);
}
