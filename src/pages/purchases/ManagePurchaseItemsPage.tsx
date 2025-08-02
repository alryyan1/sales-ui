// src/pages/purchases/ManagePurchaseItemsPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// MUI Components
import { 
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  Box
} from '@mui/material';

// Icons
import { ArrowLeft, AlertCircle, Plus, BarChart3 } from 'lucide-react';
import { Delete as DeleteIcon } from '@mui/icons-material';

// Services and Types
import purchaseService, { PurchaseItem } from '../../services/purchaseService';
import { Product } from '../../services/productService';
import { formatNumber, formatCurrency } from '@/constants';
import apiClient from '@/lib/axios';

// Components
import EditablePurchaseItemField from '@/components/purchases/EditablePurchaseItemField';





interface AddPurchaseItemData {
  product_id: number;
  quantity: number;
  unit_cost: number;
  sale_price?: number;
  batch_number?: string;
  expiry_date?: string;
}

// Custom Input component with select-on-focus behavior
const SelectOnFocusInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>((props, ref) => {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  return <Input {...props} ref={ref} onFocus={handleFocus} />;
});

SelectOnFocusInput.displayName = 'SelectOnFocusInput';

// Summary Dialog Component
const PurchaseSummaryDialog: React.FC<{ 
  summary: { totalItems: number; totalCost: number; totalSell: number; totalQuantity: number }; 
  purchase: { supplier_name?: string }; 
  t: (key: string) => string 
}> = ({ summary, purchase, t }) => (
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        {t('purchases:purchaseSummary')}
      </DialogTitle>
    </DialogHeader>
    <div className="grid grid-cols-1 gap-4 mt-4">
      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
          {summary.totalItems}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('purchases:totalItems')}
        </div>
      </div>
      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(summary.totalCost)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('purchases:totalCost')}
        </div>
      </div>
      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
          {formatCurrency(summary.totalSell)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('purchases:totalSellValue')}
        </div>
      </div>
      <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
          {formatNumber(summary.totalQuantity)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('purchases:totalQuantity')}
        </div>
      </div>
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          {purchase.supplier_name || 'N/A'}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('purchases:supplier')}
        </div>
      </div>
    </div>
  </DialogContent>
);

const ManagePurchaseItemsPage: React.FC = () => {
  const { id: purchaseIdParam } = useParams<{ id: string }>();
  const purchaseId = purchaseIdParam ? Number(purchaseIdParam) : null;
  const navigate = useNavigate();
  const { t } = useTranslation(['purchases', 'common', 'products']);


  // State for adding new items
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [skuInput, setSkuInput] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number | undefined>(undefined);
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  
  // Product search state
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productInputValue, setProductInputValue] = useState('');

  // Fetch purchase data
  const {
    data: purchase,
    isLoading: loadingPurchase,
    error: purchaseError,
    refetch: refetchPurchase
  } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => purchaseService.getPurchase(purchaseId!),
    enabled: !!purchaseId,
    staleTime: 0, // Always refetch to get latest data
  });

  // Add purchase item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: AddPurchaseItemData) => {
      return await purchaseService.addPurchaseItem(purchaseId!, data);
    },
    onSuccess: () => {
      toast.success(t('common:success'), {
        description: t('purchases:itemAddedSuccess'),
      });
      // Refetch purchase data to update summary and items
      refetchPurchase();
      // Reset form
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error(t('common:error'), {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  // Update purchase item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, field, value }: { itemId: number; field: string; value: unknown }) => {
      // Find the current item to get all its current values
      const currentItem = purchase?.items?.find(item => item.id === itemId);
      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Prepare complete item data with the updated field
      const updatedItemData = {
        product_id: currentItem.product_id,
        batch_number: field === 'batch_number' ? (value as string || null) : (currentItem.batch_number || null),
        quantity: field === 'quantity' ? Number(value) : currentItem.quantity,
        unit_cost: field === 'unit_cost' ? Number(value) : Number(currentItem.unit_cost),
        sale_price: field === 'sale_price' ? (value ? Number(value) : null) : (currentItem.sale_price ? Number(currentItem.sale_price) : null),
        expiry_date: field === 'expiry_date' ? (value as string || null) : (currentItem.expiry_date || null),
      };

      return await purchaseService.updatePurchaseItem(purchaseId!, itemId, updatedItemData);
    },
    onSuccess: () => {
      toast.success(t('common:success'), {
        description: t('purchases:itemUpdatedSuccess'),
      });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error(t('common:error'), {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  // Delete purchase item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await purchaseService.deletePurchaseItem(purchaseId!, itemId);
    },
    onSuccess: () => {
      toast.success(t('common:success'), {
        description: t('purchases:itemDeletedSuccess'),
      });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error(t('common:error'), {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  // Reset form function
  const resetForm = useCallback(() => {
    setSelectedProduct(null);
    setSkuInput('');
    setProductInputValue('');
    setQuantity(1);
    setUnitCost(0);
    setSalePrice(undefined);
    setBatchNumber('');
    setExpiryDate('');
  }, []);

  // Product search function
  const searchProducts = useCallback(async (searchTerm: string) => {
    setProductLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append("search", searchTerm);
      } else {
        params.append("show_all_for_empty_search", "true");
      }
      params.append("limit", "15");

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
  const handleProductSelect = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      setSkuInput(product.sku || '');
      setProductInputValue(product.name);
      // Set suggested prices if available
      if (product.latest_cost_per_sellable_unit) {
        setUnitCost(Number(product.latest_cost_per_sellable_unit));
      }
      if (product.suggested_sale_price_per_sellable_unit) {
        setSalePrice(Number(product.suggested_sale_price_per_sellable_unit));
      }
    } else {
      setSkuInput('');
      setProductInputValue('');
    }
  }, []);

  // Handle SKU input and search by SKU
  const handleSkuKeyPress = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skuInput.trim()) {
      try {
        // Search for product by SKU
        const product = await purchaseService.getProductBySku(skuInput.trim());
        if (product) {
          handleProductSelect(product);
        } else {
          toast.error(t('common:error'), {
            description: t('products:productNotFound'),
          });
        }
      } catch {
        toast.error(t('common:error'), {
          description: t('products:errorSearchingSku'),
        });
      }
    }
  }, [skuInput, handleProductSelect, t]);

  // Handle adding item
  const handleAddItem = useCallback(() => {
    if (!selectedProduct) {
      toast.error(t('common:error'), {
        description: t('purchases:selectProductFirst'),
      });
      return;
    }

    if (quantity <= 0 || unitCost < 0) {
      toast.error(t('common:error'), {
        description: t('purchases:invalidQuantityOrCost'),
      });
      return;
    }

    const data: AddPurchaseItemData = {
      product_id: selectedProduct.id,
      quantity,
      unit_cost: unitCost,
      sale_price: salePrice,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    addItemMutation.mutate(data);
  }, [selectedProduct, quantity, unitCost, salePrice, batchNumber, expiryDate, addItemMutation, t]);

  // Calculate summary values
  const summary = useMemo(() => {
    if (!purchase?.items) {
      return {
        totalCost: 0,
        totalSell: 0,
        totalItems: 0,
        totalQuantity: 0,
      };
    }

    return purchase.items.reduce(
      (acc, item) => ({
        totalCost: acc.totalCost + (item.quantity * Number(item.unit_cost)),
        totalSell: acc.totalSell + (item.quantity * Number(item.sale_price || 0)),
        totalItems: acc.totalItems + 1,
        totalQuantity: acc.totalQuantity + item.quantity,
      }),
      { totalCost: 0, totalSell: 0, totalItems: 0, totalQuantity: 0 }
    );
  }, [purchase?.items]);

  // Debounce refs for item updates
  const updateTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Handle item updates with debouncing
  const handleItemUpdate = useCallback((itemId: number, field: string, value: unknown) => {
    const updateKey = `${itemId}-${field}`;
    
    // Clear existing timeout for this specific field
    const existingTimeout = updateTimeoutRefs.current.get(updateKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout for debounced update
    const newTimeout = setTimeout(() => {
      updateItemMutation.mutate({ itemId, field, value });
      updateTimeoutRefs.current.delete(updateKey);
    }, 1000); // 1 second debounce
    
    updateTimeoutRefs.current.set(updateKey, newTimeout);
  }, [updateItemMutation]);

  // Debounced product search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(productInputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [productInputValue, searchProducts]);

  // Initial product load
  useEffect(() => {
    searchProducts('');
  }, [searchProducts]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeoutRefs = updateTimeoutRefs.current;
    return () => {
      timeoutRefs.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.clear();
    };
  }, []);

  // Handle item deletion
  const handleItemDelete = useCallback((itemId: number) => {
    if (window.confirm(t('purchases:confirmDeleteItem'))) {
      deleteItemMutation.mutate(itemId);
    }
  }, [deleteItemMutation, t]);

  if (!purchaseId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common:error')}</AlertTitle>
          <AlertDescription>{t('purchases:invalidPurchaseId')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loadingPurchase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>{t('common:loading')}</Typography>
      </div>
    );
  }

  if (purchaseError || !purchase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common:error')}</AlertTitle>
          <AlertDescription>
            {purchaseService.getErrorMessage(purchaseError)}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/purchases')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('purchases:managePurchaseItems')} #{purchase.id}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('purchases:supplier')}: {purchase.supplier_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('purchases:viewSummary')}
              </Button>
            </DialogTrigger>
            <PurchaseSummaryDialog summary={summary} purchase={purchase} t={t} />
          </Dialog>
          <Badge variant={purchase.status === 'received' ? 'default' : 'secondary'}>
            {t(`purchases:status_${purchase.status}`)}
          </Badge>
        </div>
      </div>



      {/* Add New Item */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('purchases:addNewItem')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label>{t('products:productName')}</Label>
              <Autocomplete
                options={productOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                value={selectedProduct}
                onChange={(_, newValue) => handleProductSelect(typeof newValue === 'string' ? null : newValue)}
                inputValue={productInputValue}
                onInputChange={(_, newInputValue) => setProductInputValue(newInputValue)}
                loading={productLoading}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText={t('common:noResults')}
                freeSolo={true}
                clearOnBlur={true}
                selectOnFocus={true}
                blurOnSelect={true}
                filterOptions={(x) => x} // Disable client-side filtering since we're doing server-side search
                size="small"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('products:searchProduct')}
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {productLoading ? <CircularProgress color="inherit" size={20} /> : null}
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
                        <Typography variant="body2" component="span">
                          {option.name}
                        </Typography>
                        {option.sku && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            SKU: {option.sku}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
              />
            </div>

            {/* SKU Input */}
            <div className="space-y-2">
              <Label>{t('products:sku')}</Label>
              <SelectOnFocusInput
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                onKeyPress={handleSkuKeyPress}
                placeholder={t('products:enterSkuAndPressEnter')}
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>{t('purchases:quantity')}</Label>
              <SelectOnFocusInput
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
              />
            </div>

            {/* Unit Cost */}
            <div className="space-y-2">
              <Label>{t('purchases:unitCost')}</Label>
              <SelectOnFocusInput
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                min={0}
                step={0.01}
              />
            </div>

            {/* Sale Price */}
            <div className="space-y-2">
              <Label>{t('purchases:salePrice')}</Label>
              <SelectOnFocusInput
                type="number"
                value={salePrice || ''}
                onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : undefined)}
                min={0}
                step={0.01}
              />
            </div>

            {/* Batch Number */}
            <div className="space-y-2">
              <Label>{t('purchases:batchNumber')}</Label>
              <SelectOnFocusInput
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleAddItem}
              disabled={!selectedProduct || addItemMutation.isPending}
              className="flex items-center gap-2"
            >
              {addItemMutation.isPending && <CircularProgress size={16} />}
              <Plus className="h-4 w-4" />
              {t('purchases:addItem')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Items List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('purchases:purchaseItems')}</CardTitle>
        </CardHeader>
        <CardContent>
          {purchase.items && purchase.items.length > 0 ? (
            <div className="space-y-4">
              {purchase.items.map((item: PurchaseItem) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 bg-white dark:bg-gray-800"
                >
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                    <div>
                      <Typography variant="subtitle2" className="font-medium">
                        {item.product_name || item.product?.name || `Product ID: ${item.product_id}`}
                      </Typography>
                      {(item.product_sku || item.product?.sku) && (
                        <Typography variant="caption" color="text.secondary">
                          SKU: {item.product_sku || item.product?.sku}
                        </Typography>
                      )}
                    </div>
                    <div className="text-center">
                      <EditablePurchaseItemField
                        value={item.batch_number || ''}
                        onSave={(newValue) => handleItemUpdate(item.id, 'batch_number', newValue)}
                        type="text"
                        placeholder="—"
                        isLoading={updateItemMutation.isPending}
                      />
                      <Typography variant="caption" color="text.secondary" className="block mt-1">
                        {t('purchases:batch')}
                      </Typography>
                    </div>
                    <div className="text-center">
                      <EditablePurchaseItemField
                        value={item.quantity}
                        onSave={(newValue) => handleItemUpdate(item.id, 'quantity', newValue)}
                        type="number"
                        min={1}
                        formatDisplay={(value) => formatNumber(Number(value))}
                        parseValue={(value) => Number(value)}
                        isLoading={updateItemMutation.isPending}
                      />
                      <Typography variant="caption" color="text.secondary" className="block mt-1">
                        {t('purchases:quantity')}
                      </Typography>
                    </div>
                    <div className="text-center">
                      <EditablePurchaseItemField
                        value={item.unit_cost}
                        onSave={(newValue) => handleItemUpdate(item.id, 'unit_cost', newValue)}
                        type="number"
                        min={0}
                        step={0.01}
                        formatDisplay={(value) => formatCurrency(Number(value))}
                        parseValue={(value) => Number(value)}
                        isLoading={updateItemMutation.isPending}
                      />
                      <Typography variant="caption" color="text.secondary" className="block mt-1">
                        {t('purchases:unitCost')}
                      </Typography>
                    </div>
                    <div className="text-center">
                      <EditablePurchaseItemField
                        value={item.sale_price || 0}
                        onSave={(newValue) => handleItemUpdate(item.id, 'sale_price', newValue)}
                        type="number"
                        min={0}
                        step={0.01}
                        formatDisplay={(value) => Number(value) > 0 ? formatCurrency(Number(value)) : '—'}
                        parseValue={(value) => Number(value) || 0}
                        isLoading={updateItemMutation.isPending}
                      />
                      <Typography variant="caption" color="text.secondary" className="block mt-1">
                        {t('purchases:salePrice')}
                      </Typography>
                    </div>
                    <div className="text-center">
                      <Typography variant="body2" className="font-medium">
                        {formatCurrency(item.quantity * Number(item.unit_cost))}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" className="block mt-1">
                        {t('purchases:totalCost')}
                      </Typography>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Tooltip title={t('common:delete')}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleItemDelete(item.id)}
                          disabled={deleteItemMutation.isPending}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Typography color="text.secondary">
                {t('purchases:noPurchaseItems')}
              </Typography>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagePurchaseItemsPage;