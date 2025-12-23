// src/components/pos/SalePaymentSection.tsx
import React, { useState, useEffect } from "react";

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
import { Sale } from "./types";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import saleService from "../../services/saleService";

// Payment Method Options
const paymentMethodOptions = [
  { value: 'cash', label: 'نقداً' },
  { value: 'visa', label: 'فيزا' },
  { value: 'mastercard', label: 'ماستركارد' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'mada', label: 'مدى' },
  { value: 'store_credit', label: 'رصيد المحل' },
  { value: 'other', label: 'أخرى' },
];

interface PaymentLine {
  id: string;
  method: string;
  amount: number;
}

interface SalePaymentSectionProps {
  sale: Sale | null;
  onPaymentComplete?: () => void;
}

export const SalePaymentSection: React.FC<SalePaymentSectionProps> = ({
  sale,
  onPaymentComplete,
}) => {
  // Local state for payment functionality
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate effective total paid
  const effectiveTotalPaid = paymentLines.length > 0
    ? preciseSum(paymentLines.map(line => line.amount || 0), 2)
    : 0;

  // Calculate amounts
  const grandTotal = sale ? Number(sale.total_amount) : 0;
  const amountDue = preciseCalculation(grandTotal, effectiveTotalPaid, 'subtract', 2);

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

  // Initialize payment lines when sale changes
  useEffect(() => {
    if (sale?.payments && sale.payments.length > 0) {
      // Use existing payments from sale
      const existingPaymentLines: PaymentLine[] = sale.payments.map((payment, index) => ({
        id: `sale-payment-${payment.id || index}`,
        method: payment.method,
        amount: Number(payment.amount),
      }));
      setPaymentLines(existingPaymentLines);
    } else if (sale && grandTotal > 0) {
      // Create a default payment line for the full amount
      setPaymentLines([{
        id: Date.now().toString(),
        method: 'cash',
        amount: grandTotal,
      }]);
    } else {
      // Clear payment lines if no sale
      setPaymentLines([]);
    }
    setErrors([]);
  }, [sale, grandTotal]);

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

  const handleAddPayments = async () => {
    if (!sale || !validatePayments()) return;

    setIsSaving(true);
    try {
      // Add payments to the existing sale
      const paymentData = {
        payments: paymentLines.map(payment => ({
          method: payment.method as 'cash' | 'visa' | 'mastercard' | 'bank_transfer' | 'mada' | 'store_credit' | 'other',
          amount: payment.amount,
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: null,
          notes: null,
        })),
      };
      
      await saleService.addPaymentToSale(sale.id, paymentData);
      
      // Clear payment lines and call completion callback
      setPaymentLines([]);
      setErrors([]);
      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (error: unknown) {
      console.error('Failed to add payments to sale:', error);
      
      // Handle error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
        if (axiosError.response?.data?.message) {
          const errorMessage = axiosError.response.data.message;
          setErrors([errorMessage]);
        } else if (axiosError.response?.data?.errors) {
          // Handle validation errors
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : 'Validation error occurred';
          setErrors([errorMessage]);
        } else {
          setErrors(['Failed to add payments to sale. Please try again.']);
        }
      } else {
        setErrors(['Failed to add payments to sale. Please try again.']);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render if no sale is selected
  if (!sale) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Typography variant="body2" color="text.secondary">
            اختر بيعًا لإضافة دفعات
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>إضافة دفعات</span>
            <span className="text-sm text-gray-500">
              #{sale.sale_order_number || sale.id}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addPaymentLine}
            disabled={grandTotal === 0 || effectiveTotalPaid >= grandTotal}
            className="h-8 px-2"
          >
            <AddIcon className="h-4 w-4 mr-1" />
            إضافة طريقة دفع
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Sale Information */}
        <div className="bg-gray-50 p-2 rounded space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">تاريخ البيع</span>
            <span>{new Date(sale.sale_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">المبلغ الإجمالي</span>
            <span className="font-medium">{formatNumber(grandTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">المبلغ المدفوع</span>
            <span className="font-medium text-green-600">{formatNumber(sale.paid_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">المبلغ المستحق</span>
            <span className="font-medium text-red-600">{formatNumber(sale.due_amount)}</span>
          </div>
        </div>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <Typography key={index} variant="body2">
                {error}
              </Typography>
            ))}
          </Alert>
        )}

        {/* Payment Lines */}
        {paymentLines.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            لم تتم إضافة دفعات
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
                      <InputLabel>طريقة الدفع</InputLabel>
                      <Select
                        value={paymentLine.method}
                        onChange={(e) => updatePaymentLine(paymentLine.id, 'method', e.target.value)}
                        label="طريقة الدفع"
                        disabled={isFromSale}
                      >
                        {paymentMethodOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <TextField
                      size="small"
                      label="مبلغ الدفع"
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
                      helperText={paymentLine.amount > amountDue + paymentLine.amount ? 'المبلغ يتجاوز الرصيد المتبقي' : ''}
                      sx={{ minWidth: 120 }}
                      disabled={isFromSale}
                    />
                  </div>
                  
                  {isFromSale && (
                    <div className="mt-1 text-xs text-gray-500">
                      دفعة موجودة
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
                <span className="text-gray-600">مبلغ الدفعة الجديدة</span>
                <span className="font-medium text-blue-600">{formatNumber(effectiveTotalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">المتبقي المستحق</span>
                <span className={`font-medium ${amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatNumber(amountDue)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Action Button */}
        {paymentLines.length > 0 && (
          <div className="mt-4">
            <Button
              onClick={handleAddPayments}
              disabled={paymentLines.length === 0 || Math.abs(effectiveTotalPaid - amountDue) > 0.01 || isSaving}
              className="w-full"
              size="default"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isSaving ? 'جاري إضافة الدفعات...' : 'إضافة دفعات'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};