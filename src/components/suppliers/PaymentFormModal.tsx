// src/components/suppliers/PaymentFormModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { ar, enUS } from "date-fns/locale";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, FileText, Loader2, Wallet } from "lucide-react";

// Services
import supplierPaymentService, {
  SupplierPayment,
} from '@/services/supplierPaymentService';

// Schema matching PurchaseLedgerDialog (minus notes)
const getPaymentSchema = (t: (key: string) => string) =>
  z.object({
    amount: z.coerce.number().min(0.01, t("suppliers:paymentForm.amountMinError")),
    method: z.string().min(1, t("suppliers:paymentForm.methodRequired")),
    payment_date: z.date({
      required_error: t("suppliers:paymentForm.dateRequired"),
    }),
    reference_number: z.string().optional(),
  });

type PaymentFormValues = z.infer<ReturnType<typeof getPaymentSchema>>;

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierId: number;
  paymentToEdit: SupplierPayment | null;
  purchaseId?: number | string | null;
}

const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplierId,
  paymentToEdit,
  purchaseId,
}) => {
  const { t, i18n } = useTranslation(["suppliers", "common"]);
  const dateLocale = i18n.language === "ar" ? ar : enUS;
  const PAYMENT_METHODS = [
    { id: "cash", name: t("suppliers:paymentForm.methodCash") },
    { id: "bank_transfer", name: t("suppliers:paymentForm.methodBankTransfer") },
    { id: "visa", name: t("suppliers:paymentForm.methodVisa") },
  ];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(getPaymentSchema(t)),
    defaultValues: {
      amount: 0,
      method: "cash",
      payment_date: new Date(),
      reference_number: "",
    },
  });
  // Reset form when modal opens/closes or paymentToEdit changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (paymentToEdit) {
        form.reset({
          amount: paymentToEdit.amount,
          method: paymentToEdit.method,
          payment_date: new Date(paymentToEdit.payment_date),
          reference_number: paymentToEdit.reference_number || '',
        });
      } else {
        form.reset({
          amount: 0,
          method: "cash",
          payment_date: new Date(),
          reference_number: "",
        });
      }
    }
  }, [isOpen, paymentToEdit, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...values,
        payment_date: format(values.payment_date, "yyyy-MM-dd"),
        purchase_id: purchaseId ? Number(purchaseId) : undefined,
      };

      if (paymentToEdit) {
        await supplierPaymentService.updatePayment(paymentToEdit.id, {
          ...payload,
          id: paymentToEdit.id,
        });
      } else {
        await supplierPaymentService.createPayment(supplierId, payload);
      }

      onSuccess();
    } catch (err) {
      setError(supplierPaymentService.getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" dir={i18n.dir()}>
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl gap-2 text-primary">
            <Wallet className="w-5 h-5" />
            {paymentToEdit ? t("suppliers:paymentForm.editTitle") : t("suppliers:paymentForm.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {paymentToEdit
              ? t("suppliers:paymentForm.editDesc")
              : t("suppliers:paymentForm.addDesc")
            }
            {purchaseId && t("suppliers:paymentForm.forPurchase", { id: purchaseId })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 bg-slate-50/50 p-4 rounded-lg border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("suppliers:paymentForm.detailsTitle")}
            </h4>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suppliers:paymentForm.amountLabel")} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.00"
                        {...field}
                        className={form.formState.errors.amount ? "border-red-500" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Date */}
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field: dateField }) => (
                  <FormItem>
                    <FormLabel>{t("suppliers:paymentForm.paymentDateLabel")} <span className="text-red-500">*</span></FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-start font-normal",
                            !dateField.value && "text-muted-foreground",
                            form.formState.errors.payment_date && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 ml-2" />
                          {dateField.value ? (
                            format(dateField.value, "dd MMMM yyyy", { locale: dateLocale })
                          ) : (
                            <span>{t("suppliers:paymentForm.chooseDate")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateField.value}
                          onSelect={(date) => date && dateField.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suppliers:paymentForm.paymentMethodLabel")} <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={form.formState.errors.method ? "border-red-500" : ""}>
                          <SelectValue placeholder={t("suppliers:paymentForm.choosePaymentMethod")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reference Number */}
              <FormField
                control={form.control}
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suppliers:paymentForm.referenceOptional")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("suppliers:paymentForm.referencePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {t("common:cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  paymentToEdit ? t("suppliers:paymentForm.updateButton") : t("suppliers:paymentForm.saveButton")
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentFormModal;