// src/pages/PosPage.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  Alert,
  Snackbar,
} from "@mui/material";

// POS Components
import {
  PosHeader,
  SaleItemsTable,
  SaleSummary,
  TodaySales,
  SaleDetailsDialog,
  PaymentDialog,
  CartItem,
  Sale,
} from "../components/pos";

// Types
import { Product } from "../services/productService";
import saleService from "../services/saleService";
import { preciseCalculation } from "../constants";

// Main POS Page Component
const PosPage: React.FC = () => {
  const { t } = useTranslation(['pos', 'common']);

  // State
  const [currentSaleItems, setCurrentSaleItems] = useState<CartItem[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [loading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleDetailsOpen, setSaleDetailsOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Load today's sales on mount
  useEffect(() => {
    loadTodaySales();
  }, []);

  const loadTodaySales = async () => {
    try {
      // Load today's sales from database
      const response = await saleService.getSales(1, '', 'completed', '', '', 50, null, true);
      const dbSales = response.data || [];
      
      // Transform database sales to POS format
      const transformedSales: Sale[] = dbSales.map((dbSale, index) => ({
        id: dbSale.id,
        items: dbSale.items?.map(item => ({
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku || 'N/A',
            suggested_sale_price_per_sellable_unit: Number(item.unit_price)
          } as Product,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total_price || item.quantity * Number(item.unit_price))
        })) || [],
        total: Number(dbSale.total_amount),
        timestamp: new Date(dbSale.sale_date),
        transactionNumber: index + 1
      }));
      
      setTodaySales(transformedSales);
    } catch (error) {
      console.error('Failed to load today\'s sales:', error);
      // Fallback to empty array if API fails
      setTodaySales([]);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const addToCurrentSale = (product: Product) => {
    setCurrentSaleItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      
             if (existingItem) {
         return prevItems.map(item =>
           item.product.id === product.id
             ? {
                 ...item,
                 quantity: item.quantity + 1,
                 total: preciseCalculation(item.quantity + 1, item.unitPrice, 'multiply', 2)
               }
             : item
         );
       } else {
         const newItem: CartItem = {
           product,
           quantity: 1,
           unitPrice: product.suggested_sale_price_per_sellable_unit || 0,
           total: product.suggested_sale_price_per_sellable_unit || 0
         };
         return [...prevItems, newItem];
       }
    });
    
    showSnackbar(`${product.name} ${t('pos:addedToCart')}`, 'success');
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCurrentSale(productId);
      return;
    }

         setCurrentSaleItems(prevItems =>
       prevItems.map(item =>
         item.product.id === productId
           ? {
               ...item,
               quantity: newQuantity,
               total: preciseCalculation(newQuantity, item.unitPrice, 'multiply', 2)
             }
           : item
       )
     );
  };

  const removeFromCurrentSale = (productId: number) => {
    setCurrentSaleItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const clearCurrentSale = () => {
    setCurrentSaleItems([]);
    showSnackbar(t('pos:saleCleared'), 'success');
  };

  const handleProceedToPayment = () => {
    setPaymentDialogOpen(true);
  };

  const handlePaymentComplete = async () => {
    clearCurrentSale();
    setPaymentDialogOpen(false);
    
    // Reload today's sales to include the new sale
    await loadTodaySales();
    
    showSnackbar(t('pos:saleCompleted'), 'success');
  };

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setSaleDetailsOpen(true);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <PosHeader onAddProduct={addToCurrentSale} loading={loading} />

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', gap: 2, p: 2, height: '100%' }}>
          {/* Column 1: Sale Items Table (60% width) */}
          <Box sx={{ flex: '0 0 60%' }}>
            <SaleItemsTable
              items={currentSaleItems}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCurrentSale}
              loading={loading}
            />
          </Box>

          {/* Column 2: Sale Summary (20% width) */}
          <Box sx={{ flex: '0 0 20%' }}>
            <SaleSummary
              items={currentSaleItems}
              onProceedToPayment={handleProceedToPayment}
              onClearSale={clearCurrentSale}
            />
          </Box>

          {/* Column 3: Today Sales (20% width) */}
          <Box sx={{ flex: '0 0 20%' }}>
            <TodaySales
              sales={todaySales}
              onViewSale={handleViewSale}
            />
          </Box>
        </Box>
      </Box>

      {/* Sale Details Dialog */}
      <SaleDetailsDialog
        sale={selectedSale}
        open={saleDetailsOpen}
        onClose={() => {
          setSaleDetailsOpen(false);
          setSelectedSale(null);
        }}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        items={currentSaleItems}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PosPage; 