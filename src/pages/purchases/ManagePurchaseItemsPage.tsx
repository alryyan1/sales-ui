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
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// MUI Components
import { 
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  Box,
  Avatar
} from '@mui/material';

// Icons
import { ArrowLeft, AlertCircle, Plus, BarChart3 } from 'lucide-react';
import { Delete as DeleteIcon } from '@mui/icons-material';

// Services and Types
import purchaseService, { PurchaseItem } from '../../services/purchaseService';
import productService, { Product } from '../../services/productService';
import { formatCurrency } from '@/constants';
import apiClient from '@/lib/axios';
import { useSettings } from '@/context/SettingsContext';

// Components
import InstantTextField from '@/components/purchases/InstantTextField';





interface AddPurchaseItemData {
  product_id: number;
  quantity: number;
  unit_cost: number;
  sale_price: number;
  sale_price_stocking_unit?: number;
  batch_number?: string;
  expiry_date?: string;
}

// Helper: round to exactly 3 decimal places
const roundToThreeDecimals = (value: number): number => {
  return Number(Number(value).toFixed(3));
};

// (Removed dd mm yyyy helpers since native date inputs are used)

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

// Summary Dialog Component moved to components/purchases/PurchaseSummaryDialog
import PurchaseSummaryDialog from '@/components/purchases/PurchaseSummaryDialog';

const ManagePurchaseItemsPage: React.FC = () => {
  const { id: purchaseIdParam } = useParams<{ id: string }>();
  const purchaseId = purchaseIdParam ? Number(purchaseIdParam) : null;
  const navigate = useNavigate();
  const { t } = useTranslation(['purchases', 'common', 'products']);
  const { settings } = useSettings();


  // State for adding new items
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [skuInput, setSkuInput] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number | undefined>(undefined);
  const [salePriceStockingUnit, setSalePriceStockingUnit] = useState<number | undefined>(undefined);
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [productUnits, setProductUnits] = useState<Record<number, { stocking_unit_name?: string | null; sellable_unit_name?: string | null }>>({});
  
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
        sale_price: field === 'sale_price' ? (value ? Number(value) : 0) : (currentItem.sale_price ? Number(currentItem.sale_price) : 0),
        sale_price_stocking_unit: field === 'sale_price_stocking_unit'
          ? (value !== null && value !== undefined ? Number(value) : null)
          : (currentItem.sale_price_stocking_unit !== undefined ? (currentItem.sale_price_stocking_unit as number | null) : null),
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

  // Add all products mutation
  const addAllProductsMutation = useMutation({
    mutationFn: async () => {
      // Get all products
      const response = await apiClient.get<{ data: Product[] }>('/products?limit=1000');
      const allProducts = response.data.data || response.data;
      
      // Filter out products that are already in the purchase
      const existingProductIds = purchase?.items?.map(item => item.product_id) || [];
      const newProducts = allProducts.filter(product => !existingProductIds.includes(product.id));
      
      // Add each product with quantity 0
      const promises = newProducts.map(product => {
        const data: AddPurchaseItemData = {
          product_id: product.id,
          quantity: 0,
          unit_cost: Number(product.latest_cost_per_sellable_unit) || 0,
          sale_price: Number(product.suggested_sale_price_per_sellable_unit) || 0,
          batch_number: undefined,
          expiry_date: undefined,
        };
        return purchaseService.addPurchaseItem(purchaseId!, data);
      });
      
      await Promise.all(promises);
      return newProducts.length;
    },
    onSuccess: (count) => {
      toast.success(t('common:success'), {
        description: t('purchases:allProductsAddedSuccess', { count }),
      });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error(t('common:error'), {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  // Delete zero quantity items mutation
  const deleteZeroQuantityItemsMutation = useMutation({
    mutationFn: async () => {
      const zeroQuantityItems = purchase?.items?.filter(item => item.quantity === 0) || [];
      
      // Delete each zero quantity item
      const promises = zeroQuantityItems.map(item => 
        purchaseService.deletePurchaseItem(purchaseId!, item.id)
      );
      
      await Promise.all(promises);
      return zeroQuantityItems.length;
    },
    onSuccess: (count) => {
      toast.success(t('common:success'), {
        description: t('purchases:zeroQuantityItemsDeletedSuccess', { count }),
      });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error(t('common:error'), {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  // Update purchase status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: "received" | "pending" | "ordered") => {
      // Include current items when updating status
      const currentItems = purchase?.items?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        batch_number: item.batch_number,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        sale_price: item.sale_price,
        expiry_date: item.expiry_date,
      })) || [];
      
      return await purchaseService.updatePurchase(purchaseId!, { 
        status,
        items: currentItems
      });
    },
    onSuccess: () => {
      toast.success(t('common:success'), {
        description: t('purchases:statusUpdatedSuccess'),
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
        // Also search by SKU
        params.append("search_sku", "true");
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
        const costPerSellable = Number(product.latest_cost_per_sellable_unit);
        const unitsPerStocking = product.units_per_stocking_unit && product.units_per_stocking_unit > 0 ? product.units_per_stocking_unit : 1;
        const costPerStocking = costPerSellable * unitsPerStocking;
        setUnitCost(costPerStocking);
        // Calculate prices using profit percentage
        const globalProfitRate = settings?.default_profit_rate ?? 20;
        const profitFactor = globalProfitRate / 100;
        // Sellable unit price: (cost per stocking * profit% / 100) / units_per_stocking
        const sellablePrice = (costPerStocking * profitFactor) / unitsPerStocking;
        setSalePrice(roundToThreeDecimals(sellablePrice));
        // Stocking unit price: cost per stocking * profit% / 100
        const stockingPrice = costPerStocking * profitFactor;
        setSalePriceStockingUnit(roundToThreeDecimals(stockingPrice));
      }
    } else {
      setSkuInput('');
      setProductInputValue('');
    }
  }, [settings?.default_profit_rate]);

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

  // Handle unit cost change and calculate sale price
  const handleUnitCostChange = useCallback((newCost: number) => {
    setUnitCost(newCost);
    // Calculate prices using profit percentage
    const globalProfitRate = settings?.default_profit_rate ?? 20;
    const profitFactor = globalProfitRate / 100;
    const unitsPerStocking = selectedProduct?.units_per_stocking_unit && selectedProduct.units_per_stocking_unit > 0 ? selectedProduct.units_per_stocking_unit : 1;
    // Sellable unit price
    const costPerSellable = newCost  / unitsPerStocking;
    const profitablePricePerSellable = costPerSellable * profitFactor;
    const sellablePrice = costPerSellable + profitablePricePerSellable;
    
    console.log(newCost, 'newCost')
    console.log(profitFactor, 'profitFactor')
    console.log(unitsPerStocking, 'unitsPerStocking')
    console.log(costPerSellable, 'costPerSellable')
    setSalePrice(roundToThreeDecimals(sellablePrice));

    // Stocking unit price
    setSalePriceStockingUnit(roundToThreeDecimals(sellablePrice * unitsPerStocking));
  }, [settings?.default_profit_rate, selectedProduct?.units_per_stocking_unit]);

  // Handle autocomplete Enter key for SKU search
  const handleAutocompleteKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && productInputValue.trim() && !selectedProduct) {
      e.preventDefault();
      try {
        // Try to search by SKU first
        const product = await purchaseService.getProductBySku(productInputValue.trim());
        if (product) {
          handleProductSelect(product);
          return;
        }
        
        // If no SKU match, search in existing options by name
        const nameMatch = productOptions.find(p => 
          p.name.toLowerCase().includes(productInputValue.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase() === productInputValue.toLowerCase())
        );
        
        if (nameMatch) {
          handleProductSelect(nameMatch);
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
  }, [productInputValue, selectedProduct, productOptions, handleProductSelect, t]);

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
      sale_price: salePrice !== undefined ? roundToThreeDecimals(salePrice) : 0,
      sale_price_stocking_unit: salePriceStockingUnit !== undefined ? roundToThreeDecimals(salePriceStockingUnit) : undefined,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    addItemMutation.mutate(data);
  }, [selectedProduct, quantity, unitCost, salePrice, salePriceStockingUnit, batchNumber, expiryDate, addItemMutation, t]);

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

  // Check if purchase is in read-only state
  const isReadOnly = useMemo(() => {
    return purchase?.status === 'received';
  }, [purchase?.status]);

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

  // Load unit names for items' products if not present in API response
  useEffect(() => {
    const ids = purchase?.items?.map(i => i.product_id) || [];
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      setProductUnits({});
      return;
    }
    (async () => {
      try {
        const products = await productService.getProductsByIds(uniqueIds);
        const map: Record<number, { stocking_unit_name?: string | null; sellable_unit_name?: string | null }> = {};
        products.forEach(p => {
          map[p.id] = {
            stocking_unit_name: p.stocking_unit_name ?? null,
            sellable_unit_name: p.sellable_unit_name ?? null,
          };
        });
        setProductUnits(map);
      } catch {
        // Silent fail; UI will fallback to translations
      }
    })();
  }, [purchase?.items]);
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
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('purchases:managePurchaseItems')} #{purchase.id}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('purchases:supplier')}: {purchase.supplier_name}
              </p>
            </div>
            
            {/* Summary Cards */}
            <div className="flex gap-2">
              {/* Items Count Card */}
              <div className="w-[100px] h-[100px] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.totalItems}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 text-center">
                  {t('purchases:totalItems')}
                </div>
              </div>
              
              {/* Total Cost Card */}
              <div className="w-[100px] h-[100px] bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(summary.totalCost)}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300 text-center">
                  {t('purchases:totalCost')}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
                     {!isReadOnly && (
             <>
               <Tooltip title={t('purchases:addAllProducts')}>
                 <IconButton
                   onClick={() => addAllProductsMutation.mutate()}
                   disabled={addAllProductsMutation.isPending}
                   size="small"
                   color="primary"
                 >
                   {addAllProductsMutation.isPending ? (
                     <CircularProgress size={16} />
                   ) : (
                     <Plus className="h-4 w-4" />
                   )}
                 </IconButton>
               </Tooltip>
               <Tooltip title={t('purchases:deleteZeroQuantityItems')}>
                 <IconButton
                   onClick={() => deleteZeroQuantityItemsMutation.mutate()}
                   disabled={deleteZeroQuantityItemsMutation.isPending}
                   size="small"
                   color="error"
                 >
                   {deleteZeroQuantityItemsMutation.isPending ? (
                     <CircularProgress size={16} />
                   ) : (
                     <DeleteIcon fontSize="small" />
                   )}
                 </IconButton>
               </Tooltip>
             </>
           )}
          <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('purchases:viewSummary')}
              </Button>
            </DialogTrigger>
            <PurchaseSummaryDialog summary={summary} supplierName={purchase.supplier_name} />
          </Dialog>
          
          {/* Status Select */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">{t('purchases:status')}:</Label>
            <Select
              value={purchase.status}
              onValueChange={(value: "received" | "pending" | "ordered") => {
                updateStatusMutation.mutate(value);
              }}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('purchases:status_pending')}</SelectItem>
                <SelectItem value="ordered">{t('purchases:status_ordered')}</SelectItem>
                <SelectItem value="received">{t('purchases:status_received')}</SelectItem>
              </SelectContent>
            </Select>
            {updateStatusMutation.isPending && <CircularProgress size={16} />}
          </div>
          
          <Badge variant={purchase.status === 'received' ? 'default' : 'secondary'}>
            {t(`purchases:status_${purchase.status}`)}
          </Badge>
        </div>
      </div>



      {/* Add New Item */}
      {!isReadOnly && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('purchases:addNewItem')}
            </CardTitle>
          </CardHeader>
                     <CardContent>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Product Selection */}
            <div className="space-y-2 lg:col-span-3 md:col-span-2">
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
                onKeyDown={handleAutocompleteKeyDown}
                sx={{ width: '100%' }} // Make Autocomplete take full width
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('products:searchProduct')}
                    placeholder={t('products:searchByNameOrSku')}
                    size="small"
                    fullWidth
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
                  const isSkuMatch = option.sku && productInputValue.toLowerCase() === option.sku.toLowerCase();
                  return (
                    <li key={key} {...otherProps}>
                      <Box>
                        <Typography variant="body2" component="span">
                          {option.name}
                        </Typography>
                        {option.sku && (
                          <Typography 
                            variant="caption" 
                            color={isSkuMatch ? "primary" : "text.secondary"} 
                            display="block"
                            sx={{ fontWeight: isSkuMatch ? 'bold' : 'normal' }}
                          >
                            SKU: {option.sku}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
              />
              <Typography variant="caption" color="text.secondary" className="block mt-1">
                {t('products:searchByNameOrSkuHint')}
              </Typography>
            </div>

            {selectedProduct && (
              <>
                {/* SKU Input */}
                <div className="space-y-2 md:col-span-1 lg:col-span-1">
                  <Label>{t('products:sku')}</Label>
                  <SelectOnFocusInput
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    onKeyPress={handleSkuKeyPress}
                    placeholder={t('products:enterSkuAndPressEnter')}
                  />
                </div>

                {/* Selected Product Summary */}
                <div className="lg:col-span-2 md:col-span-2 col-span-1" >
                  <div className="p-2 text-right ">
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {selectedProduct.stocking_unit_name && selectedProduct.sellable_unit_name ? (
                        <span>
                          1 {selectedProduct.stocking_unit_name} = {selectedProduct.units_per_stocking_unit || 1} {selectedProduct.sellable_unit_name}
                        </span>
                      ) : (
                        <span>
                          1 Stocking Unit = {selectedProduct.units_per_stocking_unit || 1} Sellable Units
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label>{t('purchases:quantity')} {selectedProduct?.stocking_unit_name ? `(${selectedProduct.stocking_unit_name})` : ''}</Label>
                  <SelectOnFocusInput
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Unit Cost */}
                <div className="space-y-2">
                  <Label>{t('purchases:unitCost')} {selectedProduct?.stocking_unit_name ? `(${selectedProduct.stocking_unit_name})` : ''}</Label>
                  <SelectOnFocusInput
                    type="number"
                    value={unitCost}
                    onChange={(e) => handleUnitCostChange(Number(e.target.value))}
                    min={0}
                    step={0.01}
                    className="w-full"
                  />
                </div>

                {/* Sale Price (per SELLABLE unit) - Required */}
                <div className="space-y-2">
                  <Label>
                    {t('purchases:salePrice')} <span className="text-red-500">*</span>
                  </Label>
                  <SelectOnFocusInput
                    type="number"
                    value={salePrice || ''}
                    onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : undefined)}
                    min={0}
                    step={0.001}
                    required
                    aria-invalid={salePrice === undefined}
                    className={`w-full ${salePrice === undefined ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <div className="text-xs">
                    {selectedProduct?.sellable_unit_name && (
                      <span className="text-gray-500">({selectedProduct.sellable_unit_name})</span>
                    )}
                    {salePrice === undefined && (
                      <span className="text-red-500 ms-2">{t('common:required') || 'Required'}</span>
                    )}
                  </div>
                </div>

                {/* Sale Price (per STOCKING unit) - Optional */}
                <div className="space-y-2">
                  <Label>{t('purchases:salePrice')}</Label>
                  <SelectOnFocusInput
                    type="number"
                    value={salePriceStockingUnit || ''}
                    onChange={(e) => setSalePriceStockingUnit(e.target.value ? Number(e.target.value) : undefined)}
                    min={0}
                    step={0.001}
                    className="w-full"
                  />
                  {selectedProduct?.stocking_unit_name && (
                    <div className="text-xs text-gray-500">({selectedProduct.stocking_unit_name})</div>
                  )}
                </div>

                {/* Batch Number */}
                <div className="space-y-2">
                  <Label>{t('purchases:batchNumber')}</Label>
                  <SelectOnFocusInput
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label>{t('purchases:expiryDate')}</Label>
                  <InstantTextField
                    type="date"
                    value={expiryDate}
                    placeholder="yyyy-mm-dd"
                    onChangeValue={(val) => setExpiryDate(String(val))}
                  />
                </div>
              </>
            )}
          </div>

          {selectedProduct && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleAddItem}
                disabled={salePrice === undefined || addItemMutation.isPending}
                className="flex items-center gap-2"
              >
                {addItemMutation.isPending && <CircularProgress size={16} />}
                <Plus className="h-4 w-4" />
                {t('purchases:addItem')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Purchase Items List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('purchases:purchaseItems')}</CardTitle>
        </CardHeader>
        <CardContent>
          {purchase.items && purchase.items.length > 0 ? (
            <div className="space-y-4">
              {purchase.items
                .sort((a, b) => b.id - a.id) // Sort by ID descending (newest first)
                .map((item: PurchaseItem, index: number) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-3 ${
                    item.quantity === 0 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                      : 'bg-white dark:bg-gray-800'
                  }`}
                >
                                     <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_120px_120px_120px_120px_120px_auto] gap-4 items-center">
                     <div className="flex items-center gap-3">
                       <Avatar 
                         sx={{ 
                           width: 32, 
                           height: 32, 
                           bgcolor: 'primary.main',
                           fontSize: '0.875rem',
                           fontWeight: 'bold'
                         }}
                       >
                         {(purchase.items?.length || 0) - index}
                       </Avatar>
                       <div>
                         <Typography variant="subtitle2" className="font-medium">
                           {item.product_name || item.product?.name || `Product ID: ${item.product_id}`}
                         </Typography>
                         {(item.product_sku || item.product?.sku) && (
                           <Typography variant="caption" color="text.secondary">
                             SKU: {item.product_sku || item.product?.sku}
                           </Typography>
                         )}
                         {item.quantity === 0 && (
                           <Badge variant="destructive" className="mt-1 text-xs">
                             {t('purchases:zeroQuantity')}
                           </Badge>
                         )}
                       </div>
                     </div>
                     <div className="text-center w-full">
                       <InstantTextField
                         value={item.batch_number || ''}
                         onChangeValue={(newValue) => handleItemUpdate(item.id, 'batch_number', newValue)}
                         type="text"
                         placeholder="—"
                         disabled={isReadOnly}
                       />
                       <Typography variant="caption" color="text.secondary" className="block mt-1">
                         {t('purchases:batch')}
                       </Typography>
                     </div>
                     <div className="text-center w-full">
                       <InstantTextField
                         value={item.quantity}
                         onChangeValue={(newValue) => { if (newValue === '') return; handleItemUpdate(item.id, 'quantity', Number(newValue)); }}
                         type="number"
                         min={1}
                         step={1}
                         disabled={isReadOnly}
                       />
                       <Typography variant="caption" color="text.secondary" className="block mt-1">
                         {t('purchases:quantity')} {productUnits[item.product_id]?.stocking_unit_name ? `(${productUnits[item.product_id]?.stocking_unit_name})` : ''}
                       </Typography>
                     </div>
                     <div className="text-center w-full">
                       <InstantTextField
                         value={item.unit_cost}
                         onChangeValue={(newValue) => { if (newValue === '') return; handleItemUpdate(item.id, 'unit_cost', Number(newValue)); }}
                         type="number"
                         min={0}
                         step={0.01}
                         disabled={isReadOnly}
                       />
                       <Typography variant="caption" color="text.secondary" className="block mt-1">
                         {t('purchases:unitCost')} {productUnits[item.product_id]?.stocking_unit_name ? `(${productUnits[item.product_id]?.stocking_unit_name})` : ''}
                       </Typography>
                     </div>
                     <div className="text-center w-full">
                       <InstantTextField
                         value={item.sale_price ?? ''}
                         onChangeValue={(newValue) => { if (newValue === '') return; const rounded = roundToThreeDecimals(Number(newValue)); handleItemUpdate(item.id, 'sale_price', rounded); }}
                         type="number"
                         min={0}
                         step={0.001}
                         disabled={isReadOnly}
                       />
                       <Typography variant="caption" color="text.secondary" className="block mt-1">
                         {t('purchases:salePrice')} {productUnits[item.product_id]?.sellable_unit_name ? `(${productUnits[item.product_id]?.sellable_unit_name})` : `(${t('products:sellableUnit')})`}
                       </Typography>
                     </div>
                     <div className="text-center w-full">
                       <InstantTextField
                         value={item.sale_price_stocking_unit ?? ''}
                         onChangeValue={(newValue) => { if (newValue === '') return; const rounded = roundToThreeDecimals(Number(newValue)); handleItemUpdate(item.id, 'sale_price_stocking_unit', rounded); }}
                         type="number"
                         min={0}
                         step={0.001}
                         disabled={isReadOnly}
                       />
                       <Typography variant="caption" color="text.secondary" className="block mt-1">
                         {t('purchases:salePrice')} ({productUnits[item.product_id]?.stocking_unit_name || t('products:stockingUnit')})
                       </Typography>
                     </div>
                     <div className="text-center w-full">
                       <InstantTextField
                         value={item.expiry_date || ''}
                         onChangeValue={(newValue) => handleItemUpdate(item.id, 'expiry_date', String(newValue) || null)}
                         type="date"
                         placeholder="yyyy-mm-dd"
                         disabled={isReadOnly}
                       />
                       <Typography variant="caption" color="text.secondary" className="block mt-1">
                         {t('purchases:expiryDate')}
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
                       {!isReadOnly && (
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
                       )}
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