// src/components/pos/PaymentSection.tsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
} from "@mui/material";

// MUI Icons
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Icons
import { CreditCard } from "lucide-react";

// Types
import { PaymentMethodData } from "./types";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";

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

interface PaymentLine {
  id: string;
  method: string;
  amount: number;
}

interface PaymentSectionProps {
  grandTotal: number;
  amountDue: number;
  paymentMethods?: PaymentMethodData[];
  onPaymentMethodsChange?: (paymentMethods: PaymentMethodData[]) => void;
  onTotalPaidChange?: (amount: number) => void;
  isEditMode?: boolean;
  salePayments?: Array<{
    id: number;
    method: string;
    amount: number;
    user_name?: string;
  }>;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  grandTotal,
  amountDue,
  paymentMethods: externalPaymentMethods = [],
  onPaymentMethodsChange,
  onTotalPaidChange,
  isEditMode = false,
  salePayments = [],
}) => {
  const { t } = useTranslation(['pos', 'common', 'paymentMethods']);

  // Local state for payment functionality
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const isMounted = useRef(true);

  // Calculate effective total paid
  const effectiveTotalPaid = paymentLines.length > 0
    ? preciseSum(paymentLines.map(line => line.amount || 0), 2)
    : 0;

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

  // Initialize payment lines with existing payment methods or sale payments
  useEffect(() => {
    if (!isMounted.current) return;
    
    // Prevent unnecessary re-initialization
    const hasPaymentLines = paymentLines.length > 0;
    
    if (salePayments && salePayments.length > 0) {
      // Use payments from fetched sale data
      const salePaymentLines: PaymentLine[] = salePayments.map((payment, index) => ({
        id: `sale-payment-${payment.id || index}`,
        method: payment.method,
        amount: Number(payment.amount),
      }));
      
      // Only update if different from current state
      const isDifferent = !hasPaymentLines || 
        salePaymentLines.length !== paymentLines.length ||
        salePaymentLines.some((line, index) => 
          !paymentLines[index] || 
          line.id !== paymentLines[index].id ||
          line.method !== paymentLines[index].method ||
          Math.abs(line.amount - paymentLines[index].amount) > 0.01
        );
      
      if (isDifferent) {
        setPaymentLines(salePaymentLines);
      }
    } else if (externalPaymentMethods.length > 0) {
      const existingPaymentLines: PaymentLine[] = externalPaymentMethods.map((payment, index) => ({
        id: `existing-${index}`,
        method: payment.method,
        amount: payment.amount,
      }));
      
      if (!hasPaymentLines || paymentLines[0]?.id?.startsWith('existing-')) {
        setPaymentLines(existingPaymentLines);
      }
    } else if (!hasPaymentLines) {
      // If no existing payments and no payment lines, start with one payment line
      setPaymentLines([{
        id: Date.now().toString(),
        method: 'cash',
        amount: grandTotal > 0 ? grandTotal : 0,
      }]);
    }
  }, [salePayments, externalPaymentMethods, grandTotal]);

  // Update payment amounts when grand total changes
  useEffect(() => {
    if (paymentLines.length > 0 && grandTotal > 0 && isMounted.current) {
      // Calculate the total amount already paid (excluding the last payment line)
      const existingPayments = paymentLines.slice(0, -1);
      const totalExistingPaid = preciseSum(existingPayments.map(line => line.amount || 0), 2);
      
      // Calculate the remaining amount that needs to be paid
      const remainingAmount = preciseCalculation(grandTotal, totalExistingPaid, 'subtract', 2);
      
      // Only update if the amount would actually change
      const lastPaymentLine = paymentLines[paymentLines.length - 1];
      const newAmount = Math.max(0, remainingAmount);
      
      if (lastPaymentLine && Math.abs(lastPaymentLine.amount - newAmount) > 0.01) {
        // Update only the last payment line with the remaining amount
        const updatedPaymentLines = paymentLines.map((line, index) => {
          if (index === paymentLines.length - 1) {
            return {
              ...line,
              amount: newAmount
            };
          }
          return line;
        });
        setPaymentLines(updatedPaymentLines);
      }
    }
  }, [grandTotal]);

  // Update parent's payment methods when payment lines change
  useEffect(() => {
    if (onPaymentMethodsChange && paymentLines.length > 0 && isMounted.current) {
      const updatedPaymentMethods: PaymentMethodData[] = paymentLines.map(line => ({
        method: line.method as 'cash' | 'visa' | 'mastercard' | 'bank_transfer' | 'mada' | 'store_credit' | 'other',
        amount: line.amount,
      }));
      onPaymentMethodsChange(updatedPaymentMethods);
    }
  }, [paymentLines]);

  // Update parent's total paid when effective total paid changes
  useEffect(() => {
    if (onTotalPaidChange && effectiveTotalPaid >= 0 && isMounted.current) {
      onTotalPaidChange(effectiveTotalPaid);
    }
  }, [effectiveTotalPaid]);

  const addPaymentLine = () => {
    // Calculate the total amount already paid
    const totalExistingPaid = preciseSum(paymentLines.map(line => line.amount || 0), 2);
    
    // Calculate the remaining amount that needs to be paid
    const remainingAmount = preciseCalculation(grandTotal, totalExistingPaid, 'subtract', 2);
    
    const newPaymentLine: PaymentLine = {
      id: Date.now().toString(),
      method: 'cash',
      amount: Math.max(0, remainingAmount),
    };
    setPaymentLines([...paymentLines, newPaymentLine]);
  };

  const removePaymentLine = (id: string) => {
    setPaymentLines(paymentLines.filter(line => line.id !== id));
  };

  const updatePaymentLine = (id: string, field: keyof PaymentLine, value: string | number) => {
    setPaymentLines(paymentLines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const validatePayments = (): boolean => {
    const newErrors: string[] = [];
    
    if (paymentLines.length === 0) {
      newErrors.push('At least one payment method is required');
    }
    
    // Only validate payment amounts if there's actually a total to pay
    if (grandTotal > 0) {
      if (effectiveTotalPaid < grandTotal) {
        newErrors.push(`Total paid (${formatNumber(effectiveTotalPaid)}) is less than total amount (${formatNumber(grandTotal)})`);
      }
      
      if (effectiveTotalPaid > grandTotal) {
        newErrors.push(`Total paid (${formatNumber(effectiveTotalPaid)}) exceeds total amount (${formatNumber(grandTotal)})`);
      }
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Expose validation function to parent
  useEffect(() => {
    if (isMounted.current) {
      validatePayments();
    }
  }, [paymentLines, grandTotal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>{t('pos:paymentMethods')}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addPaymentLine}
            disabled={grandTotal === 0 || effectiveTotalPaid >= grandTotal}
            className="h-8 px-2"
          >
            <AddIcon className="h-4 w-4 mr-1" />
            {t('pos:addPaymentMethod')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <Typography key={index} variant="body2">
                {error}
              </Typography>
            ))}
          </Alert>
        )}

        {paymentLines.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            {t('pos:noPaymentsAdded')}
          </Typography>
        ) : (
          <div className="space-y-1">
            {paymentLines.map((paymentLine) => {
              const isFromSale = paymentLine.id.startsWith('sale-payment-');
              return (
                <div key={paymentLine.id} className="relative border border-gray-200 rounded-md p-2">
                  {!isFromSale && (
                    <IconButton
                      size="small"
                      onClick={() => removePaymentLine(paymentLine.id)}
                      className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                    >
                      <DeleteIcon className="h-4 w-4" />
                    </IconButton>
                  )}
                  
                  <div className="flex gap-1 items-end">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>{t('pos:paymentMethod')}</InputLabel>
                      <Select
                        value={paymentLine.method}
                        onChange={(e) => updatePaymentLine(paymentLine.id, 'method', e.target.value)}
                        label={t('pos:paymentMethod')}
                        disabled={isFromSale}
                      >
                        {paymentMethodOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {getPaymentMethodName(option.value)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <TextField
                      size="small"
                      label={t('pos:paymentAmount')}
                      type="number"
                      value={paymentLine.amount}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value >= 0) {
                          updatePaymentLine(paymentLine.id, 'amount', value);
                        }
                      }}
                      inputProps={{
                        min: 0,
                        step: 0.01,
                        max: amountDue + paymentLine.amount
                      }}
                      error={paymentLine.amount > amountDue + paymentLine.amount}
                      helperText={paymentLine.amount > amountDue + paymentLine.amount ? 'Amount exceeds remaining balance' : ''}
                      sx={{ minWidth: 120 }}
                      disabled={isFromSale}
                    />
                  </div>
                  
                  {isFromSale && (
                    <div className="mt-1 text-xs text-gray-500">
                      {t('pos:paymentFromSale')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Payment Summary */}
        {paymentLines.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:amountPaid')}</span>
                <span className="font-medium text-blue-600">{formatNumber(effectiveTotalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:amountDue')}</span>
                <span className={`font-medium ${amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatNumber(amountDue)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 