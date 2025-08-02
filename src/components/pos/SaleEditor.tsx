// src/components/pos/SaleEditor.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  Alert,
  Divider,
  Chip,
} from "@mui/material";

// MUI Icons
import {
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";

// Types
import { formatNumber, preciseCalculation } from "@/constants";
import { CartItem, Sale } from "./types";
import { Product } from "../../services/productService";
import saleService from "../../services/saleService";
import { ProductSelector } from "./ProductSelector";

interface SaleEditorProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
  onSaleUpdated: () => void;
}

export const SaleEditor: React.FC<SaleEditorProps> = ({ 
  sale, 
  open, 
  onClose,
  onSaleUpdated
}) => {
  const { t } = useTranslation(['pos', 'common']);
  const [editingItems, setEditingItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);

  // Initialize editing items when sale changes
  useEffect(() => {
    if (sale) {
      const items = sale.items.map(item => ({
        ...item,
        originalQuantity: item.quantity, // Keep track of original quantity
        originalUnitPrice: item.unitPrice,
        originalTotal: item.total
      }));
      setEditingItems(items);
      setHasChanges(false);
      setError(null);
    }
  }, [sale]);

  // Check if there are changes
  useEffect(() => {
    if (!sale) return;
    
    const hasAnyChanges = editingItems.some(item => 
      item.quantity !== item.originalQuantity ||
      item.unitPrice !== item.originalUnitPrice
    );
    setHasChanges(hasAnyChanges);
  }, [editingItems, sale]);

  const updateItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setEditingItems(prev => prev.map(item => 
      item.product.id === productId
        ? {
            ...item,
            quantity: newQuantity,
            total: preciseCalculation(newQuantity, item.unitPrice, 'multiply', 2)
          }
        : item
    ));
  };

  const updateItemPrice = (productId: number, newPrice: number) => {
    if (newPrice < 0) return;
    
    setEditingItems(prev => prev.map(item => 
      item.product.id === productId
        ? {
            ...item,
            unitPrice: newPrice,
            total: preciseCalculation(item.quantity, newPrice, 'multiply', 2)
          }
        : item
    ));
  };

  const removeItem = (productId: number) => {
    setEditingItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const addItem = () => {
    setProductSelectorOpen(true);
  };

  const handleProductSelected = (product: Product) => {
    const newItem: CartItem = {
      product,
      quantity: 1,
      unitPrice: product.suggested_sale_price_per_sellable_unit || 0,
      total: product.suggested_sale_price_per_sellable_unit || 0,
      originalQuantity: 1,
      originalUnitPrice: product.suggested_sale_price_per_sellable_unit || 0,
      originalTotal: product.suggested_sale_price_per_sellable_unit || 0
    };
    setEditingItems(prev => [...prev, newItem]);
  };

  const calculateSubtotal = () => {
    return editingItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSave = async () => {
    if (!sale) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare updated sale data
      const updatedItems = editingItems.map(item => ({
        id: item.id, // Keep original ID if exists
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.total
      }));

      const updateData = {
        items: updatedItems,
        total_amount: calculateSubtotal()
      };

      await saleService.updateSale(sale.id, updateData);
      onSaleUpdated();
      onClose();
    } catch (error) {
      console.error('Failed to update sale:', error);
      setError(t('pos:updateSaleError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original state
    if (sale) {
      const items = sale.items.map(item => ({
        ...item,
        originalQuantity: item.quantity,
        originalUnitPrice: item.unitPrice,
        originalTotal: item.total
      }));
      setEditingItems(items);
    }
    setHasChanges(false);
    setError(null);
  };

  if (!sale) return null;

  const subtotal = calculateSubtotal();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {t('pos:editSale')} #{sale.id}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('pos:transactionTime')}: {sale.created_at.toLocaleString()}
          </Typography>
          {hasChanges && (
            <Chip 
              label={t('pos:unsavedChanges')} 
              color="warning" 
              size="small" 
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('pos:product')}</TableCell>
                <TableCell align="center">{t('pos:quantity')}</TableCell>
                <TableCell align="right">{t('pos:unitPrice')}</TableCell>
                <TableCell align="right">{t('pos:total')}</TableCell>
                <TableCell align="center">{t('common:actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {editingItems.map((item) => (
                <TableRow key={item.product.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {item.product.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">
                        {item.product.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                        disabled={item.quantity <= 0}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        size="small"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.product.id, parseInt(e.target.value) || 0)}
                        sx={{ width: 60 }}
                        inputProps={{ min: 0, style: { textAlign: 'center' } }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      value={item.unitPrice}
                      onChange={(e) => updateItemPrice(item.product.id, parseFloat(e.target.value) || 0)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatNumber(item.total)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => removeItem(item.product.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            startIcon={<AddIcon />}
            onClick={addItem}
            variant="outlined"
            size="small"
          >
            {t('pos:addItem')}
          </Button>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'right' }}>
            {t('pos:total')}: {formatNumber(subtotal)}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleCancel} 
          disabled={isLoading}
          startIcon={<CancelIcon />}
        >
          {t('common:cancel')}
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isLoading || !hasChanges}
          variant="contained"
          startIcon={<SaveIcon />}
        >
          {isLoading ? t('common:saving') : t('common:save')}
        </Button>
      </DialogActions>
      
      {/* Product Selector */}
      <ProductSelector
        open={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        onProductSelected={handleProductSelected}
      />
    </Dialog>
  );
}; 