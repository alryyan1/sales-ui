// src/hooks/useDialogState.ts
import { useState, useCallback } from 'react';
import { Product } from '../services/productService';

export const useDialogState = () => {
  const [saleEditorOpen, setSaleEditorOpen] = useState(false);
  const [calculatorDialogOpen, setCalculatorDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [thermalDialogOpen, setThermalDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [batchSelectionOpen, setBatchSelectionOpen] = useState(false);
  const [batchSelectionProduct, setBatchSelectionProduct] = useState<Product | null>(null);

  const openCalculator = useCallback(() => setCalculatorDialogOpen(true), []);
  const closeCalculator = useCallback(() => setCalculatorDialogOpen(false), []);
  
  const openPdfDialog = useCallback(() => setPdfDialogOpen(true), []);
  const closePdfDialog = useCallback(() => setPdfDialogOpen(false), []);
  
  const openInvoiceDialog = useCallback(() => setInvoiceDialogOpen(true), []);
  const closeInvoiceDialog = useCallback(() => setInvoiceDialogOpen(false), []);
  
  const openThermalDialog = useCallback(() => setThermalDialogOpen(true), []);
  const closeThermalDialog = useCallback(() => setThermalDialogOpen(false), []);
  
  const openPaymentDialog = useCallback(() => setPaymentDialogOpen(true), []);
  const closePaymentDialog = useCallback(() => setPaymentDialogOpen(false), []);
  
  const openBatchSelection = useCallback((product: Product) => {
    setBatchSelectionProduct(product);
    setBatchSelectionOpen(true);
  }, []);
  const closeBatchSelection = useCallback(() => {
    setBatchSelectionOpen(false);
    setBatchSelectionProduct(null);
  }, []);

  return {
    saleEditorOpen,
    calculatorDialogOpen,
    pdfDialogOpen,
    invoiceDialogOpen,
    thermalDialogOpen,
    paymentDialogOpen,
    batchSelectionOpen,
    batchSelectionProduct,
    setSaleEditorOpen,
    setCalculatorDialogOpen,
    setPdfDialogOpen,
    setInvoiceDialogOpen,
    setThermalDialogOpen,
    setPaymentDialogOpen,
    setBatchSelectionOpen,
    setBatchSelectionProduct,
    // Convenience methods
    openCalculator,
    closeCalculator,
    openPdfDialog,
    closePdfDialog,
    openInvoiceDialog,
    closeInvoiceDialog,
    openThermalDialog,
    closeThermalDialog,
    openPaymentDialog,
    closePaymentDialog,
    openBatchSelection,
    closeBatchSelection,
  };
};


