// src/components/purchases/PurchaseItemRow.tsx
import React, { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

// MUI Components
import { 
  Card, 
  CardContent, 
  IconButton, 
  TextField, 
  Typography, 
  Chip,
  Box,
  Tooltip
} from "@mui/material";
import { 
  Delete as DeleteIcon
} from "@mui/icons-material";

// Types
import { Product } from "../../services/productService";
import { formatNumber, preciseCalculation } from "@/constants";
import { PurchaseFormValues } from "@/pages/PurchaseFormPage";

// Components
import { ProductSelect } from "../common/ProductSelect";

interface PurchaseItemRowProps {
  index: number;
  remove: (index: number) => void;
  isSubmitting: boolean;
  itemCount: number;
  isNew?: boolean;
  shouldFocus?: boolean;
  isPurchaseReceived?: boolean;
}

// Type for a single item in the PurchaseFormValues
export type PurchaseItemFormValues = {
  id?: number | null;
  product_id: number;
  product?: Product;
  batch_number?: string | null;
  quantity: number;
  unit_cost: number;
  sale_price?: number | null;
  expiry_date?: Date | null;
  total_sellable_units_display?: number;
  cost_per_sellable_unit_display?: number;
};

// Memoized product option component for better performance
const ProductOption = React.memo(({ option }: { option: Product }) => (
  <Box>
    <Typography variant="body2" component="span">
      {option.name}
    </Typography>
    {option.sku && (
      <Typography variant="caption" color="text.secondary" display="block">
        SKU: {option.sku}
      </Typography>
    )}
  </Box>
));

ProductOption.displayName = 'ProductOption';

export const PurchaseItemRow: React.FC<PurchaseItemRowProps> = React.memo(({
  index,
  remove,
  isSubmitting,
  itemCount,
  isPurchaseReceived = false,
}) => {
  const { t } = useTranslation([
    "purchases",
    "common",
    "products",
    "validation",
  ]);
  
  const { watch, setValue, register, formState: { errors } } = useFormContext<PurchaseFormValues>();
  const uniqueId = useMemo(() => `purchase-item-${index}`, [index]);

  // Watch fields for this item row - memoized to prevent unnecessary re-renders
  const watchedFields = useMemo(() => ({
    selectedProduct: watch(`items.${index}.product`) as Product | undefined,
    quantityOfStockingUnits: watch(`items.${index}.quantity`),
    costPerStockingUnit: watch(`items.${index}.unit_cost`),
  }), [watch, index]);

  const { selectedProduct, quantityOfStockingUnits, costPerStockingUnit } = watchedFields;

  // Calculate display values - memoized
  const calculatedValues = useMemo(() => {
    const unitsPerStocking = selectedProduct?.units_per_stocking_unit || 1;
    const totalSellableUnitsDisplay =
      preciseCalculation(Number(quantityOfStockingUnits) || 0, unitsPerStocking, 'multiply', 2);
    const itemTotalCost =
      preciseCalculation(Number(quantityOfStockingUnits) || 0, Number(costPerStockingUnit) || 0, 'multiply', 2);
    
    return {
      totalSellableUnitsDisplay,
      itemTotalCost,
      unitsPerStocking,
    };
  }, [selectedProduct, quantityOfStockingUnits, costPerStockingUnit]);

  // Memoized handlers
  const handleProductChange = useCallback((product: Product | null) => {
    if (isPurchaseReceived) return; // Prevent changes if purchase is received
    
    if (product) {
      setValue(`items.${index}.product_id`, product.id);
      setValue(`items.${index}.product`, product);
    } else {
      // Clear selection
      setValue(`items.${index}.product_id`, 0);
      setValue(`items.${index}.product`, undefined);
    }
  }, [setValue, index, isPurchaseReceived]);

  const handleRemove = useCallback(() => {
    if (isPurchaseReceived) return; // Prevent deletion if purchase is received
    if (itemCount > 1) {
      remove(index);
    }
  }, [remove, index, itemCount, isPurchaseReceived]);

  // Memoized error getter
  const getFieldError = useCallback((fieldName: string) => {
    const error = errors.items?.[index]?.[fieldName as keyof PurchaseItemFormValues];
    return error?.message;
  }, [errors, index]);

  // Memoized render content
  const renderContent = useMemo(() => (
    <CardContent sx={{ p: 2 }}>
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-start">
        {/* Product Selection */}
        <div>
          <ProductSelect
            id={`product-select-${uniqueId}`}
            value={selectedProduct || null}
            onChange={handleProductChange}
            label={t('purchases:fields.productName')}
            error={!!getFieldError('product_id')}
            helperText={getFieldError('product_id')}
            disabled={isSubmitting || isPurchaseReceived}
            showSku={true}
            placeholder={t('products:selectProduct')}
            required
          />
        </div>

        {/* Batch Number */}
        <TextField
          label={t('purchases:fields.batchNumber')}
          size="small"
          error={!!getFieldError('batch_number')}
          helperText={getFieldError('batch_number')}
          disabled={isSubmitting || isPurchaseReceived}
          {...register(`items.${index}.batch_number`)}
        />

        {/* Quantity */}
        <TextField
          label={t('purchases:fields.quantity')}
          type="number"
          size="small"
          error={!!getFieldError('quantity')}
          helperText={getFieldError('quantity')}
          disabled={isSubmitting || isPurchaseReceived}
          {...register(`items.${index}.quantity`)}
        />

        {/* Unit Cost */}
        <TextField
          label={t('purchases:fields.unitCost')}
          type="number"
          size="small"
          error={!!getFieldError('unit_cost')}
          helperText={getFieldError('unit_cost')}
          disabled={isSubmitting || isPurchaseReceived}
          {...register(`items.${index}.unit_cost`)}
        />

        {/* Sale Price */}
        <TextField
          label={t('purchases:fields.salePrice')}
          type="number"
          size="small"
          error={!!getFieldError('sale_price')}
          helperText={getFieldError('sale_price')}
          disabled={isSubmitting || isPurchaseReceived}
          {...register(`items.${index}.sale_price`)}
        />

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Tooltip title={isPurchaseReceived ? t('purchases:cannotDeleteReceived') : t('common:delete')}>
            <IconButton
              onClick={handleRemove}
              disabled={isSubmitting || itemCount <= 1 || isPurchaseReceived}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Additional Info Row */}
      {selectedProduct && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Chip
            label={`${t('purchases:fields.totalSellableUnits')}: ${formatNumber(calculatedValues.totalSellableUnitsDisplay)}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`${t('purchases:fields.itemTotal')}: ${formatNumber(calculatedValues.itemTotalCost)}`}
            size="small"
            variant="outlined"
          />
                     {(selectedProduct.units_per_stocking_unit || 0) > 1 && (
             <Chip
               label={`${t('purchases:fields.unitsPerStocking')}: ${selectedProduct.units_per_stocking_unit || 0}`}
               size="small"
               variant="outlined"
             />
           )}
        </Box>
      )}
    </CardContent>
  ), [
    selectedProduct,
    handleProductChange,
    isSubmitting,
    isPurchaseReceived,
    getFieldError,
    handleRemove,
    itemCount,
    calculatedValues,
    uniqueId,
    index,
    register,
    t
  ]);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      {isPurchaseReceived && (
        <Box sx={{ 
          p: 1, 
          bgcolor: 'warning.light', 
          color: 'warning.contrastText',
          borderBottom: 1,
          borderColor: 'warning.main'
        }}>
          <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
            {t('purchases:itemLockedReceived')}
          </Typography>
        </Box>
      )}
      {renderContent}
    </Card>
  );
});

PurchaseItemRow.displayName = 'PurchaseItemRow';
