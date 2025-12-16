// src/pages/PosPage.tsx
import React, { useState, useEffect, useCallback } from "react";

// MUI Components
import { Box, Paper } from "@mui/material";

// POS Components
import {
  SaleEditor,
  PosHeader,
  TodaySalesColumn,
  SaleSummaryColumn,
  CurrentSaleItemsColumn,
  CalculatorDialog,
  PosPdfDialog,
  InvoicePdfDialog,
  ThermalInvoiceDialog,
  BatchSelectionDialog,
} from "../components/pos";

// Types
import { Product } from "../services/productService";
import saleService from "../services/saleService";
import clientService from "../services/clientService";
import { generateDailySalesPdf } from "../services/exportService";
import { useAuth } from "@/context/AuthContext";
import { transformBackendSaleToPOS } from "../utils/saleTransformers";

// Custom Hooks
import { useSaleState } from "../hooks/useSaleState";
import { useSaleOperations } from "../hooks/useSaleOperations";
import { useSalesLoader } from "../hooks/useSalesLoader";
import { useSaleSelection } from "../hooks/useSaleSelection";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSaleLoading } from "../hooks/useSaleLoading";
import { useDialogState } from "../hooks/useDialogState";

const PosPage: React.FC = () => {
  const { user } = useAuth();
  
  // UI State
  const [isTodaySalesCollapsed, setIsTodaySalesCollapsed] = useState(false);
  const [filterByCurrentUser, setFilterByCurrentUser] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Custom Hooks
  const saleState = useSaleState();
  const loadingState = useSaleLoading();
  const dialogs = useDialogState();
  
  const { paymentSubmitTrigger } = useKeyboardShortcuts({
    onOpenPaymentDialog: dialogs.openPaymentDialog,
    paymentDialogOpen: dialogs.paymentDialogOpen,
  });

  const { loadTodaySales } = useSalesLoader({
    filterByCurrentUser,
    selectedDate,
    userId: user?.id || null,
    onSalesLoaded: saleState.setTodaySales,
    onLoadingChange: loadingState.setIsLoadingSales,
  });

  const { selectSale } = useSaleSelection({
    onSaleSelected: saleState.updateSale,
    onItemsUpdated: saleState.updateItems,
    onClientUpdated: saleState.setSelectedClient,
    onLoadingChange: loadingState.setIsLoadingSaleItems,
    onLoadingSaleIdChange: loadingState.setLoadingSaleId,
  });

  const saleOperations = useSaleOperations({
    selectedSale: saleState.selectedSale,
    currentSaleItems: saleState.currentSaleItems,
    onSaleUpdate: saleState.updateSale,
    onItemsUpdate: saleState.updateItems,
    onSalesListUpdate: saleState.updateSalesList,
    onRefreshTrigger: saleState.refresh,
  });

  // Load sales on mount and when filters change
  useEffect(() => {
    loadTodaySales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterByCurrentUser, selectedDate, user]);

  // Product addition handlers
  const addToCurrentSale = useCallback(async (product: Product) => {
    if (product.available_batches && product.available_batches.length > 1) {
      dialogs.openBatchSelection(product);
      return;
    }
    await saleOperations.addProductToSale(product);
  }, [saleOperations, dialogs]);

  const handleBatchSelect = useCallback(async (batch: { id: number }) => {
    if (dialogs.batchSelectionProduct) {
      await saleOperations.addProductToSale(dialogs.batchSelectionProduct, batch.id);
      dialogs.closeBatchSelection();
    }
  }, [dialogs, saleOperations]);

  // Update quantity with loading state
  const updateQuantity = useCallback(async (productId: number, newQuantity: number) => {
    loadingState.setUpdatingItem(productId, true);
    try {
      await saleOperations.updateQuantity(productId, newQuantity);
    } finally {
      loadingState.setUpdatingItem(productId, false);
    }
  }, [saleOperations, loadingState]);

  // Update unit price with loading state
  const updateUnitPrice = useCallback(async (productId: number, newUnitPrice: number) => {
    loadingState.setUpdatingItem(productId, true);
    try {
      await saleOperations.updateUnitPrice(productId, newUnitPrice);
    } finally {
      loadingState.setUpdatingItem(productId, false);
    }
  }, [saleOperations, loadingState]);

  // Update batch handler
  const updateBatch = useCallback(async (
    productId: number,
    batchId: number | null,
    _batchNumber: string | null,
    _expiryDate: string | null,
    unitPrice: number
  ) => {
    await saleOperations.updateBatch(productId, batchId, unitPrice);
  }, [saleOperations]);

  // Remove item with loading state
  const removeFromCurrentSale = useCallback(async (productId: number) => {
    loadingState.setDeletingItem(productId, true);
    try {
      await saleOperations.removeFromCurrentSale(productId);
      const remainingItems = saleState.currentSaleItems.filter(item => item.product.id !== productId);
      if (remainingItems.length === 0) {
        saleState.resetSale();
        await loadTodaySales();
      }
    } finally {
      loadingState.setDeletingItem(productId, false);
    }
  }, [saleOperations, loadingState, saleState, loadTodaySales]);

  // Payment completion handler
  const handlePaymentComplete = useCallback(async (errorMessage?: string) => {
    if (errorMessage) {
      saleOperations.showToast(errorMessage, 'error');
      return;
    }

    await loadTodaySales();
    
    if (saleState.selectedSale) {
      try {
        const updatedSale = await (saleService.getSaleForPOS || saleService.getSale)(saleState.selectedSale.id);
        
        try {
          if (updatedSale.client) {
            saleState.setSelectedClient(updatedSale.client);
          } else if (updatedSale.client_id) {
            const client = await clientService.getClient(updatedSale.client_id);
            saleState.setSelectedClient(client);
          } else {
            saleState.setSelectedClient(null);
          }
        } catch {
          // ignore client fetch errors
        }

        const transformedSale = transformBackendSaleToPOS(updatedSale);
        saleState.updateSale(transformedSale);
        saleState.setDiscountAmount(0);
        saleState.setDiscountType('fixed');
        saleOperations.showToast('تم تحديث البيع', 'success');
        
        setTimeout(() => {
          dialogs.openThermalDialog();
        }, 500);
      } catch (error) {
        console.error('Error refreshing sale after payment:', error);
      }
    } else {
      await loadTodaySales();
      saleOperations.showToast('تم إكمال البيع', 'success');
    }
  }, [saleState, saleOperations, dialogs, loadTodaySales]);

  // Create empty sale
  const handleCreateEmptySale = useCallback(async () => {
    try {
      const emptySaleData = {
        client_id: null,
        sale_date: new Date().toISOString().split('T')[0],
        notes: null
      };

      const newSale = await saleService.createEmptySale(emptySaleData);
      const transformedSale = transformBackendSaleToPOS(newSale);

      await selectSale(transformedSale);
      await loadTodaySales();
      saleOperations.showToast('تم إنشاء عملية جديدة', 'success');
    } catch (error) {
      console.error('Error creating empty sale:', error);
      saleOperations.showToast(saleService.getErrorMessage(error), 'error');
    }
  }, [selectSale, loadTodaySales, saleOperations]);

  // Sale date change handler
  const handleSaleDateChange = useCallback(async (saleId: number, newDate: string) => {
    try {
      await saleService.updateSale(saleId, { sale_date: newDate });
      await loadTodaySales();
      
      if (saleState.selectedSale && saleState.selectedSale.id === saleId) {
        const updatedSale = saleState.todaySales.find(sale => sale.id === saleId);
        if (updatedSale) {
          saleState.updateSale(updatedSale);
        }
      }
      
      saleOperations.showToast('تم تحديث تاريخ البيع', 'success');
    } catch (error) {
      console.error('Failed to update sale date:', error);
      saleOperations.showToast(saleService.getErrorMessage(error), 'error');
    }
  }, [saleState, saleOperations, loadTodaySales]);

  // Client change handler
  const handleClientChange = useCallback(async (client: import('../services/clientService').Client | null) => {
    saleState.setSelectedClient(client);
    if (!saleState.selectedSale || !client) return;
    await saleOperations.updateClient(client);
  }, [saleState, saleOperations]);

  // PDF generation handler
  const handleGenerateDailySalesPdf = useCallback(async () => {
    try {
      await generateDailySalesPdf();
      saleOperations.showToast('تم إنشاء PDF', 'success');
    } catch {
      saleOperations.showToast('فشل إنشاء PDF', 'error');
    }
  }, [saleOperations]);

  const handlePrintThermalInvoice = useCallback(() => {
    if (!saleState.selectedSale) {
      saleOperations.showToast('لم يتم اختيار بيع', 'error');
      return;
    }
    dialogs.openThermalDialog();
  }, [saleState, saleOperations, dialogs]);

  return (
    <Box sx={{ height: 'calc(100vh - 10px)', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      {/* Header */}
      <PosHeader
        key={saleState.selectedSale?.id ?? 'no-sale'}
        onAddProduct={addToCurrentSale}
        onAddMultipleProducts={saleOperations.addMultipleToCurrentSale}
        loading={false}
        onCreateEmptySale={handleCreateEmptySale}
        onOpenCalculator={dialogs.openCalculator}
        onGeneratePdf={handleGenerateDailySalesPdf}
        onPreviewPdf={dialogs.openPdfDialog}
        onGenerateInvoice={dialogs.openInvoiceDialog}
        onPrintThermalInvoice={handlePrintThermalInvoice}
        hasSelectedSale={!!saleState.selectedSale}
        selectedClient={saleState.selectedClient}
        onClientChange={handleClientChange}
        filterByCurrentUser={filterByCurrentUser}
        onToggleUserFilter={() => setFilterByCurrentUser(!filterByCurrentUser)}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', px: { xs: 1, sm: 2, lg: 3 }, py: 1.5 }}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5 }}>
          {/* Column 1 - Today's Sales */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 90, flexShrink: 0 }}>
            <Paper sx={{ height: '100%', overflow: 'hidden', position: 'sticky', top: 80 }}>
              <TodaySalesColumn
                sales={saleState.todaySales}
                selectedSaleId={saleState.selectedSale?.id || null}
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

          {/* Column 2 - Current Sale Items */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper sx={{ height: '100%', overflow: 'hidden' }}>
              <CurrentSaleItemsColumn
                currentSaleItems={saleState.currentSaleItems}
                onUpdateQuantity={updateQuantity}
                onUpdateUnitPrice={updateUnitPrice}
                onRemoveItem={removeFromCurrentSale}
                onUpdateBatch={updateBatch}
                isSalePaid={saleState.selectedSale ? (saleState.selectedSale.payments && saleState.selectedSale.payments.length > 0) : false}
                deletingItems={loadingState.deletingItems}
                updatingItems={loadingState.updatingItems}
                isLoading={loadingState.isLoadingSaleItems}
              />
            </Paper>
          </Box>

          {/* Column 3 - Summary and Actions */}
          {saleState.selectedSale && (
            <Box sx={{ width: { xs: '100%', md: 320, xl: 360 }, flexShrink: 0 }}>
              <Paper sx={{ height: '100%', overflow: 'hidden', position: { md: 'sticky' }, top: { md: 80 } }}>
                <SaleSummaryColumn
                  currentSaleItems={saleState.currentSaleItems}
                  discountAmount={saleState.discountAmount}
                  discountType={saleState.discountType}
                  onDiscountChange={(amount: number, type: 'percentage' | 'fixed') => {
                    saleState.setDiscountAmount(amount);
                    saleState.setDiscountType(type);
                  }}
                  isEditMode={!!saleState.selectedSale}
                  saleId={saleState.selectedSale?.id}
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

      {/* Sale Editor */}
      <SaleEditor
        sale={saleState.selectedSale}
        open={dialogs.saleEditorOpen}
        onClose={() => {
          dialogs.setSaleEditorOpen(false);
          saleState.resetSale();
        }}
        onSaleUpdated={loadTodaySales}
      />

      {/* Dialogs */}
      <CalculatorDialog
        open={dialogs.calculatorDialogOpen}
        onOpenChange={dialogs.setCalculatorDialogOpen}
        currentUserId={user?.id || null}
        filterByCurrentUser={filterByCurrentUser}
      />

      <PosPdfDialog open={dialogs.pdfDialogOpen} onClose={dialogs.closePdfDialog} />

      <InvoicePdfDialog open={dialogs.invoiceDialogOpen} onClose={dialogs.closeInvoiceDialog} sale={saleState.selectedSale} />

      <ThermalInvoiceDialog open={dialogs.thermalDialogOpen} onClose={dialogs.closeThermalDialog} sale={saleState.selectedSale} />

      {/* Batch Selection Dialog */}
      <BatchSelectionDialog
        open={dialogs.batchSelectionOpen}
        onOpenChange={dialogs.setBatchSelectionOpen}
        product={dialogs.batchSelectionProduct}
        onBatchSelect={handleBatchSelect}
      />
    </Box>
  );
};

export default PosPage;
