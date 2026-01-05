// src/components/pos/SaleSummaryColumn.tsx
import React, { useState, useEffect, useCallback } from "react";

// MUI Components
import {
  Card,
  CardContent,
  Button,
  Divider,
  TextField,
  Box,
  Typography,
  Skeleton,
} from "@mui/material";

// MUI Icons
import {
  Percent as PercentIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Types
import { CartItem, Sale } from "./types";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import saleService from "../../services/saleService";

// Import the new dialogs
import { PaymentDialog } from "./PaymentDialog";
import { DiscountDialog } from "./DiscountDialog";
import dayjs from "dayjs";
import { PaymentMethod } from "./types";
import { Chip, Paper } from "@mui/material";

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
  isLoading?: boolean;
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
  isLoading = false,
}) => {
  // State for sale info
  const [saleInfo, setSaleInfo] = useState<Sale | null>(null);
  const [isFetchingSaleInfo, setIsFetchingSaleInfo] = useState(false);
  
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

  const fetchSaleInfo = useCallback(async () => {
    if (!saleId) return;

    setIsFetchingSaleInfo(true);
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
      console.log('Sale info fetched:', transformedSale);
      console.log('Payments:', transformedSale.payments);
    } catch (error) {
      console.error('Failed to fetch sale info:', error);
      setSaleInfo(null);
    } finally {
      setIsFetchingSaleInfo(false);
    }
  }, [saleId]);

  // Fetch sale info when saleId changes
  useEffect(() => {
    if (saleId) {
      fetchSaleInfo();
    } else {
      setSaleInfo(null);
    }
  }, [saleId, refreshTrigger, fetchSaleInfo]);

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

  const isCurrentlyLoading = isLoading || isFetchingSaleInfo;

  // Helper function to translate payment methods to Arabic
  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    const methodMap: Record<PaymentMethod, string> = {
      cash: "نقدي",
      visa: "فيزا",
      mastercard: "ماستركارد",
      bank_transfer: "تحويل بنكي",
      mada: "مدى",
      store_credit: "رصيد متجر",
      other: "أخرى",
      refund: "استرداد",
    };
    return methodMap[method] || method;
  };

  return (
    <Box sx={{  width: '100%', display: 'flex', flexDirection: 'column', p: 2, gap: 2, overflowY: 'auto', height: '100%' }}>
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isCurrentlyLoading ? (
            // Skeleton loading state
            <>
              {/* Sale ID Skeleton */}
              <Skeleton variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
              
              {/* Date/Time Row Skeleton */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'blue.50', p: 2, borderRadius: 1 }}>
                <Skeleton variant="rectangular" width={96} height={48} />
                <Skeleton variant="rectangular" width={96} height={48} />
                <Skeleton variant="rectangular" width={96} height={48} />
              </Box>

              <Divider />

              {/* Monetary Info Skeleton */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width={80} />
                  <Skeleton variant="text" width={96} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width={64} />
                  <Skeleton variant="text" width={80} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Skeleton variant="text" width={48} />
                  <Skeleton variant="text" width={112} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width={48} />
                  <Skeleton variant="text" width={80} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width={48} />
                  <Skeleton variant="text" width={80} />
                </Box>
              </Box>

              <Divider />

              {/* Button Skeleton */}
              <Skeleton variant="rectangular" height={48} />
            </>
          ) : (
            <>
              <Box
                sx={{
                  textAlign: 'center',
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  border: 1,
                  borderBottom: 2,
                  background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                  color: 'white',
                  borderRadius: 1,
                  py: 1,
                }}
              >
                {saleInfo?.id}
              </Box>
          
              {/* Row 1: Date/Time */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'blue.50', p: 2, borderRadius: 1 }}>
                {/* Center - Time */}
                <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    الوقت
                  </Typography>
                  <Typography variant="body2" fontWeight="semibold">
                    {dayjs(saleInfo?.created_at).format('HH:mm A')}
                  </Typography>
                </Box>
                
                {/* Right - Date with edit icon */}
                <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                    التاريخ
                  </Typography>
                  {isDateEditing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TextField
                        type="date"
                        value={editingDate}
                        onChange={(e) => setEditingDate(e.target.value)}
                        size="small"
                        sx={{ width: 120 }}
                        inputProps={{ style: { fontSize: '0.75rem' } }}
                      />
                      <Button
                        size="small"
                        variant="text"
                        onClick={handleDateSave}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        <CheckIcon fontSize="small" sx={{ color: 'success.main' }} />
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        onClick={handleDateCancel}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        <CloseIcon fontSize="small" sx={{ color: 'error.main' }} />
                      </Button>
                    </Box>
                  ) : (
                    <Box
                      onClick={handleDateClick}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'blue.100' },
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                      }}
                      title="انقر لتعديل التاريخ"
                    >
                      <Typography variant="body2" fontWeight="semibold">
                        {saleInfo?.sale_date}
                      </Typography>
                      <EditIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    </Box>
                  )}
                </Box>
              </Box>

              <Divider />

              {/* Row 3: Monetary Info */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Items count and subtotal */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    العناصر ({itemsToUse.length})
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatNumber(subtotal)}
                  </Typography>
                </Box>

                {/* Discount row with button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      الخصم
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setIsDiscountDialogOpen(true)}
                      sx={{
                        minWidth: 'auto',
                        px: 1,
                        height: 24,
                        ...(isDiscountApplied && {
                          bgcolor: 'error.50',
                          color: 'error.700',
                          borderColor: 'error.300',
                          '&:hover': { bgcolor: 'error.100' },
                        }),
                      }}
                      title={isDiscountApplied ? `الخصم: ${formatNumber(actualDiscountValue)}` : 'تعيين الخصم'}
                    >
                      <PercentIcon fontSize="small" sx={{ fontSize: 12, color: isDiscountApplied ? 'error.main' : 'inherit' }} />
                    </Button>
                  </Box>
                  <Typography variant="body2" fontWeight="medium" color="error.main">
                    {actualDiscountValue > 0 ? `-${formatNumber(actualDiscountValue)}` : '0.00'}
                  </Typography>
                </Box>

                {/* Total Amount */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 'bold', borderTop: 1, borderColor: 'divider', pt: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    الإجمالي
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatNumber(grandTotal)}
                  </Typography>
                </Box>

                {/* Paid Amount */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    المدفوع
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" color="info.main">
                    {formatNumber(paidAmount)}
                  </Typography>
                </Box>

                {/* Due Amount */}
                {(grandTotal - paidAmount) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      المستحق
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="warning.main">
                      {formatNumber(grandTotal - paidAmount)}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Payments List Section */}
              {saleInfo?.payments && saleInfo.payments.length > 0 && (
                <>
                  <Divider />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 0.5 }}>
                      المدفوعات ({saleInfo.payments.length})
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        maxHeight: 200,
                        overflowY: 'auto',
                        pr: 0.5,
                      }}
                    >
                      {saleInfo.payments.map((payment, index) => (
                        <Paper
                          key={payment.id || index}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip
                              label={getPaymentMethodLabel(payment.method)}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '0.7rem',
                                height: 24,
                                borderColor: 'primary.main',
                                color: 'primary.main',
                              }}
                            />
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              {formatNumber(Number(payment.amount))}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {payment.payment_date ? dayjs(payment.payment_date).format('YYYY-MM-DD') : '-'}
                            </Typography>
                            {payment.reference_number && (
                              <Typography variant="caption" color="text.secondary">
                                المرجع: {payment.reference_number}
                              </Typography>
                            )}
                          </Box>
                          {payment.user_name && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                              بواسطة: {payment.user_name}
                            </Typography>
                          )}
                          {payment.notes && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.25 }}>
                              {payment.notes}
                            </Typography>
                          )}
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                </>
              )}

              <Divider />

              {/* Add Payment Button */}
              <Button
                onClick={() => setPaymentDialogOpen(true)}
                variant="contained"
                fullWidth
                size="large"
                disabled={!saleId || grandTotal <= 0}
                sx={{
                  ...(paidAmount > 0 && {
                    bgcolor: 'success.main',
                    '&:hover': { bgcolor: 'success.dark' },
                  }),
                }}
              >
                {paidAmount > 0 ? 'المدفوعات' : 'إضافة دفعة'}
              </Button>
            </>
          )}
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
    </Box>
  );
};
