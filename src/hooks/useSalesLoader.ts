// src/hooks/useSalesLoader.ts
import { useCallback } from 'react';
import saleService from '../services/saleService';
import { transformBackendSalesToPOS } from '../utils/saleTransformers';
import { Sale } from '../components/pos/types';

interface UseSalesLoaderProps {
  filterByCurrentUser: boolean;
  selectedDate: string;
  userId?: number | null;
  onSalesLoaded: (sales: Sale[]) => void;
  onLoadingChange: (loading: boolean) => void;
}

export const useSalesLoader = ({
  filterByCurrentUser,
  selectedDate,
  userId,
  onSalesLoaded,
  onLoadingChange,
}: UseSalesLoaderProps) => {
  const loadTodaySales = useCallback(async () => {
    onLoadingChange(true);
    try {
      const filterUserId = filterByCurrentUser && userId ? userId : null;
      const dbSales = await saleService.getTodaySalesPOS(filterUserId);
      const transformedSales = transformBackendSalesToPOS(dbSales);
      onSalesLoaded(transformedSales);
    } catch (error) {
      console.error('Failed to load today\'s sales:', error);
      onSalesLoaded([]);
    } finally {
      onLoadingChange(false);
    }
  }, [filterByCurrentUser, selectedDate, userId, onSalesLoaded, onLoadingChange]);

  return { loadTodaySales };
};


