import { t } from "i18next";
import { z } from "zod";

// --- Zod Schema Definition with `t()` directly ---
export const returnItemSchema = z.object({
  original_sale_item_id: z.number(),
  product_id: z.number(),
  product_name: z.string().optional(),
  product_sku: z.string().nullable().optional(),
  quantity_returned: z.coerce
    .number()
    .int()
    .min(1, { message: t("validation:minQuantity") }),
  condition: z
    .string()
    .min(1, { message: t("validation:required") })
    .optional()
    .default("resellable"),
  unit_price: z.number(),
  max_returnable_quantity: z.coerce
    .number()
    .min(0, { message: t("validation:invalidNumber") }), // Add coerce to handle string inputs
});
export const addSaleReturnSchema = z
  .object({
    original_sale_id: z
      .number({ required_error: t("validation:required") })
      .positive(),
    return_date: z.date({
      required_error: t("validation:required"),
      invalid_type_error: t("validation:invalidDate"),
    }),
    status: z.enum(["pending", "completed", "cancelled"], {
      required_error: t("validation:required"),
    }),
    return_reason: z.string(),
    notes: z.string().nullable(),
    credit_action: z.enum(["refund", "store_credit", "none"], {
      required_error: t("validation:required"),
    }),
    refunded_amount: z
      .preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce
          .number({ invalid_type_error: t("validation:invalidNumber") })
          .min(0)
          .optional()
      )
      .default(0),
    items: z
      .array(returnItemSchema)
      .min(1, { message: t("sales:errorReturnItemsRequired") }),
  })
  .refine(
    (data) => {
      if (data.credit_action === "refund") {
        const totalReturnedValue = data.items.reduce(
          (sum, item) =>
            sum +
            (Number(item.quantity_returned) || 0) *
              (Number(item.unit_price) || 0),
          0
        );
        return (Number(data.refunded_amount) || 0) <= totalReturnedValue;
      }
      return true;
    },
    {
      message: t("sales:errorRefundExceedsReturnedValue"),
      path: ["refunded_amount"],
    }
  );