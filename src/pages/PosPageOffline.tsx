import React, { useState, useEffect, useMemo, useRef } from "react";
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
        // Try load from local storage
        const stored = localStorage.getItem("current_pos_shift");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setShift(parsed);
            if (!selectedShiftId && parsed?.id) setSelectedShiftId(parsed.id);
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
          setShift(shiftData);
          localStorage.setItem("current_pos_shift", JSON.stringify(shiftData));
          // Initialize selected shift ID
          if (!selectedShiftId && shiftData?.id) {
            setSelectedShiftId(shiftData.id);
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
      localStorage.setItem("current_pos_shift", JSON.stringify(newShift));

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
      const updatedShift = response.data.data || response.data;
      setShift(updatedShift);
      localStorage.setItem("current_pos_shift", JSON.stringify(updatedShift));
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

  // Reload pending sales list when sync finishes (to show synced status)
  useEffect(() => {
    if (!isSyncing) {
      loadPendingSales();
    }
  }, [isSyncing]);

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

  const addToCart = (
    product: Product,
    unitType: "stocking" | "sellable" = "sellable"
  ) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }

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

      let newItems;
      if (existing) {
        // If existing item has different unit type, convert quantity
        const existingUnitType = (existing as any).unitType || "sellable";
        if (existingUnitType === unitType) {
          // Same unit type, just increment
          newItems = prev.items.map((i) =>
            i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          // Different unit type, convert and add
          const existingQtyInSellable =
            existingUnitType === "stocking"
              ? existing.quantity * unitsPerStocking
              : existing.quantity;
          const newQtyInSellable =
            unitType === "stocking" ? unitsPerStocking : 1;
          const totalSellableQty = existingQtyInSellable + newQtyInSellable;

          // Convert back to the new unit type
          const newQty =
            unitType === "stocking"
              ? Math.floor(totalSellableQty / unitsPerStocking)
              : totalSellableQty;

          newItems = prev.items.map((i) =>
            i.product_id === product.id
              ? {
                  ...i,
                  quantity: newQty,
                  unit_price: price,
                  unitType: unitType,
                }
              : i
          );
        }
      } else {
        const newItem: OfflineSaleItem & {
          unitType?: "stocking" | "sellable";
        } = {
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
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) => {
        if (i.product_id === productId) {
          const product = i.product as Product;
          const unitType = (i as any).unitType || "sellable";
          const unitsPerStocking = product?.units_per_stocking_unit || 1;
          const currentStock = Number(
            product?.current_stock_quantity ?? product?.stock_quantity ?? 0
          );

          // Validate stock availability
          if (unitType === "stocking") {
            const requiredSellableQty = qty * unitsPerStocking;
            if (requiredSellableQty > currentStock) {
              toast.error(
                `المخزون غير كافٍ. المتاح: ${currentStock} ${
                  product?.sellable_unit_name || "قطعة"
                }`
              );
              return i;
            }
          } else {
            if (qty > currentStock) {
              toast.error(
                `المخزون غير كافٍ. المتاح: ${currentStock} ${
                  product?.sellable_unit_name || "قطعة"
                }`
              );
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

  const removeItem = (productId: number) => {
    if (currentSale.is_synced) {
      toast.error("لا يمكن تعديل عملية بيع تمت مزامنتها");
      return;
    }
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

  // List of pending (completed but not synced) sales
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);

  const loadPendingSales = async () => {
    let sales = await offlineSaleService.getOfflineSales();

    // Fetch server sales for current shift if online
    if (isOnline && selectedShiftId) {
      try {
        const res = await apiClient.get(
          `/sales?shift_id=${selectedShiftId}&per_page=100`
        );
        const serverSalesData = res.data.data || [];

        const localIds = new Set(sales.filter((s) => s.id).map((s) => s.id));

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
            s.items?.map((i: any) => ({
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: Number(i.unit_price),
              product: i.product,
              product_name: i.product?.name,
              purchase_item_id: i.purchase_item_id,
              // minimal mapping for display
            })) || [],
          payments: s.payments || [],
          notes: s.notes,
          created_at: s.created_at,
          user_id: s.user_id,
        }));

        const uniqueServerSales = mapped.filter((s) => !localIds.has(s.id));
        sales = [...sales, ...uniqueServerSales];
      } catch (e) {
        console.warn("Could not fetch shift history", e);
      }
    }

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
      filteredSales = sales.filter(
        (s) => s.shift_id && Number(s.shift_id) === Number(selectedShiftId)
      );
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
      unitType: (item as any).unitType || "sellable", // Default to sellable if not set
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
        onAddToCart={(product) => addToCart(product, "sellable")}
        onNewSale={handleNewSale}
        isSaleSelected={isPendingSaleSelected}
        onPaymentShortcut={() => {
          if (
            Number(currentSale.total_amount) > 0 &&
            currentSale.status !== "completed"
          ) {
            setIsPaymentDialogOpen(true);
          }
        }}
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
            sales={pendingSales.filter((s) => !!s.is_synced === isSyncedView)}
            selectedSaleId={currentSale.tempId}
            onSaleSelect={handleSelectPendingSale}
            onDelete={handleDeletePendingSale}
            title={isSyncedView ? "SYNCED" : "PENDING"}
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
              sales={pendingSales}
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
