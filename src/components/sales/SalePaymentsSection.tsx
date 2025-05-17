// src/components/sales/SalePaymentsSection.tsx
import React from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Child Row Component
import { SalePaymentRow } from "./SalePaymentRow"; // Make sure this is correctly defined
import { formatNumber } from "@/constants";

interface SalePaymentsSectionProps {
  isSubmitting: boolean;
  grandTotal: number; // Pass grand total from sale items
}

export const SalePaymentsSection: React.FC<SalePaymentsSectionProps> = ({
  isSubmitting,
  grandTotal,
}) => {
  const { t } = useTranslation(["sales", "common"]);
  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "payments",
  });

  const watchedPayments = watch("payments"); // Watch the entire payments array
  const totalPaid =
    watchedPayments?.reduce(
      (sum: number, p: any) => sum + (Number(p?.amount) || 0),
      0
    ) ?? 0;

  const addPaymentLine = () => {
    const amountDue = grandTotal - totalPaid;
    append({
      method: "cash", // Default method
      amount: Math.max(0.01, amountDue), // Default to remaining due, at least 0.01
      payment_date: new Date(),
      reference_number: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
          {t("sales:paymentsSectionTitle")}
        </h3>
        <Button
          type="button"
          variant="outline"
          onClick={addPaymentLine}
          disabled={isSubmitting || totalPaid >= grandTotal}
          size="sm"
          className="text-xs"
        >
          <PlusCircle className="me-2 h-4 w-4" /> {t("sales:addPaymentMethod")}{" "}
          {/* Add key */}
        </Button>
      </div>

      {/* Display root error for payments array (e.g., from refine if total paid > total sale) */}
      {errors.payments &&
        !Array.isArray(errors.payments) &&
        (errors.payments as any).message && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t((errors.payments as any).message)}
            </AlertDescription>
          </Alert>
        )}

      {fields.map((item, index) => (
        <SalePaymentRow
          key={item.id}
          index={index}
          remove={remove}
          isSubmitting={isSubmitting}
          grandTotal={grandTotal}
          totalPaidSoFar={totalPaid} // Pass this for dynamic max calculation
        />
      ))}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("sales:noPaymentsAdded")}
        </p> // Add key
      )}
    </div>
  );
};
