// src/components/pos/SalePaymentCard.tsx
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
  CircularProgress,
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
import { PaymentMethodData, Sale, PaymentMethod } from "./types";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
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

interface PaymentLine {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface SalePaymentCardProps {
  saleId?: number;
  grandTotal: number;
  onPaymentComplete: (errorMessage?: string) => void;
  isEditMode?: boolean;
}

export const SalePaymentCard: React.FC<SalePaymentCardProps> = ({
  saleId,
  grandTotal,
  onPaymentComplete,
  isEditMode = false,
}) => {
  const { t } = useTranslation(['pos', 'common', 'paymentMethods']);

  // Local state for payment functionality
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Sale info state
  const [saleInfo, setSaleInfo] = useState<Sale | null>(null);
  const [loadingSaleInfo, setLoadingSaleInfo] = useState(false);

  // Fetch sale info when saleId changes
  useEffect(() => {
    if (saleId) {
      // Reset payment lines and errors when switching to a new sale
      setPaymentLines([]);
      setErrors([]);
      fetchSaleInfo();
    } else {
      setSaleInfo(null);
      setPaymentLines([]);
      setErrors([]);
    }
  }, [saleId]);

  const fetchSaleInfo = async () => {
    if (!saleId) return;

    setLoadingSaleInfo(true);
    try {
      const saleData = await saleService.getSale(saleId);
      
      // Transform the backend sale data to match our Sale interface
      const transformedSale: Sale = {
        id: saleData.id,
        sale_order_number: saleData.sale_order_number,
        client_id: saleData.client_id,
        client_name: saleData.client_name,
        user_id: saleData.user_id,
        user_name: saleData.user_name,
        sale_date: saleData.sale_date,
        invoice_number: saleData.invoice_number,
        status: saleData.status,
        total_amount: Number(saleData.total_amount),
        paid_amount: Number(saleData.paid_amount),
        due_amount: Number(saleData.due_amount || 0),
        notes: saleData.notes,
        created_at: saleData.created_at,
        updated_at: saleData.updated_at,
        items: saleData.items?.map((item: any) => ({
          id: item.id,
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku || 'N/A',
            suggested_sale_price_per_sellable_unit: Number(item.unit_price),
            last_sale_price_per_sellable_unit: Number(item.unit_price),
            stock_quantity: item.current_stock_quantity || 0,
            stock_alert_level: item.stock_alert_level,
            earliest_expiry_date: item.earliest_expiry_date,
            current_stock_quantity: item.current_stock_quantity || 0,
            sellable_unit_name: item.sellable_unit_name || 'Piece'
          },
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total_price || item.quantity * Number(item.unit_price))
        })) || [],
        payments: saleData.payments?.map((payment: any) => ({
          id: payment.id,
          sale_id: payment.sale_id,
          user_name: payment.user_name,
          method: payment.method,
          amount: Number(payment.amount),
          payment_date: payment.payment_date,
          reference_number: payment.reference_number || undefined,
          notes: payment.notes || undefined,
          created_at: payment.created_at
        })) || [],
        timestamp: new Date(saleData.sale_date)
      };
      
      setSaleInfo(transformedSale);
    } catch (error) {
      console.error('Failed to fetch sale info:', error);
      setSaleInfo(null);
    } finally {
      setLoadingSaleInfo(false);
    }
  };

  // Use fetched sale data for totals when available (for completed sales)
  const effectiveGrandTotal = saleInfo ? Number(saleInfo.total_amount) : grandTotal;
  
  // Calculate effective total paid - prioritize payment lines for new payments, then sale info for existing payments
  let effectiveTotalPaid: number;
  if (paymentLines.length > 0) {
    // If we have payment lines, use them (for new payments being added)
    effectiveTotalPaid = preciseSum(paymentLines.map(line => line.amount || 0), 2);
  } else if (saleInfo) {
    // If no payment lines but we have sale info, use the sale's paid amount
    effectiveTotalPaid = Number(saleInfo.paid_amount);
  } else {
    // If no payment lines yet, use grand total as default
    effectiveTotalPaid = grandTotal;
  }
  
  const amountDue = preciseCalculation(effectiveGrandTotal, effectiveTotalPaid, 'subtract', 2);

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
    if (saleInfo?.payments && saleInfo.payments.length > 0) {
      // Use payments from fetched sale data
      const salePaymentLines: PaymentLine[] = saleInfo.payments.map((payment, index) => ({
        id: `sale-payment-${payment.id || index}`,
        method: payment.method,
        amount: Number(payment.amount),
      }));
      setPaymentLines(salePaymentLines);
    } else {
      // If no existing payments (including empty array from empty sale), start with one payment line
      // Only set amount if grandTotal is greater than 0, otherwise leave it empty
      setPaymentLines([{
        id: Date.now().toString(),
        method: 'cash',
        amount: grandTotal > 0 ? grandTotal : 0,
      }]);
    }
  }, [saleInfo?.payments, saleInfo?.payments?.length, grandTotal, saleId]);

  // Reset payment-related state when sale changes
  useEffect(() => {
    if (saleId) {
      setErrors([]);
    }
  }, [saleId]);

  // Reset payment lines when sale info shows empty payments (like empty sale)
  useEffect(() => {
    if (saleInfo && saleInfo.payments && saleInfo.payments.length === 0) {
      // Reset to one payment line with grand total for empty sales
      // Only set amount if grandTotal is greater than 0, otherwise leave it empty
      setPaymentLines([{
        id: Date.now().toString(),
        method: 'cash',
        amount: grandTotal > 0 ? grandTotal : 0,
      }]);
    }
  }, [saleInfo?.payments, grandTotal]);

  // Update payment amounts when grandTotal changes
  useEffect(() => {
    if (paymentLines.length > 0 && grandTotal > 0) {
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
            amount: Math.max(0, remainingAmount)
          };
        }
        return line;
      });
      setPaymentLines(updatedPaymentLines);
    }
  }, [grandTotal, paymentLines.length]);

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
    if (effectiveGrandTotal > 0) {
      if (effectiveTotalPaid < effectiveGrandTotal) {
        newErrors.push(`Total paid (${formatNumber(effectiveTotalPaid)}) is less than total amount (${formatNumber(effectiveGrandTotal)})`);
      }
      
      if (effectiveTotalPaid > effectiveGrandTotal) {
        newErrors.push(`Total paid (${formatNumber(effectiveTotalPaid)}) exceeds total amount (${formatNumber(effectiveGrandTotal)})`);
      }
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleCompletePayment = async () => {
    if (validatePayments()) {
      setIsSaving(true);
      try {
        if (isEditMode && saleId) {
          // Add payments to existing sale using the dedicated endpoint
          const paymentData = {
            payments: paymentLines.map(payment => ({
              method: payment.method,
              amount: payment.amount,
              payment_date: new Date().toISOString().split('T')[0],
              reference_number: null,
              notes: null,
            })),
          };
          
          await saleService.addPaymentToSale(saleId, paymentData);
        }
        
        // Call the completion callback
        onPaymentComplete();
        setPaymentLines([]);
        setErrors([]);

      } catch (error: unknown) {
        console.error('Failed to save payment to database:', error);
        
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
            setErrors(['Failed to save payment to database. Please try again.']);
          }
        } else {
          setErrors(['Failed to save payment to database. Please try again.']);
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>{t('pos:paymentMethods')}</span>
            {loadingSaleInfo && (
              <div className="flex items-center space-x-2 ml-2">
                <CircularProgress size={16} />
                <span className="text-sm text-blue-500">
                  {t('common:loading')}...
                </span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addPaymentLine}
            disabled={loadingSaleInfo || effectiveGrandTotal === 0 || effectiveTotalPaid >= effectiveGrandTotal}
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

        {loadingSaleInfo ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                {t('common:loading')} {t('pos:paymentMethods').toLowerCase()}...
              </Typography>
            </div>
          </div>
        ) : paymentLines.length === 0 ? (
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
        {!loadingSaleInfo && paymentLines.length > 0 && (
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

        {/* Action Button */}
        {!loadingSaleInfo && (
          <div className="pt-2">
            <Button
              onClick={handleCompletePayment}
              disabled={effectiveGrandTotal === 0 || Math.abs(effectiveTotalPaid - effectiveGrandTotal) > 0.01 || isSaving}
              className={`w-full h-12 text-lg transition-all duration-300 ${
                effectiveGrandTotal > 0 && Math.abs(effectiveTotalPaid - effectiveGrandTotal) <= 0.01 && !isSaving
                  ? 'bg-sky-500 hover:bg-sky-600 animate-pulse shadow-lg'
                  : 'bg-gray-400 hover:bg-gray-500'
              }`}
              size="lg"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {isSaving ? t('pos:savingPayment') : t('pos:completePayment')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 