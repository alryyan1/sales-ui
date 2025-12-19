import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Chip,
  CircularProgress,
  Stack,
  Autocomplete,
  Tooltip,
  IconButton,
} from "@mui/material";
import {} from "@mui/icons-material";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
} from "lucide-react";
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
  const [currentSale, setCurrentSale] = useState<OfflineSale>(
    offlineSaleService.createDraftSale()
  );
  const [inputValue, setInputValue] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dialog State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Load Products on Mount
  useEffect(() => {
    const load = async () => {
      const res = await offlineSaleService.searchProducts("");
      // console.log(res,'res');
      setProducts(res);
    };
    load();
  }, []);

  // Initial check if we have products, if not try to sync
  useEffect(() => {
    const checkInit = async () => {
      const res = await offlineSaleService.searchProducts("");
      if (res.length === 0 && isOnline) {
        await offlineSaleService.initializeProducts();
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

  const addToCart = (product: Product) => {
    updateCurrentSale((prev) => {
      const existing = prev.items.find((i) => i.product_id === product.id);
      // Determine price: try last sale price per sellable unit, then first batch, then default 0
      let price = Number(product.last_sale_price_per_sellable_unit || 0);
      if (
        price === 0 &&
        product.available_batches &&
        product.available_batches.length > 0
      ) {
        price = Number(product.available_batches[0].sale_price || 0);
      }

      let newItems;
      if (existing) {
        newItems = prev.items.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        const newItem: OfflineSaleItem = {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: price,
          product: product,
          id: undefined, // New item
        };
        newItems = [...prev.items, newItem];
      }

      return offlineSaleService.calculateTotals({ ...prev, items: newItems });
    });
  };

  const updateQuantity = (productId: number, qty: number) => {
    updateCurrentSale((prev) => {
      const newItems = prev.items.map((i) =>
        i.product_id === productId ? { ...i, quantity: qty } : i
      );
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
    const newDraft = offlineSaleService.createDraftSale(shift?.id || null);
    // Save new draft immediately so it exists
    await offlineSaleService.saveDraft(newDraft);
    setCurrentSale(newDraft);
  };

  // Select sale from history
  const handleSelectPendingSale = (sale: OfflineSale) => {
    setCurrentSale(sale);
  };

  // Create new sale
  const handleNewSale = async () => {
    const newSale = offlineSaleService.createDraftSale(shift?.id || null);
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
      handleNewSale();
    } else {
      await loadPendingSales();
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f4f6f8",
      }}
    >
      {/* TOP BAR */}
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "white",
          gap: 3,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="900"
          sx={{
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            backgroundClip: "text",
            color: "transparent",
            letterSpacing: "-0.5px",
          }}
        >
          NEXT POS
        </Typography>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            maxWidth: 600,
          }}
        >
          <Autocomplete
            open={autocompleteOpen}
            onOpen={() => setAutocompleteOpen(true)}
            onClose={() => setAutocompleteOpen(false)}
            options={products}
            getOptionLabel={(option) =>
              `${option.name} (${option.sku || "No SKU"})`
            }
            value={null}
            inputValue={inputValue}
            onInputChange={(_, newInputValue) => {
              setInputValue(newInputValue);
            }}
            autoHighlight
            fullWidth
            onChange={(_, newValue) => {
              if (newValue) {
                addToCart(newValue);
                setInputValue("");
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={inputRef}
                autoFocus
                placeholder="Scan or Search Product..."
                size="small"
                sx={{
                  bgcolor: "grey.50",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    "& fieldset": { borderColor: "grey.200" },
                    "&:hover fieldset": { borderColor: "primary.main" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <Search
                      size={18}
                      color="#9ca3af"
                      style={{ marginRight: 8 }}
                    />
                  ),
                }}
                onKeyDown={(e) => {
                  if (e.key === "+") {
                    e.preventDefault();
                    if (Number(currentSale.total_amount) > 0) {
                      setIsPaymentDialogOpen(true);
                    }
                    return;
                  }
                  if (e.key === "Enter" && inputValue) {
                    const exactMatch = products.find(
                      (p) => p.sku === inputValue || p.sku === inputValue.trim()
                    );
                    if (exactMatch) {
                      addToCart(exactMatch);
                      setInputValue("");
                      setAutocompleteOpen(false); // Close dropdown
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                  }
                  if (params.inputProps.onKeyDown) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (params.inputProps.onKeyDown as any)(e);
                  }
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.sku}
                    </Typography>
                  </Box>
                  <Typography color="primary.main" fontWeight="bold">
                    {(() => {
                      let price = Number(
                        option.last_sale_price_per_sellable_unit || 0
                      );
                      if (
                        price === 0 &&
                        option.available_batches &&
                        option.available_batches.length > 0
                      ) {
                        price = Number(
                          option.available_batches[0].sale_price || 0
                        );
                      }
                      return price.toFixed(2);
                    })()}
                  </Typography>
                </Box>
              </li>
            )}
            filterOptions={(options, state) => {
              const inputValue = state.inputValue.toLowerCase();
              const filtered = options.filter(
                (option) =>
                  option.name.toLowerCase().includes(inputValue) ||
                  (option.sku && option.sku.toLowerCase().includes(inputValue))
              );
              return filtered.sort((a, b) => {
                const aSku = a.sku?.toLowerCase() || "";
                const bSku = b.sku?.toLowerCase() || "";
                const exactA = aSku === inputValue;
                const exactB = bSku === inputValue;
                if (exactA && !exactB) return -1;
                if (!exactA && exactB) return 1;
                return 0;
              });
            }}
            clearOnBlur
            handleHomeEndKeys
          />
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          onClick={handleNewSale}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
          }}
        >
          New Sale
        </Button>

        <Box sx={{ flexGrow: 0 }} />

        <Stack direction="row" spacing={2} alignItems="center">
      

          {/* Shift Status */}
          {shift && shift.is_open ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label="Open"
                color="success"
                size="small"
                variant="filled"
                sx={{ borderRadius: 1.5, fontWeight: 600, px: 0.5 }}
              />
              <Tooltip title="Close Shift">
                <IconButton
                  onClick={handleCloseShift}
                  disabled={shiftLoading || !isOnline}
                  size="small"
                  sx={{
                    color: "error.main",
                    bgcolor: "error.lighter",
                    "&:hover": { bgcolor: "error.light", color: "white" },
                  }}
                >
                  {shiftLoading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <X size={18} />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Button
              variant="outlined"
              color="success"
              size="small"
              onClick={handleOpenShift}
              disabled={shiftLoading || !isOnline}
              sx={{ borderRadius: 2 }}
            >
              {shiftLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                "Open Shift"
              )}
            </Button>
          )}

          {/* Sync Status */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* <Chip
              icon={
                isSyncing ? (
                  <CircularProgress size={14} />
                ) : isOnline ? (
                  <Wifi size={14} />
                ) : (
                  <WifiOff size={14} />
                )
              }
              label={isSyncing ? "Syncing..." : isOnline ? "Online" : "Offline"}
              color={isOnline ? "success" : "default"}
              variant="outlined"
              size="small"
              sx={{ borderRadius: 1.5 }}
            /> */}
            <Tooltip title="Sync Data">
              <IconButton
                onClick={() => triggerSync()}
                disabled={isSyncing}
                size="small"
                sx={{ border: "1px solid", borderColor: "divider" }}
              >
                <RefreshCw
                  size={18}
                  className={isSyncing ? "animate-spin" : ""}
                />
              </IconButton>
            </Tooltip>
                {/* Shift Navigation */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "grey.50",
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 2,
              p: 0.5,
            }}
          >
         <IconButton
              size="small"
              onClick={() =>
                setSelectedShiftId((prev) => (prev ? prev + 1 : null))
              }
              disabled={
                !selectedShiftId ||
                (availableShiftIds.length > 0 &&
                  selectedShiftId >= Math.max(...availableShiftIds))
              }
            >
              <ChevronRight size={18} />
            </IconButton>  
            <Typography
              variant="body2"
              fontWeight="600"
              sx={{
                mx: 2,
                minWidth: 60,
                textAlign: "center",
                color: "text.primary",
              }}
            >
              Shift #{selectedShiftId || "-"}
            </Typography>
            
             <IconButton
              size="small"
              onClick={() =>
                setSelectedShiftId((prev) => (prev ? prev - 1 : null))
              }
              disabled={
                !selectedShiftId ||
                (availableShiftIds.length > 0 &&
                  selectedShiftId <= Math.min(...availableShiftIds))
              }
            >
              <ChevronLeft size={18} />
            </IconButton>
          </Box>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT: PENDING SALES COLUMN */}
        <Box
          sx={{
            width: 90,
            flexShrink: 0,
            bgcolor: "white",
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          <PendingSalesColumn
            sales={pendingSales}
            selectedSaleId={currentSale.tempId}
            onSaleSelect={handleSelectPendingSale}
            onDelete={handleDeletePendingSale}
          />
        </Box>

        {/* MIDDLE: MAIN TABLE AREA */}
        <Box sx={{ flex: 1, p: 3, display: "flex", flexDirection: "column" }}>
          <CurrentSaleItemsColumn
            currentSaleItems={cartItems}
            onUpdateQuantity={async (id, qty) => updateQuantity(id, qty)}
            onUpdateUnitPrice={async (id, price) => updateUnitPrice(id, price)}
            onRemoveItem={async (id) => removeItem(id)}
            onUpdateBatch={async (id, batchId, num, expiry, price) =>
              updateBatch(id, batchId, num, expiry, price)
            }
          />
        </Box>

        {/* RIGHT: SUMMARY PANEL */}
        {/* RIGHT: SUMMARY PANEL */}
        <Box
          sx={{
            width: 400,
            borderLeft: "1px solid",
            borderColor: "divider",
            zIndex: 10,
            bgcolor: "white",
          }}
        >
          <OfflineSaleSummaryColumn
            currentSale={currentSale}
            currentSaleItems={cartItems}
            onUpdateSale={(updated) => updateCurrentSale(updated)}
            onCompleteSale={handleCompleteSale}
            isPaymentDialogOpen={isPaymentDialogOpen}
            onPaymentDialogOpenChange={setIsPaymentDialogOpen}
          />
        </Box>
      </Box>

      {/* PAYMENT DIALOG TEST */}
      {/* Dialogs now handled by OfflineSaleSummaryColumn */}
    </Box>
  );
};

export default PosPageOffline;
