import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Cloud, Clock, X } from "lucide-react";
import apiClient from "@/lib/axios";
import { PDFViewer } from "@react-pdf/renderer";
import { useAuth } from "@/context/AuthContext";
import { usePosFilters } from "@/context/PosFilterContext";
import { useSettings } from "@/context/SettingsContext";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { offlineSaleService } from "../services/offlineSaleService";
import saleService from "../services/saleService";
import { dbService, OfflineSale, OfflineSaleItem } from "../services/db";
import { Product } from "../services/productService";
import { CurrentSaleItemsColumn } from "../components/pos/CurrentSaleItemsColumn";
import { CartItem } from "../components/pos/types";
import { PendingSalesColumn } from "../components/pos/PendingSalesColumn";
import { toast } from "sonner";
import { OfflineSaleSummaryColumn } from "../components/pos/OfflineSaleSummaryColumn";
import { PosOfflineHeader } from "../components/pos/PosOfflineHeader";
import { PosShiftReportPdf } from "../components/pos/PosShiftReportPdf";
import { CalculatorSummaryDialog } from "../components/pos/CalculatorSummaryDialog";
import settingService from "@/services/settingService";

export const PosPageOffline = () => {
  const { user } = useAuth();
  const { isOnline, isSyncing, triggerSync, lastSyncedProducts } =
    useOfflineSync();
  const { getSetting, isLoadingSettings } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";
  // console.log(settingService.getSettings(),'settingsservice')
  // Date state for days mode (initialize early, before shift state)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Use local time instead of UTC (which toISOString uses)
    // This prevents date shifts when the user is in a timezone ahead of UTC (like +04:00) during late hours
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Shift state - initialize to null in days mode
  const [shift, setShift] = useState<{
    id: number;
    opened_at: string | null;
    closed_at: string | null;
    is_open: boolean;
  } | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [availableShiftIds, setAvailableShiftIds] = useState<number[]>([]);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  useEffect(() => {
    // Skip shift fetching in days mode or if settings are still loading
    if (isLoadingSettings || posMode === "days") {
      return;
    }

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
              is_open:
                parsed.is_open === true ||
                parsed.is_open === "true" ||
                parsed.is_open === 1,
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
            is_open:
              shiftData.is_open === true ||
              shiftData.is_open === "true" ||
              shiftData.is_open === 1,
          };
          setShift(normalizedShift);
          localStorage.setItem(
            "current_pos_shift",
            JSON.stringify(normalizedShift)
          );
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
  }, [isOnline, posMode, isLoadingSettings]); // Run on mount and when isOnline, posMode or isLoadingSettings changes

  // State for tracking client update loading
  const [isUpdatingClient, setIsUpdatingClient] = useState(false);

  // Clear selectedShiftId when switching to days mode and reset tracking refs
  useEffect(() => {
    if (posMode === "days") {
      setSelectedShiftId(null);
      // Reset shift tracking ref to prevent reload triggers
      lastShiftIdRef.current = null;
    } else {
      // Reset date tracking ref when switching to shift mode
      lastSelectedDateRef.current = null;
    }
  }, [posMode]);

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
      localStorage.setItem(
        "current_pos_shift",
        JSON.stringify(normalizedShift)
      );

      // Automatically select the newly opened shift
      if (normalizedShift?.id) {
        setSelectedShiftId(normalizedShift.id);
      }

      // Delete all pending (unsynced) sales when opening a new shift
      try {
        await offlineSaleService.deleteAllPendingSales();
        // Reload pending sales list to update the UI
        await loadLocalPendingSales();
      } catch (deleteError) {
        console.error("Failed to delete pending sales:", deleteError);
        // Don't fail the shift opening if deletion fails, just log it
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
      localStorage.setItem(
        "current_pos_shift",
        JSON.stringify(normalizedShift)
      );
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
    offlineSaleService.createDraftSale(null, user?.id ?? null)
  );
  // MOVED TO HEADER: inputValue, autocompleteOpen, inputRef

  // Dialog State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSyncedView, setIsSyncedView] = useState(true);
  const [isShiftReportOpen, setIsShiftReportOpen] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Load Products and Clients on Mount & Auto-update
  useEffect(() => {
    if (isLoadingSettings) return;

    const loadAndSync = async () => {
      setIsPageLoading(true);
      try {
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
      } finally {
        setIsPageLoading(false);
      }
    };

    loadAndSync();
  }, [isOnline, user?.warehouse_id, isLoadingSettings]);

  // Reload pending sales list and refresh products when sync finishes
  useEffect(() => {
    if (!isSyncing) {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;

      // Only reload synced sales if enough time has passed since last load
      if (timeSinceLastLoad >= LOAD_DEBOUNCE_MS && !isLoadingSettings) {
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

  const addToCart = useCallback(
    (product: Product, unitType: "stocking" | "sellable" = "sellable") => {
      if (currentSale.is_synced) {
        toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
        return;
      }

      // Skip shift validation in days mode
      if (posMode === "shift") {
        // More robust check for shift.is_open
        const isShiftOpen =
          shift?.is_open === true ||
          (typeof shift?.is_open === "string" && shift.is_open === "true") ||
          (typeof shift?.is_open === "number" && shift.is_open === 1);
        if (!shift || !isShiftOpen) {
          toast.error("يجب فتح الوردية قبل إضافة منتجات");
          return;
        }
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
                  current_stock_quantity: Math.max(
                    0,
                    currentStock - newQtyInSellable
                  ),
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
            current_stock_quantity: Math.max(
              0,
              currentStock - quantityToDeduct
            ),
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
                  current_stock_quantity: Math.max(
                    0,
                    currentStock - quantityToDeduct
                  ),
                };
              }
              return p;
            });
          });
        }

        return offlineSaleService.calculateTotals({ ...prev, items: newItems });
      });
    },
    [currentSale.is_synced, shift, posMode]
  );

  const updateQuantity = (productId: number, qty: number) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }

    // Find the current item to get old quantity
    const currentItem = currentSale.items.find(
      (i) => i.product_id === productId
    );
    if (!currentItem) return;

    const product = currentItem.product as Product;
    const unitType = (currentItem as any).unitType || "sellable";
    const unitsPerStocking = product?.units_per_stocking_unit || 1;
    const currentStock = Number(
      product?.current_stock_quantity ?? product?.stock_quantity ?? 0
    );

    // Calculate quantity difference in sellable units
    const oldQuantity = currentItem.quantity;
    const oldQuantityInSellable =
      unitType === "stocking" ? oldQuantity * unitsPerStocking : oldQuantity;
    const newQuantityInSellable =
      unitType === "stocking" ? qty * unitsPerStocking : qty;
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
    const itemToRemove = currentSale.items.find(
      (i) => i.product_id === productId
    );
    let quantityToRestore = 0;

    if (itemToRemove) {
      const product = itemToRemove.product as Product;
      const unitType = (itemToRemove as any).unitType || "sellable";
      const unitsPerStocking = product?.units_per_stocking_unit || 1;

      // Calculate quantity to restore in sellable units
      quantityToRestore =
        unitType === "stocking"
          ? itemToRemove.quantity * unitsPerStocking
          : itemToRemove.quantity;
    }

    let shouldDeleteSale = false;
    let saleTempId: string | null = null;

    updateCurrentSale((prev) => {
      const newItems = prev.items.filter((i) => i.product_id !== productId);
      const updatedSale = offlineSaleService.calculateTotals({
        ...prev,
        items: newItems,
      });

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
        if (posMode === "days") {
          const newDraft = offlineSaleService.createDraftSale(null, user?.id ?? null);
          setCurrentSale(newDraft);
          shouldAutoSave.current = false;
        } else if (shift && shift.is_open) {
          const newDraft = offlineSaleService.createDraftSale(shift.id, user?.id ?? null);
          setCurrentSale(newDraft);
          shouldAutoSave.current = false;
        } else {
          const newDraft = offlineSaleService.createDraftSale(null, user?.id ?? null);
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

  // Loading states for filters
  const [isLoadingId, setIsLoadingId] = useState(false);
  const [isLoadingDate, setIsLoadingDate] = useState(false);

  // Filter state from context
  const { filterDate, filterSaleId, setFilterSaleId, registerFetchFunctions } =
    usePosFilters();

  // Helper function to map backend Sale to OfflineSale format
  const mapSaleToOfflineSale = useCallback(
    async (s: any): Promise<OfflineSale> => {
      // Get current product data from IndexedDB to enrich with live stock
      const allLocalProducts = await offlineSaleService.searchProducts("");
      const productMap = new Map(allLocalProducts.map((p) => [p.id, p]));

      return {
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
        is_returned: Boolean(s.is_returned),
        discount_amount: s.discount_amount
          ? Number(s.discount_amount)
          : undefined,
        discount_type: s.discount_type || undefined,
        items:
          s.items?.map((i: any) => {
            // Try to get current product data from IndexedDB for live stock info
            const currentProduct = productMap.get(i.product_id);

            return {
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: Number(i.unit_price),
              product: currentProduct ||
                i.product || {
                  id: i.product_id,
                  name: i.product_name || "Unknown Product",
                  sku: i.product_sku || "",
                  stock_quantity: 0,
                  available_batches: [],
                },
              product_name:
                currentProduct?.name || i.product?.name || i.product_name,
              purchase_item_id: i.purchase_item_id,
            };
          }) || [],
        payments: s.payments || [],
        notes: s.notes,
        created_at: s.created_at,
        user_id: s.user_id,
      };
    },
    []
  );

  // Select sale from history (will be used in fetchSaleById)
  const handleSelectPendingSale = useCallback(async (sale: OfflineSale) => {
    console.log(
      "[Discount] handleSelectPendingSale: loading sale with discount:",
      {
        discount_amount: sale.discount_amount,
        discount_type: sale.discount_type,
        tempId: sale.tempId,
      }
    );
    // Always refresh product data from IndexedDB to get current stock for all sales
    if (sale.items.length > 0) {
      try {
        const allLocalProducts = await offlineSaleService.searchProducts("");
        const productMap = new Map(allLocalProducts.map((p) => [p.id, p]));

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

        const updatedSale = {
          ...sale,
          items: updatedItems,
          // Explicitly preserve discount fields
          discount_amount: sale.discount_amount,
          discount_type: sale.discount_type,
        };

        console.log(
          "[Discount] handleSelectPendingSale: setting sale with discount:",
          {
            discount_amount: updatedSale.discount_amount,
            discount_type: updatedSale.discount_type,
          }
        );

        setCurrentSale(updatedSale);
      } catch (error) {
        console.error("Error refreshing product data for sale:", error);
        // Fallback to original sale if refresh fails
        setCurrentSale(sale);
      }
    } else {
      setCurrentSale(sale);
    }
  }, []);

  // Fetch sale by ID from backend
  const fetchSaleById = useCallback(
    async (id: number) => {
      try {
        const sale = await saleService.getSale(id);
        const offlineSale = await mapSaleToOfflineSale(sale);

        // Add to synced sales if not already there
        setSyncedSales((prev) => {
          const exists = prev.find((s) => s.id === offlineSale.id);
          if (exists) {
            return prev;
          }
          return [offlineSale, ...prev].sort(
            (a, b) => b.offline_created_at - a.offline_created_at
          );
        });

        // Select the fetched sale
        await handleSelectPendingSale(offlineSale);

        // Clear the ID input
        setFilterSaleId("");

        toast.success(`تم العثور على عملية البيع #${id}`);
      } catch (error: any) {
        console.error("Error fetching sale by ID:", error);
        const errorMsg =
          error?.response?.data?.message ||
          error?.message ||
          "فشل جلب عملية البيع";
        toast.error(errorMsg);
      }
    },
    [mapSaleToOfflineSale, setFilterSaleId, handleSelectPendingSale]
  );

  // Calculate expected sale number for new drafts
  const expectedSaleNumber = useMemo(() => {
    if (syncedSales.length === 0) return 1;
    const maxOrderNum = Math.max(
      ...syncedSales.map((s) => s.sale_order_number || 0)
    );
    return maxOrderNum + 1;
  }, [syncedSales]);

  // Fetch sales by date from backend
  const fetchSalesByDate = useCallback(
    async (date: string) => {
      setIsLoadingDate(true);
      try {
        // Fetch sales for the selected date
        const response = await saleService.getSales(
          1,
          `start_date=${date}&end_date=${date}`,
          "",
          date,
          date,
          1000 // Large limit to get all sales for the day
        );

        const serverSalesData = response.data || [];

        // Map all sales to OfflineSale format
        const mappedSales = await Promise.all(
          serverSalesData.map((s: any) => mapSaleToOfflineSale(s))
        );

        // Update synced sales with fetched data
        setSyncedSales(
          mappedSales.sort(
            (a, b) => b.offline_created_at - a.offline_created_at
          )
        );

        toast.success(`تم جلب ${mappedSales.length} عملية بيع للتاريخ ${date}`);
      } catch (error: any) {
        console.error("Error fetching sales by date:", error);
        const errorMsg =
          error?.response?.data?.message ||
          error?.message ||
          "فشل جلب المبيعات";
        toast.error(errorMsg);
      } finally {
        setIsLoadingDate(false);
      }
    },
    [mapSaleToOfflineSale]
  );

  // Register fetch functions with context
  useEffect(() => {
    registerFetchFunctions(
      fetchSaleById,
      fetchSalesByDate,
      isLoadingId,
      isLoadingDate
    );
  }, [
    fetchSaleById,
    fetchSalesByDate,
    isLoadingId,
    isLoadingDate,
    registerFetchFunctions,
  ]);

  // Reload normal sales when date filter is cleared (shift mode only)
  useEffect(() => {
    if (posMode === "shift" && !filterDate && selectedShiftId) {
      // Date filter was cleared, reload normal sales for the shift
      loadSyncedSales();
    }
  }, [filterDate, selectedShiftId, posMode]); // Note: loadSyncedSales is intentionally not in deps to avoid loops

  // Load local pending (unsynced) sales from IndexedDB
  const loadLocalPendingSales = useCallback(async () => {
    const sales = await offlineSaleService.getOfflineSales();

    // Filter only unsynced sales
    const unsyncedSales = sales.filter((s) => !s.is_synced);

    // Filter by mode
    let filteredSales = unsyncedSales;
    if (posMode === "days") {
      // Filter by date in days mode
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(selectedDate);
      selectedDateEnd.setHours(23, 59, 59, 999);

      filteredSales = unsyncedSales.filter((s) => {
        const saleDate = new Date(s.offline_created_at);
        return saleDate >= selectedDateStart && saleDate <= selectedDateEnd;
      });
    } else {
      // Filter by selected shift ID in shift mode
      if (selectedShiftId) {
        filteredSales = unsyncedSales.filter(
          (s) => s.shift_id && Number(s.shift_id) === Number(selectedShiftId)
        );
      }
    }

    // Sort by date desc
    setLocalPendingSales(
      filteredSales.sort((a, b) => b.offline_created_at - a.offline_created_at)
    );
  }, [selectedShiftId, posMode, selectedDate]);

  // Track if loadSyncedSales is currently running to prevent concurrent calls
  const isLoadingSyncedSalesRef = useRef(false);
  const lastSyncedSalesLoadRef = useRef<number>(0);
  const MIN_TIME_BETWEEN_LOADS = 3000; // Minimum 3 seconds between loads

  // Load synced sales from server API (always fetch fresh)
  const loadSyncedSales = useCallback(async () => {
    if (isLoadingSettings) {
      console.log("[loadSyncedSales] Settings still loading, skipping");
      return;
    }

    // In days mode, require selectedDate; in shift mode, require selectedShiftId
    console.log("[loadSyncedSales] Called with:", {
      posMode,
      selectedDate,
      selectedShiftId,
      timestamp: new Date().toISOString(),
    });

    if (posMode === "days") {
      // In days mode, ensure selectedShiftId is cleared and selectedDate is set
      if (selectedShiftId !== null) {
        // State is inconsistent - wait for cleanup to complete
        console.warn(
          "[loadSyncedSales] Days mode but selectedShiftId is not null, skipping"
        );
        return;
      }
      if (!selectedDate) {
        console.warn(
          "[loadSyncedSales] Days mode but no selectedDate, clearing sales"
        );
        setSyncedSales([]);
        return;
      }
      console.log(
        "[loadSyncedSales] Days mode: fetching sales for date",
        selectedDate
      );
    } else {
      // In shift mode, ensure selectedShiftId is set
      if (!selectedShiftId) {
        console.warn(
          "[loadSyncedSales] Shift mode but no selectedShiftId, clearing sales"
        );
        setSyncedSales([]);
        return;
      }
      console.log(
        "[loadSyncedSales] Shift mode: fetching sales for shift",
        selectedShiftId
      );
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
      let apiUrl = "";
      if (posMode === "days") {
        // Use date-based query in days mode
        apiUrl = `/sales?start_date=${selectedDate}&end_date=${selectedDate}&per_page=100`;
      } else {
        // Use shift_id query in shift mode
        apiUrl = `/sales?shift_id=${selectedShiftId}&per_page=100`;
      }

      const res = await apiClient.get(apiUrl);
      const serverSalesData = res.data.data || [];

      // Get current product data from IndexedDB to enrich with live stock
      const allLocalProducts = await offlineSaleService.searchProducts("");
      const productMap = new Map(allLocalProducts.map((p) => [p.id, p]));

      const mapped: OfflineSale[] = serverSalesData.map((s: any) => ({
        tempId: `server_${s.id}`,
        id: s.id,
        offline_created_at: new Date(s.created_at).getTime(),
        is_synced: true,
        shift_id: s.shift_id ? Number(s.shift_id) : null,
        sale_date: s.sale_date,
        total_amount: Number(s.total_amount),
        paid_amount: Number(s.paid_amount),
        payments:
          s.payments?.map((p: any) => ({
            id: p.id,
            amount: Number(p.amount),
            payment_method: p.payment_method,
            payment_date: p.payment_date,
            user_id: p.user_id,
            user: p.user,
          })) || [],
        client_id: s.client_id,
        client_name: s.client_name,
        invoice_number: s.invoice_number,
        sale_order_number: s.sale_order_number,
        status: "completed",
        is_returned: Boolean(s.is_returned),
        discount_amount: s.discount_amount
          ? Number(s.discount_amount)
          : undefined,
        discount_type: s.discount_type || undefined,
        items:
          s.items?.map((i: any) => {
            // Try to get current product data from IndexedDB for live stock info
            const currentProduct = productMap.get(i.product_id);

            return {
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: Number(i.unit_price),
              product: currentProduct ||
                i.product || {
                  id: i.product_id,
                  name: i.product_name || "Unknown Product",
                  sku: i.product_sku || "",
                  stock_quantity: 0,
                  available_batches: [],
                },
              product_name:
                currentProduct?.name || i.product?.name || i.product_name,
              purchase_item_id: i.purchase_item_id,
            };
          }) || [],
        notes: s.notes,
        created_at: s.created_at,
        user_id: s.user_id,
      }));

      // Sort by date desc
      setSyncedSales(
        mapped.sort((a, b) => b.offline_created_at - a.offline_created_at)
      );
    } catch (error: any) {
      console.error("[loadSyncedSales] Failed to load synced sales:", error);
      // Don't clear existing synced sales - keep them visible even if fetch fails
      // This allows synced sales to remain visible when backend is temporarily unavailable
      lastSyncedSalesLoadRef.current = Date.now();
    } finally {
      isLoadingSyncedSalesRef.current = false;
    }
  }, [posMode, selectedDate, selectedShiftId, isLoadingSettings]);

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
  const lastSelectedDateRef = useRef<string | null>(null);
  const LOAD_DEBOUNCE_MS = 5000; // Don't reload more than once every 5 seconds

  // Reload when shift/selectedShiftId changes (shift mode) or selectedDate changes (days mode)
  useEffect(() => {
    if (isLoadingSettings) return;

    // Wait a tick to ensure mode state is fully initialized
    const timer = setTimeout(() => {
      if (posMode === "days") {
        // In days mode, reload when selectedDate changes
        if (selectedDate !== lastSelectedDateRef.current) {
          console.log("[Days Mode] Reloading sales for date:", selectedDate);
          lastSelectedDateRef.current = selectedDate;
          loadLocalPendingSales();
          loadSyncedSales();
          lastLoadTimeRef.current = Date.now();
        }
      } else {
        // In shift mode, reload when shift changes
        const currentShiftId = selectedShiftId || shift?.id || null;

        // Only reload if shift actually changed
        if (currentShiftId !== lastShiftIdRef.current) {
          console.log(
            "[Shift Mode] Reloading sales for shift:",
            currentShiftId
          );
          lastShiftIdRef.current = currentShiftId;
          loadLocalPendingSales();
          loadSyncedSales();
          lastLoadTimeRef.current = Date.now();
        }
      }
    }, 100); // Small delay to ensure state is settled

    return () => clearTimeout(timer);
  }, [selectedShiftId, shift?.id, posMode, selectedDate, isLoadingSettings]); // Added isLoadingSettings to deps

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

    // If action is a function, we need to get the current sale first
    if (typeof action === "function") {
      setCurrentSale((prev) => {
        const updated = action(prev);
        console.log("[Discount] updateCurrentSale (function):", {
          discount_amount: updated.discount_amount,
          discount_type: updated.discount_type,
        });
        return updated;
      });
    } else {
      console.log("[Discount] updateCurrentSale (object):", {
        discount_amount: action.discount_amount,
        discount_type: action.discount_type,
      });
      setCurrentSale(action);
    }
  };

  // Handler for sale updates that checks if client or payments changed on synced sale
  const handleSaleUpdate = async (updated: OfflineSale) => {
    const prevSale = currentSale;

    // Check if this is a synced sale
    const isSynced = updated.is_synced && updated.id;
    const clientChanged = prevSale.client_id !== updated.client_id;
    
    // Check if payments changed by comparing lengths and amounts
    const prevPayments = prevSale.payments || [];
    const updatedPayments = updated.payments || [];
    const paymentsChanged = 
      prevPayments.length !== updatedPayments.length ||
      prevPayments.some((p, idx) => {
        const updatedP = updatedPayments[idx];
        return !updatedP || 
          Number(p.amount) !== Number(updatedP.amount) ||
          p.method !== updatedP.method;
      });

    if (isSynced && isOnline) {
      // Handle client update
      if (clientChanged) {
        setIsUpdatingClient(true);
        try {
          // Update backend immediately
          await apiClient.put(`/sales/${updated.id}`, {
            client_id: updated.client_id,
          });

          // Update local sale
          updateCurrentSale(updated);

          // Refresh synced sales to get updated data
          await loadSyncedSales();
        } catch (error) {
          console.error("Failed to update client:", error);
          toast.error("فشل تحديث العميل");
        } finally {
          setIsUpdatingClient(false);
        }
        return;
      }

      // Handle payment updates
      if (paymentsChanged) {
        try {
          // Find new payments (those without IDs or not in previous payments)
          const prevPaymentIds = new Set(
            prevPayments.map((p: any) => p.id).filter(Boolean)
          );
          
          // Add new payments that don't have IDs (newly added)
          for (const payment of updatedPayments) {
            const paymentId = (payment as any).id;
            // If payment doesn't have an ID, it's a new payment that needs to be synced
            if (!paymentId || !prevPaymentIds.has(paymentId)) {
              // Only sync if it doesn't have an ID (truly new)
              // If it has an ID but wasn't in prev, it might be from a refresh, skip
              if (!paymentId) {
                await saleService.addPayment(updated.id!, {
                  method: payment.method,
                  amount: Number(payment.amount),
                  reference_number: (payment as any).reference_number || null,
                  notes: (payment as any).notes || null,
                });
              }
            }
          }

          // Delete payments that were removed (compare by index/amount)
          // This is a simplified approach - in production you might want more robust comparison
          if (updatedPayments.length < prevPayments.length) {
            // Get current payments from backend to find which ones to delete
            try {
              const saleData = await saleService.getSale(updated.id!);
              const backendPayments = saleData.payments || [];
              
              // Find payments that exist in backend but not in updated payments
              for (const backendPayment of backendPayments) {
                const stillExists = updatedPayments.some(
                  (up: any) => up.id === backendPayment.id
                );
                if (!stillExists && backendPayment.id) {
                  await saleService.deletePayment(updated.id!, backendPayment.id);
                }
              }
            } catch (error) {
              console.error("Failed to sync payment deletions:", error);
            }
          }

          // Refresh synced sales to get updated data with payment IDs
          await loadSyncedSales();
          
          // If current sale is synced, refresh it from backend to get payment IDs
          if (updated.id) {
            try {
              const refreshedSale = await saleService.getSale(updated.id);
              const mappedSale = await mapSaleToOfflineSale(refreshedSale);
              updateCurrentSale(mappedSale);
            } catch (error) {
              console.error("Failed to refresh sale after payment sync:", error);
              // Fallback to local update
              updateCurrentSale(updated);
            }
          } else {
            updateCurrentSale(updated);
          }
          
          toast.success("تم تحديث المدفوعات بنجاح");
        } catch (error: any) {
          console.error("Failed to sync payments:", error);
          const errorMsg =
            error?.response?.data?.message ||
            error?.message ||
            "فشل تحديث المدفوعات";
          toast.error(errorMsg);
          // Still update local state even if sync fails
          updateCurrentSale(updated);
        }
        return;
      }

      // If no changes that need syncing, just update locally
      updateCurrentSale(updated);
    } else {
      // Regular local update for non-synced sales
      updateCurrentSale(updated);
    }
  };

  // Auto-save current sale changes to local DB (Debounced)
  useEffect(() => {
    if (!shouldAutoSave.current) {
      return;
    }
    const timer = setTimeout(() => {
      if (currentSale) {
        console.log("[Discount] Auto-save: saving sale with discount:", {
          discount_amount: currentSale.discount_amount,
          discount_type: currentSale.discount_type,
          tempId: currentSale.tempId,
        });
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
      // Check if this is a synced sale (already exists on backend)
      const isSynced = currentSale.is_synced && currentSale.id;

      if (isSynced) {
        // For synced sales, ensure all payments are synced
        // Payments should already be synced via handleSaleUpdate, but double-check
        const payments = currentSale.payments || [];
        
        // Ensure all payments without IDs are synced
        if (isOnline) {
          for (const payment of payments) {
            if (!(payment as any).id) {
              try {
                await saleService.addPayment(currentSale.id!, {
                  method: payment.method,
                  amount: Number(payment.amount),
                  reference_number: (payment as any).reference_number || null,
                  notes: (payment as any).notes || null,
                });
              } catch (error) {
                console.error("Failed to sync payment:", error);
              }
            }
          }
        }

        // Refresh synced sales to get latest data
        await loadSyncedSales();
        toast.success("تم تحديث عملية البيع بنجاح");
      } else {
        // For new sales, complete and sync as usual
        await offlineSaleService.completeSale(currentSale);
        toast.success("تم إتمام عملية البيع بنجاح");
      }

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
    if (posMode === "days") {
      // In days mode, create new draft without shift
      const newDraft = offlineSaleService.createDraftSale(null, user?.id ?? null);
      setCurrentSale(newDraft);
      shouldAutoSave.current = false;
      setTimeout(() => {
        headerRef.current?.focusSearch();
      }, 100);
    } else if (shift && shift.is_open) {
      // In shift mode, require shift
      const newDraft = offlineSaleService.createDraftSale(shift.id, user?.id ?? null);
      // await offlineSaleService.saveDraft(newDraft); // DONT SAVE IMMEDIATELY
      setCurrentSale(newDraft);
      shouldAutoSave.current = false; // Prevent auto-save until user edits

      // Focus search input for next sale
      setTimeout(() => {
        headerRef.current?.focusSearch();
      }, 100);
    } else {
      // If shift closed/not available, just clear UI
      const newDraft = offlineSaleService.createDraftSale(null, user?.id ?? null);
      setCurrentSale(newDraft);
      shouldAutoSave.current = false;
    }
  };

  // Create new sale
  const handleNewSale = useCallback(async () => {
    // In days mode, skip shift validation
    if (posMode === "days") {
      const newSale = offlineSaleService.createDraftSale(null, user?.id ?? null);
      await offlineSaleService.saveDraft(newSale);
      setCurrentSale(newSale);
      await loadLocalPendingSales();
      setTimeout(() => {
        headerRef.current?.focusSearch();
      }, 100);
      return;
    }

    // Shift mode: require shift
    let currentShift = shift;

    // Refresh shift state if online and shift is null/stale
    if (isOnline && (!currentShift || !currentShift.id)) {
      try {
        const response = await apiClient.get("/shifts/current");
        if (response.status === 200) {
          const shiftData = response.data.data || response.data;
          const normalizedShift = {
            ...shiftData,
            is_open:
              shiftData.is_open === true ||
              shiftData.is_open === "true" ||
              shiftData.is_open === 1,
          };
          setShift(normalizedShift);
          localStorage.setItem(
            "current_pos_shift",
            JSON.stringify(normalizedShift)
          );
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
    const isShiftOpen =
      currentShift?.is_open === true ||
      (typeof currentShift?.is_open === "string" &&
        currentShift.is_open === "true") ||
      (typeof currentShift?.is_open === "number" && currentShift.is_open === 1);

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

    const newSale = offlineSaleService.createDraftSale(currentShift.id, user?.id ?? null);
    await offlineSaleService.saveDraft(newSale);
    setCurrentSale(newSale);
    // List refresh handled by useEffect or we can force it here
    await loadLocalPendingSales();

    // Focus search input
    setTimeout(() => {
      headerRef.current?.focusSearch();
    }, 100);
  }, [shift, loadLocalPendingSales, isOnline, selectedShiftId, posMode]);

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
      if (posMode === "days") {
        // In days mode, create new draft without shift
        const newDraft = offlineSaleService.createDraftSale(null, user?.id ?? null);
        setCurrentSale(newDraft);
        await loadLocalPendingSales();
      } else if (shift && shift.is_open) {
        handleNewSale();
      } else {
        // Fallback: clear to empty draft in memory without saving
        const newDraft = offlineSaleService.createDraftSale(null, user?.id ?? null);
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
    // If no sale is selected OR current sale is empty (no items), create new sale
    const isCurrentSaleEmpty = currentSale.items.length === 0;

    if (!isPendingSaleSelected || isCurrentSaleEmpty) {
      handleNewSale();
    } else {
      // If a sale is selected and has items, open payment dialog
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

  if (isLoadingSettings) {
    return (
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>جاري تحميل الإعدادات...</Typography>
      </Box>
    );
  }

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
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        products={products}
        onAddToCart={(product) => addToCart(product, "sellable")}
        onNewSale={handleNewSale}
        isSaleSelected={isPendingSaleSelected}
        onPaymentShortcut={handlePlusAction}
        onPrintShiftReport={() => setIsShiftReportOpen(true)}
        onShowSummary={() => setIsSummaryDialogOpen(true)}
        isPageLoading={isPageLoading}
        posMode={posMode}
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
            onRefresh={isSyncedView ? loadSyncedSales : undefined}
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
              expectedSaleNumber={expectedSaleNumber}
              currentSaleItems={cartItems}
              onUpdateSale={handleSaleUpdate}
              onCompleteSale={handleCompleteSale}
              isPaymentDialogOpen={isPaymentDialogOpen}
              onPaymentDialogOpenChange={setIsPaymentDialogOpen}
              clients={clients}
              isUpdatingClient={isUpdatingClient}
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

      {/* Calculator Summary Dialog */}
      <CalculatorSummaryDialog
        open={isSummaryDialogOpen}
        onClose={() => setIsSummaryDialogOpen(false)}
        sales={syncedSales}
        periodTitle={
          posMode === "shift"
            ? `الوردية #${selectedShiftId || shift?.id || "-"}`
            : `يوم ${selectedDate}`
        }
        dateFrom={selectedDate}
      />
    </Box>
  );
};

export default PosPageOffline;
