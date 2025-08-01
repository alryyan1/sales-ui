// src/components/purchases/PurchaseItemRow.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Delete as DeleteIcon,
  ContentCopy as CopyIcon
} from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";

// Types
import { Product } from "../../services/productService";
import { formatNumber, preciseCalculation } from "@/constants";
import { PurchaseFormValues } from "@/pages/PurchaseFormPage";
import apiClient from "@/lib/axios";

interface PurchaseItemRowProps {
  index: number;
  remove: (index: number) => void;
  products: Product[];
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
  products,
  isSubmitting,
  itemCount,
  shouldFocus = false,
  isPurchaseReceived = false,
}) => {
  const { t } = useTranslation([
    "purchases",
    "common",
    "products",
    "validation",
  ]);
  
  const { watch, setValue, register, formState: { errors } } = useFormContext<PurchaseFormValues>();
  const autocompleteRef = useRef<HTMLInputElement>(null);

  // Local state for this row's product search
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [localLoadingProducts, setLocalLoadingProducts] = useState(false);
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastProductSearchRef = useRef<string>("");

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

  // Auto-focus effect for new items
  useEffect(() => {
    if (shouldFocus && autocompleteRef.current) {
      const timer = setTimeout(() => {
        autocompleteRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldFocus]);

  // Debounced product search effect
  useEffect(() => {
    if (productDebounceRef.current) {
      clearTimeout(productDebounceRef.current);
    }
    
    productDebounceRef.current = setTimeout(() => {
      setDebouncedProductSearch(productSearchInput);
    }, 300);
    
    return () => {
      if (productDebounceRef.current) {
        clearTimeout(productDebounceRef.current);
      }
    };
  }, [productSearchInput]);

  // Product search effect
  useEffect(() => {
    if (debouncedProductSearch !== '' && debouncedProductSearch !== lastProductSearchRef.current) {
      lastProductSearchRef.current = debouncedProductSearch;
      
      const searchProducts = async () => {
        setLocalLoadingProducts(true);
        try {
          const response = await apiClient.get<{ data: Product[] }>(
            `/products?search=${encodeURIComponent(debouncedProductSearch)}&limit=15`
          );
          setLocalProducts(response.data.data ?? response.data);
        } catch (error) {
          console.error('Error searching products:', error);
          setLocalProducts([]);
        } finally {
          setLocalLoadingProducts(false);
        }
      };
      
      searchProducts();
    }
  }, [debouncedProductSearch]);

  // Sync input value when product is selected from form state
  useEffect(() => {
    if (selectedProduct && selectedProduct.name !== productSearchInput) {
      setProductSearchInput(selectedProduct.name);
    } else if (!selectedProduct && productSearchInput !== '') {
      setProductSearchInput('');
    }
  }, [selectedProduct, productSearchInput]);

  // Memoized product options
  const productOptions = useMemo(() => {
    const allProducts = [...products, ...localProducts];
    // Remove duplicates based on ID
    const uniqueProducts = allProducts.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );
    return uniqueProducts;
  }, [products, localProducts]);

  // Memoized handlers
  const handleProductSelect = useCallback((product: Product) => {
    if (isPurchaseReceived) return; // Prevent changes if purchase is received
    setValue(`items.${index}.product_id`, product.id);
    setValue(`items.${index}.product`, product);
    setProductSearchInput(product.name);
  }, [setValue, index, isPurchaseReceived]);

  const handleProductChange = useCallback((event: React.SyntheticEvent, newValue: Product | null) => {
    if (isPurchaseReceived) return; // Prevent changes if purchase is received
    if (newValue) {
      handleProductSelect(newValue);
    } else {
      // Clear selection
      setValue(`items.${index}.product_id`, 0);
      setValue(`items.${index}.product`, undefined);
      setProductSearchInput("");
    }
  }, [handleProductSelect, setValue, index, isPurchaseReceived]);

  const handleKeyDown = useCallback(async (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      // Add new item below current one
      // This would need to be handled by the parent component
      // For now, we'll just focus the next item if it exists
    }
  }, [index]);

  const handleRemove = useCallback(() => {
    if (isPurchaseReceived) return; // Prevent deletion if purchase is received
    if (itemCount > 1) {
      remove(index);
    }
  }, [remove, index, itemCount, isPurchaseReceived]);

  const handleCopySku = useCallback(async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy SKU:', err);
    }
  }, []);

  // Memoized error getter
  const getFieldError = useCallback((fieldName: string) => {
    const error = errors.items?.[index]?.[fieldName as keyof PurchaseItemFormValues];
    return error?.message;
  }, [errors, index]);

  // Memoized render content
  const renderContent = useMemo(() => (
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 2, alignItems: 'start' }}>
        {/* Product Selection */}
        <Box>
                     <Autocomplete
             key={`product-autocomplete-${index}`}
             ref={autocompleteRef}
             options={productOptions}
             getOptionLabel={(option) => option.name}
             value={selectedProduct || null}
             onChange={handleProductChange}
             onInputChange={(_, newInputValue) => {
               if (!isPurchaseReceived) {
                 setProductSearchInput(newInputValue);
               }
             }}
             inputValue={productSearchInput}
             loading={localLoadingProducts}
             isOptionEqualToValue={(option, value) => option.id === value.id}
             noOptionsText={t('common:noResults')}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('purchases:fields.productName')}
                error={!!getFieldError('product_id')}
                helperText={getFieldError('product_id')}
                size="small"
                disabled={isSubmitting || isPurchaseReceived}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {localLoadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <ProductOption option={option} />
              </li>
            )}
            onKeyDown={handleKeyDown}
          />
          
          {selectedProduct?.sku && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                SKU: {selectedProduct.sku}
              </Typography>
                             <Tooltip title={t('common:copy')}>
                 <IconButton
                   size="small"
                   onClick={() => selectedProduct.sku && handleCopySku(selectedProduct.sku)}
                   sx={{ p: 0.5 }}
                 >
                   <CopyIcon fontSize="small" />
                 </IconButton>
               </Tooltip>
            </Box>
          )}
        </Box>

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
        </Box>
      </Box>

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
    productOptions,
    selectedProduct,
    productSearchInput,
    localLoadingProducts,
    handleProductChange,
    setProductSearchInput,
    handleKeyDown,
    isSubmitting,
    isPurchaseReceived,
    getFieldError,
    handleRemove,
    itemCount,
    calculatedValues,
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
