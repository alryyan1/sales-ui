// src/hooks/useSaleSelection.ts
import { useCallback } from 'react';
import saleService from '../services/saleService';
import clientService from '../services/clientService';
import { transformBackendSaleToPOS, extractCartItemsFromSale } from '../utils/saleTransformers';
import { Sale } from '../components/pos/types';
import { Client } from '../services/clientService';

interface UseSaleSelectionProps {
  onSaleSelected: (sale: Sale) => void;
  onItemsUpdated: (items: import('../components/pos/types').CartItem[]) => void;
  onClientUpdated: (client: Client | null) => void;
  onLoadingChange: (loading: boolean) => void;
  onLoadingSaleIdChange: (id: number | null) => void;
}

export const useSaleSelection = ({
  onSaleSelected,
  onItemsUpdated,
  onClientUpdated,
  onLoadingChange,
  onLoadingSaleIdChange,
}: UseSaleSelectionProps) => {
  const selectSale = useCallback(async (sale: Sale) => {
    onLoadingSaleIdChange(sale.id);
    onLoadingChange(true);
    
    try {
      const latestSale = await (saleService.getSaleForPOS || saleService.getSale)(sale.id);
      const transformedSale = transformBackendSaleToPOS(latestSale);
      
      // Set selected client if available
      try {
        if (latestSale.client) {
          onClientUpdated(latestSale.client);
        } else if (latestSale.client_id) {
          const client = await clientService.getClient(latestSale.client_id);
          onClientUpdated(client);
        } else {
          onClientUpdated(null);
        }
      } catch {
        // ignore client fetch errors
      }
      
      onSaleSelected(transformedSale);
      onItemsUpdated(extractCartItemsFromSale(transformedSale));
    } catch (error) {
      console.error('Error fetching latest sale data:', error);
      // Fallback to using provided sale data
      onSaleSelected(sale);
      onItemsUpdated(extractCartItemsFromSale(sale));
    } finally {
      onLoadingSaleIdChange(null);
      onLoadingChange(false);
    }
  }, [onSaleSelected, onItemsUpdated, onClientUpdated, onLoadingChange, onLoadingSaleIdChange]);

  return { selectSale };
};


