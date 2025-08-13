// src/components/pos/DiscountDialog.tsx
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
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import { Percent, AlertCircle } from "lucide-react";

// Utils
import { formatNumber, preciseCalculation } from "@/constants";

interface DiscountDialogProps {
  open: boolean;
  onClose: () => void;
  currentAmount: number;
  currentType: 'percentage' | 'fixed';
  maxAmount: number; // Subtotal - the maximum discount value
  onSave: (amount: number, type: 'percentage' | 'fixed') => void;
}

export const DiscountDialog: React.FC<DiscountDialogProps> = ({
  open,
  onClose,
  currentAmount,
  currentType,
  maxAmount,
  onSave,
}) => {
  const { t } = useTranslation(['pos', 'common']);

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
      setError(t('pos:discountCannotBeNegative'));
      return false;
    }

    if (discountType === 'percentage' && numericAmount > 100) {
      setError(t('pos:discountCannotExceed100Percent'));
      return false;
    }

    if (discountType === 'fixed' && numericAmount > maxAmount) {
      setError(t('pos:discountCannotExceedSubtotal'));
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

  const maxAllowedValue = discountType === 'percentage' ? 100 : maxAmount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Percent className="h-5 w-5" />
            <span>{t('pos:setDiscount')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Discount Type Selection */}
          <div>
            <Label htmlFor="discountType">{t('pos:discountType')}</Label>
            <Select value={discountType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{t('pos:percentage')} (%)</SelectItem>
                <SelectItem value="fixed">{t('pos:fixedAmount')} ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Discount Amount */}
          <div>
            <Label htmlFor="discountAmount">
              {discountType === 'percentage' 
                ? t('pos:discountPercentage') 
                : t('pos:discountAmount')
              }
            </Label>
            <Input
              onFocus={(e) => e.target.select()}
              id="discountAmount"
              type="number"
              step="0.01"
              min="0"
              max={maxAllowedValue}
              value={discountAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className={error ? "border-red-500" : ""}
            />
            <div className="text-xs text-gray-500 mt-1">
              {discountType === 'percentage' 
                ? t('pos:maxPercentage', { max: 100 })
                : t('pos:maxAmount', { max: formatNumber(maxAmount) })
              }
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="text-sm font-semibold text-gray-700">{t('pos:preview')}</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t('pos:subtotal')}:</span>
                <span>{formatNumber(maxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('pos:discount')}:</span>
                <span className="text-red-600">-{formatNumber(actualDiscountValue)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>{t('pos:total')}:</span>
                <span className="text-green-600">{formatNumber(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClear}>
            {t('pos:clearDiscount')}
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              {t('common:cancel')}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!!error || numericAmount < 0}
            >
              {t('common:save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};