// src/components/pos/SaleSummaryColumn.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Shadcn Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Icons
import { Receipt, CreditCard, Percent, Plus } from "lucide-react";

// Types
import { CartItem, Sale } from "./types";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import saleService from "../../services/saleService";

// Import the new dialogs
import { PaymentDialog } from "./PaymentDialog";
import { DiscountDialog } from "./DiscountDialog";

interface SaleSummaryColumnProps {
  currentSaleItems: CartItem[];
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  onDiscountChange?: (amount: number, type: 'percentage' | 'fixed') => void;
  isEditMode?: boolean;
  saleId?: number;
  onPaymentComplete: (errorMessage?: string) => void;
  refreshTrigger?: number;
  onSaleDateChange?: (saleId: number, newDate: string) => void;
}

export const SaleSummaryColumn: React.FC<SaleSummaryColumnProps> = ({
  currentSaleItems,
  discountAmount: externalDiscountAmount = 0,
  discountType: externalDiscountType = 'fixed',
  onDiscountChange,
  isEditMode = false,
  saleId,
  onPaymentComplete,
  refreshTrigger = 0,
  onSaleDateChange,
}) => {
  const { t } = useTranslation(['pos', 'common']);

  // State for sale info
  const [saleInfo, setSaleInfo] = useState<Sale | null>(null);
  const [loadingSaleInfo, setLoadingSaleInfo] = useState(false);
  
  // Dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  
  // Discount state
  const [discountAmount, setDiscountAmount] = useState(externalDiscountAmount);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(externalDiscountType);

  // Calculate totals
  const subtotal = preciseSum(currentSaleItems.map(item => item.total), 2);
  
  // Calculate discount
  const discountValue = discountType === 'percentage' 
    ? preciseCalculation(subtotal, discountAmount / 100, 'multiply', 2)
    : discountAmount;
  const actualDiscountValue = Math.min(discountValue, subtotal);
  const grandTotal = preciseCalculation(subtotal, actualDiscountValue, 'subtract', 2);

  // Calculate paid amount from sale payments
  const paidAmount = saleInfo?.payments 
    ? preciseSum(saleInfo.payments.map(payment => payment.amount), 2)
    : 0;

  // Fetch sale info when saleId changes
  useEffect(() => {
    if (saleId) {
      fetchSaleInfo();
    } else {
      setSaleInfo(null);
    }
  }, [saleId, refreshTrigger]);

  const fetchSaleInfo = async () => {
    if (!saleId) return;

    setLoadingSaleInfo(true);
    try {
      const saleData = await saleService.getSale(saleId);
      
      // Transform the backend sale data to match our Sale interface
      const transformedSale: Sale = {
        id: saleData.id,
        sale_order_number: saleData.sale_order_number,
        client_id: saleData.client_id,
        client_name: saleData.client_name,
        user_id: saleData.user_id,
        user_name: saleData.user_name,
        sale_date: saleData.sale_date,
        invoice_number: saleData.invoice_number,
        status: saleData.status,
        total_amount: Number(saleData.total_amount),
        paid_amount: Number(saleData.paid_amount),
        due_amount: Number(saleData.due_amount || 0),
        notes: saleData.notes,
        created_at: saleData.created_at,
        updated_at: saleData.updated_at,
        items: saleData.items?.map((item: any) => ({
          id: item.id,
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku || 'N/A',
            scientific_name: item.scientific_name || '',
            description: item.description || '',
            suggested_sale_price_per_sellable_unit: Number(item.unit_price),
            last_sale_price_per_sellable_unit: Number(item.unit_price),
            stock_quantity: item.current_stock_quantity || 0,
            stock_alert_level: item.stock_alert_level,
            earliest_expiry_date: item.earliest_expiry_date,
            current_stock_quantity: item.current_stock_quantity || 0,
            sellable_unit_name: item.sellable_unit_name || 'Piece',
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString()
          },
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          total: Number(item.total_price || item.quantity * Number(item.unit_price))
        })) || [],
        payments: saleData.payments?.map((payment: any) => ({
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
      };
      
      setSaleInfo(transformedSale);
    } catch (error) {
      console.error('Failed to fetch sale info:', error);
      setSaleInfo(null);
    } finally {
      setLoadingSaleInfo(false);
    }
  };

  // Sync discount state with external changes
  useEffect(() => {
    setDiscountAmount(externalDiscountAmount);
    setDiscountType(externalDiscountType);
  }, [externalDiscountAmount, externalDiscountType]);

  // Update external state when internal state changes
  useEffect(() => {
    if (onDiscountChange) {
      onDiscountChange(discountAmount, discountType);
    }
  }, [discountAmount, discountType, onDiscountChange]);

  // Handle discount update
  const handleDiscountUpdate = (amount: number, type: 'percentage' | 'fixed') => {
    setDiscountAmount(amount);
    setDiscountType(type);
  };

  // Handle payment dialog success
  const handlePaymentSuccess = () => {
    fetchSaleInfo(); // Refresh sale info to get updated payments
    onPaymentComplete(); // Notify parent component
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="w-[450px] flex flex-col p-2 space-y-2 overflow-y-auto max-h-screen">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>{t('pos:saleSummary')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Row 1: Sale ID and Date */}
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">{t('pos:saleId')}</span>
              <span className="font-bold text-lg text-blue-600">
                #{saleInfo?.sale_order_number || saleId || 'New'}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm text-gray-600">{t('pos:date')}</span>
              <span className="font-semibold">
                {saleInfo ? formatDate(saleInfo.sale_date) : formatDate(new Date().toISOString())}
              </span>
            </div>
          </div>

          {/* Row 2: User ID and Time */}
          {saleInfo && (
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">{t('pos:user')}</span>
                <span className="font-semibold">{saleInfo.user_name || saleInfo.user_id}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm text-gray-600">{t('pos:time')}</span>
                <span className="font-semibold">{formatTime(saleInfo.created_at)}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Row 3: Monetary Info */}
          <div className="space-y-3">
            {/* Items count and subtotal */}
            <div className="flex justify-between">
              <span className="text-gray-600">{t('pos:items')} ({currentSaleItems.length})</span>
              <span className="font-medium">{formatNumber(subtotal)}</span>
            </div>

            {/* Discount row with button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">{t('pos:discount')}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDiscountDialogOpen(true)}
                  className="h-6 px-2"
                >
                  <Percent className="h-3 w-3" />
                </Button>
              </div>
              <span className="font-medium text-red-600">
                {actualDiscountValue > 0 ? `-${formatNumber(actualDiscountValue)}` : '0.00'}
              </span>
            </div>

            {/* Total Amount */}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>{t('pos:total')}</span>
              <span className="text-green-600">{formatNumber(grandTotal)}</span>
            </div>

            {/* Paid Amount */}
            <div className="flex justify-between">
              <span className="text-gray-600">{t('pos:paid')}</span>
              <span className="font-medium text-blue-600">{formatNumber(paidAmount)}</span>
            </div>

            {/* Due Amount */}
            {(grandTotal - paidAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:due')}</span>
                <span className="font-medium text-orange-600">{formatNumber(grandTotal - paidAmount)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Add Payment Button */}
          <Button
            onClick={() => setIsPaymentDialogOpen(true)}
            className="w-full"
            disabled={!saleId || grandTotal <= 0}
            size="lg"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {t('pos:addPayment')}
          </Button>

        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        open={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        saleId={saleId}
        grandTotal={grandTotal}
        paidAmount={paidAmount}
        onSuccess={handlePaymentSuccess}
      />

      {/* Discount Dialog */}
      <DiscountDialog
        open={isDiscountDialogOpen}
        onClose={() => setIsDiscountDialogOpen(false)}
        currentAmount={discountAmount}
        currentType={discountType}
        maxAmount={subtotal}
        onSave={handleDiscountUpdate}
      />
    </div>
  );
};