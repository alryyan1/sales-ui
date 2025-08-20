// src/components/pos/SaleSummaryColumn.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Shadcn Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

// Icons
import { Percent, Edit2, Check, X } from "lucide-react";

// Types
import { CartItem, Sale } from "./types";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import saleService from "../../services/saleService";

// Import the new dialogs
import { PaymentDialog } from "./PaymentDialog";
import { DiscountDialog } from "./DiscountDialog";
import dayjs from "dayjs";

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
  // External control for PaymentDialog
  paymentDialogOpen?: boolean;
  onPaymentDialogOpenChange?: (open: boolean) => void;
  paymentSubmitTrigger?: number;
}

export const SaleSummaryColumn: React.FC<SaleSummaryColumnProps> = ({
  currentSaleItems,
  discountAmount: externalDiscountAmount = 0,
  discountType: externalDiscountType = 'fixed',
  onDiscountChange,
  saleId,
  onPaymentComplete,
  refreshTrigger = 0,
  onSaleDateChange,
  paymentDialogOpen,
  onPaymentDialogOpenChange,
  paymentSubmitTrigger,
}) => {
  const { t } = useTranslation(['pos', 'common']);

  // State for sale info
  const [saleInfo, setSaleInfo] = useState<Sale | null>(null);
  
  // Dialog states
  const [isPaymentDialogOpenInternal, setIsPaymentDialogOpenInternal] = useState(false);
  const isPaymentDialogOpen = paymentDialogOpen ?? isPaymentDialogOpenInternal;
  const setPaymentDialogOpen = (open: boolean) => {
    if (onPaymentDialogOpenChange) onPaymentDialogOpenChange(open);
    else setIsPaymentDialogOpenInternal(open);
  };
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  
  // Discount state
  const [discountAmount, setDiscountAmount] = useState(externalDiscountAmount);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(externalDiscountType);

  // Date editing state
  const [isDateEditing, setIsDateEditing] = useState(false);
  const [editingDate, setEditingDate] = useState('');

  // Determine which items to use for calculations
  const itemsToUse = saleId && saleInfo ? saleInfo.items : currentSaleItems;
  
  // Calculate totals
  const subtotal = preciseSum(itemsToUse.map(item => item.total), 2);
  
  // Calculate discount
  const discountValue = discountType === 'percentage' 
    ? preciseCalculation(subtotal, discountAmount / 100, 'multiply', 2)
    : discountAmount;
  const actualDiscountValue = Math.min(discountValue, subtotal);
  const grandTotal = preciseCalculation(subtotal, actualDiscountValue, 'subtract', 2);
  const isDiscountApplied = actualDiscountValue > 0;

  // Calculate paid amount from sale payments
  const paidAmount = saleInfo?.payments 
    ? preciseSum(saleInfo.payments.map(payment => Number(payment.amount)), 2)
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
        items: saleData.items?.map((item: import('../../services/saleService').SaleItem) => ({
          id: item.id,
          product: {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            sku: item.product_sku || 'N/A',
            scientific_name: '',
            description: '',
            suggested_sale_price_per_sellable_unit: Number(item.unit_price),
            last_sale_price_per_sellable_unit: Number(item.unit_price),
            stock_quantity: item.current_stock_quantity || 0,
            stock_alert_level: item.stock_alert_level || null,
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
        payments: saleData.payments?.map((payment: import('../../services/saleService').Payment) => ({
          id: payment.id,
          sale_id: payment.sale_id,
          user_name: payment.user_name,
          method: payment.method as import('./types').PaymentMethod,
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
    }
  };

  // Sync discount state with external changes
  useEffect(() => {
    setDiscountAmount(externalDiscountAmount);
    setDiscountType(externalDiscountType);
  }, [externalDiscountAmount, externalDiscountType]);

  // Note: we intentionally avoid echoing internal discount state to the parent on every render
  // to prevent update loops. The parent will be notified only on explicit user updates below.

  // Handle discount update (persist via API when a sale exists)
  const handleDiscountUpdate = async (amount: number, type: 'percentage' | 'fixed') => {
    try {
      if (saleId) {
        const updatedSale = await saleService.updateSaleDiscount(saleId, {
          discount_amount: amount,
          discount_type: type,
        });
        // Refresh local sale info from server response to ensure totals are in sync
        setSaleInfo(prev => ({
          ...(prev || ({} as any)),
          id: updatedSale.id,
          sale_order_number: (updatedSale as any).sale_order_number,
          client_id: updatedSale.client_id,
          client_name: (updatedSale as any).client_name,
          user_id: updatedSale.user_id,
          user_name: (updatedSale as any).user_name,
          sale_date: updatedSale.sale_date,
          invoice_number: updatedSale.invoice_number,
          status: updatedSale.status as any,
          total_amount: Number(updatedSale.total_amount),
          paid_amount: Number(updatedSale.paid_amount),
          due_amount: Number((updatedSale as any).due_amount || 0),
          notes: updatedSale.notes as any,
          created_at: (updatedSale as any).created_at,
          updated_at: (updatedSale as any).updated_at,
          items: (updatedSale.items || []).map((item: any) => ({
            id: item.id,
            product: {
              id: item.product_id,
              name: item.product?.name || 'Unknown Product',
              sku: item.product?.sku || 'N/A',
              scientific_name: '',
              description: '',
              suggested_sale_price_per_sellable_unit: Number(item.unit_price),
              last_sale_price_per_sellable_unit: Number(item.unit_price),
              stock_quantity: item.product?.stock_quantity || 0,
              stock_alert_level: item.product?.stock_alert_level || null,
              earliest_expiry_date: item.product?.earliest_expiry_date,
              current_stock_quantity: item.product?.stock_quantity || 0,
              sellable_unit_name: item.product?.sellableUnit?.name || 'Piece',
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || new Date().toISOString(),
            },
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            total: Number(item.total_price || item.quantity * Number(item.unit_price)),
          })),
          payments: (updatedSale.payments || []).map((payment: any) => ({
            id: payment.id,
            sale_id: payment.sale_id,
            user_name: payment.user?.name,
            method: payment.method,
            amount: Number(payment.amount),
            payment_date: payment.payment_date,
            reference_number: payment.reference_number || undefined,
            notes: payment.notes || undefined,
            created_at: payment.created_at,
          })),
        }));
      }
    } catch (error) {
      console.error('Failed to update discount on backend:', error);
    } finally {
      // Update local discount UI state regardless to reflect the attempted change
      setDiscountAmount(amount);
      setDiscountType(type);
      if (onDiscountChange) onDiscountChange(amount, type);
    }
  };

  // Handle payment dialog success
  const handlePaymentSuccess = () => {
    fetchSaleInfo(); // Refresh sale info to get updated payments
    onPaymentComplete(); // Notify parent component
  };

  // Handle date editing
  const handleDateClick = () => {
    if (saleInfo?.sale_date) {
      setEditingDate(saleInfo.sale_date);
      setIsDateEditing(true);
    }
  };

  const handleDateSave = async () => {
    if (saleId && editingDate && onSaleDateChange) {
      try {
        await onSaleDateChange(saleId, editingDate);
        setIsDateEditing(false);
        setEditingDate('');
      } catch (error) {
        console.error('Failed to update sale date:', error);
      }
    }
  };

  const handleDateCancel = () => {
    setIsDateEditing(false);
    setEditingDate('');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="w-full flex flex-col p-2 space-y-2 overflow-y-auto h-full">
      <Card>
        <CardContent className="space-y-4">
          
          {/* Row 1: Sale ID, Date/Time, and Time */}
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">{t('pos:saleId')}</span>
              <span className="font-bold text-lg text-blue-600">
                #{saleInfo?.id || saleId || 'New'}
              </span>
            </div>
            
            {/* Center - Time */}
            <div className="flex flex-col text-center">
              <span className="text-sm text-gray-600">{t('pos:time')}</span>
              <span className="font-semibold text-sm">
                {dayjs(saleInfo?.created_at).format('HH:mm A')}
              </span>
            </div>
            
            {/* Right - Date with edit icon */}
            <div className="flex flex-col text-right">
              <span className="text-sm text-gray-600">{t('pos:date')}</span>
              {isDateEditing ? (
                <div className="flex items-center space-x-1">
                  <Input
                    type="date"
                    value={editingDate}
                    onChange={(e) => setEditingDate(e.target.value)}
                    className="w-24 h-6 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDateSave}
                    className="h-6 w-6 p-0"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDateCancel}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded transition-colors flex items-center justify-end space-x-1"
                  onClick={handleDateClick}
                  title={t('pos:clickToEditDate')}
                >
                  <span className="font-semibold text-sm">
                    {saleInfo?.sale_date}
                  </span>
                  <Edit2 className="h-3 w-3 text-blue-500" />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Row 3: Monetary Info */}
          <div className="space-y-3">
            {/* Items count and subtotal */}
            <div className="flex justify-between">
              <span className="text-gray-600">{t('pos:items')} ({itemsToUse.length})</span>
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
                  className={`h-6 px-2 ${isDiscountApplied ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100' : ''}`}
                  title={isDiscountApplied ? `${t('pos:discount')}: ${formatNumber(actualDiscountValue)}` : t('pos:setDiscount')}
                >
                  <Percent className={`h-3 w-3 ${isDiscountApplied ? 'text-red-600' : ''}`} />
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
            onClick={() => setPaymentDialogOpen(true)}
            className={`w-full ${
              paidAmount > 0 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : ''
            }`}
            disabled={!saleId || grandTotal <= 0}
            size="lg"
          >
            {paidAmount > 0 ? t('pos:payments') : t('pos:addPayment')}
          </Button>

        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        open={isPaymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        saleId={saleId}
        grandTotal={grandTotal}
        paidAmount={paidAmount}
        discountAmount={actualDiscountValue}
        submitTrigger={paymentSubmitTrigger}
        onSuccess={handlePaymentSuccess}
      />

      {/* Discount Dialog */}
      <DiscountDialog
        open={isDiscountDialogOpen}
        onClose={() => setIsDiscountDialogOpen(false)}
        currentAmount={discountAmount}
        currentType={discountType}
        maxAmount={subtotal}
        dueAmount={Math.max(0, grandTotal - paidAmount)}
        onSave={handleDiscountUpdate}
      />
    </div>
  );
};