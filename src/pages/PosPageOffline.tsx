import React, { useState, useEffect, useMemo, useRef } from "react";
import { Box, Paper } from "@mui/material";
import apiClient from "@/lib/axios";

// Use standard Tailwind classes via classNames if needed,
// using MUI for components as project seems heavy on MUI but request asked for "Elegant" which MUI can do with custom styling.
// We will use MUI sx props for "clean and elegant".

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

export const PosPageOffline = () => {
  const { isOnline, isSyncing, triggerSync } = useOfflineSync();

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
        // If offline, we can't fetch shift status from API.
        // We might want to keep it null or handle this gracefully.
        return;
      }
      try {
        setShiftLoading(true);
        const response = await apiClient.get("/shifts/current");
        if (response.status === 200) {
          const shiftData = response.data.data || response.data;
          setShift(shiftData);
          // Initialize selected shift ID
          if (!selectedShiftId && shiftData?.id) {
            setSelectedShiftId(shiftData.id);
          }
        } else {
          setShift(null);
        }
      } catch (error: any) {
        if (error?.response?.status === 204) {
          setShift(null);
        } else {
          console.error("Failed to load current shift:", error);
        }
      } finally {
        setShiftLoading(false);
      }
    };
    fetchShift();
  }, [isOnline]);

  const handleOpenShift = async () => {
    if (!isOnline) {
      toast.error("Cannot open shift while offline");
      return;
    }
    try {
      setShiftLoading(true);
      const response = await apiClient.post("/shifts/open");
      const newShift = response.data.data || response.data;
      setShift(newShift);

      // Automatically select the newly opened shift
      if (newShift?.id) {
        setSelectedShiftId(newShift.id);
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
    if (!isOnline) {
      toast.error("Cannot close shift while offline");
      return;
    }
    try {
      setShiftLoading(true);
      const response = await apiClient.post("/shifts/close");
      setShift(response.data.data || response.data);
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

  // Load Products and Clients on Mount
  useEffect(() => {
    const load = async () => {
      const res = await offlineSaleService.searchProducts("");
      // console.log(res,'res');
      setProducts(res);

      const clientsRes = await offlineSaleService.searchClients("");
      setClients(clientsRes);
    };
    load();
  }, []);

  // Initial check if we have products/clients, if not try to sync
  useEffect(() => {
    const checkInit = async () => {
      const res = await offlineSaleService.searchProducts("");
      const clientsRes = await offlineSaleService.searchClients("");

      if ((res.length === 0 || clientsRes.length === 0) && isOnline) {
        await offlineSaleService.initializeProducts();
        await offlineSaleService.initializeClients(); // Load clients too
        window.location.reload(); // Simple refresh to show products, or just reload data
      }
    };
    checkInit();
  }, [isOnline]);

  // Reload pending sales list when sync finishes (to show synced status)
  useEffect(() => {
    if (!isSyncing) {
      loadPendingSales();
    }
  }, [isSyncing]);

  // --- Actions ---

  // Helper function to get price based on unit type
  const getPriceForUnitType = (product: Product, unitType: 'stocking' | 'sellable' = 'sellable'): number => {
    const unitsPerStocking = product.units_per_stocking_unit || 1;
    
    if (unitType === 'stocking') {
      // Calculate price per stocking unit (box)
      const sellablePrice = Number(product.last_sale_price_per_sellable_unit || 0);
      if (sellablePrice === 0 && product.available_batches && product.available_batches.length > 0) {
        const batchPrice = Number(product.available_batches[0].sale_price || 0);
        return batchPrice * unitsPerStocking;
      }
      return sellablePrice * unitsPerStocking;
    } else {
      // Price per sellable unit (piece)
      let price = Number(product.last_sale_price_per_sellable_unit || 0);
      if (price === 0 && product.available_batches && product.available_batches.length > 0) {
        price = Number(product.available_batches[0].sale_price || 0);
      }
      return price;
    }
  };

  const addToCart = (product: Product, unitType: 'stocking' | 'sellable' = 'sellable') => {
    if (!shift || !shift.is_open) {
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
    if (unitType === 'stocking') {
      const availableStockingUnits = Math.floor(currentStock / unitsPerStocking);
      if (availableStockingUnits <= 0) {
        toast.error(`عذراً، لا يوجد مخزون كافٍ. المتاح: ${currentStock} ${product.sellable_unit_name || 'قطعة'}`);
        return;
      }
    }

    updateCurrentSale((prev) => {
      const existing = prev.items.find((i) => i.product_id === product.id);
      const price = getPriceForUnitType(product, unitType);

      let newItems;
      if (existing) {
        // If existing item has different unit type, convert quantity
        const existingUnitType = (existing as any).unitType || 'sellable';
        if (existingUnitType === unitType) {
          // Same unit type, just increment
          newItems = prev.items.map((i) =>
            i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          // Different unit type, convert and add
          const existingQtyInSellable = existingUnitType === 'stocking' 
            ? existing.quantity * unitsPerStocking 
            : existing.quantity;
          const newQtyInSellable = unitType === 'stocking' 
            ? unitsPerStocking 
            : 1;
          const totalSellableQty = existingQtyInSellable + newQtyInSellable;
          
          // Convert back to the new unit type
          const newQty = unitType === 'stocking' 
            ? Math.floor(totalSellableQty / unitsPerStocking)
            : totalSellableQty;
          
          newItems = prev.items.map((i) =>
            i.product_id === product.id 
              ? { ...i, quantity: newQty, unit_price: price, unitType: unitType } 
              : i
          );
        }
      } else {
        const newItem: OfflineSaleItem & { unitType?: 'stocking' | 'sellable' } = {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: price,
          product: product,
          id: undefined, // New item
          unitType: unitType,
        };
        newItems = [...prev.items, newItem];
      }

      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  const updateQuantity = (productId: number, qty: number) => {
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) => {
        if (i.product_id === productId) {
          const product = i.product as Product;
          const unitType = (i as any).unitType || 'sellable';
          const unitsPerStocking = product?.units_per_stocking_unit || 1;
          const currentStock = Number(product?.current_stock_quantity ?? product?.stock_quantity ?? 0);
          
          // Validate stock availability
          if (unitType === 'stocking') {
            const requiredSellableQty = qty * unitsPerStocking;
            if (requiredSellableQty > currentStock) {
              toast.error(`المخزون غير كافٍ. المتاح: ${currentStock} ${product?.sellable_unit_name || 'قطعة'}`);
              return i;
            }
          } else {
            if (qty > currentStock) {
              toast.error(`المخزون غير كافٍ. المتاح: ${currentStock} ${product?.sellable_unit_name || 'قطعة'}`);
              return i;
            }
          }
          
          return { ...i, quantity: qty };
        }
        return i;
      });
      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  const updateUnitPrice = (productId: number, newPrice: number) => {
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) =>
        i.product_id === productId ? { ...i, unit_price: newPrice } : i
      );
      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  // Function to switch unit type for an item
  const switchUnitType = (productId: number, newUnitType: 'stocking' | 'sellable') => {
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) => {
        if (i.product_id === productId) {
          const product = i.product as Product;
          const currentUnitType = (i as any).unitType || 'sellable';
          
          if (currentUnitType === newUnitType) {
            return i; // No change needed
          }
          
          const unitsPerStocking = product?.units_per_stocking_unit || 1;
          
          // First, convert current quantity to sellable units (base unit)
          let currentQuantityInSellable: number;
          if (currentUnitType === 'stocking') {
            // Current quantity is in stocking units, convert to sellable
            currentQuantityInSellable = i.quantity * unitsPerStocking;
          } else {
            // Current quantity is already in sellable units
            currentQuantityInSellable = i.quantity;
          }
          
          // Now convert to the new unit type
          let newQuantity: number;
          if (newUnitType === 'stocking') {
            // Convert from sellable to stocking units
            newQuantity = Math.floor(currentQuantityInSellable / unitsPerStocking);
            if (newQuantity === 0) {
              toast.error(`الكمية الحالية (${currentQuantityInSellable} ${product?.sellable_unit_name || 'قطعة'}) غير كافية للتحويل إلى وحدة التخزين (يحتاج ${unitsPerStocking} ${product?.sellable_unit_name || 'قطعة'} على الأقل)`);
              return i;
            }
          } else {
            // Convert from sellable to sellable (shouldn't happen, but just in case)
            newQuantity = currentQuantityInSellable;
          }
          
          // Get new price for the unit type
          const newPrice = getPriceForUnitType(product, newUnitType);
          
          return { ...i, quantity: newQuantity, unit_price: newPrice, unitType: newUnitType };
        }
        return i;
      });
      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  const removeItem = (productId: number) => {
    updateCurrentSale((prev) => {
      const newItems = prev.items.filter((i) => i.product_id !== productId);
      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  const updateBatch = (
    productId: number,
    batchId: number | null,
    _batchNumber: string | null,
    _expiryDate: string | null,
    unitPrice: number
  ) => {
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

  // List of pending (completed but not synced) sales
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);

  const loadPendingSales = async () => {
    const sales = await offlineSaleService.getOfflineSales();

    // Compute available shift IDs (from pending sales + current shift if online)
    const ids = new Set(
      sales
        .map((s) => s.shift_id)
        .filter((id): id is number => typeof id === "number")
    );
    if (shift?.id) ids.add(shift.id);
    const sortedIds = Array.from(ids).sort((a, b) => a - b);
    setAvailableShiftIds(sortedIds);

    // Filter by selected shift ID if set, otherwise show all (or handle as user prefers)
    // User asked: "only shows pendings sales that belong to current select shift"
    let filteredSales = sales;
    if (selectedShiftId) {
      filteredSales = sales.filter((s) => s.shift_id === selectedShiftId);
    }

    // Sort by date desc
    setPendingSales(
      filteredSales.sort((a, b) => b.offline_created_at - a.offline_created_at)
    );
  };

  useEffect(() => {
    loadPendingSales();
    // Set up an interval or listener if needed, but for now we reload on actions
  }, [selectedShiftId, shift]); // Add shift dependency to re-calc available IDs

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
        loadPendingSales();
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [currentSale]);

  const handleCompleteSale = async () => {
    try {
      // currentSale already has payments attached via the SummaryColumn
      await offlineSaleService.completeSale(currentSale);
      toast.success("Sale completed and synced!");
    } catch (error: any) {
      console.error("Payment sync error:", error);
      const msg =
        error?.response?.data?.message || error?.message || "Unknown error";
      toast.warning(`Saved offline. Sync failed: ${msg}`);
    }

    // Reload pending sales list
    await loadPendingSales();

    // Reset
    if (shift && shift.is_open) {
      const newDraft = offlineSaleService.createDraftSale(shift.id);
      await offlineSaleService.saveDraft(newDraft);
      setCurrentSale(newDraft);
    } else {
      // If shift closed/not available, just clear UI
      const newDraft = offlineSaleService.createDraftSale(null);
      setCurrentSale(newDraft);
    }
  };

  // Select sale from history
  const handleSelectPendingSale = (sale: OfflineSale) => {
    setCurrentSale(sale);
  };

  // Create new sale
  const handleNewSale = async () => {
    if (!shift || !shift.is_open) {
      toast.error("يجب فتح الوردية أولاً لإنشاء عملية بيع جديدة");
      return;
    }
    const newSale = offlineSaleService.createDraftSale(shift.id);
    await offlineSaleService.saveDraft(newSale);
    setCurrentSale(newSale);
    // List refresh handled by useEffect or we can force it here
    await loadPendingSales();
  };

  // --- Adapters ---

  const cartItems: CartItem[] = useMemo(() => {
    return currentSale.items.map((item) => ({
      product: item.product as Product,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      total: Number(item.unit_price) * item.quantity,
      unitType: (item as any).unitType || 'sellable', // Default to sellable if not set
      selectedBatchId: item.purchase_item_id,
      // We'd ideally store these in OfflineSaleItem to persist display,
      // but for now we try to find them in product.available_batches or fallback
      selectedBatchNumber: (item.product as Product).available_batches?.find(
        (b) => b.id === item.purchase_item_id
      )?.batch_number,
      selectedBatchExpiryDate: (
        item.product as Product
      ).available_batches?.find((b) => b.id === item.purchase_item_id)
        ?.expiry_date,
    }));
  }, [currentSale.items]);

  // Delete pending sale
  const handleDeletePendingSale = async (sale: OfflineSale) => {
    if (!confirm("Are you sure you want to delete this pending sale?")) return;

    await dbService.deletePendingSale(sale.tempId);

    // If the deleted sale is the current one, switch to a new draft
    if (currentSale.tempId === sale.tempId) {
      if (shift && shift.is_open) {
        handleNewSale();
      } else {
        // Fallback: clear to empty draft in memory without saving
        const newDraft = offlineSaleService.createDraftSale(null);
        setCurrentSale(newDraft);
        await loadPendingSales();
      }
    } else {
      await loadPendingSales();
    }
  };

  const isPendingSaleSelected = useMemo(() => {
    return pendingSales.some((s) => s.tempId === currentSale.tempId);
  }, [pendingSales, currentSale.tempId]);

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
        onAddToCart={(product) => addToCart(product, 'sellable')}
        onNewSale={handleNewSale}
        onPaymentShortcut={() => {
          if (
            Number(currentSale.total_amount) > 0 &&
            currentSale.status !== "completed"
          ) {
            setIsPaymentDialogOpen(true);
          }
        }}
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
          <PendingSalesColumn
            sales={pendingSales}
            selectedSaleId={currentSale.tempId}
            onSaleSelect={handleSelectPendingSale}
            onDelete={handleDeletePendingSale}
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
            onSwitchUnitType={async (id, unitType) => switchUnitType(id, unitType)}
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

      {/* PAYMENT DIALOG TEST */}
      {/* Dialogs now handled by OfflineSaleSummaryColumn */}
    </Box>
  );
};

export default PosPageOffline;
