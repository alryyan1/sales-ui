// src/components/purchases/manage-items/AddItemDialog.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Divider,
  Stack,
  TextField,
  Autocomplete,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/axios';
import purchaseService from '@/services/purchaseService';
import { Product } from '@/services/productService';
import { useSettings } from '@/context/SettingsContext';
import { AddPurchaseItemData } from './types';

// Helper: round to exactly 3 decimal places
const roundToThreeDecimals = (value: number): number => {
  return Number(Number(value).toFixed(3));
};

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onAddItem: (data: AddPurchaseItemData) => void;
  isLoading: boolean;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  open,
  onClose,
  onAddItem,
  isLoading,
}) => {
  const { settings } = useSettings();

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productInputValue, setProductInputValue] = useState('');
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number | undefined>(undefined);
  const [salePriceStockingUnit, setSalePriceStockingUnit] = useState<number | undefined>(undefined);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedProduct(null);
    setProductInputValue('');
    setQuantity(1);
    setUnitCost(0);
    setSalePrice(undefined);
    setSalePriceStockingUnit(undefined);
    setBatchNumber('');
    setExpiryDate('');
  }, []);

  // Search products
  const searchProducts = useCallback(async (searchTerm: string) => {
    setProductLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
        params.append('search_sku', 'true');
      } else {
        params.append('show_all_for_empty_search', 'true');
      }
      params.append('limit', '15');

      const response = await apiClient.get<{ data: Product[] }>(
        `/products/autocomplete?${params.toString()}`
      );
      const products = response.data.data ?? response.data;
      setProductOptions(products);
    } catch (error) {
      console.error('Error searching products:', error);
      setProductOptions([]);
    } finally {
      setProductLoading(false);
    }
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback(
    (product: Product | null) => {
      setSelectedProduct(product);
      if (product) {
        setProductInputValue(product.name);
        if (product.latest_cost_per_sellable_unit) {
          const costPerSellable = Number(product.latest_cost_per_sellable_unit);
          const unitsPerStocking =
            product.units_per_stocking_unit && product.units_per_stocking_unit > 0
              ? product.units_per_stocking_unit
              : 1;
          const costPerStocking = costPerSellable * unitsPerStocking;
          setUnitCost(costPerStocking);
          const globalProfitRate = settings?.default_profit_rate ?? 20;
          const profitFactor = globalProfitRate / 100;
          const sellablePrice = (costPerStocking * profitFactor) / unitsPerStocking;
          setSalePrice(roundToThreeDecimals(sellablePrice));
          const stockingPrice = costPerStocking * profitFactor;
          setSalePriceStockingUnit(roundToThreeDecimals(stockingPrice));
        }
      } else {
        setProductInputValue('');
      }
    },
    [settings?.default_profit_rate]
  );

  // Handle unit cost change
  const handleUnitCostChange = useCallback(
    (newCost: number) => {
      setUnitCost(newCost);
      const globalProfitRate = settings?.default_profit_rate ?? 20;
      const profitFactor = globalProfitRate / 100;
      const unitsPerStocking =
        selectedProduct?.units_per_stocking_unit && selectedProduct.units_per_stocking_unit > 0
          ? selectedProduct.units_per_stocking_unit
          : 1;
      const costPerSellable = newCost / unitsPerStocking;
      const profitablePricePerSellable = costPerSellable * profitFactor;
      const sellablePrice = costPerSellable + profitablePricePerSellable;
      setSalePrice(roundToThreeDecimals(sellablePrice));
      setSalePriceStockingUnit(roundToThreeDecimals(sellablePrice * unitsPerStocking));
    },
    [settings?.default_profit_rate, selectedProduct?.units_per_stocking_unit]
  );

  // Handle autocomplete Enter key
  const handleAutocompleteKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && productInputValue.trim() && !selectedProduct) {
        e.preventDefault();
        try {
          const product = await purchaseService.getProductBySku(productInputValue.trim());
          if (product) {
            handleProductSelect(product);
            return;
          }
          const nameMatch = productOptions.find(
            (p) =>
              p.name.toLowerCase().includes(productInputValue.toLowerCase()) ||
              (p.sku && p.sku.toLowerCase() === productInputValue.toLowerCase())
          );
          if (nameMatch) {
            handleProductSelect(nameMatch);
          } else {
            toast.error('خطأ', { description: 'المنتج غير موجود' });
          }
        } catch {
          toast.error('خطأ', { description: 'حدث خطأ أثناء البحث' });
        }
      }
    },
    [productInputValue, selectedProduct, productOptions, handleProductSelect]
  );

  // Handle add item
  const handleAddItem = useCallback(() => {
    if (!selectedProduct) {
      toast.error('خطأ', { description: 'يرجى اختيار منتج أولاً' });
      return;
    }
    if (quantity <= 0 || unitCost < 0) {
      toast.error('خطأ', { description: 'الكمية أو التكلفة غير صالحة' });
      return;
    }

    const data: AddPurchaseItemData = {
      product_id: selectedProduct.id,
      quantity,
      unit_cost: unitCost,
      sale_price: salePrice !== undefined ? roundToThreeDecimals(salePrice) : 0,
      sale_price_stocking_unit:
        salePriceStockingUnit !== undefined ? roundToThreeDecimals(salePriceStockingUnit) : undefined,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    onAddItem(data);
  }, [selectedProduct, quantity, unitCost, salePrice, salePriceStockingUnit, batchNumber, expiryDate, onAddItem]);

  // Debounced product search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchProducts(productInputValue), 300);
    return () => clearTimeout(timer);
  }, [productInputValue, searchProducts, open]);

  // Initial product load when dialog opens
  useEffect(() => {
    if (open) {
      searchProducts('');
    }
  }, [open, searchProducts]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { minHeight: '50vh' } }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
        >
          <Plus /> إضافة صنف جديد
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Stack spacing={3}>
          {/* Product Selection */}
          <Box>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              اسم المنتج
            </Typography>
            <Autocomplete
              options={productOptions}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
              value={selectedProduct}
              onChange={(_, newValue) =>
                handleProductSelect(typeof newValue === 'string' ? null : newValue)
              }
              inputValue={productInputValue}
              onInputChange={(_, newInputValue) => setProductInputValue(newInputValue)}
              loading={productLoading}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="لا توجد نتائج"
              freeSolo
              clearOnBlur
              selectOnFocus
              blurOnSelect
              filterOptions={(x) => x}
              size="small"
              onKeyDown={handleAutocompleteKeyDown}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="ابحث بالاسم أو الباركود"
                  size="small"
                  fullWidth
                  autoFocus
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {productLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      {option.sku && (
                        <Typography variant="caption" color="text.secondary">
                          باركود: {option.sku}
                        </Typography>
                      )}
                    </Box>
                  </li>
                );
              }}
            />
          </Box>

          {selectedProduct && (
            <>
              {/* Unit Info Chip */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Chip
                  label={`1 ${selectedProduct.stocking_unit_name || 'وحدة تخزين'} = ${
                    selectedProduct.units_per_stocking_unit || 1
                  } ${selectedProduct.sellable_unit_name || 'وحدة بيع'}`}
                  color="info"
                  variant="outlined"
                />
              </Box>

              {/* First Row: Quantity & Cost */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    الكمية{' '}
                    {selectedProduct?.stocking_unit_name
                      ? `(${selectedProduct.stocking_unit_name})`
                      : ''}
                  </Typography>
                  <TextField
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    inputProps={{ min: 1, step: 1 }}
                    size="small"
                    fullWidth
                  />
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    سعر التكلفة{' '}
                    {selectedProduct?.stocking_unit_name
                      ? `(${selectedProduct.stocking_unit_name})`
                      : ''}
                  </Typography>
                  <TextField
                    type="number"
                    value={unitCost}
                    onChange={(e) => handleUnitCostChange(Number(e.target.value))}
                    inputProps={{ min: 0, step: 0.01 }}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Box>

              {/* Second Row: Sale Prices */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    سعر البيع ({selectedProduct?.sellable_unit_name || 'وحدة بيع'}){' '}
                    <span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <TextField
                    type="number"
                    value={salePrice || ''}
                    onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : undefined)}
                    inputProps={{ min: 0, step: 0.001 }}
                    size="small"
                    fullWidth
                    error={salePrice === undefined}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    سعر البيع ({selectedProduct?.stocking_unit_name || 'وحدة تخزين'})
                  </Typography>
                  <TextField
                    type="number"
                    value={salePriceStockingUnit || ''}
                    onChange={(e) =>
                      setSalePriceStockingUnit(e.target.value ? Number(e.target.value) : undefined)
                    }
                    inputProps={{ min: 0, step: 0.001 }}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Box>

              {/* Third Row: Batch & Expiry */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    رقم الدفعة
                  </Typography>
                  <TextField
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    تاريخ الانتهاء
                  </Typography>
                  <TextField
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>
            </>
          )}
        </Stack>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            mt: 3,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button variant="outlined" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddItem}
            disabled={!selectedProduct || salePrice === undefined || isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <Plus size={18} />}
          >
            إضافة الصنف
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default AddItemDialog;
