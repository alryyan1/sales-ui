// src/components/pos/DiscountDialog.tsx
import React, { useState, useEffect } from "react";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormLabel,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Box,
  Typography,
  Paper,
} from "@mui/material";

// MUI Icons
import {
  Percent as PercentIcon,
} from "@mui/icons-material";

// Utils
import { formatNumber, preciseCalculation } from "@/constants";

interface DiscountDialogProps {
  open: boolean;
  onClose: () => void;
  currentAmount: number;
  currentType: 'percentage' | 'fixed';
  maxAmount: number; // Subtotal - the maximum discount value
  dueAmount?: number; // Remaining due; discount must not exceed this
  onSave: (amount: number, type: 'percentage' | 'fixed') => void;
}

export const DiscountDialog: React.FC<DiscountDialogProps> = ({
  open,
  onClose,
  currentAmount,
  currentType,
  maxAmount,
  dueAmount = Infinity,
  onSave,
}) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(currentType);
  const [discountAmount, setDiscountAmount] = useState<string>(currentAmount.toString());
  const [error, setError] = useState<string | null>(null);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setDiscountType(currentType);
      setDiscountAmount(currentAmount.toString());
      setError(null);
    }
  }, [open, currentAmount, currentType]);

  // Calculate discount preview
  const numericAmount = parseFloat(discountAmount) || 0;
  const discountValue = discountType === 'percentage' 
    ? preciseCalculation(maxAmount, numericAmount / 100, 'multiply', 2)
    : numericAmount;
  
  const actualDiscountValue = Math.min(discountValue, maxAmount);
  const finalTotal = preciseCalculation(maxAmount, actualDiscountValue, 'subtract', 2);

  // Validation
  const validateDiscount = () => {
    if (numericAmount < 0) {
      setError('الخصم لا يمكن أن يكون سالباً');
      return false;
    }

    if (discountType === 'percentage' && numericAmount > 100) {
      setError('الخصم لا يمكن أن يتجاوز 100%');
      return false;
    }

    if (discountType === 'fixed' && numericAmount > maxAmount) {
      setError('الخصم لا يمكن أن يتجاوز المجموع الفرعي');
      return false;
    }

    // Additional validation: discount should not exceed remaining due
    const computedDiscount = discountType === 'percentage'
      ? preciseCalculation(maxAmount, numericAmount / 100, 'multiply', 2)
      : numericAmount;
    const maxByDue = Math.max(0, dueAmount);
    if (computedDiscount > maxByDue) {
      setError('الخصم لا يمكن أن يتجاوز المبلغ المتبقي');
      return false;
    }

    setError(null);
    return true;
  };

  // Handle type change
  const handleTypeChange = (newType: 'percentage' | 'fixed') => {
    setDiscountType(newType);
    setError(null);
    
    // Convert between percentage and fixed when type changes
    if (newType === 'percentage' && discountType === 'fixed') {
      // Convert from fixed to percentage
      const percentage = maxAmount > 0 ? (numericAmount / maxAmount) * 100 : 0;
      setDiscountAmount(Math.min(percentage, 100).toFixed(0));
    } else if (newType === 'fixed' && discountType === 'percentage') {
      // Convert from percentage to fixed
      const fixedAmount = preciseCalculation(maxAmount, numericAmount / 100, 'multiply', 2);
      setDiscountAmount(fixedAmount.toFixed(0));
    }
  };

  // Handle amount change
  const handleAmountChange = (value: string) => {
    setDiscountAmount(value);
    setError(null);
  };

  // Handle save
  const handleSave = () => {
    if (validateDiscount()) {
      onSave(numericAmount, discountType);
      onClose();
    }
  };

  // Handle clear discount
  const handleClear = () => {
    onSave(0, discountType);
    onClose();
  };

  const cappedMaxByDue = Math.max(0, dueAmount);
  const maxAllowedValue = discountType === 'percentage' ? 100 : Math.min(maxAmount, cappedMaxByDue);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PercentIcon />
        <span>تعيين الخصم</span>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {/* Discount Type Selection */}
          <FormControl fullWidth>
            <FormLabel htmlFor="discountType">نوع الخصم</FormLabel>
            <Select
              id="discountType"
              value={discountType}
              onChange={(e) => handleTypeChange(e.target.value as 'percentage' | 'fixed')}
              sx={{ mt: 1 }}
            >
              <MenuItem value="percentage">نسبة مئوية (%)</MenuItem>
              <MenuItem value="fixed">مبلغ ثابت ($)</MenuItem>
            </Select>
          </FormControl>

          {/* Discount Amount */}
          <FormControl fullWidth>
            <FormLabel htmlFor="discountAmount">
              {discountType === 'percentage' ? 'نسبة الخصم' : 'مبلغ الخصم'}
            </FormLabel>
            <TextField
              onFocus={(e) => e.target.select()}
              id="discountAmount"
              type="number"
              inputProps={{
                step: "0.01",
                min: "0",
                max: maxAllowedValue,
              }}
              value={discountAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="0"
              error={!!error}
              sx={{ mt: 1 }}
              fullWidth
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {discountType === 'percentage' 
                ? `الحد الأقصى: 100%`
                : `الحد الأقصى: ${formatNumber(Math.min(maxAmount, cappedMaxByDue))}`
              }
            </Typography>
          </FormControl>

          {/* Error Message */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Preview */}
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              معاينة
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">المجموع الفرعي:</Typography>
                <Typography variant="body2">{formatNumber(maxAmount)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">الخصم:</Typography>
                <Typography variant="body2" color="error">
                  -{formatNumber(actualDiscountValue)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 1, mt: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>الإجمالي:</Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {formatNumber(finalTotal)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button variant="outlined" onClick={handleClear}>
          مسح الخصم
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={onClose}>
            إلغاء
          </Button>
          <Button 
            variant="contained"
            onClick={handleSave} 
            disabled={!!error || numericAmount < 0}
          >
            حفظ
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
