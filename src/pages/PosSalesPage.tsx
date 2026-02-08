// src/pages/PosSalesPage.tsx
// Unified online-only POS with shift management, sale CRUD, payments, thermal invoice

import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper } from "@mui/material";
import apiClient from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";
import productService from "@/services/productService";
import saleService from "@/services/saleService";
import clientService from "@/services/clientService";
import { Product } from "@/services/productService";
import { transformBackendSaleToPOS } from "@/utils/saleTransformers";
import { generateDailySalesPdf } from "@/services/exportService";

import {
  TodaySalesColumn,
  SaleSummaryColumn,
  CurrentSaleItemsColumn,
  ThermalInvoiceDialog,
  BatchSelectionDialog,
  PosOfflineHeader,
  CalculatorSummaryDialog,
} from "../components/pos";
import { Sale } from "../components/pos/types";

import { useSaleState } from "../hooks/useSaleState";
import { useSaleOperations } from "../hooks/useSaleOperations";
import { useSaleSelection } from "../hooks/useSaleSelection";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSaleLoading } from "../hooks/useSaleLoading";
import { useDialogState } from "../hooks/useDialogState";

interface Shift {
  id: number;
  opened_at: string | null;
  closed_at: string | null;
  is_open: boolean;
}

const PosSalesPage: React.FC = () => {
  const { user } = useAuth();
  const { getSetting, isLoadingSettings } = useSettings();
  const posMode = (getSetting("pos_mode", "shift") as "shift" | "days") ?? "shift";

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [isTodaySalesCollapsed, setIsTodaySalesCollapsed] = useState(false);
  const [filterByCurrentUser, setFilterByCurrentUser] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [availableShiftIds, setAvailableShiftIds] = useState<number[]>([]);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  const saleState = useSaleState();
  const loadingState = useSaleLoading();
  const dialogs = useDialogState();

  const { paymentSubmitTrigger } = useKeyboardShortcuts({
    onOpenPaymentDialog: dialogs.openPaymentDialog,
    paymentDialogOpen: dialogs.paymentDialogOpen,
  });

  const saleOperations = useSaleOperations({
    selectedSale: saleState.selectedSale,
    currentSaleItems: saleState.currentSaleItems,
    onSaleUpdate: saleState.updateSale,
    onItemsUpdate: saleState.updateItems,
    onSalesListUpdate: saleState.updateSalesList,
    onRefreshTrigger: saleState.refresh,
  });

  const { selectSale } = useSaleSelection({
    onSaleSelected: saleState.updateSale,
    onItemsUpdated: saleState.updateItems,
    onClientUpdated: saleState.setSelectedClient,
    onLoadingChange: loadingState.setIsLoadingSaleItems,
    onLoadingSaleIdChange: loadingState.setLoadingSaleId,
  });

  const userId = filterByCurrentUser && user?.id ? user.id : null;

  const loadSales = useCallback(async () => {
    loadingState.setIsLoadingSales(true);
    try {
      let res;
      if (posMode === "shift" && selectedShiftId) {
        res = await saleService.getSales(
          1,
          `shift_id=${selectedShiftId}`,
          "",
          "",
          "",
          1000,
          null,
          false,
          userId ?? undefined
        );
      } else {
        res = await saleService.getSales(
          1,
          "",
          "",
          selectedDate,
          selectedDate,
          1000,
          null,
          false,
          userId ?? undefined
        );
      }
      const data = res.data || [];
      const transformed = data.map((s: import("../services/saleService").Sale) =>
        transformBackendSaleToPOS(s)
      );
      saleState.setTodaySales(transformed);
    } catch (err) {
      console.error("Failed to load sales:", err);
      saleState.setTodaySales([]);
    } finally {
      loadingState.setIsLoadingSales(false);
    }
  }, [posMode, selectedShiftId, selectedDate, userId, loadingState, saleState]);

  useEffect(() => {
    if (isLoadingSettings) return;
    loadSales();
  }, [isLoadingSettings, posMode, selectedShiftId, selectedDate, filterByCurrentUser, user?.id]);

  useEffect(() => {
    if (isLoadingSettings || posMode === "days") return;
    const fetchShift = async () => {
      try {
        setShiftLoading(true);
        const res = await apiClient.get("/shifts/current");
        if (res.status === 200) {
          const d = res.data.data || res.data;
          const normalized = {
            ...d,
            is_open: d.is_open === true || d.is_open === "true" || d.is_open === 1,
          };
          setShift(normalized);
          if (!selectedShiftId && normalized?.id) setSelectedShiftId(normalized.id);
        } else {
          setShift(null);
        }
      } catch (e: unknown) {
        if (e && typeof e === "object" && "response" in e) {
          const err = e as { response?: { status?: number } };
          if (err.response?.status === 204) setShift(null);
        } else {
          console.error("Failed to load current shift:", e);
        }
      } finally {
        setShiftLoading(false);
      }
    };
    fetchShift();
  }, [isLoadingSettings, posMode]);

  useEffect(() => {
    if (posMode === "days") setSelectedShiftId(null);
  }, [posMode]);

  const fetchAvailableShiftIds = useCallback(async () => {
    if (posMode !== "shift") return;
    try {
      const res = await apiClient.get<{ data?: { id: number }[] }>("/shifts");
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const ids = (list as { id: number }[]).map((s) => s.id).filter(Boolean);
      const fromSales = (saleState.todaySales as (Sale & { shift_id?: number })[]).filter((s) => s.shift_id).map((s) => s.shift_id as number);
      const all = Array.from(new Set([...ids, ...fromSales, shift?.id].filter(Boolean))).sort((a, b) => a - b);
      setAvailableShiftIds(all);
    } catch {
      const fromSales = (saleState.todaySales as (Sale & { shift_id?: number })[]).filter((s) => s.shift_id).map((s) => s.shift_id as number);
      setAvailableShiftIds(Array.from(new Set([...fromSales, shift?.id].filter(Boolean))).sort((a, b) => a - b));
    }
  }, [posMode, shift?.id, saleState.todaySales]);

  useEffect(() => {
    fetchAvailableShiftIds();
  }, [fetchAvailableShiftIds]);

  const handleOpenShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      const res = await apiClient.post("/shifts/open");
      const d = res.data.data || res.data;
      const normalized = {
        ...d,
        is_open: true,
      };
      setShift(normalized);
      setSelectedShiftId(normalized.id);
      toast.success("تم فتح الوردية");
      await loadSales();
    } catch (err) {
      console.error("Failed to open shift:", err);
      toast.error("فشل فتح الوردية");
    } finally {
      setShiftLoading(false);
    }
  }, [loadSales]);

  const handleCloseShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      await apiClient.post("/shifts/close");
      setShift(null);
      setSelectedShiftId(null);
      toast.success("تم إغلاق الوردية");
      await loadSales();
    } catch (err) {
      console.error("Failed to close shift:", err);
      toast.error("فشل إغلاق الوردية");
    } finally {
      setShiftLoading(false);
    }
  }, [loadSales]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await productService.getProducts(1, "", "name", "asc", 1000);
      setProducts(res.data || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  const addToCurrentSale = useCallback(
    async (product: Product) => {
      if (product.available_batches && product.available_batches.length > 1) {
        dialogs.openBatchSelection(product);
        return;
      }
      await saleOperations.addProductToSale(product);
    },
    [saleOperations, dialogs]
  );

  const handleBatchSelect = useCallback(
    async (batch: { id: number }) => {
      if (dialogs.batchSelectionProduct) {
        await saleOperations.addProductToSale(dialogs.batchSelectionProduct, batch.id);
        dialogs.closeBatchSelection();
      }
    },
    [dialogs, saleOperations]
  );

  const updateQuantity = useCallback(
    async (productId: number, newQuantity: number) => {
      loadingState.setUpdatingItem(productId, true);
      try {
        await saleOperations.updateQuantity(productId, newQuantity);
      } finally {
        loadingState.setUpdatingItem(productId, false);
      }
    },
    [saleOperations, loadingState]
  );

  const updateUnitPrice = useCallback(
    async (productId: number, newUnitPrice: number) => {
      loadingState.setUpdatingItem(productId, true);
      try {
        await saleOperations.updateUnitPrice(productId, newUnitPrice);
      } finally {
        loadingState.setUpdatingItem(productId, false);
      }
    },
    [saleOperations, loadingState]
  );

  const updateBatch = useCallback(
    async (
      productId: number,
      batchId: number | null,
      _batchNumber: string | null,
      _expiryDate: string | null,
      unitPrice: number
    ) => {
      await saleOperations.updateBatch(productId, batchId, unitPrice);
    },
    [saleOperations]
  );

  const removeFromCurrentSale = useCallback(
    async (productId: number) => {
      loadingState.setDeletingItem(productId, true);
      try {
        await saleOperations.removeFromCurrentSale(productId);
        const remaining = saleState.currentSaleItems.filter((i) => i.product.id !== productId);
        if (remaining.length === 0) {
          saleState.resetSale();
          await loadSales();
        }
      } finally {
        loadingState.setDeletingItem(productId, false);
      }
    },
    [saleOperations, loadingState, saleState, loadSales]
  );

  const handlePaymentComplete = useCallback(
    async (errorMessage?: string) => {
      if (errorMessage) {
        saleOperations.showToast(errorMessage, "error");
        return;
      }
      await loadSales();
      if (saleState.selectedSale) {
        try {
          const updated = await (saleService.getSaleForPOS || saleService.getSale)(saleState.selectedSale.id);
          const transformed = transformBackendSaleToPOS(updated);
          saleState.updateSale(transformed);
          saleState.setDiscountAmount(0);
          saleState.setDiscountType("fixed");
          saleOperations.showToast("تم تحديث البيع", "success");
          setTimeout(() => dialogs.openThermalDialog(), 500);
        } catch {
          saleOperations.showToast("تم إكمال البيع", "success");
        }
      } else {
        saleOperations.showToast("تم إكمال البيع", "success");
      }
    },
    [saleState, saleOperations, dialogs, loadSales]
  );

  const handleCreateEmptySale = useCallback(async () => {
    try {
      const empty = await saleService.createEmptySale({
        client_id: null,
        sale_date: new Date().toISOString().split("T")[0],
        notes: null,
      });
      const transformed = transformBackendSaleToPOS(empty);
      await selectSale(transformed);
      await loadSales();
      saleOperations.showToast("تم إنشاء عملية جديدة", "success");
    } catch (err) {
      saleOperations.showToast(saleService.getErrorMessage(err), "error");
    }
  }, [selectSale, loadSales, saleOperations]);

  const handleSaleDateChange = useCallback(
    async (saleId: number, newDate: string) => {
      try {
        await saleService.updateSale(saleId, { sale_date: newDate });
        await loadSales();
        if (saleState.selectedSale?.id === saleId) {
          const updated = saleState.todaySales.find((s) => s.id === saleId);
          if (updated) saleState.updateSale(updated);
        }
        saleOperations.showToast("تم تحديث تاريخ البيع", "success");
      } catch (err) {
        saleOperations.showToast(saleService.getErrorMessage(err), "error");
      }
    },
    [saleState, saleOperations, loadSales]
  );

  const handleClientChange = useCallback(
    async (client: import("../services/clientService").Client | null) => {
      saleState.setSelectedClient(client);
      if (!saleState.selectedSale || !client) return;
      await saleOperations.updateClient(client);
    },
    [saleState, saleOperations]
  );

  const handleGenerateDailySalesPdf = useCallback(async () => {
    try {
      await generateDailySalesPdf();
      saleOperations.showToast("تم إنشاء PDF", "success");
    } catch {
      saleOperations.showToast("فشل إنشاء PDF", "error");
    }
  }, [saleOperations]);

  const handlePrintThermalInvoice = useCallback(() => {
    if (!saleState.selectedSale) {
      saleOperations.showToast("لم يتم اختيار بيع", "error");
      return;
    }
    dialogs.openThermalDialog();
  }, [saleState, saleOperations, dialogs]);

  const handleDeleteSale = useCallback(
    async (sale: Sale) => {
      if (!window.confirm("هل أنت متأكد من حذف هذه العملية؟")) return;
      try {
        await saleService.deleteSale(sale.id);
        if (saleState.selectedSale?.id === sale.id) saleState.resetSale();
        await loadSales();
        saleOperations.showToast("تم حذف العملية", "success");
      } catch (err) {
        saleOperations.showToast(saleService.getErrorMessage(err), "error");
      }
    },
    [saleState, saleOperations, loadSales]
  );

  const handlePlusAction = useCallback(() => {
    if (!saleState.selectedSale || saleState.currentSaleItems.length === 0) {
      handleCreateEmptySale();
      return;
    }
    const total = Number(saleState.selectedSale?.total_amount || 0);
    if (total > 0) dialogs.openPaymentDialog();
  }, [saleState.selectedSale, saleState.currentSaleItems, handleCreateEmptySale, dialogs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "+") {
        e.preventDefault();
        handlePlusAction();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleCreateEmptySale();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePlusAction, handleCreateEmptySale]);

  if (isLoadingSettings) {
    return (
      <Box sx={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <span>جاري تحميل الإعدادات...</span>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "calc(100vh - 10px)", display: "flex", flexDirection: "column", bgcolor: "grey.100" }}>
      <PosOfflineHeader
        isOnline
        isSyncing={false}
        onTriggerSync={() => {}}
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
        onAddToCart={addToCurrentSale}
        onNewSale={handleCreateEmptySale}
        onPaymentShortcut={handlePlusAction}
        isSaleSelected={!!saleState.selectedSale}
        onPrintShiftReport={handleGenerateDailySalesPdf}
        onShowSummary={() => setIsSummaryDialogOpen(true)}
        showSyncButton={false}
        posMode={posMode}
      />

      <Box sx={{ flex: 1, overflow: "hidden", px: { xs: 1, sm: 2, lg: 3 }, py: 1.5 }}>
        <Box sx={{ height: "100%", display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 1.5 }}>
          <Box sx={{ display: { xs: "none", md: "block" }, width: 90, flexShrink: 0 }}>
            <Paper sx={{ height: "100%", overflow: "hidden", position: "sticky", top: 80 }}>
              <TodaySalesColumn
                sales={saleState.todaySales}
                selectedSaleId={saleState.selectedSale?.id ?? null}
                onSaleSelect={selectSale}
                isCollapsed={isTodaySalesCollapsed}
                onToggleCollapse={() => setIsTodaySalesCollapsed(!isTodaySalesCollapsed)}
                filterByCurrentUser={filterByCurrentUser}
                selectedDate={selectedDate}
                loadingSaleId={loadingState.loadingSaleId}
                isLoading={loadingState.isLoadingSales}
              />
            </Paper>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={{ height: "100%", overflow: "hidden" }}>
              <CurrentSaleItemsColumn
                currentSaleItems={saleState.currentSaleItems}
                onUpdateQuantity={updateQuantity}
                onUpdateUnitPrice={updateUnitPrice}
                onRemoveItem={removeFromCurrentSale}
                onUpdateBatch={updateBatch}
                isSalePaid={
                  !!(saleState.selectedSale?.payments && saleState.selectedSale.payments.length > 0)
                }
                deletingItems={loadingState.deletingItems}
                updatingItems={loadingState.updatingItems}
                isLoading={loadingState.isLoadingSaleItems}
              />
            </Paper>
          </Box>

          {saleState.selectedSale && (
            <Box sx={{ width: { xs: "100%", md: 320, xl: 360 }, flexShrink: 0 }}>
              <Paper sx={{ height: "100%", overflow: "hidden", position: { md: "sticky" }, top: { md: 80 } }}>
                <SaleSummaryColumn
                  currentSaleItems={saleState.currentSaleItems}
                  discountAmount={saleState.discountAmount}
                  discountType={saleState.discountType}
                  onDiscountChange={(amount, type) => {
                    saleState.setDiscountAmount(amount);
                    saleState.setDiscountType(type);
                  }}
                  isEditMode
                  saleId={saleState.selectedSale.id}
                  onPaymentComplete={handlePaymentComplete}
                  refreshTrigger={saleState.refreshTrigger}
                  onSaleDateChange={handleSaleDateChange}
                  paymentDialogOpen={dialogs.paymentDialogOpen}
                  onPaymentDialogOpenChange={dialogs.setPaymentDialogOpen}
                  paymentSubmitTrigger={paymentSubmitTrigger}
                />
              </Paper>
            </Box>
          )}
        </Box>
      </Box>

      <ThermalInvoiceDialog
        open={dialogs.thermalDialogOpen}
        onClose={dialogs.closeThermalDialog}
        sale={saleState.selectedSale as import("../components/pos/types").Sale | null}
      />

      <BatchSelectionDialog
        open={dialogs.batchSelectionOpen}
        onOpenChange={dialogs.setBatchSelectionOpen}
        product={dialogs.batchSelectionProduct}
        onBatchSelect={handleBatchSelect}
      />

      <CalculatorSummaryDialog
        open={isSummaryDialogOpen}
        onClose={() => setIsSummaryDialogOpen(false)}
        sales={saleState.todaySales}
        periodTitle={
          posMode === "shift"
            ? `الوردية #${selectedShiftId ?? shift?.id ?? "-"}`
            : `يوم ${selectedDate}`
        }
        dateFrom={selectedDate}
        posMode={posMode}
        selectedShiftId={selectedShiftId}
      />
    </Box>
  );
};

export default PosSalesPage;
