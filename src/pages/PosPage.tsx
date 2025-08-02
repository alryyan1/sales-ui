// src/pages/PosPage.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import { 
  X
} from "lucide-react";

// POS Components
import {
  SaleEditor,
  CartItem,
  Sale,
  PosHeader,
  TodaySalesColumn,
  SaleSummaryColumn,
  CurrentSaleItemsColumn,
  CalculatorDialog,
  PosPdfDialog,
  InvoicePdfDialog,
  ThermalInvoiceDialog,
} from "../components/pos";

// Types
import { Product } from "../services/productService";
import saleService from "../services/saleService";
import { preciseCalculation } from "../constants";
import { generateDailySalesPdf } from "../services/exportService";
import { useAuth } from "@/context/AuthContext";

const PosPage: React.FC = () => {
  const { t } = useTranslation(['pos', 'common']);
  const { user } = useAuth(); // Get current user

  // State
  const [currentSaleItems, setCurrentSaleItems] = useState<CartItem[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [saleEditorOpen, setSaleEditorOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [isTodaySalesCollapsed, setIsTodaySalesCollapsed] = useState(false);
  const [calculatorDialogOpen, setCalculatorDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [thermalDialogOpen, setThermalDialogOpen] = useState(false);
  
  // User filtering state
  const [filterByCurrentUser, setFilterByCurrentUser] = useState(true);
  
  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today's date as default
  );
  
  // Discount and Payment State
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [selectedClient, setSelectedClient] = useState<import('../services/clientService').Client | null>(null);
  
  // Refresh trigger for SalePaymentCard
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load today's sales on mount
  useEffect(() => {
    loadTodaySales();
  }, [filterByCurrentUser, selectedDate]); // Reload when filter or date changes

  const loadTodaySales = async () => {
    try {
      // Use the new endpoint for today's sales by created_at
      const dbSales = await saleService.getTodaySalesByCreatedAt();
      
      // Debug logging
      console.log('Current user ID:', user?.id);
      console.log('Filter by current user:', filterByCurrentUser);
      console.log('Raw sales from API:', dbSales);
      console.log('Sales with user_id:', dbSales.map(sale => ({ id: sale.id, user_id: sale.user_id, user_name: sale.user_name })));
      
      // Apply client-side filtering for current user if needed
      const filteredDbSales = filterByCurrentUser && user?.id 
        ? dbSales.filter(sale => sale.user_id === user.id)
        : dbSales;
      
      console.log('Filtered sales:', filteredDbSales.map(sale => ({ id: sale.id, user_id: sale.user_id, user_name: sale.user_name })));
      
      // Transform database sales to POS format
      const transformedSales: Sale[] = filteredDbSales.map((dbSale) => ({
        id: dbSale.id,
        sale_order_number: dbSale.sale_order_number,
        client_id: dbSale.client_id,
        client_name: dbSale.client_name,
        user_id: dbSale.user_id,
        user_name: dbSale.user_name,
        sale_date: dbSale.sale_date,
        invoice_number: dbSale.invoice_number,
        status: dbSale.status,
        total_amount: Number(dbSale.total_amount),
        paid_amount: Number(dbSale.paid_amount),
        due_amount: Number(dbSale.due_amount || 0),
        notes: dbSale.notes,
        created_at: dbSale.created_at,
        updated_at: dbSale.updated_at,
        items: dbSale.items?.map(item => ({
          id: item.id, // Add the missing ID field
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku || 'N/A',
            suggested_sale_price_per_sellable_unit: Number(item.unit_price),
            last_sale_price_per_sellable_unit: Number(item.unit_price),
            stock_quantity: item.current_stock_quantity || 0,
            stock_alert_level: item.stock_alert_level,
            earliest_expiry_date: item.earliest_expiry_date,
            current_stock_quantity: item.current_stock_quantity || 0,
            sellable_unit_name: item.sellable_unit_name || 'Piece'
          } as Product,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total_price || item.quantity * Number(item.unit_price))
        })) || [],
        payments: dbSale.payments?.map(payment => ({
          id: payment.id,
          sale_id: payment.sale_id,
          user_name: payment.user_name,
          method: payment.method,
          amount: Number(payment.amount),
          payment_date: payment.payment_date,
          reference_number: payment.reference_number || undefined,
          notes: payment.notes || undefined,
          created_at: payment.created_at
        })) || [],
        // timestamp removed - not part of Sale type
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

  const addToCurrentSale = async (product: Product) => {
    // Always ensure we have a sale on the backend before adding items
    if (!selectedSale) {
      // Create an empty sale first
      try {
        const emptySaleData = {
          client_id: null,
          sale_date: new Date().toISOString().split('T')[0], // Today's date
          notes: null
        };

        const newSale = await saleService.createEmptySale(emptySaleData);
        
        // Transform the backend sale to POS format
        const transformedSale: Sale = {
          id: newSale.id,
          sale_order_number: newSale.sale_order_number,
          client_id: newSale.client_id,
          client_name: newSale.client_name,
          user_id: newSale.user_id,
          user_name: newSale.user_name,
          sale_date: newSale.sale_date,
          invoice_number: newSale.invoice_number,
          status: newSale.status,
          total_amount: Number(newSale.total_amount),
          paid_amount: Number(newSale.paid_amount),
          due_amount: Number(newSale.due_amount || 0),
          notes: newSale.notes,
          created_at: newSale.created_at,
          updated_at: newSale.updated_at,
          items: newSale.items?.map(item => ({
            id: item.id,
            product: {
              id: item.product_id,
              name: item.product_name || 'Unknown Product',
              sku: item.product_sku || 'N/A',
              suggested_sale_price_per_sellable_unit: Number(item.unit_price),
              last_sale_price_per_sellable_unit: Number(item.unit_price),
              stock_quantity: item.current_stock_quantity || 0,
              stock_alert_level: item.stock_alert_level,
              earliest_expiry_date: item.earliest_expiry_date,
              current_stock_quantity: item.current_stock_quantity || 0,
              sellable_unit_name: item.sellable_unit_name || 'Piece'
            } as Product,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            total: Number(item.total_price || item.quantity * Number(item.unit_price))
          })) || [],
          payments: newSale.payments?.map(payment => ({
            id: payment.id,
            sale_id: payment.sale_id,
            user_name: payment.user_name,
            method: payment.method,
            amount: Number(payment.amount),
            payment_date: payment.payment_date,
            reference_number: payment.reference_number || undefined,
            notes: payment.notes || undefined,
            created_at: payment.created_at
          })) || [],
          // timestamp removed - not part of Sale type
        };

        // Select the new sale
        setSelectedSale(transformedSale);
        setSelectedSaleId(transformedSale.id);
        
        // Add the new sale to today's sales
        setTodaySales(prevSales => [transformedSale, ...prevSales]);
        
        // If there are existing items in currentSaleItems without IDs, add them to the backend sale
        const existingItemsWithoutIds = currentSaleItems.filter(item => !item.id);
        if (existingItemsWithoutIds.length > 0) {
          console.log('Adding existing items without IDs to backend sale:', existingItemsWithoutIds);
          
          // Add each existing item to the backend sale
          for (const existingItem of existingItemsWithoutIds) {
            try {
              const itemData = {
                product_id: existingItem.product.id,
                quantity: existingItem.quantity,
                unit_price: existingItem.unitPrice
              };

              await saleService.addSaleItem(transformedSale.id, itemData);
            } catch (error) {
              console.error('Error adding existing item to backend sale:', error);
              // Continue with other items even if one fails
            }
          }
          
          // Reload the sale data to get updated items with IDs
          const updatedSale = await saleService.getSale(transformedSale.id);
          
          const updatedItems: CartItem[] = (updatedSale.items || []).map((item: import('../services/saleService').SaleItem) => ({
            id: item.id,
            product: {
              id: item.product_id,
              name: item.product_name || 'Unknown Product',
              sku: item.product_sku || 'N/A',
              suggested_sale_price_per_sellable_unit: Number(item.unit_price),
              last_sale_price_per_sellable_unit: Number(item.unit_price),
              stock_quantity: item.current_stock_quantity || 0,
              stock_alert_level: item.stock_alert_level,
              earliest_expiry_date: item.earliest_expiry_date,
              current_stock_quantity: item.current_stock_quantity || 0,
              sellable_unit_name: item.sellable_unit_name || 'Piece'
            } as Product,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            total: Number(item.total_price || item.quantity * Number(item.unit_price))
          }));
          
          setCurrentSaleItems(updatedItems);
          
          const finalTransformedSale: Sale = {
            id: updatedSale.id,
            sale_order_number: updatedSale.sale_order_number,
            client_id: updatedSale.client_id,
            client_name: updatedSale.client_name,
            user_id: updatedSale.user_id,
            user_name: updatedSale.user_name,
            sale_date: updatedSale.sale_date,
            invoice_number: updatedSale.invoice_number,
            status: updatedSale.status,
            total_amount: Number(updatedSale.total_amount),
            paid_amount: Number(updatedSale.paid_amount),
            due_amount: Number(updatedSale.due_amount || 0),
            notes: updatedSale.notes,
            created_at: updatedSale.created_at,
            updated_at: updatedSale.updated_at,
            items: updatedItems,
            payments: updatedSale.payments?.map((payment: import('../services/saleService').Payment) => ({
              id: payment.id,
              sale_id: payment.sale_id,
              user_name: payment.user_name,
              method: payment.method,
              amount: Number(payment.amount),
              payment_date: payment.payment_date,
              reference_number: payment.reference_number || undefined,
              notes: payment.notes || undefined,
              created_at: payment.created_at
            })) || [],
            // timestamp removed - not part of Sale type
          };
          
          setSelectedSale(finalTransformedSale);
          
          // Update today's sales list
          setTodaySales(prevSales => 
            prevSales.map(sale => 
              sale.id === finalTransformedSale.id ? finalTransformedSale : sale
            )
          );
          
          // Now add the new product
          const itemData = {
            product_id: product.id,
            quantity: 1,
            unit_price: product.last_sale_price_per_sellable_unit || product.suggested_sale_price_per_sellable_unit || 0
          };

          const response = await saleService.addSaleItem(finalTransformedSale.id, itemData);
          
          // Check if the response indicates product already exists
          if (response.message === 'Product already exists in sale') {
            showSnackbar(`${product.name} ${t('pos:alreadyInCart')}`, 'success');
            return;
          }
          
          // Update with the final response
          const finalItems: CartItem[] = (response.sale.items || []).map(item => ({
            id: item.id,
            product: {
              id: item.product_id,
              name: item.product_name || 'Unknown Product',
              sku: item.product_sku || 'N/A',
              suggested_sale_price_per_sellable_unit: Number(item.unit_price),
              last_sale_price_per_sellable_unit: Number(item.unit_price),
              stock_quantity: item.current_stock_quantity || 0,
              stock_alert_level: item.stock_alert_level,
              earliest_expiry_date: item.earliest_expiry_date,
              current_stock_quantity: item.current_stock_quantity || 0,
              sellable_unit_name: item.sellable_unit_name || 'Piece'
            } as Product,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            total: Number(item.total_price || item.quantity * Number(item.unit_price))
          }));
          
          setCurrentSaleItems(finalItems);
          
          const finalSale: Sale = {
            id: response.sale.id,
            sale_order_number: response.sale.sale_order_number,
            client_id: response.sale.client_id,
            client_name: response.sale.client_name,
            user_id: response.sale.user_id,
            user_name: response.sale.user_name,
            sale_date: response.sale.sale_date,
            invoice_number: response.sale.invoice_number,
            status: response.sale.status,
            total_amount: Number(response.sale.total_amount),
            paid_amount: Number(response.sale.paid_amount),
            due_amount: Number(response.sale.due_amount || 0),
            notes: response.sale.notes,
            created_at: response.sale.created_at,
            updated_at: response.sale.updated_at,
            items: finalItems,
            payments: response.sale.payments?.map(payment => ({
              id: payment.id,
              sale_id: payment.sale_id,
              user_name: payment.user_name,
              method: payment.method,
              amount: Number(payment.amount),
              payment_date: payment.payment_date,
              reference_number: payment.reference_number || undefined,
              notes: payment.notes || undefined,
              created_at: payment.created_at
            })) || [],
            // timestamp removed - not part of Sale type
          };
          
          setSelectedSale(finalSale);
          
          // Update today's sales list
          setTodaySales(prevSales => 
            prevSales.map(sale => 
              sale.id === finalSale.id ? finalSale : sale
            )
          );
          
          showSnackbar(`${product.name} ${t('pos:addedToCart')}`, 'success');
          
          // Increment refresh trigger to force SalePaymentCard to refetch sale data
          setRefreshTrigger(prev => prev + 1);
          return;
        }
        
        // Now continue with adding the product to this sale
      } catch (error) {
        console.error('Error creating empty sale:', error);
        const errorMessage = saleService.getErrorMessage(error);
        showSnackbar(errorMessage, 'error');
        return;
      }
    }

    // Now we always have a selectedSale, so add the product to it
    try {
      const itemData = {
        product_id: product.id,
        quantity: 1,
        unit_price: product.last_sale_price_per_sellable_unit || product.suggested_sale_price_per_sellable_unit || 0
      };

      const response = await saleService.addSaleItem(selectedSale!.id, itemData);
      
      // Check if the response indicates product already exists
      if (response.message === 'Product already exists in sale') {
        showSnackbar(`${product.name} ${t('pos:alreadyInCart')}`, 'success');
        return;
      }
      
      // Update the current sale items with the new data from backend
      const items: CartItem[] = (response.sale.items || []).map(item => ({
        id: item.id,
        product: {
          id: item.product_id,
          name: item.product_name || 'Unknown Product',
          sku: item.product_sku || 'N/A',
          suggested_sale_price_per_sellable_unit: Number(item.unit_price),
          last_sale_price_per_sellable_unit: Number(item.unit_price),
          stock_quantity: item.current_stock_quantity || 0,
          stock_alert_level: item.stock_alert_level,
          earliest_expiry_date: item.earliest_expiry_date,
          current_stock_quantity: item.current_stock_quantity || 0,
          sellable_unit_name: item.sellable_unit_name || 'Piece'
        } as Product,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        total: Number(item.total_price || item.quantity * Number(item.unit_price))
      }));
      
      setCurrentSaleItems(items);
      
      // Update the selected sale with new data
      const transformedSale: Sale = {
        id: response.sale.id,
        sale_order_number: response.sale.sale_order_number,
        client_id: response.sale.client_id,
        client_name: response.sale.client_name,
        user_id: response.sale.user_id,
        user_name: response.sale.user_name,
        sale_date: response.sale.sale_date,
        invoice_number: response.sale.invoice_number,
        status: response.sale.status,
        total_amount: Number(response.sale.total_amount),
        paid_amount: Number(response.sale.paid_amount),
        due_amount: Number(response.sale.due_amount || 0),
        notes: response.sale.notes,
        created_at: response.sale.created_at,
        updated_at: response.sale.updated_at,
        items: items,
        payments: response.sale.payments?.map(payment => ({
          id: payment.id,
          sale_id: payment.sale_id,
          user_name: payment.user_name,
          method: payment.method,
          amount: Number(payment.amount),
          payment_date: payment.payment_date,
          reference_number: payment.reference_number || undefined,
          notes: payment.notes || undefined,
          created_at: payment.created_at
        })) || [],
        // timestamp removed - not part of Sale type
      };
      
      setSelectedSale(transformedSale);
      
      // Update today's sales list
      setTodaySales(prevSales => 
        prevSales.map(sale => 
          sale.id === selectedSale!.id ? transformedSale : sale
        )
      );
      
      showSnackbar(`${product.name} ${t('pos:addedToCart')}`, 'success');
      
      // Increment refresh trigger to force SalePaymentCard to refetch sale data
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error adding product to sale:', error);
      const errorMessage = saleService.getErrorMessage(error);
      showSnackbar(errorMessage, 'error');
    }
  };

  const updateQuantity = async (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCurrentSale(productId);
      return;
    }

    // If we have a selected sale (edit mode), update on backend
    if (selectedSale) {
      try {
        // Find the sale item to update
        const itemToUpdate = currentSaleItems.find(item => item.product.id === productId);
        if (!itemToUpdate || !itemToUpdate.id) {
          showSnackbar(t('pos:itemNotFound'), 'error');
          return;
        }

        const itemData = {
          quantity: newQuantity,
          unit_price: itemToUpdate.unitPrice
        };

        const updatedSale = await saleService.updateSaleItem(selectedSale.id, itemToUpdate.id, itemData);
        
        // Update the current sale items with the new data from backend
        const items: CartItem[] = (updatedSale.items || []).map(item => ({
          id: item.id,
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku || 'N/A',
            suggested_sale_price_per_sellable_unit: Number(item.unit_price),
            last_sale_price_per_sellable_unit: Number(item.unit_price),
            stock_quantity: item.current_stock_quantity || 0,
            stock_alert_level: item.stock_alert_level,
            earliest_expiry_date: item.earliest_expiry_date,
            current_stock_quantity: item.current_stock_quantity || 0,
            sellable_unit_name: item.sellable_unit_name || 'Piece'
          } as Product,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total_price || item.quantity * Number(item.unit_price))
        }));
        
        setCurrentSaleItems(items);
        
        // Update the selected sale with new data
        const transformedSale: Sale = {
          id: updatedSale.id,
          sale_order_number: updatedSale.sale_order_number,
          client_id: updatedSale.client_id,
          client_name: updatedSale.client_name,
          user_id: updatedSale.user_id,
          user_name: updatedSale.user_name,
          sale_date: updatedSale.sale_date,
          invoice_number: updatedSale.invoice_number,
          status: updatedSale.status,
          total_amount: Number(updatedSale.total_amount),
          paid_amount: Number(updatedSale.paid_amount),
          due_amount: Number(updatedSale.due_amount || 0),
          notes: updatedSale.notes,
          created_at: updatedSale.created_at,
          updated_at: updatedSale.updated_at,
          items: items,
          payments: updatedSale.payments?.map(payment => ({
            id: payment.id,
            sale_id: payment.sale_id,
            user_name: payment.user_name,
            method: payment.method,
            amount: Number(payment.amount),
            payment_date: payment.payment_date,
            reference_number: payment.reference_number || undefined,
            notes: payment.notes || undefined,
            created_at: payment.created_at
          })) || [],
                  // timestamp removed - not part of Sale type
      };
        
        setSelectedSale(transformedSale);
        
        // Update today's sales list
        setTodaySales(prevSales => 
          prevSales.map(sale => 
            sale.id === selectedSale.id ? transformedSale : sale
          )
        );
      } catch (error) {
        console.error('Error updating sale item quantity:', error);
        const errorMessage = saleService.getErrorMessage(error);
        showSnackbar(errorMessage, 'error');
      }
    } else {
      // For new sales, update frontend state
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
    }
  };

  const removeFromCurrentSale = async (productId: number) => {
    // Since we now create sales on backend before adding items, all sale items have backend records
    // Find the item to get its ID for backend deletion
    const itemToRemove = currentSaleItems.find(item => item.product.id === productId);
    
    console.log('removeFromCurrentSale called with productId:', productId);
    console.log('currentSaleItems:', currentSaleItems);
    console.log('itemToRemove:', itemToRemove);
    
    if (!itemToRemove) {
      console.error('Item not found for productId:', productId);
      showSnackbar(t('pos:itemNotFound'), 'error');
      return;
    }

    if (!itemToRemove.id) {
      console.error('Item found but has no ID:', itemToRemove);
      showSnackbar(t('pos:itemNotFound'), 'error');
      return;
    }

    console.log('Deleting sale item with ID:', itemToRemove.id);

    // Always make backend request to delete the sale item
    try {
      await handleDeleteSaleItem(itemToRemove.id);
    } catch (error) {
      console.error('Error removing item from sale:', error);
      showSnackbar(t('pos:itemRemovalFailed'), 'error');
    }
  };

  const handleDeleteSaleItem = async (saleItemId: number) => {
    if (!selectedSale) {
      showSnackbar(t('pos:noSaleSelected'), 'error');
      return;
    }

    try {
      const result = await saleService.deleteSaleItem(selectedSale.id, saleItemId);
      
      // Show success message
      showSnackbar(result.message, 'success');
      
      // Reload today's sales to get updated data
      await loadTodaySales();
      
      // If the sale was cancelled (no items left), clear the selection
      if (result.sale_status === 'cancelled') {
        setSelectedSale(null);
        setSelectedSaleId(null);
        setCurrentSaleItems([]);
        // Reset payment state - now handled by SalePaymentCard
        setDiscountAmount(0);
        setDiscountType('fixed');
        showSnackbar(t('pos:saleCancelled'), 'success');
      } else {
        // Update the selected sale with new data
        const updatedSale = todaySales.find(sale => sale.id === selectedSale.id);
        if (updatedSale) {
          handleSaleSelect(updatedSale);
        }
      }
    } catch (error) {
      console.error('Error deleting sale item:', error);
      const errorMessage = saleService.getErrorMessage(error);
      showSnackbar(errorMessage, 'error');
    }
  };

  const clearCurrentSale = () => {
    setCurrentSaleItems([]);
    // Reset payment state - now handled by SalePaymentCard
    setDiscountAmount(0);
    setDiscountType('fixed');
    showSnackbar(t('pos:saleCleared'), 'success');
  };

  const handlePaymentComplete = async (errorMessage?: string) => {
    if (errorMessage) {
      // Show error message in toast
      showSnackbar(errorMessage, 'error');
    } else {
      // Success case - always reload today's sales after payment completion
      await loadTodaySales();
      
      if (selectedSale) {
        // If we were editing a sale, keep it selected but clear the items and payments
        // This maintains focus on the completed sale
        setCurrentSaleItems([]);
        // Reset payment state - now handled by SalePaymentCard
        setDiscountAmount(0);
        setDiscountType('fixed');
        showSnackbar(t('pos:saleUpdated'), 'success');
        
        // Automatically open thermal PDF dialog for the completed sale
        setTimeout(() => {
          setThermalDialogOpen(true);
        }, 500); // Small delay to ensure the sale data is updated
      } else {
        // New sale completed - find the newly created sale and select it
        const updatedSales = await saleService.getSales(
          1, '', '', '', '', 1000, null, true,
          filterByCurrentUser ? user?.id || null : null
        );
        const dbSales = updatedSales.data || [];
        
        // Find the most recent sale (should be the one we just created)
        if (dbSales.length > 0) {
          const latestSale = dbSales[0]; // Assuming they're sorted by creation date desc
          
          // Transform and select the latest sale
          const transformedSale: Sale = {
            id: latestSale.id,
            sale_order_number: latestSale.sale_order_number,
            client_id: latestSale.client_id,
            client_name: latestSale.client_name,
            user_id: latestSale.user_id,
            user_name: latestSale.user_name,
            sale_date: latestSale.sale_date,
            invoice_number: latestSale.invoice_number,
            status: latestSale.status,
            total_amount: Number(latestSale.total_amount),
            paid_amount: Number(latestSale.paid_amount),
            due_amount: Number(latestSale.due_amount || 0),
            notes: latestSale.notes,
            created_at: latestSale.created_at,
            updated_at: latestSale.updated_at,
            items: latestSale.items?.map(item => ({
              id: item.id,
              product: {
                id: item.product_id,
                name: item.product_name || 'Unknown Product',
                sku: item.product_sku || 'N/A',
                suggested_sale_price_per_sellable_unit: Number(item.unit_price),
                last_sale_price_per_sellable_unit: Number(item.unit_price),
                stock_quantity: item.current_stock_quantity || 0,
                stock_alert_level: item.stock_alert_level,
                earliest_expiry_date: item.earliest_expiry_date,
                current_stock_quantity: item.current_stock_quantity || 0,
                sellable_unit_name: item.sellable_unit_name || 'Piece'
              } as Product,
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              total: Number(item.total_price || item.quantity * Number(item.unit_price))
            })) || [],
            payments: latestSale.payments?.map(payment => ({
              id: payment.id,
              sale_id: payment.sale_id,
              user_name: payment.user_name,
              method: payment.method,
              amount: Number(payment.amount),
              payment_date: payment.payment_date,
              reference_number: payment.reference_number || undefined,
              notes: payment.notes || undefined,
              created_at: payment.created_at
            })) || [],
                    // timestamp removed - not part of Sale type
      };
          
          // Select the completed sale
          setSelectedSale(transformedSale);
          setSelectedSaleId(transformedSale.id);
          setCurrentSaleItems([]);
          // Reset payment state - now handled by SalePaymentCard
          setDiscountAmount(0);
          setDiscountType('fixed');
          
          // Automatically open thermal PDF dialog for the completed sale
          setTimeout(() => {
            setThermalDialogOpen(true);
          }, 500); // Small delay to ensure the sale data is updated
        }
        
        showSnackbar(t('pos:saleCompleted'), 'success');
      }
    }
  };

  const handleSaleSelect = (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedSaleId(sale.id);
    
    // Convert sale items to current sale items format
    const items: CartItem[] = sale.items.map(item => ({
      id: item.id, // Preserve the sale item ID for deletion
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));
    setCurrentSaleItems(items);
    
    // Load sale payments if they exist
    // Payment state is now handled by SalePaymentCard component
    // No need to set payment methods or total paid here
  };



  const handleCreateEmptySale = async () => {
    try {
      // Create an empty sale on the backend using the dedicated endpoint
      const emptySaleData = {
        client_id: null,
        sale_date: new Date().toISOString().split('T')[0], // Today's date
        notes: null
      };

      const newSale = await saleService.createEmptySale(emptySaleData);
      
      // Transform the backend sale to POS format
      const transformedSale: Sale = {
        id: newSale.id,
        sale_order_number: newSale.sale_order_number,
        client_id: newSale.client_id,
        client_name: newSale.client_name,
        user_id: newSale.user_id,
        user_name: newSale.user_name,
        sale_date: newSale.sale_date,
        invoice_number: newSale.invoice_number,
        status: newSale.status,
        total_amount: Number(newSale.total_amount),
        paid_amount: Number(newSale.paid_amount),
        due_amount: Number(newSale.due_amount || 0),
        notes: newSale.notes,
        created_at: newSale.created_at,
        updated_at: newSale.updated_at,
        items: newSale.items?.map(item => ({
          id: item.id,
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku || 'N/A',
            suggested_sale_price_per_sellable_unit: Number(item.unit_price),
            last_sale_price_per_sellable_unit: Number(item.unit_price),
            stock_quantity: item.current_stock_quantity || 0,
            stock_alert_level: item.stock_alert_level,
            earliest_expiry_date: item.earliest_expiry_date,
            current_stock_quantity: item.current_stock_quantity || 0,
            sellable_unit_name: item.sellable_unit_name || 'Piece'
          } as Product,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total_price || item.quantity * Number(item.unit_price))
        })) || [],
        payments: newSale.payments?.map(payment => ({
          id: payment.id,
          sale_id: payment.sale_id,
          user_name: payment.user_name,
          method: payment.method,
          amount: Number(payment.amount),
          payment_date: payment.payment_date,
          reference_number: payment.reference_number || undefined,
          notes: payment.notes || undefined,
          created_at: payment.created_at
        })) || [],
        // timestamp removed - not part of Sale type
      };

      // Select the new sale
      handleSaleSelect(transformedSale);
      
      // Refresh today's sales to ensure consistency and get the most up-to-date data
      await loadTodaySales();
      
      showSnackbar(t('pos:emptySaleCreated'), 'success');
    } catch (error) {
      console.error('Error creating empty sale:', error);
      const errorMessage = saleService.getErrorMessage(error);
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleOpenCalculator = () => {
    setCalculatorDialogOpen(true);
  };

  const handleOpenPdfDialog = () => {
    setPdfDialogOpen(true);
  };

  const handleOpenInvoiceDialog = () => {
    setInvoiceDialogOpen(true);
  };

  const handlePrintThermalInvoice = () => {
    if (!selectedSale) {
      showSnackbar(t('pos:noSaleSelected'), 'error');
      return;
    }
    setThermalDialogOpen(true);
  };

  const handleGenerateDailySalesPdf = async () => {
    try {
      await generateDailySalesPdf();
      showSnackbar(t('pos:pdfGenerated'), 'success');
    } catch {
      showSnackbar(t('pos:pdfGenerationFailed'), 'error');
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  // Handle sale date change
  const handleSaleDateChange = async (saleId: number, newDate: string) => {
    try {
      // Update the sale date on the backend
      await saleService.updateSale(saleId, { sale_date: newDate });
      
      // Reload today's sales to reflect the change
      await loadTodaySales();
      
      // Update the selected sale if it's the one being edited
      if (selectedSale && selectedSale.id === saleId) {
        const updatedSale = todaySales.find(sale => sale.id === saleId);
        if (updatedSale) {
          setSelectedSale(updatedSale);
        }
      }
      
      showSnackbar(t('pos:saleDateUpdated'), 'success');
    } catch (error) {
      console.error('Failed to update sale date:', error);
      const errorMessage = saleService.getErrorMessage(error);
      showSnackbar(errorMessage, 'error');
    }
  };

  // Payment method handlers


  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <PosHeader 
        onAddProduct={addToCurrentSale} 
        loading={false} 
        onCreateEmptySale={handleCreateEmptySale}
        onOpenCalculator={handleOpenCalculator}
        onGeneratePdf={handleGenerateDailySalesPdf}
        onPreviewPdf={handleOpenPdfDialog}
        onGenerateInvoice={handleOpenInvoiceDialog}
        onPrintThermalInvoice={handlePrintThermalInvoice}
        hasSelectedSale={!!selectedSale}
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        filterByCurrentUser={filterByCurrentUser}
        onToggleUserFilter={() => setFilterByCurrentUser(!filterByCurrentUser)}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
          {/* Column 2 - Summary and Actions */}
          <div className="w-[400px]">
                      <SaleSummaryColumn
          currentSaleItems={currentSaleItems}
          discountAmount={discountAmount}
          discountType={discountType}
          onDiscountChange={(amount: number, type: 'percentage' | 'fixed') => {
            setDiscountAmount(amount);
            setDiscountType(type);
          }}
          isEditMode={!!selectedSale}
          saleId={selectedSale?.id}
          onPaymentComplete={handlePaymentComplete}
          refreshTrigger={refreshTrigger}
          onSaleDateChange={handleSaleDateChange}
        />
          </div>
        {/* Column 1 - Current Sale Items (50%) */}
        <CurrentSaleItemsColumn
          currentSaleItems={currentSaleItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCurrentSale}
          onClearAll={clearCurrentSale}
          isSalePaid={selectedSale ? (selectedSale.payments && selectedSale.payments.length > 0) : false}
        />

      

        {/* Column 3 - Today's Sales (20%) */}
        <div className={`border-l border-gray-200 transition-all duration-300 ${
          isTodaySalesCollapsed ? 'w-32' : 'w-32'
        }`}>
          <TodaySalesColumn
            sales={todaySales}
            selectedSaleId={selectedSaleId}
            onSaleSelect={handleSaleSelect}
            isCollapsed={isTodaySalesCollapsed}
            onToggleCollapse={() => setIsTodaySalesCollapsed(!isTodaySalesCollapsed)}
            filterByCurrentUser={filterByCurrentUser}
            selectedDate={selectedDate}
          />
        </div>
      </div>

      {/* Sale Editor */}
      <SaleEditor
        sale={selectedSale}
        open={saleEditorOpen}
        onClose={() => {
          setSaleEditorOpen(false);
          setSelectedSale(null);
        }}
        onSaleUpdated={loadTodaySales}
      />



      {/* Calculator Dialog */}
      <CalculatorDialog 
        open={calculatorDialogOpen} 
        onOpenChange={setCalculatorDialogOpen}
        currentUserId={user?.id || null}
        filterByCurrentUser={filterByCurrentUser}
      />

      {/* PDF Dialog */}
      <PosPdfDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
      />

      {/* Invoice PDF Dialog */}
      <InvoicePdfDialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        sale={selectedSale}
      />

      {/* Thermal Invoice Dialog */}
      <ThermalInvoiceDialog
        open={thermalDialogOpen}
        onClose={() => setThermalDialogOpen(false)}
        sale={selectedSale}
      />

      {/* Snackbar */}
      {snackbar.open && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className={snackbar.severity === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={snackbar.severity === 'success' ? 'text-green-800' : 'text-red-800'}>
              {snackbar.message}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseSnackbar}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default PosPage; 