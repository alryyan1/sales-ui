// src/pages/PosPage.tsx
import React, { useState, useEffect } from "react";

// Toast
import { toast } from "sonner";

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
  BatchSelectionDialog,
} from "../components/pos";

// Types
import { Product } from "../services/productService";
import saleService from "../services/saleService";
import clientService from "../services/clientService";
import { preciseCalculation } from "../constants";
import { generateDailySalesPdf } from "../services/exportService";
import { useAuth } from "@/context/AuthContext";

// Utilities
import {
  transformBackendSaleToPOS,
  transformBackendSalesToPOS,
  extractCartItemsFromSale,
} from "../utils/saleTransformers";

const PosPage: React.FC = () => {
  const { user } = useAuth(); // Get current user

  // State
  const [currentSaleItems, setCurrentSaleItems] = useState<CartItem[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [saleEditorOpen, setSaleEditorOpen] = useState(false);
  const [isTodaySalesCollapsed, setIsTodaySalesCollapsed] = useState(false);
  const [calculatorDialogOpen, setCalculatorDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [thermalDialogOpen, setThermalDialogOpen] = useState(false);
  // Trigger enter-to-submit in PaymentDialog
  const [paymentSubmitTrigger, setPaymentSubmitTrigger] = useState(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  // Batch selection state
  const [batchSelectionOpen, setBatchSelectionOpen] = useState(false);
  const [batchSelectionProduct, setBatchSelectionProduct] = useState<Product | null>(null);
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
  const [loadingSaleId, setLoadingSaleId] = useState<number | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingSaleItems, setIsLoadingSaleItems] = useState(false);
  
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

  // Load today's sales - Simplified using POS-optimized API
  const loadTodaySales = async () => {
    setIsLoadingSales(true);
    try {
      const userId = filterByCurrentUser && user?.id ? user.id : null;
      const dbSales = await saleService.getTodaySalesPOS(userId);
      
      // Transform to POS format (if backend doesn't return POS format yet)
      const transformedSales = transformBackendSalesToPOS(dbSales);
      
      setTodaySales(transformedSales);
    } catch (error) {
      console.error('Failed to load today\'s sales:', error);
      setTodaySales([]);
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    loadTodaySales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterByCurrentUser, selectedDate, user]);

  // Global Enter key behavior on POS page
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if focused element is an input/textarea/select to avoid interfering with typing,
      // unless PaymentDialog is already open (then we want Enter to add payment)
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const inFormField = ['input', 'textarea', 'select'].includes(activeTag);

      if (e.key === 'Enter') {
        if (!paymentDialogOpen) {
          if (!inFormField) {
            // Open payment dialog
            setPaymentDialogOpen(true);
            e.preventDefault();
          }
        } else {
          // Trigger submit inside PaymentDialog
          setPaymentSubmitTrigger((v) => v + 1);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paymentDialogOpen]);

  const showToast = (message: string, severity: 'success' | 'error') => {
    if (severity === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const addToCurrentSale = async (product: Product) => {
    // Check if product has multiple batches
    if (product.available_batches && product.available_batches.length > 1) {
      // Show batch selection dialog
      setBatchSelectionProduct(product);
      setBatchSelectionOpen(true);
      return;
    }
    
    // If only one batch or no batches, proceed with normal flow
    await addProductToSale(product);
  };

  // Helper: Update sale state from backend response
  const updateSaleFromBackend = (backendSale: import('../services/saleService').Sale) => {
    const transformedSale = transformBackendSaleToPOS(backendSale);
    setSelectedSale(transformedSale);
    setSelectedSaleId(transformedSale.id);
    setCurrentSaleItems(extractCartItemsFromSale(transformedSale));
    setTodaySales(prevSales =>
      prevSales.map(sale =>
        sale.id === transformedSale.id ? transformedSale : sale
      )
    );
  };

  // Simplified: Add product to sale using POS-optimized API
  const addProductToSale = async (product: Product, selectedBatchId?: number | null) => {
    try {
      const response = await saleService.addProductToSalePOS(
        selectedSale?.id || null,
        {
          product_id: product.id,
          quantity: 1,
          purchase_item_id: selectedBatchId || null
        }
      );

      // Check if product already exists
      if (response.message === 'Product already exists in sale') {
        showToast(`${product.name} موجود بالفعل في السلة`, 'success');
        return;
      }

      // Update state from backend response
      updateSaleFromBackend(response.sale);
      showToast(`${product.name} تمت الإضافة إلى السلة`, 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error adding product to sale:', error);
      const errorMessage = saleService.getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  };

  const addMultipleToCurrentSale = async (products: Product[]) => {
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
        };

        // Select the new sale
        setSelectedSale(transformedSale);
        setSelectedSaleId(transformedSale.id);
        
        // Add the new sale to today's sales
        setTodaySales(prevSales => [transformedSale, ...prevSales]);
      } catch (error) {
        console.error('Error creating empty sale:', error);
        showToast('فشل إنشاء البيع', 'error');
        return;
      }
    }

    // Now add multiple products to the selected sale
    try {
      const itemsData = products.map(product => {
        const unitPrice = (product.last_sale_price_per_sellable_unit ?? product.suggested_sale_price_per_sellable_unit ?? 0);
        return {
          product_id: product.id,
          quantity: 1, // Default quantity
          unit_price: Number(unitPrice)
        };
      });

      const result = await saleService.addMultipleSaleItems(selectedSale!.id, itemsData);
      
      // Update the selected sale with new data
      const updatedSale: Sale = {
        id: result.sale.id,
        sale_order_number: result.sale.sale_order_number,
        client_id: result.sale.client_id,
        client_name: result.sale.client_name,
        user_id: result.sale.user_id,
        user_name: result.sale.user_name,
        sale_date: result.sale.sale_date,
        invoice_number: result.sale.invoice_number,
        status: result.sale.status,
        total_amount: Number(result.sale.total_amount),
        paid_amount: Number(result.sale.paid_amount),
        due_amount: Number(result.sale.due_amount || 0),
        notes: result.sale.notes,
        created_at: result.sale.created_at,
        updated_at: result.sale.updated_at,
        items: result.sale.items?.map((item: import('../services/saleService').SaleItem) => ({
          id: item.id,
          product: item.product || {
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
          total: Number(item.total_price || item.quantity * Number(item.unit_price)),
          selectedBatchId: item.purchase_item_id || null,
          selectedBatchNumber: item.batch_number_sold || null,
          selectedBatchExpiryDate: item.purchaseItemBatch?.expiry_date || null
        })) || [],
        payments: result.sale.payments?.map(payment => ({
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
      };
      
      setSelectedSale(updatedSale);
      
      // Update current sale items
      const updatedItems: CartItem[] = updatedSale.items.map(item => ({
        id: item.id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        selectedBatchId: item.selectedBatchId,
        selectedBatchNumber: item.selectedBatchNumber,
        selectedBatchExpiryDate: item.selectedBatchExpiryDate
      }));
      
      setCurrentSaleItems(updatedItems);
      
      // Trigger refresh for SaleSummaryColumn and PaymentDialog
      setRefreshTrigger(prev => prev + 1);
      
      if (result.total_added > 0) {
        showToast(`${result.total_added} product(s) added successfully`, 'success');
      }
      
      if (result.errors && result.errors.length > 0) {
        showToast(`Some products could not be added: ${result.errors.join(', ')}`, 'error');
      }
    } catch (error) {
      console.error('Error adding multiple products to sale:', error);
      showToast('فشل إضافة المنتج', 'error');
    }
  };

  // Simplified: Update quantity
  const updateQuantity = async (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCurrentSale(productId);
      return;
    }

    setUpdatingItems(prev => new Set(prev).add(productId));

    if (selectedSale) {
      try {
        const itemToUpdate = currentSaleItems.find(item => item.product.id === productId);
        if (!itemToUpdate?.id) {
          showToast('العنصر غير موجود', 'error');
          return;
        }

        const updatedSale = await saleService.updateSaleItem(selectedSale.id, itemToUpdate.id, {
          quantity: newQuantity,
          unit_price: itemToUpdate.unitPrice
        });

        updateSaleFromBackend(updatedSale);
        setRefreshTrigger(prev => prev + 1);
        showToast('تم تحديث الكمية', 'success');
      } catch (error) {
        console.error('Error updating sale item quantity:', error);
        showToast(saleService.getErrorMessage(error), 'error');
      } finally {
        setUpdatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }
    } else {
      // For new sales without backend, update frontend state
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
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Simplified: Update batch using POS-optimized API
  const updateBatch = async (productId: number, batchId: number | null, _batchNumber: string | null, _expiryDate: string | null, unitPrice: number) => {
    if (!selectedSale) return;
    
    try {
      const saleItem = currentSaleItems.find(item => item.product.id === productId);
      if (!saleItem || !saleItem.id) {
        showToast('العنصر غير موجود', 'error');
        return;
      }

      // Use POS-optimized API that returns updated Sale
      const updatedSale = await saleService.updateBatchPOS(
        selectedSale.id,
        saleItem.id,
        {
          purchase_item_id: batchId,
          unit_price: unitPrice
        }
      );
      
      updateSaleFromBackend(updatedSale);
      setRefreshTrigger(prev => prev + 1);
      showToast('تم تحديث الدفعة', 'success');
    } catch (error) {
      console.error('Error updating batch:', error);
      showToast('فشل تحديث الدفعة', 'error');
    }
  };

  const removeFromCurrentSale = async (productId: number) => {
    // Since we now create sales on backend before adding items, all sale items have backend records
    // Find the item to get its ID for backend deletion
    const itemToRemove = currentSaleItems.find(item => item.product.id === productId);
    
    if (!itemToRemove || !itemToRemove.id) {
      showToast('العنصر غير موجود', 'error');
      return;
    }

    // Set loading state for this item
    setDeletingItems(prev => new Set(prev).add(productId));

    // Always make backend request to delete the sale item
    try {
      await handleDeleteSaleItem(itemToRemove.id);
    } catch (error) {
      console.error('Error removing item from sale:', error);
      showToast('فشل إزالة العنصر', 'error');
    } finally {
      // Clear loading state for this item
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Simplified: Delete sale item using POS-optimized API
  const handleDeleteSaleItem = async (saleItemId: number) => {
    if (!selectedSale) {
      showToast('لم يتم اختيار بيع', 'error');
      return;
    }

    try {
      // Use POS-optimized API that returns updated Sale
      const updatedSale = await saleService.removeItemPOS(selectedSale.id, saleItemId);
      
      // If no items remaining, clear selection
      if (updatedSale.items?.length === 0) {
        setSelectedSale(null);
        setSelectedSaleId(null);
        setCurrentSaleItems([]);
        setDiscountAmount(0);
        setDiscountType('fixed');
        showToast('تم إلغاء البيع', 'success');
        await loadTodaySales();
      } else {
        updateSaleFromBackend(updatedSale);
        showToast('تم حذف العنصر', 'success');
      }
      
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting sale item:', error);
      showToast(saleService.getErrorMessage(error), 'error');
    }
  };


  const handlePaymentComplete = async (errorMessage?: string) => {
    if (errorMessage) {
      // Show error message in toast
      showToast(errorMessage, 'error');
    } else {
      // Success case - always reload today's sales after payment completion
      await loadTodaySales();
      
      if (selectedSale) {
        // If we were editing a sale, keep it selected and refresh the sale data
        // This maintains focus on the completed sale and shows updated payment info
        // Don't clear currentSaleItems - let the SaleSummaryColumn handle the display
        // Reset payment state - now handled by SalePaymentCard
        setDiscountAmount(0);
        setDiscountType('fixed');
        showToast('تم تحديث البيع', 'success');
        
        // Refresh the sale data to get updated payment information
        const updatedSale = await saleService.getSale(selectedSale.id);
        
        // Set selected client if present on sale
        try {
          if (updatedSale.client) {
            setSelectedClient(updatedSale.client);
          } else if (updatedSale.client_id) {
            const client = await clientService.getClient(updatedSale.client_id);
            setSelectedClient(client);
          } else {
            setSelectedClient(null);
          }
        } catch {
          // ignore client fetch errors
        }

        // Transform and update the selected sale with fresh data
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
          items: updatedSale.items?.map(item => ({
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
        };
        
        // Update the selected sale with fresh data
        setSelectedSale(transformedSale);
        
        // Update currentSaleItems to reflect the sale's items
        setCurrentSaleItems(transformedSale.items);
        
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
          // Update currentSaleItems to reflect the sale's items
          setCurrentSaleItems(transformedSale.items);
          // Reset payment state - now handled by SalePaymentCard
          setDiscountAmount(0);
          setDiscountType('fixed');
          
          // Automatically open thermal PDF dialog for the completed sale
          setTimeout(() => {
            setThermalDialogOpen(true);
          }, 500); // Small delay to ensure the sale data is updated
        }
        
        showToast('تم إكمال البيع', 'success');
      }
    }
  };

  // Simplified: Select sale using POS-optimized API
  const handleSaleSelect = async (sale: Sale) => {
    setLoadingSaleId(sale.id);
    setIsLoadingSaleItems(true);

    try {
      // Use POS-optimized API if available, otherwise fallback to regular getSale
      const latestSale = await (saleService.getSaleForPOS || saleService.getSale)(sale.id);

      // Set selected client if available
      try {
        if (latestSale.client) {
          setSelectedClient(latestSale.client);
        } else if (latestSale.client_id) {
          const client = await clientService.getClient(latestSale.client_id);
          setSelectedClient(client);
        } else {
          setSelectedClient(null);
        }
      } catch {
        // ignore client fetch errors
      }

      // Update sale state using transformer
      updateSaleFromBackend(latestSale);
    } catch (error) {
      console.error('Error fetching latest sale data:', error);
      // Fallback to using provided sale data
      const transformedSale = transformBackendSaleToPOS(sale as any);
      setSelectedSale(transformedSale);
      setSelectedSaleId(sale.id);
      setCurrentSaleItems(extractCartItemsFromSale(transformedSale));
      showToast('فشل جلب بيانات البيع', 'error');
    } finally {
      setLoadingSaleId(null);
      setIsLoadingSaleItems(false);
    }
  };



  // Simplified: Create empty sale
  const handleCreateEmptySale = async () => {
    try {
      const emptySaleData = {
        client_id: null,
        sale_date: new Date().toISOString().split('T')[0],
        notes: null
      };

      const newSale = await saleService.createEmptySale(emptySaleData);
      const transformedSale = transformBackendSaleToPOS(newSale);

      // Select the new sale
      await handleSaleSelect(transformedSale);
      await loadTodaySales();
      showToast('تم إنشاء بيع فارغ', 'success');
    } catch (error) {
      console.error('Error creating empty sale:', error);
      showToast(saleService.getErrorMessage(error), 'error');
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
      showToast('لم يتم اختيار بيع', 'error');
      return;
    }
    setThermalDialogOpen(true);
  };

  const handleGenerateDailySalesPdf = async () => {
    try {
      await generateDailySalesPdf();
      showToast('تم إنشاء PDF', 'success');
    } catch {
      showToast('فشل إنشاء PDF', 'error');
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
      
      showToast('تم تحديث تاريخ البيع', 'success');
    } catch (error) {
      console.error('Failed to update sale date:', error);
      const errorMessage = saleService.getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  };

  // Payment method handlers

  
  // Update sale client instantly when client is selected in POS header
  const handleClientChange = async (client: import('../services/clientService').Client | null) => {
    setSelectedClient(client);
    if (!selectedSale || !client) return;
    try {
      // Update on backend
      await saleService.updateSale(selectedSale.id, { client_id: client.id });

      // Update local selected sale and today's sales list
      setSelectedSale(prev => prev ? { ...prev, client_id: client.id, client_name: client.name } : prev);
      setTodaySales(prev => prev.map(s => s.id === selectedSale.id ? { ...s, client_id: client.id, client_name: client.name } : s));

      showToast('تم تحديث البيع', 'success');
    } catch (error) {
      const errorMessage = saleService.getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="px-3 sm:px-4 lg:px-6">
          <PosHeader
            key={selectedSale?.id ?? 'no-sale'}
            onAddProduct={addToCurrentSale}
            onAddMultipleProducts={addMultipleToCurrentSale}
            loading={false}
            onCreateEmptySale={handleCreateEmptySale}
            onOpenCalculator={handleOpenCalculator}
            onGeneratePdf={handleGenerateDailySalesPdf}
            onPreviewPdf={handleOpenPdfDialog}
            onGenerateInvoice={handleOpenInvoiceDialog}
            onPrintThermalInvoice={handlePrintThermalInvoice}
            hasSelectedSale={!!selectedSale}
            selectedClient={selectedClient}
            onClientChange={handleClientChange}
            filterByCurrentUser={filterByCurrentUser}
            onToggleUserFilter={() => setFilterByCurrentUser(!filterByCurrentUser)}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-3 sm:px-4 lg:px-6 py-3">
        <div className="h-full flex flex-col md:flex-row gap-3">
          {/* Column 1 - Today's Sales */}
          <div className="hidden md:block w-[80px] shrink-0">
            <div className="h-full rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden sticky top-20">
              <TodaySalesColumn
                sales={todaySales}
                selectedSaleId={selectedSaleId}
                onSaleSelect={handleSaleSelect}
                isCollapsed={isTodaySalesCollapsed}
                onToggleCollapse={() => setIsTodaySalesCollapsed(!isTodaySalesCollapsed)}
                filterByCurrentUser={filterByCurrentUser}
                selectedDate={selectedDate}
                loadingSaleId={loadingSaleId}
                isLoading={isLoadingSales}
              />
            </div>
          </div>

          {/* Column 2 - Current Sale Items (fills remaining width) */}
          <div className="flex-1 min-w-0">
            <div className="h-full shadow-sm overflow-hidden">
              <CurrentSaleItemsColumn
                currentSaleItems={currentSaleItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCurrentSale}
                onUpdateBatch={updateBatch}
                isSalePaid={selectedSale ? (selectedSale.payments && selectedSale.payments.length > 0) : false}
                deletingItems={deletingItems}
                updatingItems={updatingItems}
                isLoading={isLoadingSaleItems}
              />
            </div>
          </div>

          {/* Column 3 - Summary and Actions */}
          {selectedSale && (
            <div className="md:w-[320px] xl:w-[360px] w-full shrink-0">
              <div className="h-full rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden md:sticky md:top-20">
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
                paymentDialogOpen={paymentDialogOpen}
                onPaymentDialogOpenChange={setPaymentDialogOpen}
                paymentSubmitTrigger={paymentSubmitTrigger}
                />
              </div>
            </div>
          )}
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

      {/* Dialogs */}
      <CalculatorDialog
        open={calculatorDialogOpen}
        onOpenChange={setCalculatorDialogOpen}
        currentUserId={user?.id || null}
        filterByCurrentUser={filterByCurrentUser}
      />

      <PosPdfDialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} />

      <InvoicePdfDialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} sale={selectedSale} />

      <ThermalInvoiceDialog open={thermalDialogOpen} onClose={() => setThermalDialogOpen(false)} sale={selectedSale} />

      {/* Batch Selection Dialog */}
      <BatchSelectionDialog
        open={batchSelectionOpen}
        onOpenChange={setBatchSelectionOpen}
        product={batchSelectionProduct}
        onBatchSelect={async (batch) => {
          if (batchSelectionProduct) {
            await addProductToSale(batchSelectionProduct, batch.id);
            setBatchSelectionOpen(false);
            setBatchSelectionProduct(null);
          }
        }}
      />
    </div>
  );
};

export default PosPage; 