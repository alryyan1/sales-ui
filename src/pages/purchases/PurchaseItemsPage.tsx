// src/pages/purchases/PurchaseItemsPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

// Services and Types
import purchaseService, { Purchase, PurchaseItem } from '../../services/purchaseService';
import productService, { Product } from '../../services/productService';
import { formatCurrency } from '@/constants';
import dayjs from 'dayjs';

// Shadcn Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface PurchaseItemFormData {
  id?: number;
  product_id: number;
  batch_number: string;
  quantity: number;
  unit_cost: number;
  sale_price: number | null;
  expiry_date: string;
}



const PurchaseItemsPage: React.FC = () => {
  const { t } = useTranslation(['purchases', 'common', 'products']);
  const navigate = useNavigate();
  const { purchaseId } = useParams<{ purchaseId: string }>();

  // State
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PurchaseItemFormData>({
    product_id: 0,
    batch_number: '',
    quantity: 0,
    unit_cost: 0,
    sale_price: null,
    expiry_date: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<PurchaseItemFormData>>({});

  // Memoized values
  const totalItems = useMemo(() => purchaseItems.length, [purchaseItems]);
  const totalValue = useMemo(() => 
    purchaseItems.reduce((sum, item) => sum + Number(item.total_cost), 0), 
    [purchaseItems]
  );

  // Fetch purchase details
  const fetchPurchaseDetails = useCallback(async () => {
    if (!purchaseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await purchaseService.getPurchase(Number(purchaseId));
      setPurchase(data);
      setPurchaseItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch purchase details:', err);
      const errorMsg = purchaseService.getErrorMessage(err);
      setError(errorMsg);
      toast.error(t('common:error'), { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }, [purchaseId, t]);

  // Fetch products for autocomplete
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const response = await productService.getProducts(1, '', 'created_at', 'desc', 1000);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error(t('common:error'), { description: 'Failed to load products' });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [t]);

  // Load data on mount
  useEffect(() => {
    if (purchaseId) {
      fetchPurchaseDetails();
      fetchProducts();
    }
  }, [purchaseId, fetchPurchaseDetails, fetchProducts]);

  // Form validation
  const validateForm = (data: PurchaseItemFormData): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};
    
    if (!data.product_id) {
      errors.product_id = t('purchases:productRequired');
    }
    
    if (data.quantity <= 0) {
      errors.quantity = t('purchases:quantityRequired');
    }
    
    if (data.unit_cost <= 0) {
      errors.unit_cost = t('purchases:unitCostRequired');
    }
    
    return errors;
  };

  // Handle form input changes
  const handleFormChange = (field: keyof PurchaseItemFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Start adding new item
  const handleAddItem = () => {
    setFormData({
      product_id: 0,
      batch_number: '',
      quantity: 0,
      unit_cost: 0,
      sale_price: null,
      expiry_date: '',
    });
    setFormErrors({});
    setIsAddingItem(true);
    setEditingItemId(null);
  };

  // Start editing item
  const handleEditItem = (item: PurchaseItem) => {
    setFormData({
      id: item.id,
      product_id: item.product_id,
      batch_number: item.batch_number || '',
      quantity: item.quantity,
      unit_cost: Number(item.unit_cost),
      sale_price: item.sale_price ? Number(item.sale_price) : null,
      expiry_date: item.expiry_date || '',
    });
    setFormErrors({});
    setEditingItemId(item.id);
    setIsAddingItem(false);
  };

  // Cancel form
  const handleCancelForm = () => {
    setIsAddingItem(false);
    setEditingItemId(null);
    setFormData({
      product_id: 0,
      batch_number: '',
      quantity: 0,
      unit_cost: 0,
      sale_price: null,
      expiry_date: '',
    });
    setFormErrors({});
  };

  // Save item (add or update)
  const handleSaveItem = async () => {
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingItemId) {
        // Update existing item
        const itemData = {
          product_id: formData.product_id,
          batch_number: formData.batch_number || null,
          quantity: formData.quantity,
          unit_cost: formData.unit_cost,
          sale_price: formData.sale_price,
          expiry_date: formData.expiry_date || null,
        };

        const result = await purchaseService.updatePurchaseItem(Number(purchaseId), editingItemId, itemData);
        setPurchase(result.purchase);
        setPurchaseItems(result.purchase.items || []);
        toast.success(t('purchases:itemUpdated'));
      } else {
        // Add new item
        const itemData = {
          product_id: formData.product_id,
          batch_number: formData.batch_number || null,
          quantity: formData.quantity,
          unit_cost: formData.unit_cost,
          sale_price: formData.sale_price,
          expiry_date: formData.expiry_date || null,
        };

        const result = await purchaseService.addPurchaseItem(Number(purchaseId), itemData);
        setPurchase(result.purchase);
        setPurchaseItems(result.purchase.items || []);
        toast.success(t('purchases:itemAdded'));
      }

      handleCancelForm();
    } catch (error) {
      console.error('Failed to save item:', error);
      const errorMsg = purchaseService.getErrorMessage(error);
      toast.error(t('common:error'), { description: errorMsg });
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: number) => {
    if (!confirm(t('purchases:confirmDeleteItem'))) return;

    try {
      const result = await purchaseService.deletePurchaseItem(Number(purchaseId), itemId);
      setPurchase(result.purchase);
      setPurchaseItems(result.purchase.items || []);
      toast.success(t('purchases:itemDeleted'));
    } catch (error) {
      console.error('Failed to delete item:', error);
      const errorMsg = purchaseService.getErrorMessage(error);
      toast.error(t('common:error'), { description: errorMsg });
    }
  };

  // Get product name from purchase item or fallback to products array
  const getProductName = (item: PurchaseItem) => {
    // First try to use the product_name from the purchase item
    if (item.product_name) {
      return item.product_name;
    }
    // Fallback to finding product by ID
    const product = products.find(p => p.id === item.product_id);
    return product ? product.name : 'Unknown Product';
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>{t('common:loading')}</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!purchase) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{t('purchases:purchaseNotFound')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/purchases')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1">
            {t('purchases:managePurchaseItems')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('purchases:purchase')} #{purchase.id} - {purchase.supplier_name}
          </Typography>
        </Box>
      </Box>

      {/* Purchase Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('purchases:purchaseSummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('purchases:purchaseDate')}
              </Typography>
              <Typography variant="body1">
                {dayjs(purchase.purchase_date).format('DD/MM/YYYY')}
              </Typography>
            </div>
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('purchases:status')}
              </Typography>
              <Badge variant={purchase.status === 'received' ? 'default' : 'secondary'}>
                {t(`purchases:status_${purchase.status}`)}
              </Badge>
            </div>
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('purchases:totalAmount')}
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatCurrency(purchase.total_amount)}
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('purchases:purchaseItems')}</CardTitle>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              disabled={isAddingItem || editingItemId !== null}
            >
              {t('purchases:addItem')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('purchases:totalItems')}
              </Typography>
              <Typography variant="h6">{totalItems}</Typography>
            </div>
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('purchases:totalValue')}
              </Typography>
              <Typography variant="h6">{formatCurrency(totalValue)}</Typography>
            </div>
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('purchases:averageValue')}
              </Typography>
              <Typography variant="h6">
                {totalItems > 0 ? formatCurrency(totalValue / totalItems) : formatCurrency(0)}
              </Typography>
            </div>
          </div>

          {/* Items Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('purchases:product')}</TableHead>
                <TableHead>{t('purchases:batchNumber')}</TableHead>
                <TableHead>{t('purchases:quantity')}</TableHead>
                <TableHead>{t('purchases:unitCost')}</TableHead>
                <TableHead>{t('purchases:totalCost')}</TableHead>
                <TableHead>{t('purchases:salePrice')}</TableHead>
                <TableHead>{t('purchases:expiryDate')}</TableHead>
                <TableHead>{t('common:actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Typography variant="body2" color="text.secondary">
                      {t('purchases:noItems')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                purchaseItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {getProductName(item)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.batch_number || '-'}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                    <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                    <TableCell>
                      {item.sale_price ? formatCurrency(item.sale_price) : '-'}
                    </TableCell>
                    <TableCell>
                      {item.expiry_date ? dayjs(item.expiry_date).format('DD/MM/YYYY') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Tooltip title={t('common:edit')}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditItem(item)}
                            disabled={isAddingItem || editingItemId !== null}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common:delete')}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isAddingItem || editingItemId !== null}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Item Dialog */}
      <Dialog
        open={isAddingItem || editingItemId !== null}
        onClose={handleCancelForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingItemId ? t('purchases:editItem') : t('purchases:addItem')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Selection */}
              <Autocomplete
                options={products}
                getOptionLabel={(option) => option.name}
                value={products.find(p => p.id === formData.product_id) || null}
                onChange={(_, newValue) => handleFormChange('product_id', newValue?.id || 0)}
                loading={isLoadingProducts}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('purchases:product')}
                    required
                    error={!!formErrors.product_id}
                    helperText={formErrors.product_id}
                  />
                )}
              />

              {/* Batch Number */}
              <TextField
                label={t('purchases:batchNumber')}
                value={formData.batch_number}
                onChange={(e) => handleFormChange('batch_number', e.target.value)}
                fullWidth
              />

              {/* Quantity */}
              <TextField
                label={t('purchases:quantity')}
                type="number"
                value={formData.quantity}
                onChange={(e) => handleFormChange('quantity', Number(e.target.value))}
                required
                error={!!formErrors.quantity}
                helperText={formErrors.quantity}
                fullWidth
              />

              {/* Unit Cost */}
              <TextField
                label={t('purchases:unitCost')}
                type="number"
                value={formData.unit_cost}
                onChange={(e) => handleFormChange('unit_cost', Number(e.target.value))}
                required
                error={!!formErrors.unit_cost}
                helperText={formErrors.unit_cost}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                fullWidth
              />

              {/* Sale Price */}
              <TextField
                label={t('purchases:salePrice')}
                type="number"
                value={formData.sale_price || ''}
                onChange={(e) => handleFormChange('sale_price', e.target.value ? Number(e.target.value) : null)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                fullWidth
              />

              {/* Expiry Date */}
              <TextField
                label={t('purchases:expiryDate')}
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleFormChange('expiry_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </div>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelForm} startIcon={<CancelIcon />}>
            {t('common:cancel')}
          </Button>
          <Button
            onClick={handleSaveItem}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            {t('common:save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseItemsPage; 