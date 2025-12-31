import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { Cloud, Clock, X } from "lucide-react";
import apiClient from "@/lib/axios";
import { PDFViewer } from "@react-pdf/renderer";
import { useAuth } from "@/context/AuthContext";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { offlineSaleService } from "../services/offlineSaleService";
import { dbService, OfflineSale, OfflineSaleItem } from "../services/db";
import { Product } from "../services/productService";
import { CurrentSaleItemsColumn } from "../components/pos/CurrentSaleItemsColumn";
import { CartItem } from "../components/pos/types";
import { PendingSalesColumn } from "../components/pos/PendingSalesColumn";
import { toast } from "sonner";
import { OfflineSaleSummaryColumn } from "../components/pos/OfflineSaleSummaryColumn";
import { PosOfflineHeader } from "../components/pos/PosOfflineHeader";
import { PosShiftReportPdf } from "../components/pos/PosShiftReportPdf";

export const PosPageOffline = () => {
  const { user } = useAuth();
  const { isOnline, isSyncing, triggerSync, lastSyncedProducts } =
    useOfflineSync();
    

  // Shift state
  const [shift, setShift] = useState<{
    id: number;
    opened_at: string | null;
    closed_at: string | null;
    is_open: boolean;
  } | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [availableShiftIds, setAvailableShiftIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchShift = async () => {
      if (!isOnline) {
        // Try load from local storage
        const stored = localStorage.getItem("current_pos_shift");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Ensure is_open is a boolean
            const normalizedShift = {
              ...parsed,
              is_open: parsed.is_open === true || parsed.is_open === "true" || parsed.is_open === 1,
            };
            setShift(normalizedShift);
            if (!selectedShiftId && normalizedShift?.id) {
              setSelectedShiftId(normalizedShift.id);
            }
          } catch (e) {
            console.error("Error parsing stored shift", e);
          }
        }
        return;
      }
      try {
        setShiftLoading(true);
        const response = await apiClient.get("/shifts/current");
        if (response.status === 200) {
          const shiftData = response.data.data || response.data;
          // Ensure is_open is a boolean
          const normalizedShift = {
            ...shiftData,
            is_open: shiftData.is_open === true || shiftData.is_open === "true" || shiftData.is_open === 1,
          };
          setShift(normalizedShift);
          localStorage.setItem("current_pos_shift", JSON.stringify(normalizedShift));
          // Initialize selected shift ID
          if (!selectedShiftId && normalizedShift?.id) {
            setSelectedShiftId(normalizedShift.id);
          }
        } else {
          setShift(null);
          localStorage.removeItem("current_pos_shift");
        }
      } catch (error: any) {
        if (error?.response?.status === 204) {
          setShift(null);
          localStorage.removeItem("current_pos_shift");
        } else {
          console.error("Failed to load current shift:", error);
        }
      } finally {
        setShiftLoading(false);
      }
    };
    fetchShift();
  }, [isOnline, selectedShiftId]); // Run on mount and when isOnline or selectedShiftId changes

  const handleOpenShift = async () => {
    try {
      setShiftLoading(true);
      const response = await apiClient.post("/shifts/open");
      const newShift = response.data.data || response.data;
      // Ensure is_open is a boolean
      const normalizedShift = {
        ...newShift,
        is_open: true, // Explicitly set to true when opening
      };
      setShift(normalizedShift);
      localStorage.setItem("current_pos_shift", JSON.stringify(normalizedShift));

      // Automatically select the newly opened shift
      if (normalizedShift?.id) {
        setSelectedShiftId(normalizedShift.id);
      }

      toast.success("تم فتح الوردية");
    } catch (error) {
      console.error("Failed to open shift:", error);
      toast.error("فشل فتح الوردية");
    } finally {
      setShiftLoading(false);
    }
  };

  const handleCloseShift = async () => {
    try {
      setShiftLoading(true);
      const response = await apiClient.post("/shifts/close");
      const updatedShift = response.data.data || response.data;
      // Ensure is_open is a boolean
      const normalizedShift = {
        ...updatedShift,
        is_open: false, // Explicitly set to false when closing
      };
      setShift(normalizedShift);
      localStorage.setItem("current_pos_shift", JSON.stringify(normalizedShift));
      toast.success("تم إغلاق الوردية");
    } catch (error) {
      console.error("Failed to close shift:", error);
      toast.error("فشل إغلاق الوردية");
    } finally {
      setShiftLoading(false);
    }
  };

  // UI State
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<any[]>([]); // Using any for client type for now as we didn't import strict type
  const [currentSale, setCurrentSale] = useState<OfflineSale>(
    offlineSaleService.createDraftSale()
  );
  // MOVED TO HEADER: inputValue, autocompleteOpen, inputRef

  // Dialog State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSyncedView, setIsSyncedView] = useState(true);
  const [isShiftReportOpen, setIsShiftReportOpen] = useState(false);

  // Load Products and Clients on Mount & Auto-update
  useEffect(() => {
    const loadAndSync = async () => {
      // 1. Load local data first (fast render)
      const localProducts = await offlineSaleService.searchProducts("");
      if (localProducts.length > 0) setProducts(localProducts);

      const localClients = await offlineSaleService.searchClients("");
      if (localClients.length > 0) setClients(localClients);

      // 2. If online, fetch fresh data
      if (isOnline) {
        try {
          await offlineSaleService.initializeProducts(
            user?.warehouse_id || undefined
          );
          await offlineSaleService.initializeClients();

          // 3. Refresh state from updated DB
          const freshProducts = await offlineSaleService.searchProducts("");
          setProducts(freshProducts);

          const freshClients = await offlineSaleService.searchClients("");
          setClients(freshClients);
        } catch (e) {
          console.error("Auto-update failed", e);
        }
      }
    };

    loadAndSync();
  }, [isOnline, user?.warehouse_id]);

  // Reload pending sales list and refresh products when sync finishes
  useEffect(() => {
    if (!isSyncing) {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      
      // Only reload synced sales if enough time has passed since last load
      if (timeSinceLastLoad >= LOAD_DEBOUNCE_MS) {
        loadLocalPendingSales();
        loadSyncedSales();
        lastLoadTimeRef.current = now;
      } else {
        // Still reload local pending sales (lightweight operation)
        loadLocalPendingSales();
      }

      // Optimized Update: Only update products that changed during sync
      if (lastSyncedProducts && lastSyncedProducts.length > 0) {
        console.log(
          `Optimized: Updating ${lastSyncedProducts.length} products in UI state`
        );

        setProducts((prevProducts) => {
          const productMap = new Map(prevProducts.map((p) => [p.id, p]));
          lastSyncedProducts.forEach((p: Product) => productMap.set(p.id, p));
          return Array.from(productMap.values());
        });

        // Update items in current sale if they match
        if (currentSale.items.length > 0) {
          updateCurrentSale((prev) => {
            const newItems = prev.items.map((item) => {
              const pId = item.product_id;
              if (!pId) return item;

              const updated = lastSyncedProducts.find(
                (p: Product) => p.id === pId
              );
              if (updated && item.product) {
                console.log(
                  `Updating active cart item stock for ${updated.name}: ${updated.stock_quantity}`
                );
                const updatedProduct: Product = {
                  ...(item.product as Product),
                  stock_quantity: updated.stock_quantity,
                  current_stock_quantity: updated.stock_quantity,
                };
                return {
                  ...item,
                  product: updatedProduct,
                } as OfflineSaleItem;
              }
              return item;
            });
            return { ...prev, items: newItems };
          });
        }
      }
    }
  }, [isSyncing, lastSyncedProducts]);

  // --- Actions ---

  // Helper function to get price based on unit type
  const getPriceForUnitType = (
    product: Product,
    unitType: "stocking" | "sellable" = "sellable"
  ): number => {
    const unitsPerStocking = product.units_per_stocking_unit || 1;

    if (unitType === "stocking") {
      // Calculate price per stocking unit (box)
      const sellablePrice = Number(
        product.last_sale_price_per_sellable_unit || 0
      );
      if (
        sellablePrice === 0 &&
        product.available_batches &&
        product.available_batches.length > 0
      ) {
        const batchPrice = Number(product.available_batches[0].sale_price || 0);
        return batchPrice * unitsPerStocking;
      }
      return sellablePrice * unitsPerStocking;
    } else {
      // Price per sellable unit (piece)
      let price = Number(product.last_sale_price_per_sellable_unit || 0);
      if (
        price === 0 &&
        product.available_batches &&
        product.available_batches.length > 0
      ) {
        price = Number(product.available_batches[0].sale_price || 0);
      }
      return price;
    }
  };

  const addToCart = useCallback((
    product: Product,
    unitType: "stocking" | "sellable" = "sellable"
  ) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }

    // More robust check for shift.is_open
    const isShiftOpen = shift?.is_open === true || (typeof shift?.is_open === "string" && shift.is_open === "true") || (typeof shift?.is_open === "number" && shift.is_open === 1);
    if (!shift || !isShiftOpen) {
      toast.error("يجب فتح الوردية قبل إضافة منتجات");
      return;
    }

    const unitsPerStocking = product.units_per_stocking_unit || 1;
    const currentStock = Number(
      product.current_stock_quantity ?? product.stock_quantity ?? 0
    );

    if (currentStock <= 0) {
      toast.error("عذراً، هذا المنتج غير متوفر في المخزون (الكمية 0)");
      return;
    }

    // Check if we have enough stock for the selected unit type
    if (unitType === "stocking") {
      const availableStockingUnits = Math.floor(
        currentStock / unitsPerStocking
      );
      if (availableStockingUnits <= 0) {
        toast.error(
          `عذراً، لا يوجد مخزون كافٍ. المتاح: ${currentStock} ${
            product.sellable_unit_name || "قطعة"
          }`
        );
        return;
      }
    }

    updateCurrentSale((prev) => {
      const existing = prev.items.find((i) => i.product_id === product.id);
      const price = getPriceForUnitType(product, unitType);
      const currentStock = Number(
        product?.current_stock_quantity ?? product?.stock_quantity ?? 0
      );

      let newItems;
      let quantityToDeduct = 0; // Quantity to deduct from stock in sellable units

      if (existing) {
        // If existing item has different unit type, convert quantity
        const existingUnitType = (existing as any).unitType || "sellable";
        if (existingUnitType === unitType) {
          // Same unit type, just increment
          const addedQty = unitType === "stocking" ? unitsPerStocking : 1;
          quantityToDeduct = addedQty;
          
          newItems = prev.items.map((i) => {
            if (i.product_id === product.id) {
              // Update product stock in the item
              const updatedProduct: Product = {
                ...(i.product as Product),
                stock_quantity: Math.max(0, currentStock - addedQty),
                current_stock_quantity: Math.max(0, currentStock - addedQty),
              };
              return { 
                ...i, 
                quantity: i.quantity + 1,
                product: updatedProduct,
              };
            }
            return i;
          });
        } else {
          // Different unit type, convert and add
          const existingQtyInSellable =
            existingUnitType === "stocking"
              ? existing.quantity * unitsPerStocking
              : existing.quantity;
          const newQtyInSellable =
            unitType === "stocking" ? unitsPerStocking : 1;
          const totalSellableQty = existingQtyInSellable + newQtyInSellable;
          quantityToDeduct = newQtyInSellable;

          // Convert back to the new unit type
          const newQty =
            unitType === "stocking"
              ? Math.floor(totalSellableQty / unitsPerStocking)
              : totalSellableQty;

          newItems = prev.items.map((i) => {
            if (i.product_id === product.id) {
              // Update product stock in the item
              const updatedProduct: Product = {
                ...(i.product as Product),
                stock_quantity: Math.max(0, currentStock - newQtyInSellable),
                current_stock_quantity: Math.max(0, currentStock - newQtyInSellable),
              };
              return {
                ...i,
                quantity: newQty,
                unit_price: price,
                unitType: unitType,
                product: updatedProduct,
              };
            }
            return i;
          });
        }
      } else {
        // New item - deduct quantity from stock
        quantityToDeduct = unitType === "stocking" ? unitsPerStocking : 1;
        
        const updatedProduct: Product = {
          ...product,
          stock_quantity: Math.max(0, currentStock - quantityToDeduct),
          current_stock_quantity: Math.max(0, currentStock - quantityToDeduct),
        };
        
        const newItem: OfflineSaleItem & {
          unitType?: "stocking" | "sellable";
        } = {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: price,
          product: updatedProduct,
          id: undefined, // New item
          unitType: unitType,
        };
        newItems = [...prev.items, newItem];
      }

      // Update products state to reflect stock change
      if (quantityToDeduct > 0) {
        setProducts((prevProducts) => {
          return prevProducts.map((p) => {
            if (p.id === product.id) {
              return {
                ...p,
                stock_quantity: Math.max(0, currentStock - quantityToDeduct),
                current_stock_quantity: Math.max(0, currentStock - quantityToDeduct),
              };
            }
            return p;
          });
        });
      }

      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  }, [currentSale.is_synced, shift]);

  const updateQuantity = (productId: number, qty: number) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }
    
    // Find the current item to get old quantity
    const currentItem = currentSale.items.find((i) => i.product_id === productId);
    if (!currentItem) return;
    
    const product = currentItem.product as Product;
    const unitType = (currentItem as any).unitType || "sellable";
    const unitsPerStocking = product?.units_per_stocking_unit || 1;
    const currentStock = Number(
      product?.current_stock_quantity ?? product?.stock_quantity ?? 0
    );

    // Calculate quantity difference in sellable units
    const oldQuantity = currentItem.quantity;
    const oldQuantityInSellable = unitType === "stocking" 
      ? oldQuantity * unitsPerStocking 
      : oldQuantity;
    const newQuantityInSellable = unitType === "stocking" 
      ? qty * unitsPerStocking 
      : qty;
    const quantityDiff = newQuantityInSellable - oldQuantityInSellable;

    // Validate stock availability
    if (unitType === "stocking") {
      const requiredSellableQty = qty * unitsPerStocking;
      if (requiredSellableQty > currentStock) {
        toast.error(
          `المخزون غير كافٍ. المتاح: ${currentStock} ${
            product?.sellable_unit_name || "قطعة"
          }`
        );
        return;
      }
    } else {
      if (qty > currentStock) {
        toast.error(
          `المخزون غير كافٍ. المتاح: ${currentStock} ${
            product?.sellable_unit_name || "قطعة"
          }`
        );
        return;
      }
    }

    // Update sale items
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) => {
        if (i.product_id === productId) {
          // Update product stock in the item
          const updatedProduct: Product = {
            ...(i.product as Product),
            stock_quantity: Math.max(0, currentStock - quantityDiff),
            current_stock_quantity: Math.max(0, currentStock - quantityDiff),
          };
          
          return { 
            ...i, 
            quantity: qty,
            product: updatedProduct,
          };
        }
        return i;
      });
      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });

    // Update products state to reflect stock change
    setProducts((prevProducts) => {
      return prevProducts.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            stock_quantity: Math.max(0, currentStock - quantityDiff),
            current_stock_quantity: Math.max(0, currentStock - quantityDiff),
          };
        }
        return p;
      });
    });
  };

  const updateUnitPrice = (productId: number, newPrice: number) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) =>
        i.product_id === productId ? { ...i, unit_price: newPrice } : i
      );
      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  // Function to switch unit type for an item
  const switchUnitType = (
    productId: number,
    newUnitType: "stocking" | "sellable"
  ) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) => {
        if (i.product_id === productId) {
          const product = i.product as Product;
          const currentUnitType = (i as any).unitType || "sellable";

          if (currentUnitType === newUnitType) {
            return i; // No change needed
          }

          const unitsPerStocking = product?.units_per_stocking_unit || 1;

          // First, convert current quantity to sellable units (base unit)
          let currentQuantityInSellable: number;
          if (currentUnitType === "stocking") {
            // Current quantity is in stocking units, convert to sellable
            currentQuantityInSellable = i.quantity * unitsPerStocking;
          } else {
            // Current quantity is already in sellable units
            currentQuantityInSellable = i.quantity;
          }

          // Now convert to the new unit type
          let newQuantity: number;
          if (newUnitType === "stocking") {
            // Convert from sellable to stocking units
            newQuantity = Math.floor(
              currentQuantityInSellable / unitsPerStocking
            );
            if (newQuantity === 0) {
              toast.error(
                `الكمية الحالية (${currentQuantityInSellable} ${
                  product?.sellable_unit_name || "قطعة"
                }) غير كافية للتحويل إلى وحدة التخزين (يحتاج ${unitsPerStocking} ${
                  product?.sellable_unit_name || "قطعة"
                } على الأقل)`
              );
              return i;
            }
          } else {
            // Convert from sellable to sellable (shouldn't happen, but just in case)
            newQuantity = currentQuantityInSellable;
          }

          // Get new price for the unit type
          const newPrice = getPriceForUnitType(product, newUnitType);

          return {
            ...i,
            quantity: newQuantity,
            unit_price: newPrice,
            unitType: newUnitType,
          };
        }
        return i;
      });
      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  const removeItem = async (productId: number) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }
    
    // Find the item to get its quantity for stock restoration
    const itemToRemove = currentSale.items.find((i) => i.product_id === productId);
    let quantityToRestore = 0;
    
    if (itemToRemove) {
      const product = itemToRemove.product as Product;
      const unitType = (itemToRemove as any).unitType || "sellable";
      const unitsPerStocking = product?.units_per_stocking_unit || 1;
      
      // Calculate quantity to restore in sellable units
      quantityToRestore = unitType === "stocking" 
        ? itemToRemove.quantity * unitsPerStocking 
        : itemToRemove.quantity;
    }
    
    let shouldDeleteSale = false;
    let saleTempId: string | null = null;
    
    updateCurrentSale((prev) => {
      const newItems = prev.items.filter((i) => i.product_id !== productId);
      const updatedSale = offlineSaleService.calculateTotals({ ...prev, items: newItems });
      
      // Check if all items are removed and sale is pending
      if (newItems.length === 0 && prev.tempId && !prev.is_synced) {
        shouldDeleteSale = true;
        saleTempId = prev.tempId;
      }
      
      return updatedSale;
    });

    // Restore stock quantity when item is removed
    if (itemToRemove && quantityToRestore > 0) {
      const product = itemToRemove.product as Product;
      const currentStock = Number(
        product?.current_stock_quantity ?? product?.stock_quantity ?? 0
      );
      
      // Update products state to restore stock
      setProducts((prevProducts) => {
        return prevProducts.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              stock_quantity: currentStock + quantityToRestore,
              current_stock_quantity: currentStock + quantityToRestore,
            };
          }
          return p;
        });
      });
    }
    
    // If all items removed, delete the pending sale and reload from IndexedDB
    if (shouldDeleteSale && saleTempId) {
      try {
        await offlineSaleService.deletePendingSale(saleTempId);
        toast.success("تم حذف عملية البيع المعلقة تلقائياً");
        
        // Create a new draft sale
        if (shift && shift.is_open) {
          const newDraft = offlineSaleService.createDraftSale(shift.id);
          setCurrentSale(newDraft);
          shouldAutoSave.current = false;
        } else {
          const newDraft = offlineSaleService.createDraftSale(null);
          setCurrentSale(newDraft);
          shouldAutoSave.current = false;
        }
        
        // Reload pending sales from IndexedDB
        await loadLocalPendingSales();
      } catch (error) {
        console.error("Failed to delete pending sale:", error);
        toast.error("فشل حذف عملية البيع المعلقة");
      }
    }
  };

  const updateBatch = (
    productId: number,
    batchId: number | null,
    _batchNumber: string | null,
    _expiryDate: string | null,
    unitPrice: number
  ) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) =>
        i.product_id === productId
          ? { ...i, purchase_item_id: batchId, unit_price: unitPrice } // We use purchase_item_id for batch ID mapping
          : i
      );
      // Note: We might need to store batch info (number/expiry) in OfflineSaleItem if we want to display it properly after reload
      // But basic mapping for calculation uses unit_price which is updated here.
      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  // List of local pending (unsynced) sales and synced sales (separate sources)
  const [localPendingSales, setLocalPendingSales] = useState<OfflineSale[]>([]);
  const [syncedSales, setSyncedSales] = useState<OfflineSale[]>([]);

  // Load local pending (unsynced) sales from IndexedDB
  const loadLocalPendingSales = useCallback(async () => {
    const sales = await offlineSaleService.getOfflineSales();
    
    // Filter only unsynced sales
    const unsyncedSales = sales.filter((s) => !s.is_synced);

    // Filter by selected shift ID if set
    let filteredSales = unsyncedSales;
    if (selectedShiftId) {
      filteredSales = unsyncedSales.filter(
        (s) => s.shift_id && Number(s.shift_id) === Number(selectedShiftId)
      );
    }

    // Sort by date desc
    setLocalPendingSales(
      filteredSales.sort((a, b) => b.offline_created_at - a.offline_created_at)
    );
  }, [selectedShiftId]);

  // Track if loadSyncedSales is currently running to prevent concurrent calls
  const isLoadingSyncedSalesRef = useRef(false);
  const lastSyncedSalesLoadRef = useRef<number>(0);
  const MIN_TIME_BETWEEN_LOADS = 3000; // Minimum 3 seconds between loads
  
  // Load synced sales from server API (always fetch fresh)
  const loadSyncedSales = useCallback(async () => {
    if (!selectedShiftId) {
      setSyncedSales([]);
      return;
    }

    // Prevent concurrent calls
    if (isLoadingSyncedSalesRef.current) {
      return;
    }

    // Prevent too frequent calls
    const now = Date.now();
    const timeSinceLastLoad = now - lastSyncedSalesLoadRef.current;
    if (timeSinceLastLoad < MIN_TIME_BETWEEN_LOADS) {
      return;
    }

    isLoadingSyncedSalesRef.current = true;
    lastSyncedSalesLoadRef.current = now;

    // Try to fetch regardless of isOnline status
    // Don't clear existing synced sales if fetch fails - keep them visible
    try {
      const res = await apiClient.get(
        `/sales?shift_id=${selectedShiftId}&per_page=100`
      );
      const serverSalesData = res.data.data || [];

      // Get current product data from IndexedDB to enrich with live stock
      const allLocalProducts = await offlineSaleService.searchProducts("");
      const productMap = new Map(allLocalProducts.map(p => [p.id, p]));

      const mapped: OfflineSale[] = serverSalesData.map((s: any) => ({
        tempId: `server_${s.id}`,
        id: s.id,
        offline_created_at: new Date(s.created_at).getTime(),
        is_synced: true,
        shift_id: s.shift_id ? Number(s.shift_id) : null,
        sale_date: s.sale_date,
        total_amount: Number(s.total_amount),
        paid_amount: Number(s.paid_amount),
        client_id: s.client_id,
        client_name: s.client_name,
        invoice_number: s.invoice_number,
        sale_order_number: s.sale_order_number,
        status: "completed",
        items:
          s.items?.map((i: any) => {
            // Try to get current product data from IndexedDB for live stock info
            const currentProduct = productMap.get(i.product_id);
            
            return {
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: Number(i.unit_price),
              product: currentProduct || i.product || {
                id: i.product_id,
                name: i.product_name || "Unknown Product",
                sku: i.product_sku || "",
                stock_quantity: 0,
                available_batches: [],
              },
              product_name: currentProduct?.name || i.product?.name || i.product_name,
              purchase_item_id: i.purchase_item_id,
            };
          }) || [],
        payments: s.payments || [],
        notes: s.notes,
        created_at: s.created_at,
        user_id: s.user_id,
      }));

      // Sort by date desc
      setSyncedSales(
        mapped.sort((a, b) => b.offline_created_at - a.offline_created_at)
      );
    } catch (e) {
      console.warn("Could not fetch synced sales from server", e);
      // Don't clear existing synced sales - keep them visible even if fetch fails
      // This allows synced sales to remain visible when backend is temporarily unavailable
    } finally {
      isLoadingSyncedSalesRef.current = false;
    }
  }, [selectedShiftId]);

  // Update available shift IDs from both sources
  const updateAvailableShiftIds = useCallback(async () => {
    const allLocalSales = await offlineSaleService.getOfflineSales();
    const ids = new Set(
      allLocalSales
        .map((s) => s.shift_id)
        .filter((id): id is number => typeof id === "number")
    );
    
    // Add IDs from synced sales
    syncedSales.forEach((s) => {
      if (s.shift_id) ids.add(s.shift_id);
    });

    if (shift?.id) ids.add(shift.id);
    const sortedIds = Array.from(ids).sort((a, b) => a - b);
    setAvailableShiftIds(sortedIds);
  }, [syncedSales, shift]);

  // Track previous online status and last load time to prevent loops
  const prevIsOnlineRef = useRef<boolean | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const lastShiftIdRef = useRef<number | null>(null);
  const LOAD_DEBOUNCE_MS = 5000; // Don't reload more than once every 5 seconds
  
  // Reload when shift or selectedShiftId changes (but not on every render)
  useEffect(() => {
    const currentShiftId = selectedShiftId || shift?.id || null;
    
    // Only reload if shift actually changed
    if (currentShiftId !== lastShiftIdRef.current) {
      lastShiftIdRef.current = currentShiftId;
      loadLocalPendingSales();
      loadSyncedSales();
      lastLoadTimeRef.current = Date.now();
    }
  }, [selectedShiftId, shift?.id]); // Removed function dependencies to prevent loops
  
  // Separate effect to handle coming back online (without causing loop)
  useEffect(() => {
    const wasOffline = prevIsOnlineRef.current === false;
    const isNowOnline = isOnline === true;
    const cameBackOnline = wasOffline && isNowOnline;
    
    if (cameBackOnline) {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      
      // Only reload if enough time has passed
      if (timeSinceLastLoad >= LOAD_DEBOUNCE_MS) {
        loadSyncedSales();
        lastLoadTimeRef.current = now;
      }
    }
    
    prevIsOnlineRef.current = isOnline;
  }, [isOnline]); // Only depends on isOnline, removed loadSyncedSales from deps

  // Update available shift IDs when sales change
  useEffect(() => {
    updateAvailableShiftIds();
  }, [localPendingSales, syncedSales, shift]);

  // ... (rest of methods)

  // Flag to track if the current sale state came from user interaction (needs save) vs init (no save)
  const shouldAutoSave = useRef(false);

  // Wrapper to update sale and enable auto-save
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateCurrentSale = (action: React.SetStateAction<OfflineSale>) => {
    shouldAutoSave.current = true;
    setCurrentSale(action);
  };

  // Auto-save current sale changes to local DB (Debounced)
  useEffect(() => {
    if (!shouldAutoSave.current) {
      return;
    }
    const timer = setTimeout(() => {
      if (currentSale) {
        // If it's a draft, save it
        // We trust 'shouldAutoSave' implies user intent
        offlineSaleService.saveDraft(currentSale);
        loadLocalPendingSales();
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [currentSale]);

  // Ref for header to control focus
  const headerRef = useRef<{ focusSearch: () => void }>(null);

  const handleCompleteSale = async () => {
    try {
      // currentSale already has payments attached via the SummaryColumn
      await offlineSaleService.completeSale(currentSale);
      toast.success("Sale completed and synced!");

      // Removed Thermal Invoice Dialog logic as per user request
    } catch (error: any) {
      console.error("Payment sync error:", error);
      const msg =
        error?.response?.data?.message || error?.message || "Unknown error";
      toast.warning(`Saved offline. Sync failed: ${msg}`);
    }

    // Reload sales lists
    await loadLocalPendingSales();
    await loadSyncedSales();

    // Reset
    if (shift && shift.is_open) {
      const newDraft = offlineSaleService.createDraftSale(shift.id);
      // await offlineSaleService.saveDraft(newDraft); // DONT SAVE IMMEDIATELY
      setCurrentSale(newDraft);
      shouldAutoSave.current = false; // Prevent auto-save until user edits

      // Focus search input for next sale
      setTimeout(() => {
        headerRef.current?.focusSearch();
      }, 100);
    } else {
      // If shift closed/not available, just clear UI
      const newDraft = offlineSaleService.createDraftSale(null);
      setCurrentSale(newDraft);
      shouldAutoSave.current = false;
    }
  };

  // Select sale from history
  const handleSelectPendingSale = async (sale: OfflineSale) => {
    // Always refresh product data from IndexedDB to get current stock for all sales
    if (sale.items.length > 0) {
      try {
        const allLocalProducts = await offlineSaleService.searchProducts("");
        const productMap = new Map(allLocalProducts.map(p => [p.id, p]));
        
        // Update sale items with fresh product data
        const updatedItems = sale.items.map((item) => {
          const freshProduct = productMap.get(item.product_id);
          if (freshProduct) {
            return {
              ...item,
              product: freshProduct,
            };
          }
          // If product not found in IndexedDB, try to use existing product data
          return item;
        });
        
        setCurrentSale({
          ...sale,
          items: updatedItems,
        });
      } catch (error) {
        console.error("Error refreshing product data for sale:", error);
        // Fallback to original sale if refresh fails
        setCurrentSale(sale);
      }
    } else {
      setCurrentSale(sale);
    }
  };

  // Create new sale
  const handleNewSale = useCallback(async () => {
    let currentShift = shift;
    
    // Refresh shift state if online and shift is null/stale
    if (isOnline && (!currentShift || !currentShift.id)) {
      try {
        const response = await apiClient.get("/shifts/current");
        if (response.status === 200) {
          const shiftData = response.data.data || response.data;
          const normalizedShift = {
            ...shiftData,
            is_open: shiftData.is_open === true || shiftData.is_open === "true" || shiftData.is_open === 1,
          };
          setShift(normalizedShift);
          localStorage.setItem("current_pos_shift", JSON.stringify(normalizedShift));
          if (!selectedShiftId && normalizedShift?.id) {
            setSelectedShiftId(normalizedShift.id);
          }
          // Use the refreshed shift for validation
          currentShift = normalizedShift;
        }
      } catch (error: any) {
        // If refresh fails, continue with existing shift check
        console.error("Failed to refresh shift:", error);
      }
    }

    // More robust check for shift.is_open (handle boolean, string, or undefined)
    const isShiftOpen = currentShift?.is_open === true || (typeof currentShift?.is_open === "string" && currentShift.is_open === "true") || (typeof currentShift?.is_open === "number" && currentShift.is_open === 1);
    
    if (!currentShift || !isShiftOpen) {
      console.log("Cannot create sale - Shift state:", currentShift);
      toast.error("يجب فتح الوردية أولاً لإنشاء عملية بيع جديدة");
      return;
    }
    
    if (!currentShift.id) {
      console.log("Cannot create sale - Shift ID missing:", currentShift);
      toast.error("خطأ: معرف الوردية غير موجود");
      return;
    }
    
    const newSale = offlineSaleService.createDraftSale(currentShift.id);
    await offlineSaleService.saveDraft(newSale);
    setCurrentSale(newSale);
    // List refresh handled by useEffect or we can force it here
    await loadLocalPendingSales();

    // Focus search input
    setTimeout(() => {
      headerRef.current?.focusSearch();
    }, 100);
  }, [shift, loadLocalPendingSales, isOnline, selectedShiftId]);

  // --- Adapters ---

  const cartItems: CartItem[] = useMemo(() => {
    return currentSale.items.map((item) => {
      const product = item.product as Product | undefined;
      const availableBatches = product?.available_batches || [];
      
      return {
        product: product || ({} as Product), // Fallback to empty object if undefined
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        total: Number(item.unit_price) * item.quantity,
        unitType: (item as any).unitType || "sellable", // Default to sellable if not set
        selectedBatchId: item.purchase_item_id,
        // We'd ideally store these in OfflineSaleItem to persist display,
        // but for now we try to find them in product.available_batches or fallback
        selectedBatchNumber: availableBatches.find(
          (b) => b.id === item.purchase_item_id
        )?.batch_number,
        selectedBatchExpiryDate: availableBatches.find(
          (b) => b.id === item.purchase_item_id
        )?.expiry_date,
      };
    });
  }, [currentSale.items]);

  // Delete pending sale
  const handleDeletePendingSale = async (sale: OfflineSale) => {
    if (sale.is_synced) {
      toast.error("لا يمكن حذف عملية بيع تمت مزامنتها");
      return;
    }
    if (!confirm("Are you sure you want to delete this pending sale?")) return;

    await offlineSaleService.deletePendingSale(sale.tempId);

    // If the deleted sale is the current one, switch to a new draft
    if (currentSale.tempId === sale.tempId) {
      if (shift && shift.is_open) {
        handleNewSale();
      } else {
        // Fallback: clear to empty draft in memory without saving
        const newDraft = offlineSaleService.createDraftSale(null);
        setCurrentSale(newDraft);
        await loadLocalPendingSales();
      }
    } else {
      await loadLocalPendingSales();
    }
  };

  const isPendingSaleSelected = useMemo(() => {
    return (
      localPendingSales.some((s) => s.tempId === currentSale.tempId) ||
      syncedSales.some((s) => s.tempId === currentSale.tempId)
    );
  }, [localPendingSales, syncedSales, currentSale.tempId]);

  // Handle Plus Key Action
  const handlePlusAction = useCallback(() => {
    if (!isPendingSaleSelected) {
      handleNewSale();
    } else {
      if (
        Number(currentSale.total_amount) > 0 &&
        currentSale.status !== "completed"
      ) {
        setIsPaymentDialogOpen(true);
      }
    }
  }, [isPendingSaleSelected, currentSale, handleNewSale]);

  // Global Key Listener for Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore inputs (Header input handles its own +)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // + key: Payment dialog
      if (e.key === "+") {
        e.preventDefault();
        handlePlusAction();
      }
      
      // Ctrl/Cmd + N: New sale
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleNewSale();
      }
      
      // Ctrl/Cmd + S: Save draft (auto-save already handles this, but we can show a toast)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (currentSale.items.length > 0) {
          offlineSaleService.saveDraft(currentSale);
          toast.success("تم حفظ المسودة");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handlePlusAction, handleNewSale, currentSale]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 80px)",
      }}
    >
      {/* TOP HEADER */}
      <PosOfflineHeader
        ref={headerRef}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onTriggerSync={triggerSync}
        shift={shift}
        shiftLoading={shiftLoading}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        selectedShiftId={selectedShiftId}
        availableShiftIds={availableShiftIds}
        onShiftSelect={setSelectedShiftId}
        products={products}
        onAddToCart={(product) => addToCart(product, "sellable")}
        onNewSale={handleNewSale}
        isSaleSelected={isPendingSaleSelected}
        onPaymentShortcut={handlePlusAction}
        onPrintShiftReport={() => setIsShiftReportOpen(true)}
      />

      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          p: 2,
          gap: 2,
        }}
      >
        {/* LEFT: PENDING SALES COLUMN */}
        <Paper
          elevation={0}
          sx={{
            width: 90,
            flexShrink: 0,
            bgcolor: "white",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Toggle Header */}
          <Box
            sx={{
              p: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Tooltip
              title={
                isSyncedView ? "عرض المبيعات المعلقة" : "عرض المبيعات المتزامنة"
              }
            >
              <IconButton
                onClick={() => setIsSyncedView(!isSyncedView)}
                size="small"
                sx={{
                  width: "100%",
                  borderRadius: 1,
                  bgcolor: isSyncedView ? "#ecfdf5" : "#fffbeb",
                  color: isSyncedView ? "#059669" : "#d97706",
                  border: "1px solid",
                  borderColor: isSyncedView ? "#a7f3d0" : "#fde68a",
                  "&:hover": {
                    bgcolor: isSyncedView ? "#d1fae5" : "#fef3c7",
                  },
                }}
              >
                {isSyncedView ? <Cloud size={18} /> : <Clock size={18} />}
              </IconButton>
            </Tooltip>
          </Box>

          <PendingSalesColumn
            sales={isSyncedView ? syncedSales : localPendingSales}
            selectedSaleId={currentSale.tempId}
            onSaleSelect={handleSelectPendingSale}
            onDelete={handleDeletePendingSale}
            title={isSyncedView ? "SYNCED" : "PENDING"}
            isOffline={!isOnline && isSyncedView}
          />
        </Paper>

        {/* MIDDLE: MAIN TABLE AREA */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            bgcolor: "white",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            p: 2,
          }}
        >
          <CurrentSaleItemsColumn
            currentSaleItems={cartItems}
            onUpdateQuantity={async (id, qty) => updateQuantity(id, qty)}
            onUpdateUnitPrice={async (id, price) => updateUnitPrice(id, price)}
            onRemoveItem={async (id) => removeItem(id)}
            onUpdateBatch={async (id, batchId, num, expiry, price) =>
              updateBatch(id, batchId, num, expiry, price)
            }
            onSwitchUnitType={async (id, unitType) =>
              switchUnitType(id, unitType)
            }
            readOnly={!!currentSale.is_synced}
          />
        </Paper>

        {/* RIGHT: SUMMARY PANEL */}
        {isPendingSaleSelected && (
          <Paper
            elevation={0}
            sx={{
              width: 400,
              flexShrink: 0,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <OfflineSaleSummaryColumn
              currentSale={currentSale}
              currentSaleItems={cartItems}
              onUpdateSale={(updated) => updateCurrentSale(updated)}
              onCompleteSale={handleCompleteSale}
              isPaymentDialogOpen={isPaymentDialogOpen}
              onPaymentDialogOpenChange={setIsPaymentDialogOpen}
              clients={clients}
              onClientAdded={async (client) => {
                // Optimistic/Local update for speed
                await dbService.saveClients([client]);
                setClients((prev) => {
                  const exists = prev.find((c) => c.id === client.id);
                  if (exists)
                    return prev.map((c) => (c.id === client.id ? client : c));
                  return [...prev, client];
                });
              }}
            />
          </Paper>
        )}
      </Box>

      {/* Shift Report Dialog */}
      <Dialog
        open={isShiftReportOpen}
        onClose={() => setIsShiftReportOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: { width: "800px", maxWidth: "90vw", height: "90vh", m: 2 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          تقرير الوردية
          <IconButton onClick={() => setIsShiftReportOpen(false)}>
            <X size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: "100%", p: 0, overflow: "hidden" }}>
          <PDFViewer width="100%" height="100%" showToolbar={true}>
            <PosShiftReportPdf
              sales={[...localPendingSales, ...syncedSales]}
              shift={
                shift && shift.id === selectedShiftId
                  ? shift
                  : {
                      id: selectedShiftId || 0,
                      opened_at: null,
                      closed_at: null,
                      is_open: false,
                    }
              }
              userName="الكاشير"
            />
          </PDFViewer>
        </DialogContent>
      </Dialog>

    </Box>
  );
};

export default PosPageOffline;
