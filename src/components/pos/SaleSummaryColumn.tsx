// src/components/pos/SaleSummaryColumn.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Icons
import { 
  Trash2, 
  CreditCard, 
  Receipt,
  X,
  DollarSign,
} from "lucide-react";

// Types
import { CartItem, PaymentMethodData } from "./types";
import { formatNumber, preciseSum } from "@/constants";

interface SaleSummaryColumnProps {
  currentSaleItems: CartItem[];
  onProceedToPayment: () => void;
  onClearSale: () => void;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  totalPaid?: number;
  paymentMethods?: PaymentMethodData[];
  onRemovePayment?: (index: number) => void;
  onCancelPayment?: () => void;
}

export const SaleSummaryColumn: React.FC<SaleSummaryColumnProps> = ({
  currentSaleItems,
  onProceedToPayment,
  onClearSale,
  discountAmount = 0,
  discountType = 'fixed',
  totalPaid = 0,
  paymentMethods = [],
  onRemovePayment,
  onCancelPayment,
}) => {
  const { t } = useTranslation(['pos', 'common']);

  const subtotal = preciseSum(currentSaleItems.map(item => item.total));
  
  // Calculate discount value
  const discountValue = discountType === 'percentage' 
    ? (subtotal * discountAmount) / 100 
    : discountAmount;
  
  const total = subtotal - discountValue;
  const amountDue = total - totalPaid;

  // Helper function to get payment method display name
  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'نقداً',
      'visa': 'فيزا',
      'mastercard': 'ماستركارد',
      'bank_transfer': 'تحويل بنكي',
      'mada': 'مدى',
      'store_credit': 'رصيد المحل',
      'other': 'أخرى',
      'refund': 'استرداد'
    };
    return methods[method] || method;
  };

  // Helper function to determine if payment is a refund
  const isRefund = (payment: PaymentMethodData) => {
    return payment.method === 'refund' || payment.amount < 0;
  };

  return (
    <div className="w-80 flex flex-col p-4 space-y-4">
      {/* Sale Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>{t('pos:saleSummary')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('pos:itemsCount')}</span>
            <span className="font-medium">{currentSaleItems.length}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">{t('pos:subtotal')}</span>
            <span className="font-medium">{formatNumber(subtotal)}</span>
          </div>

          {/* Discount Section */}
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:discount')}</span>
                <span className="font-medium text-green-600">
                  {discountType === 'percentage' 
                    ? `${discountAmount}%` 
                    : formatNumber(discountAmount)
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:discountValue')}</span>
                <span className="font-medium text-green-600">-{formatNumber(discountValue)}</span>
              </div>
            </>
          )}

          <Separator />
          
          <div className="flex justify-between">
            <span className="text-lg font-bold">{t('pos:total')}</span>
            <span className="text-lg font-bold text-green-600">{formatNumber(total)}</span>
          </div>

          {/* Payment Methods Section */}
          {paymentMethods.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">{t('pos:paymentMethods')}</span>
                  {onCancelPayment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCancelPayment}
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t('pos:cancelPayments')}
                    </Button>
                  )}
                </div>
                
                {paymentMethods.map((payment, index) => (
                  <div key={index} className={`flex items-center justify-between p-2 rounded-md ${
                    isRefund(payment) ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <DollarSign className={`h-4 w-4 ${
                        isRefund(payment) ? 'text-red-500' : 'text-gray-500'
                      }`} />
                      <div>
                        <div className={`font-medium text-sm ${
                          isRefund(payment) ? 'text-red-700' : ''
                        }`}>
                          {getPaymentMethodName(payment.method)}
                        </div>
                        {payment.reference && (
                          <div className={`text-xs ${
                            isRefund(payment) ? 'text-red-500' : 'text-gray-500'
                          }`}>
                            Ref: {payment.reference}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium text-sm ${
                        isRefund(payment) ? 'text-red-700' : ''
                      }`}>
                        {isRefund(payment) ? '-' : ''}{formatNumber(Math.abs(payment.amount))}
                      </span>
                      {onRemovePayment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemovePayment(index)}
                          className={`h-6 w-6 p-0 hover:bg-red-50 ${
                            isRefund(payment) ? 'text-red-600 hover:text-red-700' : 'text-red-600 hover:text-red-700'
                          }`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Total Paid Section */}
          {totalPaid > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:amountPaid')}</span>
                <span className="font-medium text-blue-600">{formatNumber(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:amountDue')}</span>
                <span className={`font-medium ${amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatNumber(amountDue)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={onProceedToPayment}
          disabled={currentSaleItems.length === 0}
          className="w-full h-12 text-lg"
          size="lg"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {amountDue > 0 ? t('pos:addPayment') : t('pos:proceedToPayment')}
        </Button>
        <Button
          variant="outline"
          onClick={onClearSale}
          disabled={currentSaleItems.length === 0}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('pos:clearSale')}
        </Button>
      </div>
    </div>
  );
}; 