// src/pages/purchases/ManagePurchaseItemsPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// MUI Components
import {
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  Box,
  Avatar,
  Button,
  Card,
  CardContent,
  Dialog,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Stack,
  Paper,
  Divider,
} from '@mui/material';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Services and Types
import purchaseService, { PurchaseItem } from '../../services/purchaseService';
import productService, { Product } from '../../services/productService';
import { formatCurrency } from '@/constants';
import apiClient from '@/lib/axios';
import { useSettings } from '@/context/SettingsContext';

// Components
import InstantTextField from '@/components/purchases/InstantTextField';
import PurchaseSummaryDialog from '@/components/purchases/PurchaseSummaryDialog';

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

const ManagePurchaseItemsPage: React.FC = () => {
  const { id: purchaseIdParam } = useParams<{ id: string }>();
  const purchaseId = purchaseIdParam ? Number(purchaseIdParam) : null;
  const navigate = useNavigate();
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
    staleTime: 0,
  });

  // Add purchase item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: AddPurchaseItemData) => {
      return await purchaseService.addPurchaseItem(purchaseId!, data);
    },
    onSuccess: () => {
      toast.success('تم بنجاح', { description: 'تمت إضافة الصنف بنجاح' });
      refetchPurchase();
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error('خطأ', { description: purchaseService.getErrorMessage(error) });
    },
  });

  // Update purchase item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, field, value }: { itemId: number; field: string; value: unknown }) => {
      const currentItem = purchase?.items?.find(item => item.id === itemId);
      if (!currentItem) throw new Error('الصنف غير موجود');

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
      toast.success('تم بنجاح', { description: 'تم تحديث الصنف بنجاح' });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error('خطأ', { description: purchaseService.getErrorMessage(error) });
    },
  });

  // Delete purchase item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await purchaseService.deletePurchaseItem(purchaseId!, itemId);
    },
    onSuccess: () => {
      toast.success('تم بنجاح', { description: 'تم حذف الصنف بنجاح' });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error('خطأ', { description: purchaseService.getErrorMessage(error) });
    },
  });

  // Add all products mutation
  const addAllProductsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get<{ data: Product[] }>('/products?limit=1000');
      const allProducts = response.data.data || response.data;
      const existingProductIds = purchase?.items?.map(item => item.product_id) || [];
      const newProducts = allProducts.filter(product => !existingProductIds.includes(product.id));
      
      const promises = newProducts.map(product => {
        const data: AddPurchaseItemData = {
          product_id: product.id,
          quantity: 0,
          unit_cost: Number(product.latest_cost_per_sellable_unit) || 0,
          sale_price: Number(product.suggested_sale_price_per_sellable_unit) || 0,
        };
        return purchaseService.addPurchaseItem(purchaseId!, data);
      });
      
      await Promise.all(promises);
      return newProducts.length;
    },
    onSuccess: (count) => {
      toast.success('تم بنجاح', { description: `تمت إضافة ${count} منتج` });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error('خطأ', { description: purchaseService.getErrorMessage(error) });
    },
  });

  // Delete zero quantity items mutation
  const deleteZeroQuantityItemsMutation = useMutation({
    mutationFn: async () => {
      const zeroQuantityItems = purchase?.items?.filter(item => item.quantity === 0) || [];
      const promises = zeroQuantityItems.map(item => 
        purchaseService.deletePurchaseItem(purchaseId!, item.id)
      );
      await Promise.all(promises);
      return zeroQuantityItems.length;
    },
    onSuccess: (count) => {
      toast.success('تم بنجاح', { description: `تم حذف ${count} صنف بكمية صفر` });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error('خطأ', { description: purchaseService.getErrorMessage(error) });
    },
  });

  // Update purchase status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: "received" | "pending" | "ordered") => {
      const currentItems = purchase?.items?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        batch_number: item.batch_number,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        sale_price: item.sale_price,
        expiry_date: item.expiry_date,
      })) || [];
      
      return await purchaseService.updatePurchase(purchaseId!, { status, items: currentItems });
    },
    onSuccess: () => {
      toast.success('تم بنجاح', { description: 'تم تحديث حالة المشتريات' });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error('خطأ', { description: purchaseService.getErrorMessage(error) });
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
    setSalePriceStockingUnit(undefined);
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
        params.append("search_sku", "true");
      } else {
        params.append("show_all_for_empty_search", "true");
      }
      params.append("limit", "15");

      const response = await apiClient.get<{ data: Product[] }>(`/products/autocomplete?${params.toString()}`);
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
      if (product.latest_cost_per_sellable_unit) {
        const costPerSellable = Number(product.latest_cost_per_sellable_unit);
        const unitsPerStocking = product.units_per_stocking_unit && product.units_per_stocking_unit > 0 ? product.units_per_stocking_unit : 1;
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
      setSkuInput('');
      setProductInputValue('');
    }
  }, [settings?.default_profit_rate]);

  // Handle SKU input and search by SKU
  const handleSkuKeyPress = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skuInput.trim()) {
      try {
        const product = await purchaseService.getProductBySku(skuInput.trim());
        if (product) {
          handleProductSelect(product);
        } else {
          toast.error('خطأ', { description: 'المنتج غير موجود' });
        }
      } catch {
        toast.error('خطأ', { description: 'حدث خطأ أثناء البحث' });
      }
    }
  }, [skuInput, handleProductSelect]);

  // Handle unit cost change and calculate sale price
  const handleUnitCostChange = useCallback((newCost: number) => {
    setUnitCost(newCost);
    const globalProfitRate = settings?.default_profit_rate ?? 20;
    const profitFactor = globalProfitRate / 100;
    const unitsPerStocking = selectedProduct?.units_per_stocking_unit && selectedProduct.units_per_stocking_unit > 0 ? selectedProduct.units_per_stocking_unit : 1;
    const costPerSellable = newCost / unitsPerStocking;
    const profitablePricePerSellable = costPerSellable * profitFactor;
    const sellablePrice = costPerSellable + profitablePricePerSellable;
    setSalePrice(roundToThreeDecimals(sellablePrice));
    setSalePriceStockingUnit(roundToThreeDecimals(sellablePrice * unitsPerStocking));
  }, [settings?.default_profit_rate, selectedProduct?.units_per_stocking_unit]);

  // Handle autocomplete Enter key for SKU search
  const handleAutocompleteKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && productInputValue.trim() && !selectedProduct) {
      e.preventDefault();
      try {
        const product = await purchaseService.getProductBySku(productInputValue.trim());
        if (product) {
          handleProductSelect(product);
          return;
        }
        const nameMatch = productOptions.find(p => 
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
  }, [productInputValue, selectedProduct, productOptions, handleProductSelect]);

  // Handle adding item
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
      sale_price_stocking_unit: salePriceStockingUnit !== undefined ? roundToThreeDecimals(salePriceStockingUnit) : undefined,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    addItemMutation.mutate(data);
  }, [selectedProduct, quantity, unitCost, salePrice, salePriceStockingUnit, batchNumber, expiryDate, addItemMutation]);

  // Calculate summary values
  const summary = useMemo(() => {
    if (!purchase?.items) {
      return { totalCost: 0, totalSell: 0, totalItems: 0, totalQuantity: 0 };
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
  const isReadOnly = useMemo(() => purchase?.status === 'received', [purchase?.status]);

  // Debounce refs for item updates
  const updateTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Handle item updates with debouncing
  const handleItemUpdate = useCallback((itemId: number, field: string, value: unknown) => {
    const updateKey = `${itemId}-${field}`;
    const existingTimeout = updateTimeoutRefs.current.get(updateKey);
    if (existingTimeout) clearTimeout(existingTimeout);
    
    const newTimeout = setTimeout(() => {
      updateItemMutation.mutate({ itemId, field, value });
      updateTimeoutRefs.current.delete(updateKey);
    }, 1000);
    
    updateTimeoutRefs.current.set(updateKey, newTimeout);
  }, [updateItemMutation]);

  // Debounced product search effect
  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productInputValue), 300);
    return () => clearTimeout(timer);
  }, [productInputValue, searchProducts]);

  // Initial product load
  useEffect(() => { searchProducts(''); }, [searchProducts]);

  // Load unit names for items' products
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
      } catch { /* Silent fail */ }
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
    if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      deleteItemMutation.mutate(itemId);
    }
  }, [deleteItemMutation]);

  // Status labels
  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    ordered: 'تم الطلب',
    received: 'تم الاستلام',
  };

  if (!purchaseId) {
    return (
      <Box dsplay="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>خطأ</Typography>
          <Typography color="text.secondary">رقم المشتريات غير صالح</Typography>
        </Paper>
      </Box>
    );
  }

  if (loadingPurchase) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
        <CircularProgress />
        <Typography>جاري التحميل...</Typography>
      </Box>
    );
  }

  if (purchaseError || !purchase) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>خطأ</Typography>
          <Typography color="text.secondary">{purchaseService.getErrorMessage(purchaseError)}</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate('/purchases')} color="primary">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                إدارة أصناف المشتريات #{purchase.id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                المورد: {purchase.supplier_name}
              </Typography>
            </Box>
          </Stack>

          {/* Summary Cards */}
          <Stack direction="row" gap={1}>
            <Paper sx={{ p: 1.5, minWidth: 80, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h5" fontWeight="bold">{summary.totalItems}</Typography>
              <Typography variant="caption">عدد الأصناف</Typography>
            </Paper>
            <Paper sx={{ p: 1.5, minWidth: 80, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="h6" fontWeight="bold">{formatCurrency(summary.totalCost)}</Typography>
              <Typography variant="caption">إجمالي التكلفة</Typography>
            </Paper>
          </Stack>

          {/* Actions */}
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            {!isReadOnly && (
              <>
                <Tooltip title="إضافة كل المنتجات">
                  <IconButton onClick={() => addAllProductsMutation.mutate()} disabled={addAllProductsMutation.isPending} color="primary" size="small">
                    {addAllProductsMutation.isPending ? <CircularProgress size={20} /> : <AddIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="حذف الأصناف بكمية صفر">
                  <IconButton onClick={() => deleteZeroQuantityItemsMutation.mutate()} disabled={deleteZeroQuantityItemsMutation.isPending} color="error" size="small">
                    {deleteZeroQuantityItemsMutation.isPending ? <CircularProgress size={20} /> : <DeleteIcon />}
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Button variant="outlined" size="small" startIcon={<BarChartIcon />} onClick={() => setSummaryDialogOpen(true)}>
              ملخص
            </Button>

            <Dialog open={summaryDialogOpen} onClose={() => setSummaryDialogOpen(false)} fullWidth maxWidth="sm">
              <PurchaseSummaryDialog summary={summary} supplierName={purchase.supplier_name} />
            </Dialog>

            {/* Status Select */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={purchase.status}
                onChange={(e) => updateStatusMutation.mutate(e.target.value as 'received' | 'pending' | 'ordered')}
                disabled={updateStatusMutation.isPending}
              >
                <MenuItem value="pending">قيد الانتظار</MenuItem>
                <MenuItem value="ordered">تم الطلب</MenuItem>
                <MenuItem value="received">تم الاستلام</MenuItem>
              </Select>
            </FormControl>
            {updateStatusMutation.isPending && <CircularProgress size={20} />}
            
            <Chip
              label={statusLabels[purchase.status] || purchase.status}
              color={purchase.status === 'received' ? 'success' : purchase.status === 'ordered' ? 'primary' : 'default'}
              size="small"
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Add New Item */}
      {!isReadOnly && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddIcon /> إضافة صنف جديد
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2 }}>
              {/* Product Selection */}
              <Box sx={{ gridColumn: { xs: '1', md: '1 / 3', lg: '1 / 4' } }}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>اسم المنتج</Typography>
                <Autocomplete
                  options={productOptions}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                  value={selectedProduct}
                  onChange={(_, newValue) => handleProductSelect(typeof newValue === 'string' ? null : newValue)}
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
                  {/* SKU */}
                  <Box>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>الباركود</Typography>
                    <TextField
                      value={skuInput}
                      onChange={(e) => setSkuInput(e.target.value)}
                      onKeyPress={handleSkuKeyPress}
                      placeholder="اضغط Enter للبحث"
                      size="small"
                      fullWidth
                    />
                  </Box>

                  {/* Unit Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      1 {selectedProduct.stocking_unit_name || 'وحدة تخزين'} = {selectedProduct.units_per_stocking_unit || 1} {selectedProduct.sellable_unit_name || 'وحدة بيع'}
                    </Typography>
                  </Box>

                  {/* Quantity */}
                  <Box>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      الكمية {selectedProduct?.stocking_unit_name ? `(${selectedProduct.stocking_unit_name})` : ''}
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

                  {/* Unit Cost */}
                  <Box>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      سعر التكلفة {selectedProduct?.stocking_unit_name ? `(${selectedProduct.stocking_unit_name})` : ''}
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

                  {/* Sale Price (Sellable) */}
                  <Box>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      سعر البيع <span style={{ color: 'red' }}>*</span>
                    </Typography>
                    <TextField
                      type="number"
                      value={salePrice || ''}
                      onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : undefined)}
                      inputProps={{ min: 0, step: 0.001 }}
                      size="small"
                      fullWidth
                      error={salePrice === undefined}
                      helperText={selectedProduct?.sellable_unit_name ? `(${selectedProduct.sellable_unit_name})` : ''}
                    />
                  </Box>

                  {/* Sale Price (Stocking) */}
                  <Box>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>سعر البيع (تخزين)</Typography>
                    <TextField
                      type="number"
                      value={salePriceStockingUnit || ''}
                      onChange={(e) => setSalePriceStockingUnit(e.target.value ? Number(e.target.value) : undefined)}
                      inputProps={{ min: 0, step: 0.001 }}
                      size="small"
                      fullWidth
                      helperText={selectedProduct?.stocking_unit_name ? `(${selectedProduct.stocking_unit_name})` : ''}
                    />
                  </Box>

                  {/* Batch Number */}
                  <Box>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>رقم الدفعة</Typography>
                    <TextField
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </Box>

                  {/* Expiry Date */}
                  <Box>
                    <Typography variant="body2" fontWeight="medium" gutterBottom>تاريخ الانتهاء</Typography>
                    <TextField
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </>
              )}
            </Box>

            {selectedProduct && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddItem}
                  disabled={salePrice === undefined || addItemMutation.isPending}
                  startIcon={addItemMutation.isPending ? <CircularProgress size={16} /> : <AddIcon />}
                >
                  إضافة الصنف
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Purchase Items List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>أصناف المشتريات</Typography>
          <Divider sx={{ mb: 2 }} />

          {purchase.items && purchase.items.length > 0 ? (
            <Stack spacing={2}>
              {purchase.items
                .sort((a, b) => b.id - a.id)
                .map((item: PurchaseItem, index: number) => (
                  <Paper
                    key={item.id}
                    sx={{
                      p: 2,
                      bgcolor: item.quantity === 0 ? 'error.lighter' : 'background.paper',
                      border: item.quantity === 0 ? '1px solid' : 'none',
                      borderColor: 'error.main',
                    }}
                  >
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(9, 1fr)' }, gap: 2, alignItems: 'center' }}>
                      {/* Product Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                          {(purchase.items?.length || 0) - index}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {item.product_name || item.product?.name || `منتج #${item.product_id}`}
                          </Typography>
                          {(item.product_sku || item.product?.sku) && (
                            <Typography variant="caption" color="text.secondary">
                              باركود: {item.product_sku || item.product?.sku}
                            </Typography>
                          )}
                          {item.quantity === 0 && (
                            <Chip label="كمية صفر" color="error" size="small" sx={{ mt: 0.5 }} />
                          )}
                        </Box>
                      </Box>

                      {/* Batch */}
                      <Box sx={{ textAlign: 'center' }}>
                        <InstantTextField
                          value={item.batch_number || ''}
                          onChangeValue={(v) => handleItemUpdate(item.id, 'batch_number', v)}
                          type="text"
                          placeholder="—"
                          disabled={isReadOnly}
                        />
                        <Typography variant="caption" color="text.secondary">رقم الدفعة</Typography>
                      </Box>

                      {/* Quantity */}
                      <Box sx={{ textAlign: 'center' }}>
                        <InstantTextField
                          value={item.quantity}
                          onChangeValue={(v) => { if (v === '') return; handleItemUpdate(item.id, 'quantity', Number(v)); }}
                          type="number"
                          min={0}
                          step={1}
                          disabled={isReadOnly}
                        />
                        <Typography variant="caption" color="text.secondary">
                          الكمية {productUnits[item.product_id]?.stocking_unit_name ? `(${productUnits[item.product_id]?.stocking_unit_name})` : ''}
                        </Typography>
                      </Box>

                      {/* Unit Cost */}
                      <Box sx={{ textAlign: 'center' }}>
                        <InstantTextField
                          value={item.unit_cost}
                          onChangeValue={(v) => { if (v === '') return; handleItemUpdate(item.id, 'unit_cost', Number(v)); }}
                          type="number"
                          min={0}
                          step={0.01}
                          disabled={isReadOnly}
                        />
                        <Typography variant="caption" color="text.secondary">
                          سعر التكلفة {productUnits[item.product_id]?.stocking_unit_name ? `(${productUnits[item.product_id]?.stocking_unit_name})` : ''}
                        </Typography>
                      </Box>

                      {/* Sale Price (Sellable) */}
                      <Box sx={{ textAlign: 'center' }}>
                        <InstantTextField
                          value={item.sale_price ?? ''}
                          onChangeValue={(v) => { if (v === '') return; handleItemUpdate(item.id, 'sale_price', roundToThreeDecimals(Number(v))); }}
                          type="number"
                          min={0}
                          step={0.001}
                          disabled={isReadOnly}
                        />
                        <Typography variant="caption" color="text.secondary">
                          سعر البيع {productUnits[item.product_id]?.sellable_unit_name ? `(${productUnits[item.product_id]?.sellable_unit_name})` : '(وحدة بيع)'}
                        </Typography>
                      </Box>

                      {/* Sale Price (Stocking) */}
                      <Box sx={{ textAlign: 'center' }}>
                        <InstantTextField
                          value={item.sale_price_stocking_unit ?? ''}
                          onChangeValue={(v) => { if (v === '') return; handleItemUpdate(item.id, 'sale_price_stocking_unit', roundToThreeDecimals(Number(v))); }}
                          type="number"
                          min={0}
                          step={0.001}
                          disabled={isReadOnly}
                        />
                        <Typography variant="caption" color="text.secondary">
                          سعر البيع ({productUnits[item.product_id]?.stocking_unit_name || 'وحدة تخزين'})
                        </Typography>
                      </Box>

                      {/* Expiry Date */}
                      <Box sx={{ textAlign: 'center' }}>
                        <InstantTextField
                          value={item.expiry_date || ''}
                          onChangeValue={(v) => handleItemUpdate(item.id, 'expiry_date', String(v) || null)}
                          type="date"
                          disabled={isReadOnly}
                        />
                        <Typography variant="caption" color="text.secondary">تاريخ الانتهاء</Typography>
                      </Box>

                      {/* Total Cost */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(item.quantity * Number(item.unit_cost))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">إجمالي التكلفة</Typography>
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        {!isReadOnly && (
                          <Tooltip title="حذف">
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
                      </Box>
                    </Box>
                  </Paper>
                ))}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">لا توجد أصناف في هذه المشتريات</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ManagePurchaseItemsPage;
