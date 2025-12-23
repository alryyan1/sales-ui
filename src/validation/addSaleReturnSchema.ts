import { z } from "zod";

// --- Zod Schema Definition ---
export const returnItemSchema = z.object({
  original_sale_item_id: z.number(),
  product_id: z.number(),
  product_name: z.string().optional(),
  product_sku: z.string().nullable().optional(),
  quantity_returned: z.coerce
    .number()
    .int()
    .min(1, { message: "الكمية يجب أن تكون على الأقل 1" }),
  condition: z
    .string()
    .min(1, { message: "هذا الحقل مطلوب" })
    .optional()
    .default("resellable"),
  unit_price: z.number(),
  max_returnable_quantity: z.coerce
    .number()
    .min(0, { message: "رقم غير صالح" }), // Add coerce to handle string inputs
});
export const addSaleReturnSchema = z
  .object({
    original_sale_id: z
      .number({ required_error: "هذا الحقل مطلوب" })
      .positive(),
    return_date: z.date({
      required_error: "هذا الحقل مطلوب",
      invalid_type_error: "تاريخ غير صالح",
    }),
    status: z.enum(["pending", "completed", "cancelled"], {
      required_error: "هذا الحقل مطلوب",
    }),
    return_reason: z.string(),
    notes: z.string().nullable(),
    credit_action: z.enum(["refund", "store_credit", "none"], {
      required_error: "هذا الحقل مطلوب",
    }),
    refunded_amount: z
      .preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce
          .number({ invalid_type_error: "رقم غير صالح" })
          .min(0)
          .optional()
      )
      .default(0),
    items: z
      .array(returnItemSchema)
      .min(1, { message: "يجب إضافة عنصر واحد على الأقل للإرجاع" }),
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
      message: "مبلغ الاسترداد يتجاوز قيمة العناصر المرجعة",
      path: ["refunded_amount"],
    }
  );