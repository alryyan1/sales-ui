// src/components/pos/SaleSummaryColumn.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";

// Shadcn Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Icons
import { Receipt } from "lucide-react";

// Types
import { CartItem, Sale } from "./types";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import saleService from "../../services/saleService";
import { SalePaymentCard } from "./SalePaymentCard";

interface SaleSummaryColumnProps {
  currentSaleItems: CartItem[];
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  onDiscountChange?: (amount: number, type: 'percentage' | 'fixed') => void;
  isEditMode?: boolean;
  saleId?: number;
  onPaymentComplete: (errorMessage?: string) => void;
  refreshTrigger?: number; // Add this to force refetch when items are added
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
}) => {
  const { t } = useTranslation(['pos', 'common']);

  const [discountAmount, setDiscountAmount] = useState(externalDiscountAmount);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(externalDiscountType);

  // Sale info state
  const [saleInfo, setSaleInfo] = useState<Sale | null>(null);
  const [loadingSaleInfo, setLoadingSaleInfo] = useState(false);


  const subtotal = preciseSum(currentSaleItems.map(item => item.total), 2);
  
  // Calculate discount
  const discountValue = discountType === 'percentage' 
    ? preciseCalculation(subtotal, discountAmount / 100, 'multiply', 2)
    : discountAmount;

  // Fetch sale info when saleId changes
  useEffect(() => {
    if (saleId) {
      fetchSaleInfo();
    } else {
      setSaleInfo(null);
    }
  }, [saleId]);

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
          } as any,
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
        timestamp: new Date(saleData.sale_date)
      };
      
      setSaleInfo(transformedSale);
    } catch (error) {
      console.error('Failed to fetch sale info:', error);
      setSaleInfo(null);
    } finally {
      setLoadingSaleInfo(false);
    }
  };
  
  // Ensure discount doesn't exceed subtotal
  const actualDiscountValue = Math.min(discountValue, subtotal);
  const afterDiscount = preciseCalculation(subtotal, actualDiscountValue, 'subtract', 2);
  const grandTotal = afterDiscount; // No tax calculation

  // Sync internal discount state with external changes
  useEffect(() => {
    setDiscountAmount(externalDiscountAmount);
    setDiscountType(externalDiscountType);
  }, [externalDiscountAmount, externalDiscountType]);

  // Reset discount when sale changes
  useEffect(() => {
    if (saleId) {
      setDiscountAmount(0);
      setDiscountType('fixed');
    }
  }, [saleId]);

  // Update external state when internal state changes
  useEffect(() => {
    if (onDiscountChange) {
      onDiscountChange(discountAmount, discountType);
    }
  }, [discountAmount, discountType, onDiscountChange]);



  return (
    <div className="w-96 flex flex-col p-2 space-y-2 overflow-y-auto max-h-screen">
      {/* Sale Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>{t('pos:saleSummary')}</span>
            {isEditMode && saleInfo && (
              <span className="text-sm text-gray-500 ml-2">
                #{saleInfo.sale_order_number || saleInfo.id}
              </span>
            )}
            {isEditMode && loadingSaleInfo && (
              <span className="text-sm text-blue-500 ml-2">
                {t('common:loading')}...
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Sale Info - Only show when editing existing sale */}
          {isEditMode && saleInfo && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:saleDate')}</span>
                <span className="font-medium">
                  {new Date(saleInfo.sale_date).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:saleTime')}</span>
                <span className="font-medium">
                  {new Date(saleInfo.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
              
              {saleInfo.user_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('pos:saleUser')}</span>
                  <span className="font-medium">{saleInfo.user_name}</span>
                </div>
              )}
              
              {saleInfo.client_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('pos:client')}</span>
                  <span className="font-medium">{saleInfo.client_name}</span>
                </div>
              )}
              
              <Separator />
            </>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-600">{t('pos:itemsCount')}</span>
            <span className="font-medium">{currentSaleItems.length}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">{t('pos:subtotal')}</span>
            <span className="font-medium">{formatNumber(subtotal)}</span>
          </div>

          {/* Discount Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('pos:discount')}</span>
              <div className="flex items-center space-x-2">
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    size="small"
                  >
                    <MenuItem value="percentage">%</MenuItem>
                    <MenuItem value="fixed">$</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  type="number"
                  value={discountAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 0) {
                      setDiscountAmount(value);
                    }
                  }}
                  inputProps={{
                    min: 0,
                    max: discountType === 'percentage' ? 100 : subtotal,
                    step: 0.01
                  }}
                  sx={{ width: 80 }}
                  error={discountType === 'percentage' ? discountAmount > 100 : discountAmount > subtotal}
                />
              </div>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('pos:discountValue')}</span>
                <span className="font-medium text-green-600">-{formatNumber(actualDiscountValue)}</span>
              </div>
            )}
          </div>

          <Separator />
          
          <div className="flex justify-between">
            <span className="text-lg font-bold">{t('pos:total')}</span>
            <span className="text-lg font-bold text-green-600">{formatNumber(grandTotal)}</span>
          </div>
        </CardContent>
      </Card>



      {/* Payment Methods Section */}
      <SalePaymentCard
        saleId={saleId}
        grandTotal={grandTotal}
        onPaymentComplete={onPaymentComplete}
        isEditMode={isEditMode}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}; 