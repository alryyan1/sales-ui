// src/components/pos/PaymentDialog.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Autocomplete,
  Chip,
} from "@mui/material";

// MUI Icons
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Discount as DiscountIcon,
  Person as PersonIcon,
} from "@mui/icons-material";



// Types
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import { CartItem, PaymentMethod, PaymentMethodData } from "./types";
import saleService, { CreateSaleData } from "../../services/saleService";
import clientService, { Client } from "../../services/clientService";

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
  reference_number: string;
}

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onPaymentComplete: (errorMessage?: string) => void;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  onDiscountChange?: (amount: number, type: 'percentage' | 'fixed') => void;
  totalPaid?: number;
  onTotalPaidChange?: (amount: number) => void;
  paymentMethods?: PaymentMethodData[];
  onPaymentMethodsChange?: (paymentMethods: PaymentMethodData[]) => void;
  // Add edit mode props
  isEditMode?: boolean;
  saleId?: number;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  items,
  onPaymentComplete,
  discountAmount: externalDiscountAmount = 0,
  discountType: externalDiscountType = 'percentage',
  onDiscountChange,
  onTotalPaidChange,
  paymentMethods = [],
  onPaymentMethodsChange,
  isEditMode = false,
  saleId,
}) => {
  const { t } = useTranslation(['pos', 'common', 'paymentMethods']);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(externalDiscountAmount);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(externalDiscountType);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const subtotal = preciseSum(items.map(item => item.total), 2);
  
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

  // Initialize payment lines with existing payment methods when dialog opens
  useEffect(() => {
    if (open && paymentMethods.length > 0) {
      const existingPaymentLines: PaymentLine[] = paymentMethods.map((payment, index) => ({
        id: `existing-${index}`,
        method: payment.method,
        amount: payment.amount,
        reference_number: payment.reference || '',
      }));
      setPaymentLines(existingPaymentLines);
    } else if (open && paymentMethods.length === 0) {
      // If no existing payments, start with one empty payment line
      setPaymentLines([{
        id: Date.now().toString(),
        method: 'cash',
        amount: grandTotal,
        reference_number: '',
      }]);
    }
  }, [open, paymentMethods.length, grandTotal]); // Changed dependency to paymentMethods.length

  // Sync internal discount state with external changes
  useEffect(() => {
    if (open) {
      setDiscountAmount(externalDiscountAmount);
      setDiscountType(externalDiscountType);
    }
  }, [open, externalDiscountAmount, externalDiscountType]);

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
    if (onPaymentMethodsChange && open) {
      const updatedPaymentMethods: PaymentMethodData[] = paymentLines.map(line => ({
        method: line.method,
        amount: line.amount,
        reference: line.reference_number || undefined,
      }));
      onPaymentMethodsChange(updatedPaymentMethods);
    }
  }, [paymentLines, onPaymentMethodsChange, open]);

  // Load clients for autocomplete
  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const response = await clientService.getClients(1);
        setClients(response.data);
      } catch (error) {
        console.error('Failed to load clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };

    if (open) {
      loadClients();
    }
  }, [open]);

  // Update payment amounts when discount changes (only if dialog is open)
  useEffect(() => {
    if (open && paymentLines.length > 0) {
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
  }, [discountAmount, discountType, grandTotal, paymentLines.length, open]);

  const addPaymentLine = () => {
    // Calculate the total amount already paid
    const totalExistingPaid = preciseSum(paymentLines.map(line => line.amount || 0), 2);
    
    // Calculate the remaining amount that needs to be paid
    const remainingAmount = preciseCalculation(grandTotal, totalExistingPaid, 'subtract', 2);
    
    const newPaymentLine: PaymentLine = {
      id: Date.now().toString(),
      method: 'cash',
      amount: Math.max(0.01, remainingAmount),
      reference_number: '',
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
              method: payment.method,
              amount: payment.amount,
              payment_date: new Date().toISOString().split('T')[0],
              reference_number: payment.reference_number || null,
              notes: null,
            })),
          };
          
          await saleService.addPaymentToSale(saleId, paymentData);
        } else {
          // Create new sale
          const saleData: CreateSaleData = {
            client_id: selectedClient?.id || null,
            sale_date: new Date().toISOString().split('T')[0], // Today's date
            status: 'completed',
            notes: `POS Sale - ${new Date().toLocaleString()}`,
            items: items.map(item => ({
              product_id: item.product.id,
              quantity: item.quantity,
              unit_price: item.unitPrice,
            })),
            payments: paymentLines.map(payment => ({
              method: payment.method,
              amount: payment.amount,
              payment_date: new Date().toISOString().split('T')[0],
              reference_number: payment.reference_number || null,
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
        setSelectedClient(null);
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

  const handleClose = () => {
    setPaymentLines([]);
    setErrors([]);
    setDiscountAmount(0);
    setSelectedClient(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{t('pos:payment')}</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Client Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            {t('pos:selectClient')}
          </Typography>
          <Autocomplete
            options={clients}
            getOptionLabel={(option) => `${option.name} ${option.phone ? `(${option.phone})` : ''}`}
            value={selectedClient}
            onChange={(_, newValue) => setSelectedClient(newValue)}
            loading={loadingClients}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('pos:searchClient')}
                placeholder={t('pos:searchClientPlaceholder')}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  {option.phone && (
                    <Typography variant="body2" color="text.secondary">
                      {option.phone}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.name}
                  color="primary"
                  variant="outlined"
                />
              ))
            }
          />
        </Box>

        {/* Summary Cards */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('pos:saleSummary')}
          </Typography>
                     <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
             <Box sx={{ 
               minWidth: 120, 
               flexShrink: 0, 
               p: 2, 
               borderRadius: 1, 
               border: '1px solid #bfdbfe', 
               bgcolor: '#eff6ff',
               display: 'flex',
               flexDirection: 'column',
               gap: 0.5
             }}>
               <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 500 }}>
                 {t('pos:subtotal')}
               </Typography>
               <Typography variant="body1" sx={{ color: '#1e3a8a', fontWeight: 'bold' }}>
                 {formatNumber(subtotal)}
               </Typography>
             </Box>

             <Box sx={{ 
               minWidth: 120, 
               flexShrink: 0, 
               p: 2, 
               borderRadius: 1, 
               border: '1px solid #fed7aa', 
               bgcolor: '#fff7ed',
               display: 'flex',
               flexDirection: 'column',
               gap: 0.5
             }}>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                 <DiscountIcon sx={{ fontSize: 16, color: '#ea580c' }} />
                 <Typography variant="caption" sx={{ color: '#ea580c', fontWeight: 500 }}>
                   {t('pos:discount')}
                 </Typography>
               </Box>
               <Typography variant="body1" sx={{ color: '#c2410c', fontWeight: 'bold' }}>
                 {formatNumber(actualDiscountValue)}
               </Typography>
             </Box>



             <Box sx={{ 
               minWidth: 120, 
               flexShrink: 0, 
               p: 2, 
               borderRadius: 1, 
               border: '1px solid #86efac', 
               bgcolor: '#f0fdf4',
               display: 'flex',
               flexDirection: 'column',
               gap: 0.5
             }}>
               <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 500 }}>
                 {t('pos:totalAmount')}
               </Typography>
               <Typography variant="body1" sx={{ color: '#15803d', fontWeight: 'bold' }}>
                 {formatNumber(grandTotal)}
               </Typography>
             </Box>

             <Box sx={{ 
               minWidth: 120, 
               flexShrink: 0, 
               p: 2, 
               borderRadius: 1, 
               border: '1px solid #c4b5fd', 
               bgcolor: '#faf5ff',
               display: 'flex',
               flexDirection: 'column',
               gap: 0.5
             }}>
               <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 500 }}>
                 {t('pos:amountPaid')}
               </Typography>
               <Typography variant="body1" sx={{ color: '#6d28d9', fontWeight: 'bold' }}>
                 {formatNumber(totalPaid)}
               </Typography>
             </Box>

             <Box sx={{ 
               minWidth: 120, 
               flexShrink: 0, 
               p: 2, 
               borderRadius: 1, 
               border: amountDue > 0 ? '1px solid #fca5a5' : amountDue < 0 ? '1px solid #6ee7b7' : '1px solid #d1d5db', 
               bgcolor: amountDue > 0 ? '#fef2f2' : amountDue < 0 ? '#ecfdf5' : '#f9fafb',
               display: 'flex',
               flexDirection: 'column',
               gap: 0.5
             }}>
               <Typography variant="caption" sx={{ 
                 color: amountDue > 0 ? '#dc2626' : amountDue < 0 ? '#059669' : '#6b7280', 
                 fontWeight: 500 
               }}>
                 {amountDue < 0 ? t('pos:change') : t('pos:amountDue')}
               </Typography>
               <Typography variant="body1" sx={{ 
                 color: amountDue > 0 ? '#991b1b' : amountDue < 0 ? '#047857' : '#374151', 
                 fontWeight: 'bold' 
               }}>
                 {formatNumber(Math.abs(amountDue))}
               </Typography>
             </Box>
           </Box>
        </Box>

        {/* Discount Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DiscountIcon />
            {t('pos:discount')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('pos:discountType')}</InputLabel>
              <Select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                label={t('pos:discountType')}
              >
                <MenuItem value="percentage">{t('pos:percentage')}</MenuItem>
                <MenuItem value="fixed">{t('pos:fixedAmount')}</MenuItem>
              </Select>
            </FormControl>
            
                         <TextField
               size="small"
               label={discountType === 'percentage' ? t('pos:discountPercentage') : t('pos:discountAmount')}
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
                 step: discountType === 'percentage' ? 0.01 : 0.01
               }}
               sx={{ flex: 1 }}
               error={discountType === 'percentage' ? discountAmount > 100 : discountAmount > subtotal}
               helperText={discountType === 'percentage' && discountAmount > 100 ? 'Percentage cannot exceed 100%' : 
                          discountType === 'fixed' && discountAmount > subtotal ? 'Amount cannot exceed subtotal' : ''}
             />
          </Box>
        </Box>

        {/* Payment Methods Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {t('pos:paymentMethods')}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={addPaymentLine}
              disabled={totalPaid >= grandTotal}
              startIcon={<AddIcon />}
            >
              {t('pos:addPaymentMethod')}
            </Button>
          </Box>

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
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {t('pos:noPaymentsAdded')}
            </Typography>
          ) : (
            <Box sx={{ space: 2 }}>
              {paymentLines.map((paymentLine) => (
                <Box key={paymentLine.id} sx={{ mb: 2, position: 'relative', border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                  <IconButton
                    size="small"
                    onClick={() => removePaymentLine(paymentLine.id)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: 'error.main'
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                  
                  <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                    <FormControl fullWidth size="small">
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
                       fullWidth
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
                     />
                    
                    <TextField
                      fullWidth
                      size="small"
                      label={t('pos:referenceNumber')}
                      value={paymentLine.reference_number}
                      onChange={(e) => updatePaymentLine(paymentLine.id, 'reference_number', e.target.value)}
                      placeholder={t('pos:referenceNumberPlaceholder')}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          {t('common:cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleCompleteSale}
          disabled={paymentLines.length === 0 || totalPaid !== grandTotal || isSaving}
        >
          {isSaving ? t('pos:savingSale') : isEditMode ? t('pos:updateSale') : t('pos:completeSale')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 