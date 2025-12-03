// src/hooks/useSaleState.ts
import { useState, useCallback } from 'react';
import { Sale, CartItem } from '../components/pos/types';
import { Client } from '../services/clientService';

export const useSaleState = () => {
  const [currentSaleItems, setCurrentSaleItems] = useState<CartItem[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const updateSale = useCallback((sale: Sale | null) => {
    setSelectedSale(sale);
  }, []);

  const updateItems = useCallback((items: CartItem[]) => {
    setCurrentSaleItems(items);
  }, []);

  const updateSalesList = useCallback((updater: (prev: Sale[]) => Sale[]) => {
    setTodaySales(updater);
  }, []);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const resetSale = useCallback(() => {
    setSelectedSale(null);
    setCurrentSaleItems([]);
    setDiscountAmount(0);
    setDiscountType('fixed');
    setSelectedClient(null);
  }, []);

  return {
    // State
    currentSaleItems,
    todaySales,
    selectedSale,
    selectedClient,
    discountAmount,
    discountType,
    refreshTrigger,
    
    // Setters
    setCurrentSaleItems,
    setTodaySales,
    setSelectedSale: updateSale,
    setSelectedClient,
    setDiscountAmount,
    setDiscountType,
    setRefreshTrigger: refresh,
    
    // Helpers
    updateSale,
    updateItems,
    updateSalesList,
    refresh,
    resetSale,
  };
};


