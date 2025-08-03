// src/components/pos/PaymentDialog.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Shadcn Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Icons
import { CreditCard, Trash2, Plus, AlertCircle } from "lucide-react";

// Types and Services
import { PaymentMethod } from "./types";
import { formatNumber, preciseSum } from "@/constants";
import saleService from "../../services/saleService";

// Payment Method Options
const paymentMethodOptions = [
  { value: 'cash', labelKey: 'paymentMethods:cash' },
  { value: 'visa', labelKey: 'paymentMethods:visa' },
  { value: 'mastercard', labelKey: 'paymentMethods:mastercard' },
  { value: 'bank_transfer', labelKey: 'paymentMethods:bank_transfer' },
  { value: 'mada', labelKey: 'paymentMethods:mada' },
  { value: 'store_credit', labelKey: 'paymentMethods:store_credit' },
  { value: 'other', labelKey: 'paymentMethods:other' },
];

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  saleId?: number;
  grandTotal: number;
  paidAmount: number;
  onSuccess: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  saleId,
  grandTotal,
  paidAmount,
  onSuccess,
}) => {
  const { t } = useTranslation(['pos', 'common', 'paymentMethods']);

  // State for existing payments
  const [payments, setPayments] = useState<import('../../services/saleService').Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // State for new payment form
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // State for operations
  const [addingPayment, setAddingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load payments when dialog opens
  useEffect(() => {
    if (open && saleId) {
      loadPayments();
      // Set default payment amount to remaining due
      const remainingDue = grandTotal - paidAmount;
      if (remainingDue > 0) {
        setPaymentAmount(remainingDue.toFixed(2));
      }
    } else {
      // Reset form when dialog closes
      resetForm();
    }
  }, [open, saleId, grandTotal, paidAmount]);

  const loadPayments = async () => {
    if (!saleId) return;

    setLoadingPayments(true);
    setError(null);
    try {
      const saleData = await saleService.getSale(saleId);
      setPayments(saleData.payments || []);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError(t('pos:failedToLoadPayments'));
    } finally {
      setLoadingPayments(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('cash');
    setPaymentAmount('');
    setError(null);
  };

  const handleAddPayment = async () => {
    if (!saleId || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      setError(t('pos:invalidPaymentAmount'));
      return;
    }

    // Check if payment amount exceeds remaining due
    const remainingDue = grandTotal - preciseSum(payments.map(p => Number(p.amount)), 2);
    if (amount > remainingDue) {
      setError(t('pos:paymentExceedsRemainingDue'));
      return;
    }

    setAddingPayment(true);
    setError(null);
    try {
      const paymentData = {
        method: paymentMethod,
        amount: amount,
        reference_number: null,
        notes: null,
      };

      await saleService.addPayment(saleId, paymentData);
      
      // Reload payments
      await loadPayments();
      
      // Reset form
      resetForm();
      
      // Notify parent of success
      onSuccess();
    } catch (err) {
      console.error('Failed to add payment:', err);
      const errorMessage = saleService.getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!saleId) return;

    setDeletingPaymentId(paymentId);
    setError(null);
    try {
      await saleService.deletePayment(saleId, paymentId);
      
      // Reload payments
      await loadPayments();
      
      // Notify parent of success
      onSuccess();
    } catch (err) {
      console.error('Failed to delete payment:', err);
      const errorMessage = saleService.getErrorMessage(err);
      setError(errorMessage);
      } finally {
      setDeletingPaymentId(null);
    }
  };

  const formatPaymentDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const totalPaid = preciseSum(payments.map(p => Number(p.amount)), 2);
  const remainingDue = Math.max(0, grandTotal - totalPaid);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>{t('pos:managePayments')}</span>
            {saleId && <span className="text-sm text-gray-500">- Sale #{saleId}</span>}
      </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">{t('pos:total')}</div>
                  <div className="text-lg font-bold text-gray-900">{formatNumber(grandTotal)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('pos:paid')}</div>
                  <div className="text-lg font-bold text-green-600">{formatNumber(totalPaid)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('pos:due')}</div>
                  <div className="text-lg font-bold text-orange-600">{formatNumber(remainingDue)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Existing Payments */}
          <div>
            <h3 className="text-lg font-semibold mb-3">{t('pos:existingPayments')}</h3>
            {loadingPayments ? (
              <div className="text-center py-4">
                <span className="text-gray-500">{t('common:loading')}...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {t('pos:noPaymentsYet')}
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {t(`paymentMethods:${payment.method}`)}
                        </Badge>
                        <span className="font-semibold">{formatNumber(Number(payment.amount))}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {payment.created_at && formatPaymentDate(payment.created_at)}
                        {payment.user_name && ` • ${payment.user_name}`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => payment.id && handleDeletePayment(payment.id)}
                      disabled={deletingPaymentId === payment.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deletingPaymentId === payment.id ? (
                        <span className="text-xs">...</span>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Payment */}
          {remainingDue > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>{t('pos:addNewPayment')}</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentMethod">{t('pos:paymentMethod')}</Label>
                    <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentAmount">{t('pos:amount')}</Label>
                    <Input
                      id="paymentAmount"
                       type="number"
                      step="0.01"
                      min="0"
                      max={remainingDue}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddPayment}
                  disabled={addingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full mt-4"
                >
                  {addingPayment ? (
                    <span>{t('common:saving')}...</span>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('pos:addPayment')}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common:close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 