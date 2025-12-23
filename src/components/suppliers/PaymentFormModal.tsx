// src/components/suppliers/PaymentFormModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/LoadingSpinner';

// Services
import supplierPaymentService, {
  SupplierPayment,
  PaymentMethod,
  PaymentType,
  CreatePaymentData,
  UpdatePaymentData,
} from '@/services/supplierPaymentService';

// Form types
type PaymentFormData = {
  amount: number;
  type: 'payment' | 'credit' | 'adjustment';
  method: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other';
  reference_number?: string;
  notes?: string;
  payment_date: string;
};

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierId: number;
  paymentToEdit: SupplierPayment | null;
  paymentMethods: PaymentMethod[];
  paymentTypes: PaymentType[];
}

const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplierId,
  paymentToEdit,
  paymentMethods,
  paymentTypes,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PaymentFormData>({
    defaultValues: {
      amount: 0,
      type: 'payment',
      method: 'cash',
      reference_number: '',
      notes: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  // Reset form when modal opens/closes or paymentToEdit changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (paymentToEdit) {
        form.reset({
          amount: paymentToEdit.amount,
          type: paymentToEdit.type,
          method: paymentToEdit.method,
          reference_number: paymentToEdit.reference_number || '',
          notes: paymentToEdit.notes || '',
          payment_date: format(new Date(paymentToEdit.payment_date), 'yyyy-MM-dd'),
        });
      } else {
        form.reset({
          amount: 0,
          type: 'payment',
          method: 'cash',
          reference_number: '',
          notes: '',
          payment_date: format(new Date(), 'yyyy-MM-dd'),
        });
      }
    }
  }, [isOpen, paymentToEdit, form]);

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    setError(null);

    // Basic validation
    if (!data.amount || data.amount <= 0) {
      form.setError('amount', { type: 'manual', message: 'المبلغ يجب أن يكون أكبر من صفر' });
      setIsSubmitting(false);
      return;
    }
    if (!data.type) {
      form.setError('type', { type: 'manual', message: 'هذا الحقل مطلوب' });
      setIsSubmitting(false);
      return;
    }
    if (!data.method) {
      form.setError('method', { type: 'manual', message: 'هذا الحقل مطلوب' });
      setIsSubmitting(false);
      return;
    }
    if (!data.payment_date || data.payment_date.trim() === '') {
      form.setError('payment_date', { type: 'manual', message: 'هذا الحقل مطلوب' });
      setIsSubmitting(false);
      return;
    }

    try {
      if (paymentToEdit) {
        await supplierPaymentService.updatePayment(paymentToEdit.id, {
          ...data,
          id: paymentToEdit.id,
        });
      } else {
        await supplierPaymentService.createPayment(supplierId, data);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {paymentToEdit ? 'تعديل الدفع' : 'إضافة دفعة'}
          </DialogTitle>
          <DialogDescription>
            {paymentToEdit 
              ? 'تعديل معلومات الدفعة' 
              : 'إضافة دفعة جديدة للمورد'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الدفع</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الدفع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <FormLabel>طريقة الدفع</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Date */}
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الدفع</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                    />
                  </FormControl>
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
                  <FormLabel>رقم المرجع</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="أدخل رقم المرجع"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أدخل الملاحظات"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <LoadingSpinner className="mr-2 h-4 w-4" />}
                {paymentToEdit ? 'تحديث' : 'حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentFormModal; 