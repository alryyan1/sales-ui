// src/components/pos/SaleSummaryColumn.tsx
import React, { useState, useEffect } from "react";
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
import { 
  CreditCard, 
  Receipt,
} from "lucide-react";

// Types
import { CartItem, PaymentMethodData } from "./types";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import saleService, { CreateSaleData } from "../../services/saleService";

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

interface SaleSummaryColumnProps {
  currentSaleItems: CartItem[];
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  totalPaid?: number;
  paymentMethods?: PaymentMethodData[];
  onDiscountChange?: (amount: number, type: 'percentage' | 'fixed') => void;
  onTotalPaidChange?: (amount: number) => void;
  onPaymentMethodsChange?: (paymentMethods: PaymentMethodData[]) => void;
  isEditMode?: boolean;
  saleId?: number;
  onPaymentComplete: (errorMessage?: string) => void;
}

export const SaleSummaryColumn: React.FC<SaleSummaryColumnProps> = ({
  currentSaleItems,
  discountAmount: externalDiscountAmount = 0,
  discountType: externalDiscountType = 'fixed',
  totalPaid: externalTotalPaid = 0,
  paymentMethods: externalPaymentMethods = [],
  onDiscountChange,
  onTotalPaidChange,
  onPaymentMethodsChange,
  isEditMode = false,
  saleId,
  onPaymentComplete,
}) => {
  const { t } = useTranslation(['pos', 'common', 'paymentMethods']);

  // Local state for payment functionality
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(externalDiscountAmount);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(externalDiscountType);


  const subtotal = preciseSum(currentSaleItems.map(item => item.total), 2);
  
  // Calculate discount
  const discountValue = discountType === 'percentage' 
    ? preciseCalculation(subtotal, discountAmount / 100, 'multiply', 2)
    : discountAmount;
  
  // Ensure discount doesn't exceed subtotal
  const actualDiscountValue = Math.min(discountValue, subtotal);
  const afterDiscount = preciseCalculation(subtotal, actualDiscountValue, 'subtract', 2);
  const grandTotal = afterDiscount; // No tax calculation
  const totalPaid = preciseSum(paymentLines.map(line => line.amount || 0), 2);
  const amountDue = preciseCalculation(grandTotal, totalPaid, 'subtract', 2);

  // Initialize payment lines with existing payment methods
  useEffect(() => {
    if (externalPaymentMethods.length > 0) {
      const existingPaymentLines: PaymentLine[] = externalPaymentMethods.map((payment, index) => ({
        id: `existing-${index}`,
        method: payment.method,
        amount: payment.amount,
      }));
      setPaymentLines(existingPaymentLines);
    } else {
      // If no existing payments, start with one empty payment line
      setPaymentLines([{
        id: Date.now().toString(),
        method: 'cash',
        amount: grandTotal,
      }]);
    }
  }, [externalPaymentMethods.length, grandTotal]);

  // Sync internal discount state with external changes
  useEffect(() => {
    setDiscountAmount(externalDiscountAmount);
    setDiscountType(externalDiscountType);
  }, [externalDiscountAmount, externalDiscountType]);

  // Update external state when internal state changes
  useEffect(() => {
    if (onDiscountChange) {
      onDiscountChange(discountAmount, discountType);
    }
  }, [discountAmount, discountType, onDiscountChange]);

  useEffect(() => {
    if (onTotalPaidChange) {
      onTotalPaidChange(totalPaid);
    }
  }, [totalPaid, onTotalPaidChange]);

  // Update parent's payment methods when payment lines change
  useEffect(() => {
    if (onPaymentMethodsChange) {
      const updatedPaymentMethods: PaymentMethodData[] = paymentLines.map(line => ({
        method: line.method as any,
        amount: line.amount,
      }));
      onPaymentMethodsChange(updatedPaymentMethods);
    }
  }, [paymentLines, onPaymentMethodsChange]);



  // Update payment amounts when discount changes
  useEffect(() => {
    if (paymentLines.length > 0) {
      // Calculate the total amount already paid (excluding the last payment line)
      const existingPayments = paymentLines.slice(0, -1);
      const totalExistingPaid = preciseSum(existingPayments.map(line => line.amount || 0), 2);
      
      // Calculate the remaining amount that needs to be paid
      const remainingAmount = preciseCalculation(grandTotal, totalExistingPaid, 'subtract', 2);
      
      // Update only the last payment line with the remaining amount
      const updatedPaymentLines = paymentLines.map((line, index) => {
        if (index === paymentLines.length - 1) {
          return {
            ...line,
            amount: Math.max(0.01, remainingAmount)
          };
        }
        return line;
      });
      setPaymentLines(updatedPaymentLines);
    }
  }, [discountAmount, discountType, grandTotal, paymentLines.length]);

  const addPaymentLine = () => {
    // Calculate the total amount already paid
    const totalExistingPaid = preciseSum(paymentLines.map(line => line.amount || 0), 2);
    
    // Calculate the remaining amount that needs to be paid
    const remainingAmount = preciseCalculation(grandTotal, totalExistingPaid, 'subtract', 2);
    
    const newPaymentLine: PaymentLine = {
      id: Date.now().toString(),
      method: 'cash',
      amount: Math.max(0.01, remainingAmount),
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
    
    // Validate discount
    if (discountType === 'percentage' && discountAmount > 100) {
      newErrors.push('Discount percentage cannot exceed 100%');
    }
    
    if (discountType === 'fixed' && discountAmount > subtotal) {
      newErrors.push('Discount amount cannot exceed subtotal');
    }
    
    if (totalPaid < grandTotal) {
      newErrors.push(`Total paid (${formatNumber(totalPaid)}) is less than total amount (${formatNumber(grandTotal)})`);
    }
    
    if (totalPaid > grandTotal) {
      newErrors.push(`Total paid (${formatNumber(totalPaid)}) exceeds total amount (${formatNumber(grandTotal)})`);
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleCompleteSale = async () => {
    if (validatePayments()) {
      setIsSaving(true);
      try {
        if (isEditMode && saleId) {
          // Add payments to existing sale using the dedicated endpoint
          const paymentData = {
            payments: paymentLines.map(payment => ({
              method: payment.method as any,
              amount: payment.amount,
              payment_date: new Date().toISOString().split('T')[0],
              reference_number: null,
              notes: null,
            })),
          };
          
          await saleService.addPaymentToSale(saleId, paymentData);
        } else {
          // Create new sale
          const saleData: CreateSaleData = {
            client_id: null,
            sale_date: new Date().toISOString().split('T')[0], // Today's date
            status: 'completed',
            notes: `POS Sale - ${new Date().toLocaleString()}`,
            items: currentSaleItems.map(item => ({
              product_id: item.product.id,
              quantity: item.quantity,
              unit_price: item.unitPrice,
            })),
            payments: paymentLines.map(payment => ({
              method: payment.method as any,
              amount: payment.amount,
              payment_date: new Date().toISOString().split('T')[0],
              reference_number: null,
              notes: null,
            })),
          };

          await saleService.createSale(saleData);
        }
        
        // Call the completion callback
        onPaymentComplete();
        setPaymentLines([]);
        setErrors([]);
        setDiscountAmount(0);

      } catch (error: unknown) {
        console.error('Failed to save sale to database:', error);
        
        // Handle insufficient stock error
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
          if (axiosError.response?.data?.message) {
            const errorMessage = axiosError.response.data.message;
            setErrors([errorMessage]);
            
            // Pass error message to parent component for toast display
            onPaymentComplete(errorMessage);
          } else if (axiosError.response?.data?.errors) {
            // Handle validation errors
            const errorMessages = Object.values(axiosError.response.data.errors).flat();
            const errorMessage = Array.isArray(errorMessages) ? errorMessages[0] : 'Validation error occurred';
            setErrors([errorMessage]);
            onPaymentComplete(errorMessage);
          } else {
            setErrors(['Failed to save sale to database. Please try again.']);
          }
        } else {
          setErrors(['Failed to save sale to database. Please try again.']);
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

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
    <div className="w-96 flex flex-col p-4 space-y-4 overflow-y-auto max-h-screen">
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
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('pos:discount')}</span>
              <div className="flex items-center space-x-2">
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    size="small"
                  >
                    <MenuItem value="percentage">%</MenuItem>
                    <MenuItem value="fixed">$</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  type="number"
                  value={discountAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 0) {
                      setDiscountAmount(value);
                    }
                  }}
                  inputProps={{
                    min: 0,
                    max: discountType === 'percentage' ? 100 : subtotal,
                    step: 0.01
                  }}
                  sx={{ width: 80 }}
                  error={discountType === 'percentage' ? discountAmount > 100 : discountAmount > subtotal}
                />
              </div>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:discountValue')}</span>
                <span className="font-medium text-green-600">-{formatNumber(actualDiscountValue)}</span>
              </div>
            )}
          </div>

          <Separator />
          
          <div className="flex justify-between">
            <span className="text-lg font-bold">{t('pos:total')}</span>
            <span className="text-lg font-bold text-green-600">{formatNumber(grandTotal)}</span>
          </div>
        </CardContent>
      </Card>



      {/* Payment Methods Section */}
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
              disabled={totalPaid >= grandTotal}
              className="h-8 px-2"
            >
              <AddIcon className="h-4 w-4 mr-1" />
              {t('pos:addPaymentMethod')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
            <div className="space-y-2">
              {paymentLines.map((paymentLine) => (
                <div key={paymentLine.id} className="relative border border-gray-200 rounded-md p-3">
                  <IconButton
                    size="small"
                    onClick={() => removePaymentLine(paymentLine.id)}
                    className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                  >
                    <DeleteIcon className="h-4 w-4" />
                  </IconButton>
                  
                  <div className="flex gap-2 items-end">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>{t('pos:paymentMethod')}</InputLabel>
                      <Select
                        value={paymentLine.method}
                        onChange={(e) => updatePaymentLine(paymentLine.id, 'method', e.target.value)}
                        label={t('pos:paymentMethod')}
                      >
                        {paymentMethodOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {t(option.labelKey)}
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
                        min: 0.01,
                        step: 0.01,
                        max: amountDue + paymentLine.amount
                      }}
                      error={paymentLine.amount > amountDue + paymentLine.amount}
                      helperText={paymentLine.amount > amountDue + paymentLine.amount ? 'Amount exceeds remaining balance' : ''}
                      sx={{ minWidth: 120 }}
                    />
                    

                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Summary */}
          {paymentLines.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={handleCompleteSale}
          disabled={currentSaleItems.length === 0 || totalPaid !== grandTotal || isSaving}
          className={`w-full h-12 text-lg transition-all duration-300 ${
            currentSaleItems.length > 0 && totalPaid === grandTotal && !isSaving
              ? 'bg-sky-500 hover:bg-sky-600 animate-pulse shadow-lg'
              : 'bg-gray-400 hover:bg-gray-500'
          }`}
          size="lg"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {isSaving ? t('pos:savingSale') : t('pos:completeSale')}
        </Button>
      </div>
    </div>
  );
}; 