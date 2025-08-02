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
  PaymentMethodData,
} from "../components/pos";

// Types
import { Product } from "../services/productService";
import saleService from "../services/saleService";
import { preciseCalculation, preciseSum } from "../constants";
import { generateDailySalesPdf } from "../services/exportService";

// Main POS Page Component
const PosPage: React.FC = () => {
  const { t } = useTranslation(['pos', 'common']);

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
  
  // Discount and Payment State
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [totalPaid, setTotalPaid] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [selectedClient, setSelectedClient] = useState<import('../services/clientService').Client | null>(null);

  // Load today's sales on mount
  useEffect(() => {
    loadTodaySales();
  }, []);

  const loadTodaySales = async () => {
    try {
      // Load today's sales from database (no limit, all sales for today including drafts)
      const response = await saleService.getSales(1, '', '', '', '', 1000, null, true);
      const dbSales = response.data || [];
      
      // Transform database sales to POS format
      const transformedSales: Sale[] = dbSales.map((dbSale) => ({
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
        timestamp: new Date(dbSale.sale_date)
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
          timestamp: new Date(newSale.sale_date)
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
            timestamp: new Date(updatedSale.sale_date)
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
            timestamp: new Date(response.sale.sale_date)
          };
          
          setSelectedSale(finalSale);
          
          // Update today's sales list
          setTodaySales(prevSales => 
            prevSales.map(sale => 
              sale.id === finalSale.id ? finalSale : sale
            )
          );
          
          showSnackbar(`${product.name} ${t('pos:addedToCart')}`, 'success');
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
        timestamp: new Date(response.sale.sale_date)
      };
      
      setSelectedSale(transformedSale);
      
      // Update today's sales list
      setTodaySales(prevSales => 
        prevSales.map(sale => 
          sale.id === selectedSale!.id ? transformedSale : sale
        )
      );
      
      showSnackbar(`${product.name} ${t('pos:addedToCart')}`, 'success');
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
          timestamp: new Date(updatedSale.sale_date)
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
        setPaymentMethods([]);
        setTotalPaid(0);
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
    // Clear payment methods when clearing sale
    setPaymentMethods([]);
    setTotalPaid(0);
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
        // If we were editing a sale, clear the selected sale to exit edit mode
        setSelectedSale(null);
        setSelectedSaleId(null);
        setCurrentSaleItems([]);
        setPaymentMethods([]);
        setTotalPaid(0);
        setDiscountAmount(0);
        setDiscountType('fixed');
        showSnackbar(t('pos:saleUpdated'), 'success');
      } else {
        // New sale completed
        clearCurrentSale();
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
    if (sale.payments && sale.payments.length > 0) {
      const paymentMethods: PaymentMethodData[] = sale.payments.map(payment => ({
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference_number || undefined,
      }));
      setPaymentMethods(paymentMethods);
      setTotalPaid(sale.paid_amount);
    } else {
      setPaymentMethods([]);
      setTotalPaid(0);
    }
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
        timestamp: new Date(newSale.sale_date)
      };

      // Select the new sale
      handleSaleSelect(transformedSale);
      
      // Add the new sale to today's sales
      setTodaySales(prevSales => [transformedSale, ...prevSales]);
      
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

  // Payment method handlers
  const handleRemovePayment = async (index: number) => {
    if (!selectedSale) {
      // For new sales, just update frontend state
      setPaymentMethods(prev => {
        const newMethods = prev.filter((_, i) => i !== index);
        const newTotalPaid = newMethods.reduce((sum, method) => sum + method.amount, 0);
        setTotalPaid(newTotalPaid);
        return newMethods;
      });
      return;
    }

    // For existing sales, update backend
    try {
      const newMethods = paymentMethods.filter((_, i) => i !== index);
      const newTotalPaid = newMethods.reduce((sum, method) => sum + method.amount, 0);
      
      const paymentData = {
        payments: newMethods
          .filter(payment => payment.method !== 'refund') // Filter out refund payments for backend
          .map(payment => ({
            method: payment.method as 'cash' | 'visa' | 'mastercard' | 'bank_transfer' | 'mada' | 'other' | 'store_credit',
            amount: payment.amount,
            payment_date: new Date().toISOString().split('T')[0],
            reference_number: payment.reference || null,
            notes: null,
          })),
      };

      await saleService.addPaymentToSale(selectedSale.id, paymentData);
      
      // Update frontend state
      setPaymentMethods(newMethods);
      setTotalPaid(newTotalPaid);
      await loadTodaySales(); // Reload to get updated data
      showSnackbar(t('pos:paymentRemoved'), 'success');
    } catch (error) {
      console.error('Failed to remove payment:', error);
      showSnackbar(t('pos:paymentRemovalFailed'), 'error');
    }
  };

  const handleCancelPayments = async () => {
    if (!selectedSale) {
      // For new sales, just update frontend state
      setPaymentMethods([]);
      setTotalPaid(0);
      showSnackbar(t('pos:paymentsCancelled'), 'success');
      return;
    }

    // For existing sales, update backend
    try {
      console.log('Cancelling payments for sale ID:', selectedSale.id);
      await saleService.deletePaymentsFromSale(selectedSale.id);
      
      // Update frontend state
      setPaymentMethods([]);
      setTotalPaid(0);
      await loadTodaySales(); // Reload to get updated data
      showSnackbar(t('pos:paymentsCancelled'), 'success');
    } catch (error) {
      console.error('Failed to cancel payments:', error);
      showSnackbar(t('pos:paymentCancellationFailed'), 'error');
    }
  };

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
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
          {/* Column 2 - Summary and Actions */}
          <div className="w-[400px]">
                      <SaleSummaryColumn
          currentSaleItems={currentSaleItems}
          discountAmount={discountAmount}
          discountType={discountType}
          totalPaid={totalPaid}
          paymentMethods={paymentMethods}
          onDiscountChange={(amount: number, type: 'percentage' | 'fixed') => {
            setDiscountAmount(amount);
            setDiscountType(type);
          }}
          onTotalPaidChange={setTotalPaid}
          onPaymentMethodsChange={setPaymentMethods}
          isEditMode={!!selectedSale}
          saleId={selectedSale?.id}
          onPaymentComplete={handlePaymentComplete}
        />
          </div>
        {/* Column 1 - Current Sale Items (50%) */}
        <CurrentSaleItemsColumn
          currentSaleItems={currentSaleItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCurrentSale}
          onClearAll={clearCurrentSale}
          isSalePaid={totalPaid > 0 && (preciseSum(currentSaleItems.map(item => item.total)) - (discountType === 'percentage' ? (preciseSum(currentSaleItems.map(item => item.total)) * discountAmount) / 100 : discountAmount)) <= totalPaid}
        />

      

        {/* Column 3 - Today's Sales (20%) */}
        <div className={`border-l border-gray-200 transition-all duration-300 ${
          isTodaySalesCollapsed ? 'w-16' : 'w-26'
        }`}>
          <TodaySalesColumn
            sales={todaySales}
            selectedSaleId={selectedSaleId}
            onSaleSelect={handleSaleSelect}
            isCollapsed={isTodaySalesCollapsed}
            onToggleCollapse={() => setIsTodaySalesCollapsed(!isTodaySalesCollapsed)}
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