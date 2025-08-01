// src/pages/PosPage.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import { 
  X
} from "lucide-react";

// POS Components
import {
  SaleEditor,
  PaymentDialog,
  CartItem,
  Sale,
  PosHeader,
  TodaySalesColumn,
  SaleSummaryColumn,
  CurrentSaleItemsColumn,
  CalculatorDialog,
  PosPdfDialog,
  InvoicePdfDialog,
  ThermalInvoiceDialog,
  PaymentMethodData,
} from "../components/pos";

// Types
import { Product } from "../services/productService";
import saleService from "../services/saleService";
import { preciseCalculation, preciseSum } from "../constants";
import { generateDailySalesPdf } from "../services/exportService";

// Main POS Page Component
const PosPage: React.FC = () => {
  const { t } = useTranslation(['pos', 'common']);

  // State
  const [currentSaleItems, setCurrentSaleItems] = useState<CartItem[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [saleEditorOpen, setSaleEditorOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [isTodaySalesCollapsed, setIsTodaySalesCollapsed] = useState(false);
  const [calculatorDialogOpen, setCalculatorDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [thermalDialogOpen, setThermalDialogOpen] = useState(false);
  
  // Discount and Payment State
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [totalPaid, setTotalPaid] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);

  // Load today's sales on mount
  useEffect(() => {
    loadTodaySales();
  }, []);

  const loadTodaySales = async () => {
    try {
      // Load today's sales from database (no limit, all sales for today)
      const response = await saleService.getSales(1, '', 'completed', '', '', 1000, null, true);
      const dbSales = response.data || [];
      
      // Transform database sales to POS format
      const transformedSales: Sale[] = dbSales.map((dbSale) => ({
        id: dbSale.id,
        sale_order_number: dbSale.sale_order_number,
        client_id: dbSale.client_id,
        client_name: dbSale.client_name,
        user_id: dbSale.user_id,
        user_name: dbSale.user_name,
        sale_date: dbSale.sale_date,
        invoice_number: dbSale.invoice_number,
        status: dbSale.status,
        total_amount: Number(dbSale.total_amount),
        paid_amount: Number(dbSale.paid_amount),
        due_amount: Number(dbSale.due_amount || 0),
        notes: dbSale.notes,
        created_at: dbSale.created_at,
        updated_at: dbSale.updated_at,
        items: dbSale.items?.map(item => ({
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku || 'N/A',
            suggested_sale_price_per_sellable_unit: Number(item.unit_price),
            last_sale_price_per_sellable_unit: Number(item.unit_price),
            stock_quantity: item.current_stock_quantity || 0,
            stock_alert_level: item.stock_alert_level,
            earliest_expiry_date: item.earliest_expiry_date,
            current_stock_quantity: item.current_stock_quantity || 0,
            sellable_unit_name: item.sellable_unit_name || 'Piece'
          } as Product,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total_price || item.quantity * Number(item.unit_price))
        })) || [],
        payments: dbSale.payments?.map(payment => ({
          id: payment.id,
          sale_id: payment.sale_id,
          user_name: payment.user_name,
          method: payment.method,
          amount: Number(payment.amount),
          payment_date: payment.payment_date,
          reference_number: payment.reference_number || undefined,
          notes: payment.notes || undefined,
          created_at: payment.created_at
        })) || [],
        timestamp: new Date(dbSale.sale_date)
      }));
      
      setTodaySales(transformedSales);
    } catch (error) {
      console.error('Failed to load today\'s sales:', error);
      // Fallback to empty array if API fails
      setTodaySales([]);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const addToCurrentSale = (product: Product) => {
    setCurrentSaleItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: preciseCalculation(item.quantity + 1, item.unitPrice, 'multiply', 2)
              }
            : item
        );
      } else {
        const newItem: CartItem = {
          product,
          quantity: 1,
          unitPrice: product.last_sale_price_per_sellable_unit || product.suggested_sale_price_per_sellable_unit || 0,
          total: product.last_sale_price_per_sellable_unit || product.suggested_sale_price_per_sellable_unit || 0
        };
        return [...prevItems, newItem];
      }
    });
    
    showSnackbar(`${product.name} ${t('pos:addedToCart')}`, 'success');
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCurrentSale(productId);
      return;
    }

    setCurrentSaleItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              total: preciseCalculation(newQuantity, item.unitPrice, 'multiply', 2)
            }
          : item
      )
    );
  };

  const removeFromCurrentSale = (productId: number) => {
    setCurrentSaleItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const clearCurrentSale = () => {
    setCurrentSaleItems([]);
    // Clear payment methods when clearing sale
    setPaymentMethods([]);
    setTotalPaid(0);
    setDiscountAmount(0);
    setDiscountType('fixed');
    showSnackbar(t('pos:saleCleared'), 'success');
  };

  const handleProceedToPayment = () => {
    setPaymentDialogOpen(true);
  };

  const handlePaymentComplete = async (errorMessage?: string) => {
    if (errorMessage) {
      // Show error message in toast
      showSnackbar(errorMessage, 'error');
    } else {
      // Success case - always reload today's sales after payment completion
      await loadTodaySales();
      
      if (selectedSale) {
        // If we were editing a sale, clear the selected sale to exit edit mode
        setSelectedSale(null);
        setSelectedSaleId(null);
        setCurrentSaleItems([]);
        setPaymentMethods([]);
        setTotalPaid(0);
        setDiscountAmount(0);
        setDiscountType('fixed');
        showSnackbar(t('pos:saleUpdated'), 'success');
      } else {
        // New sale completed
        clearCurrentSale();
        showSnackbar(t('pos:saleCompleted'), 'success');
      }
      setPaymentDialogOpen(false);
    }
  };

  const handleSaleSelect = (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedSaleId(sale.id);
    
    // Convert sale items to current sale items format
    const items: CartItem[] = sale.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));
    setCurrentSaleItems(items);
    
    // Load sale payments if they exist
    if (sale.payments && sale.payments.length > 0) {
      const paymentMethods: PaymentMethodData[] = sale.payments.map(payment => ({
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference_number || undefined,
      }));
      setPaymentMethods(paymentMethods);
      setTotalPaid(sale.paid_amount);
    } else {
      setPaymentMethods([]);
      setTotalPaid(0);
    }
  };

  const handleNewSale = () => {
    // Clear current sale items
    setCurrentSaleItems([]);
    // Clear selected sale
    setSelectedSale(null);
    setSelectedSaleId(null);
    // Reset discount and payment state
    setDiscountAmount(0);
    setDiscountType('fixed');
    setTotalPaid(0);
    setPaymentMethods([]);
    // Show success message
    showSnackbar(t('pos:newSaleStarted'), 'success');
  };

  const handleOpenCalculator = () => {
    setCalculatorDialogOpen(true);
  };

  const handleOpenPdfDialog = () => {
    setPdfDialogOpen(true);
  };

  const handleOpenInvoiceDialog = () => {
    setInvoiceDialogOpen(true);
  };

  const handlePrintThermalInvoice = () => {
    if (!selectedSale) {
      showSnackbar(t('pos:noSaleSelected'), 'error');
      return;
    }
    setThermalDialogOpen(true);
  };

  const handleGenerateDailySalesPdf = async () => {
    try {
      await generateDailySalesPdf();
      showSnackbar(t('pos:pdfGenerated'), 'success');
    } catch {
      showSnackbar(t('pos:pdfGenerationFailed'), 'error');
    }
  };

  // Payment method handlers
  const handleRemovePayment = async (index: number) => {
    if (!selectedSale) {
      // For new sales, just update frontend state
      setPaymentMethods(prev => {
        const newMethods = prev.filter((_, i) => i !== index);
        const newTotalPaid = newMethods.reduce((sum, method) => sum + method.amount, 0);
        setTotalPaid(newTotalPaid);
        return newMethods;
      });
      return;
    }

    // For existing sales, update backend
    try {
      const newMethods = paymentMethods.filter((_, i) => i !== index);
      const newTotalPaid = newMethods.reduce((sum, method) => sum + method.amount, 0);
      
      const paymentData = {
        payments: newMethods
          .filter(payment => payment.method !== 'refund') // Filter out refund payments for backend
          .map(payment => ({
            method: payment.method as 'cash' | 'visa' | 'mastercard' | 'bank_transfer' | 'mada' | 'other' | 'store_credit',
            amount: payment.amount,
            payment_date: new Date().toISOString().split('T')[0],
            reference_number: payment.reference || null,
            notes: null,
          })),
      };

      await saleService.addPaymentToSale(selectedSale.id, paymentData);
      
      // Update frontend state
      setPaymentMethods(newMethods);
      setTotalPaid(newTotalPaid);
      await loadTodaySales(); // Reload to get updated data
      showSnackbar(t('pos:paymentRemoved'), 'success');
    } catch (error) {
      console.error('Failed to remove payment:', error);
      showSnackbar(t('pos:paymentRemovalFailed'), 'error');
    }
  };

  const handleCancelPayments = async () => {
    if (!selectedSale) {
      // For new sales, just update frontend state
      setPaymentMethods([]);
      setTotalPaid(0);
      showSnackbar(t('pos:paymentsCancelled'), 'success');
      return;
    }

    // For existing sales, update backend
    try {
      console.log('Cancelling payments for sale ID:', selectedSale.id);
      await saleService.deletePaymentsFromSale(selectedSale.id);
      
      // Update frontend state
      setPaymentMethods([]);
      setTotalPaid(0);
      await loadTodaySales(); // Reload to get updated data
      showSnackbar(t('pos:paymentsCancelled'), 'success');
    } catch (error) {
      console.error('Failed to cancel payments:', error);
      showSnackbar(t('pos:paymentCancellationFailed'), 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <PosHeader 
        onAddProduct={addToCurrentSale} 
        loading={false} 
        onNewSale={handleNewSale} 
        onOpenCalculator={handleOpenCalculator}
        onGeneratePdf={handleGenerateDailySalesPdf}
        onPreviewPdf={handleOpenPdfDialog}
        onGenerateInvoice={handleOpenInvoiceDialog}
        onPrintThermalInvoice={handlePrintThermalInvoice}
        hasSelectedSale={!!selectedSale}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
          {/* Column 2 - Summary and Actions (30%) */}
          <SaleSummaryColumn
          currentSaleItems={currentSaleItems}
          onProceedToPayment={handleProceedToPayment}
          onClearSale={clearCurrentSale}
          discountAmount={discountAmount}
          discountType={discountType}
          totalPaid={totalPaid}
          paymentMethods={paymentMethods}
          onRemovePayment={handleRemovePayment}
          onCancelPayment={handleCancelPayments}
        />
        {/* Column 1 - Current Sale Items (50%) */}
        <CurrentSaleItemsColumn
          currentSaleItems={currentSaleItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCurrentSale}
          onClearAll={clearCurrentSale}
          isSalePaid={totalPaid > 0 && (preciseSum(currentSaleItems.map(item => item.total)) - (discountType === 'percentage' ? (preciseSum(currentSaleItems.map(item => item.total)) * discountAmount) / 100 : discountAmount)) <= totalPaid}
        />

      

        {/* Column 3 - Today's Sales (20%) */}
        <div className={`border-l border-gray-200 transition-all duration-300 ${
          isTodaySalesCollapsed ? 'w-16' : 'w-26'
        }`}>
          <TodaySalesColumn
            sales={todaySales}
            selectedSaleId={selectedSaleId}
            onSaleSelect={handleSaleSelect}
            isCollapsed={isTodaySalesCollapsed}
            onToggleCollapse={() => setIsTodaySalesCollapsed(!isTodaySalesCollapsed)}
          />
        </div>
      </div>

      {/* Sale Editor */}
      <SaleEditor
        sale={selectedSale}
        open={saleEditorOpen}
        onClose={() => {
          setSaleEditorOpen(false);
          setSelectedSale(null);
        }}
        onSaleUpdated={loadTodaySales}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        items={currentSaleItems}
        onPaymentComplete={handlePaymentComplete}
        discountAmount={discountAmount}
        discountType={discountType}
        onDiscountChange={(amount, type) => {
          setDiscountAmount(amount);
          setDiscountType(type);
        }}
        totalPaid={totalPaid}
        onTotalPaidChange={setTotalPaid}
        paymentMethods={paymentMethods}
        onPaymentMethodsChange={setPaymentMethods}
        isEditMode={!!selectedSale}
        saleId={selectedSale?.id}
      />

      {/* Calculator Dialog */}
      <CalculatorDialog 
        open={calculatorDialogOpen} 
        onOpenChange={setCalculatorDialogOpen} 
      />

      {/* PDF Dialog */}
      <PosPdfDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
      />

      {/* Invoice PDF Dialog */}
      <InvoicePdfDialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        sale={selectedSale}
      />

      {/* Thermal Invoice Dialog */}
      <ThermalInvoiceDialog
        open={thermalDialogOpen}
        onClose={() => setThermalDialogOpen(false)}
        sale={selectedSale}
      />

      {/* Snackbar */}
      {snackbar.open && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className={snackbar.severity === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={snackbar.severity === 'success' ? 'text-green-800' : 'text-red-800'}>
              {snackbar.message}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseSnackbar}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default PosPage; 