// src/hooks/useSaleOperations.ts
import { useCallback } from 'react';
import { toast } from 'sonner';
import { Product } from '../services/productService';
import saleService from '../services/saleService';
import clientService from '../services/clientService';
import { transformBackendSaleToPOS, extractCartItemsFromSale } from '../utils/saleTransformers';
import { Sale, CartItem } from '../components/pos/types';

interface UseSaleOperationsProps {
  selectedSale: Sale | null;
  currentSaleItems: CartItem[];
  onSaleUpdate: (sale: Sale) => void;
  onItemsUpdate: (items: CartItem[]) => void;
  onSalesListUpdate: (updater: (prev: Sale[]) => Sale[]) => void;
  onRefreshTrigger: () => void;
}

export const useSaleOperations = ({
  selectedSale,
  currentSaleItems,
  onSaleUpdate,
  onItemsUpdate,
  onSalesListUpdate,
  onRefreshTrigger,
}: UseSaleOperationsProps) => {
  const showToast = useCallback((message: string, severity: 'success' | 'error') => {
    if (severity === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  }, []);

  const updateSaleFromBackend = useCallback((backendSale: import('../services/saleService').Sale) => {
    const transformedSale = transformBackendSaleToPOS(backendSale);
    onSaleUpdate(transformedSale);
    onItemsUpdate(extractCartItemsFromSale(transformedSale));
    onSalesListUpdate(prevSales =>
      prevSales.map(sale => sale.id === transformedSale.id ? transformedSale : sale)
    );
  }, [onSaleUpdate, onItemsUpdate, onSalesListUpdate]);

  const addProductToSale = useCallback(async (
    product: Product,
    selectedBatchId?: number | null
  ) => {
    try {
      const response = await saleService.addProductToSalePOS(
        selectedSale?.id || null,
        {
          product_id: product.id,
          quantity: 1,
          purchase_item_id: selectedBatchId || null
        }
      );

      if (response.message === 'Product already exists in sale') {
        showToast(`${product.name} موجود بالفعل في السلة`, 'success');
        return;
      }

      updateSaleFromBackend(response.sale);
      showToast(`${product.name} تمت الإضافة إلى السلة`, 'success');
      onRefreshTrigger();
    } catch (error) {
      console.error('Error adding product to sale:', error);
      const errorMessage = saleService.getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  }, [selectedSale, updateSaleFromBackend, showToast, onRefreshTrigger]);

  const addMultipleToCurrentSale = useCallback(async (products: Product[]) => {
    try {
      let saleToUse = selectedSale;
      
      if (!saleToUse) {
        const emptySaleData = {
          client_id: null,
          sale_date: new Date().toISOString().split('T')[0],
          notes: null
        };
        const newSale = await saleService.createEmptySale(emptySaleData);
        const transformedSale = transformBackendSaleToPOS(newSale);
        onSaleUpdate(transformedSale);
        onSalesListUpdate(prevSales => [transformedSale, ...prevSales]);
        saleToUse = transformedSale;
      }

      const itemsData = products.map(product => ({
        product_id: product.id,
        quantity: 1,
        unit_price: product.last_sale_price_per_sellable_unit || product.suggested_sale_price_per_sellable_unit || 0
      }));

      const result = await saleService.addMultipleSaleItems(saleToUse.id, itemsData);
      
      updateSaleFromBackend(result.sale);
      onRefreshTrigger();
      
      if (result.total_added > 0) {
        showToast(`تم إضافة ${result.total_added} منتج بنجاح`, 'success');
      }
      
      if (result.errors && result.errors.length > 0) {
        showToast(`لم يتم إضافة بعض المنتجات: ${result.errors.join(', ')}`, 'error');
      }
    } catch (error) {
      console.error('Error adding multiple products:', error);
      showToast('فشل إضافة المنتجات', 'error');
    }
  }, [selectedSale, updateSaleFromBackend, showToast, onSaleUpdate, onSalesListUpdate, onRefreshTrigger]);

  const removeFromCurrentSale = useCallback(async (productId: number) => {
    if (!selectedSale) {
      showToast('لم يتم اختيار بيع', 'error');
      return;
    }

    const itemToRemove = currentSaleItems.find(item => item.product.id === productId);
    
    if (!itemToRemove) {
      console.error('Item not found in currentSaleItems:', { productId, currentSaleItems });
      showToast('العنصر غير موجود في السلة', 'error');
      return;
    }

    if (!itemToRemove.id) {
      console.error('Sale item ID missing:', { itemToRemove, productId, currentSaleItems });
      showToast('معرف العنصر مفقود. يرجى إعادة تحميل الصفحة', 'error');
      return;
    }

    try {
      // Delete the item and fetch updated sale
      const updatedSale = await saleService.removeItemPOS(selectedSale.id, itemToRemove.id);
      
      if (updatedSale.items?.length === 0) {
        // Sale is empty - will be handled by parent
        updateSaleFromBackend(updatedSale);
        showToast('تم إلغاء البيع', 'success');
      } else {
        updateSaleFromBackend(updatedSale);
        showToast('تم حذف العنصر', 'success');
      }
      
      onRefreshTrigger();
    } catch (error) {
      console.error('Error deleting sale item:', error);
      showToast(saleService.getErrorMessage(error), 'error');
      throw error;
    }
  }, [selectedSale, currentSaleItems, updateSaleFromBackend, showToast, onRefreshTrigger]);

  const updateQuantity = useCallback(async (productId: number, newQuantity: number) => {
    if (!selectedSale) {
      showToast('لم يتم اختيار بيع', 'error');
      return;
    }

    if (newQuantity <= 0) {
      await removeFromCurrentSale(productId);
      return;
    }

    try {
      const itemToUpdate = currentSaleItems.find(item => item.product.id === productId);
      if (!itemToUpdate) {
        console.error('Item not found in currentSaleItems:', { productId, currentSaleItems });
        showToast('العنصر غير موجود في السلة', 'error');
        return;
      }

      if (!itemToUpdate.id) {
        console.error('Sale item ID missing:', { itemToUpdate, productId, currentSaleItems });
        showToast('معرف العنصر مفقود. يرجى إعادة تحميل الصفحة', 'error');
        return;
      }

      const updatedSale = await saleService.updateSaleItem(selectedSale.id, itemToUpdate.id, {
        quantity: newQuantity,
        unit_price: itemToUpdate.unitPrice
      });

      updateSaleFromBackend(updatedSale);
      onRefreshTrigger();
      showToast('تم تحديث الكمية', 'success');
    } catch (error) {
      console.error('Error updating sale item quantity:', error);
      showToast(saleService.getErrorMessage(error), 'error');
      throw error;
    }
  }, [selectedSale, currentSaleItems, updateSaleFromBackend, showToast, onRefreshTrigger, removeFromCurrentSale]);

  const updateUnitPrice = useCallback(async (productId: number, newUnitPrice: number) => {
    if (!selectedSale) {
      showToast('لم يتم اختيار بيع', 'error');
      return;
    }

    if (newUnitPrice < 0) {
      showToast('السعر لا يمكن أن يكون سالباً', 'error');
      return;
    }

    try {
      const itemToUpdate = currentSaleItems.find(item => item.product.id === productId);
      if (!itemToUpdate) {
        console.error('Item not found in currentSaleItems:', { productId, currentSaleItems });
        showToast('العنصر غير موجود في السلة', 'error');
        return;
      }

      if (!itemToUpdate.id) {
        console.error('Sale item ID missing:', { itemToUpdate, productId, currentSaleItems });
        showToast('معرف العنصر مفقود. يرجى إعادة تحميل الصفحة', 'error');
        return;
      }

      const updatedSale = await saleService.updateSaleItem(selectedSale.id, itemToUpdate.id, {
        quantity: itemToUpdate.quantity,
        unit_price: newUnitPrice
      });

      updateSaleFromBackend(updatedSale);
      onRefreshTrigger();
      showToast('تم تحديث السعر', 'success');
    } catch (error) {
      console.error('Error updating sale item unit price:', error);
      showToast(saleService.getErrorMessage(error), 'error');
      throw error;
    }
  }, [selectedSale, currentSaleItems, updateSaleFromBackend, showToast, onRefreshTrigger]);

  const updateBatch = useCallback(async (
    productId: number,
    batchId: number | null,
    unitPrice: number
  ) => {
    if (!selectedSale) return;
    
    try {
      const saleItem = currentSaleItems.find(item => item.product.id === productId);
      if (!saleItem || !saleItem.id) {
        showToast('العنصر غير موجود', 'error');
        return;
      }

      const updatedSale = await saleService.updateBatchPOS(
        selectedSale.id,
        saleItem.id,
        {
          purchase_item_id: batchId,
          unit_price: unitPrice
        }
      );
      
      updateSaleFromBackend(updatedSale);
      onRefreshTrigger();
      showToast('تم تحديث الدفعة', 'success');
    } catch (error) {
      console.error('Error updating batch:', error);
      showToast('فشل تحديث الدفعة', 'error');
    }
  }, [selectedSale, currentSaleItems, updateSaleFromBackend, showToast, onRefreshTrigger]);

  const updateClient = useCallback(async (client: import('../services/clientService').Client | null) => {
    if (!selectedSale || !client) return;
    
    try {
      await saleService.updateSale(selectedSale.id, { client_id: client.id });
      
      const updatedSale = { ...selectedSale, client_id: client.id, client_name: client.name };
      onSaleUpdate(updatedSale);
      onSalesListUpdate(prev => prev.map(s => s.id === selectedSale.id ? updatedSale : s));
      
      showToast('تم تحديث البيع', 'success');
    } catch (error) {
      const errorMessage = saleService.getErrorMessage(error);
      showToast(errorMessage, 'error');
    }
  }, [selectedSale, onSaleUpdate, onSalesListUpdate, showToast]);

  return {
    addProductToSale,
    addMultipleToCurrentSale,
    updateQuantity,
    updateUnitPrice,
    updateBatch,
    removeFromCurrentSale,
    updateClient,
    showToast,
  };
};

