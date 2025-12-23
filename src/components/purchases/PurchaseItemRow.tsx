// src/components/purchases/PurchaseItemRow.tsx
import React, { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";

// MUI Components
import { 
  Card, 
  CardContent, 
  IconButton, 
  TextField, 
  Typography, 
  Chip,
  Box,
  Tooltip,
  Grid
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
    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
      <Grid container spacing={2.5} alignItems="flex-start">
        {/* Product Selection */}
        <Grid xs={12} sm={6} md={4}>
          <ProductSelect
            id={`product-select-${uniqueId}`}
            value={selectedProduct || null}
            onChange={handleProductChange}
            label="اسم المنتج"
            error={!!getFieldError('product_id')}
            helperText={getFieldError('product_id')}
            disabled={isSubmitting || isPurchaseReceived}
            showSku={true}
            placeholder="اختر المنتج"
            required
          />
        </Grid>

        {/* Batch Number */}
        <Grid xs={12} sm={6} md={1.5}>
          <TextField
            label="رقم الدفعة"
            size="small"
            fullWidth
            error={!!getFieldError('batch_number')}
            helperText={getFieldError('batch_number')}
            disabled={isSubmitting || isPurchaseReceived}
            {...register(`items.${index}.batch_number`)}
          />
        </Grid>

        {/* Quantity */}
        <Grid xs={12} sm={6} md={1.5}>
          <TextField
            label="الكمية"
            type="number"
            size="small"
            fullWidth
            error={!!getFieldError('quantity')}
            helperText={getFieldError('quantity')}
            disabled={isSubmitting || isPurchaseReceived}
            {...register(`items.${index}.quantity`)}
          />
        </Grid>

        {/* Unit Cost */}
        <Grid xs={12} sm={6} md={1.5}>
          <TextField
            label="تكلفة الوحدة"
            type="number"
            size="small"
            fullWidth
            error={!!getFieldError('unit_cost')}
            helperText={getFieldError('unit_cost')}
            disabled={isSubmitting || isPurchaseReceived}
            {...register(`items.${index}.unit_cost`)}
          />
        </Grid>

        {/* Sale Price */}
        <Grid xs={12} sm={6} md={1.5}>
          <TextField
            label="سعر البيع"
            type="number"
            size="small"
            fullWidth
            error={!!getFieldError('sale_price')}
            helperText={getFieldError('sale_price')}
            disabled={isSubmitting || isPurchaseReceived}
            {...register(`items.${index}.sale_price`)}
          />
        </Grid>

        {/* Actions */}
        <Grid xs={12} sm={6} md={2}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
            height: '100%',
            pt: { xs: 0, md: 0.5 }
          }}>
            <Tooltip title={isPurchaseReceived ? "لا يمكن حذف عنصر تم استلامه" : "حذف"}>
              <IconButton
                onClick={handleRemove}
                disabled={isSubmitting || itemCount <= 1 || isPurchaseReceived}
                color="error"
                size="medium"
                sx={{
                  bgcolor: 'error.light',
                  '&:hover': {
                    bgcolor: 'error.main',
                    color: 'error.contrastText'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'action.disabled'
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>

      {/* Additional Info Row */}
      {selectedProduct && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: 1.5, 
          mt: 3, 
          pt: 3, 
          borderTop: 1, 
          borderColor: 'divider',
          bgcolor: 'grey.50',
          borderRadius: 2,
          p: 2
        }}>
          <Chip
            label={`إجمالي وحدات البيع: ${formatNumber(calculatedValues.totalSellableUnitsDisplay)}`}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 500,
              borderColor: 'primary.main',
              color: 'primary.main',
              bgcolor: 'primary.light'
            }}
          />
          <Chip
            label={`إجمالي العنصر: ${formatNumber(calculatedValues.itemTotalCost)}`}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 600,
              borderColor: 'success.main',
              color: 'success.dark',
              bgcolor: 'success.light'
            }}
          />
          {(selectedProduct.units_per_stocking_unit || 0) > 1 && (
            <Chip
              label={`الوحدات لكل وحدة تخزين: ${selectedProduct.units_per_stocking_unit || 0}`}
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 500,
                borderColor: 'info.main',
                color: 'info.dark',
                bgcolor: 'info.light'
              }}
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
    register
  ]);

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        boxShadow: 1,
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
          borderColor: 'primary.light'
        }
      }}
    >
      {isPurchaseReceived && (
        <Box sx={{ 
          p: 1.5, 
          bgcolor: 'warning.light', 
          color: 'warning.dark',
          borderBottom: 1,
          borderColor: 'warning.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Box sx={{ 
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'warning.main'
          }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            تم استلام الشراء - العنصر مقفل
          </Typography>
        </Box>
      )}
      {renderContent}
    </Card>
  );
});

PurchaseItemRow.displayName = 'PurchaseItemRow';
