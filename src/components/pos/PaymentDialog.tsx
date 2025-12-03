// src/components/pos/PaymentDialog.tsx
import React, { useState, useEffect, useRef } from "react";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  Divider,
  Chip,
  CircularProgress,
  Paper,
} from "@mui/material";

// MUI Icons
import {
  CreditCard as CreditCardIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ErrorOutline as ErrorIcon,
} from "@mui/icons-material";

// Types and Services
import { PaymentMethod } from "./types";
import { formatNumber, preciseSum } from "@/constants";
import saleService from "../../services/saleService";

// Payment Method Options
const paymentMethodOptions = [
  { value: 'cash', label: 'نقدي' },
  { value: 'visa', label: 'فيزا' },
  { value: 'mastercard', label: 'ماستركارد' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'mada', label: 'مدى' },
  { value: 'store_credit', label: 'رصيد متجر' },
  { value: 'other', label: 'أخرى' },
];

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  saleId?: number;
  grandTotal: number;
  paidAmount: number;
  discountAmount?: number; // amount discounted (applied or to be applied)
  submitTrigger?: number; // increments to trigger submit programmatically
  onSuccess: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  saleId,
  grandTotal,
  paidAmount,
  discountAmount = 0,
  submitTrigger,
  onSuccess,
}) => {
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
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  const loadPayments = React.useCallback(async () => {
    if (!saleId) return;

    setLoadingPayments(true);
    setError(null);
    try {
      const saleData = await saleService.getSale(saleId);
      setPayments(saleData.payments || []);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError('فشل تحميل المدفوعات');
    } finally {
      setLoadingPayments(false);
    }
  }, [saleId]);

  // Load payments when dialog opens
  useEffect(() => {
    if (open && saleId) {
      loadPayments();
      // Set default payment amount to remaining due
      const remainingDue = grandTotal - paidAmount;
      if (remainingDue > 0) {
        setPaymentAmount(remainingDue.toFixed(0));
      }
    } else {
      // Reset form when dialog closes
      resetForm();
    }
  }, [open, saleId, grandTotal, paidAmount, loadPayments]);

  // Focus Add Payment button when dialog opens
  useEffect(() => {
    if (open) {
      // Wait next tick so the button exists
      const id = setTimeout(() => {
        addButtonRef.current?.focus();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Submit programmatically when submitTrigger changes and dialog is open
  useEffect(() => {
    if (!open) return;
    if (submitTrigger === undefined) return;
    // Avoid double-submit if currently adding
    if (!addingPayment) {
      handleAddPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitTrigger]);

  const resetForm = () => {
    setPaymentMethod('cash');
    setPaymentAmount('');
    setError(null);
  };

  const handleAddPayment = async () => {
    if (!saleId || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      setError('مبلغ الدفع غير صحيح');
      return;
    }

    // Check if payment amount exceeds remaining due
    const remainingDue = grandTotal - preciseSum(payments.map(p => Number(p.amount)), 2);
    if (amount > remainingDue) {
      setError('مبلغ الدفع يتجاوز المبلغ المستحق المتبقي');
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
    return new Date(dateString).toLocaleDateString('ar-SA', {
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
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CreditCardIcon />
        <span>إدارة المدفوعات</span>
        {saleId && <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          - بيع #{saleId}
        </Typography>}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Payment Summary - Colored Cards Row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
            {/* Total */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: 'blue.50',
                border: '1px solid',
                borderColor: 'blue.100'
              }}
            >
              <Typography variant="caption" color="blue.700" fontWeight="medium">
                الإجمالي
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="blue.700">
                {formatNumber(grandTotal)}
              </Typography>
            </Paper>
            {/* Discount */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: 'red.50',
                border: '1px solid',
                borderColor: 'red.100'
              }}
            >
              <Typography variant="caption" color="red.700" fontWeight="medium">
                الخصم
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="red.700">
                -{formatNumber(discountAmount)}
              </Typography>
            </Paper>
            {/* Paid */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: 'green.50',
                border: '1px solid',
                borderColor: 'green.100'
              }}
            >
              <Typography variant="caption" color="green.700" fontWeight="medium">
                المدفوع
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="green.700">
                {formatNumber(totalPaid)}
              </Typography>
            </Paper>
            {/* Due */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: 'orange.50',
                border: '1px solid',
                borderColor: 'orange.100'
              }}
            >
              <Typography variant="caption" color="orange.700" fontWeight="medium">
                المستحق
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="orange.700">
                {formatNumber(remainingDue)}
              </Typography>
            </Paper>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" icon={<ErrorIcon />}>
              {error}
            </Alert>
          )}

          {/* Existing Payments */}
          <Box>
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>
              المدفوعات الحالية
            </Typography>
            {loadingPayments ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  جاري التحميل...
                </Typography>
              </Box>
            ) : payments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  لا توجد مدفوعات بعد
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {payments.map((payment) => (
                  <Paper
                    key={payment.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'grey.50',
                      borderRadius: 1
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={paymentMethodOptions.find(opt => opt.value === payment.method)?.label || payment.method}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="body1" fontWeight="semibold">
                          {formatNumber(Number(payment.amount))}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {payment.created_at && formatPaymentDate(payment.created_at)}
                        {payment.user_name && ` • ${payment.user_name}`}
                      </Typography>
                    </Box>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => payment.id && handleDeletePayment(payment.id)}
                      disabled={deletingPaymentId === payment.id}
                      sx={{ color: 'error.main', minWidth: 'auto' }}
                    >
                      {deletingPaymentId === payment.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </Button>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>

          {/* Add New Payment */}
          {remainingDue > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AddIcon />
                  إضافة دفعة جديدة
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>طريقة الدفع</InputLabel>
                    <Select
                      value={paymentMethod}
                      label="طريقة الدفع"
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    >
                      {paymentMethodOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="المبلغ"
                    type="number"
                    inputProps={{
                      step: "0.01",
                      min: "0",
                      max: remainingDue
                    }}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </Box>

                <Button
                  ref={addButtonRef}
                  variant="contained"
                  onClick={handleAddPayment}
                  disabled={addingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  fullWidth
                  startIcon={addingPayment ? <CircularProgress size={16} /> : <AddIcon />}
                  sx={{ mt: 2 }}
                >
                  {addingPayment ? 'جاري الحفظ...' : 'إضافة دفعة'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};
