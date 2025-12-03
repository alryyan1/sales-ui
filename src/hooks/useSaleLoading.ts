// src/hooks/useSaleLoading.ts
import { useState, useCallback } from 'react';

export const useSaleLoading = () => {
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingSaleItems, setIsLoadingSaleItems] = useState(false);
  const [loadingSaleId, setLoadingSaleId] = useState<number | null>(null);
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  const setDeletingItem = useCallback((productId: number, isDeleting: boolean) => {
    setDeletingItems(prev => {
      const newSet = new Set(prev);
      if (isDeleting) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  const setUpdatingItem = useCallback((productId: number, isUpdating: boolean) => {
    setUpdatingItems(prev => {
      const newSet = new Set(prev);
      if (isUpdating) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  return {
    isLoadingSales,
    isLoadingSaleItems,
    loadingSaleId,
    deletingItems,
    updatingItems,
    setIsLoadingSales,
    setIsLoadingSaleItems,
    setLoadingSaleId,
    setDeletingItem,
    setUpdatingItem,
  };
};


