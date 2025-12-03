// src/components/pos/CurrentSaleItemsColumn.tsx
import React, { useState } from "react";

// shadcn/ui Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Icons
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Package, 
  Check,
  X,
  Layers
} from "lucide-react";

// Types
import { CartItem } from "./types";
import { formatNumber } from "@/constants";
import { BatchSelectionDialog } from "./BatchSelectionDialog";

interface CurrentSaleItemsColumnProps {
  currentSaleItems: CartItem[];
  onUpdateQuantity: (productId: number, newQuantity: number) => Promise<void>;
  onUpdateUnitPrice?: (productId: number, newUnitPrice: number) => Promise<void>;
  onRemoveItem: (productId: number) => Promise<void>;
  onUpdateBatch?: (productId: number, batchId: number | null, batchNumber: string | null, expiryDate: string | null, unitPrice: number) => Promise<void>;
  isSalePaid?: boolean;
  deletingItems?: Set<number>; // Track which items are being deleted
  updatingItems?: Set<number>; // Track which items are being updated
  isLoading?: boolean; // Add loading state
}

export const CurrentSaleItemsColumn: React.FC<CurrentSaleItemsColumnProps> = ({
  currentSaleItems,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onRemoveItem,
  onUpdateBatch,
  isSalePaid = false,
  deletingItems = new Set(),
  updatingItems = new Set(),
  isLoading = false,
}) => {
  // State for editing quantity
  const [editingQuantity, setEditingQuantity] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  // State for editing unit price
  const [editingUnitPrice, setEditingUnitPrice] = useState<number | null>(null);
  const [editUnitPriceValue, setEditUnitPriceValue] = useState<string>("");
  
  // State for batch selection
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<CartItem | null>(null);

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  console.log(currentSaleItems, 'currentSaleItems');

  const isExpired = (item: CartItem) => {
    const expiryDate = item.selectedBatchExpiryDate || item.product.earliest_expiry_date;
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  const getExpiryDate = (item: CartItem) => {
    return item.selectedBatchExpiryDate || item.product.earliest_expiry_date;
  };

  const isLowStock = (stockQuantity: number, alertLevel: number | null) => {
    if (!alertLevel) return false;
    return stockQuantity <= alertLevel;
  };

  const handleQuantityClick = (item: CartItem) => {
    if (isSalePaid) return;
    setEditingQuantity(item.product.id);
    setEditValue(item.quantity.toString());
  };

  const handleQuantitySave = async (productId: number) => {
    const newQuantity = parseInt(editValue);
    if (isNaN(newQuantity) || newQuantity < 1) {
      // Reset to original value if invalid
      setEditingQuantity(null);
      setEditValue("");
      return;
    }

    await onUpdateQuantity(productId, newQuantity);
    setEditingQuantity(null);
    setEditValue("");
  };

  const handleQuantityCancel = () => {
    setEditingQuantity(null);
    setEditValue("");
  };

  const handleUnitPriceClick = (item: CartItem) => {
    if (isSalePaid || !onUpdateUnitPrice) return;
    setEditingUnitPrice(item.product.id);
    setEditUnitPriceValue(item.unitPrice.toString());
  };

  const handleUnitPriceSave = async (productId: number) => {
    if (!onUpdateUnitPrice) return;
    const newUnitPrice = parseFloat(editUnitPriceValue);
    if (isNaN(newUnitPrice) || newUnitPrice < 0) {
      // Reset to original value if invalid
      setEditingUnitPrice(null);
      setEditUnitPriceValue("");
      return;
    }

    await onUpdateUnitPrice(productId, newUnitPrice);
    setEditingUnitPrice(null);
    setEditUnitPriceValue("");
  };

  const handleUnitPriceCancel = () => {
    setEditingUnitPrice(null);
    setEditUnitPriceValue("");
  };

  const handleKeyDown = (event: React.KeyboardEvent, productId: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (editingQuantity === productId) {
        handleQuantitySave(productId);
      } else if (editingUnitPrice === productId) {
        handleUnitPriceSave(productId);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (editingQuantity === productId) {
        handleQuantityCancel();
      } else if (editingUnitPrice === productId) {
        handleUnitPriceCancel();
      }
    }
  };

  const handleInputBlur = (productId: number, type: 'quantity' | 'unitPrice') => {
    // Small delay to allow button clicks to register
    setTimeout(() => {
      if (type === 'quantity' && editingQuantity === productId) {
        handleQuantityCancel();
      } else if (type === 'unitPrice' && editingUnitPrice === productId) {
        handleUnitPriceCancel();
      }
    }, 100);
  };

  const handleBatchSelection = (item: CartItem) => {
    setSelectedProductForBatch(item);
    setBatchDialogOpen(true);
  };

  const handleBatchSelect = async (batch: { id: number; batch_number: string | null; expiry_date: string | null; sale_price: number }) => {
    if (selectedProductForBatch && onUpdateBatch) {
      try {
        await onUpdateBatch(
          selectedProductForBatch.product.id,
          batch.id,
          batch.batch_number,
          batch.expiry_date,
          batch.sale_price
        );
      } catch (error) {
        console.error('Error updating batch:', error);
      }
    }
    setBatchDialogOpen(false);
    setSelectedProductForBatch(null);
  };

  const hasMultipleBatches = (item: CartItem) => {
    console.log(item.product.available_batches, 'available_batches',item.product,'item.product');

    // Check if product has multiple batches available
    return item.product.available_batches && item.product.available_batches.length > 1;
  };
 
  return (
    <div dir="ltr" className="w-full h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-0">
          {isLoading ? (
            // Skeleton loading state
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">الرقم</TableHead>
                      <TableHead className="text-center">المنتج</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-center">سعر الوحدة</TableHead>
                      <TableHead className="text-center">الإجمالي</TableHead>
                      <TableHead className="text-center">المخزون</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse mx-auto"></div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4 mx-auto"></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mx-auto"></div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mx-auto"></div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto"></div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-12 mx-auto"></div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-1">
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : currentSaleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">لا توجد عناصر في البيع</h3>
              <p className="text-base">أضف المنتجات للبدء</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">الرقم</TableHead>
                      <TableHead className="text-center">المنتج</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-center">سعر الوحدة</TableHead>
                      <TableHead className="text-center">الإجمالي</TableHead>
                      <TableHead className="text-center">المخزون</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSaleItems.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell className="text-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center mx-auto ${
                            isExpired(item) ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            <span 
                              className={`text-sm font-bold ${
                                isExpired(item) ? 'text-red-600' : 'text-blue-600'
                              }`}
                              title={getExpiryDate(item) ? `انتهاء الصلاحية: ${formatExpiryDate(getExpiryDate(item)!)}` : undefined}
                            >
                              {currentSaleItems.indexOf(item) + 1}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-center">
                            <div className="font-medium text-xl flex items-center justify-center gap-2">
                                                             {item.product.name.charAt(0).toUpperCase() + item.product.name.slice(1)}
                              {hasMultipleBatches(item) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleBatchSelection(item)}
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                                  title="اختر الدفعة"
                                >
                                  <Layers className="h-4 w-4 animate-bounce" />
                                </Button>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">رمز المنتج: {item.product.sku || 'غير متوفر'}</div>
                            {item.selectedBatchNumber && (
                              <div className="text-xs text-blue-600 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  الدفعة: {item.selectedBatchNumber}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1));
                              }}
                              disabled={item.quantity <= 1 || isSalePaid || updatingItems.has(item.product.id)}
                              className={`h-8 w-8 p-0 ${
                                (item.quantity <= 1 || isSalePaid || updatingItems.has(item.product.id)) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {updatingItems.has(item.product.id) ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                            </Button>
                            
                            {editingQuantity === item.product.id ? (
                              <div className="flex items-center space-x-1">
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, item.product.id)}
                                  onBlur={() => handleInputBlur(item.product.id, 'quantity')}
                                  className="w-16 h-8 text-center text-sm"
                                  min="1"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuantitySave(item.product.id)}
                                  disabled={updatingItems.has(item.product.id)}
                                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleQuantityCancel}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span
                                className="w-14 text-center font-medium text-base cursor-pointer hover:bg-gray-100 rounded px-1 py-1 transition-colors"
                                onClick={() => handleQuantityClick(item)}
                                title={isSalePaid ? 'تم الدفع، لا يمكن التعديل' : 'انقر لتعديل الكمية'}
                              >
                                {item.quantity}
                              </span>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await onUpdateQuantity(item.product.id, item.quantity + 1);
                              }}
                              disabled={isSalePaid || updatingItems.has(item.product.id)}
                              className={`h-8 w-8 p-0 ${
                                (isSalePaid || updatingItems.has(item.product.id)) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {updatingItems.has(item.product.id) ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-center">
                            {editingUnitPrice === item.product.id ? (
                              <div className="flex items-center justify-center space-x-1">
                                <Input
                                  type="number"
                                  value={editUnitPriceValue}
                                  onChange={(e) => setEditUnitPriceValue(e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, item.product.id)}
                                  onBlur={() => handleInputBlur(item.product.id, 'unitPrice')}
                                  className="w-20 h-8 text-center text-sm"
                                  min="0"
                                  step="0.01"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnitPriceSave(item.product.id)}
                                  disabled={updatingItems.has(item.product.id)}
                                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleUnitPriceCancel}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span
                                className="font-medium text-base cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                                onClick={() => handleUnitPriceClick(item)}
                                title={isSalePaid || !onUpdateUnitPrice ? 'تم الدفع، لا يمكن التعديل' : 'انقر لتعديل السعر'}
                              >
                                {formatNumber(item.unitPrice)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-bold text-green-600 text-base">{formatNumber(item.total)}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center space-y-1">
                            <div className="flex items-center space-x-1">
                              <Package className="h-3 w-3 text-gray-500" />
                              <span className={`text-base font-medium ${
                                item.selectedBatchId 
                                  ? (item.selectedBatchNumber ? 'text-blue-600' : 'text-blue-600')
                                  : isLowStock(item.product.stock_quantity, item.product.stock_alert_level) 
                                    ? 'text-red-600' 
                                    : 'text-green-600'
                              }`}>
                                {item.selectedBatchId 
                                  ? (() => {
                                      // Find the selected batch to get its remaining quantity
                                      const selectedBatch = item.product.available_batches?.find(
                                        batch => batch.id === item.selectedBatchId
                                      );
                                      return formatNumber(selectedBatch?.remaining_quantity || 0);
                                    })()
                                  : formatNumber(item.product.stock_quantity)
                                }
                              </span>
                            </div>
                            {item.selectedBatchId && (
                              <span className="text-xs text-blue-600">
                                {item.selectedBatchNumber ? `الدفعة: ${item.selectedBatchNumber}` : 'الدفعة المحددة'}
                              </span>
                            )}
                            {!item.selectedBatchId && isLowStock(item.product.stock_quantity, item.product.stock_alert_level) && (
                              <span className="text-sm text-red-500">مخزون منخفض</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              // Since we now create sales on backend before adding items, 
                              // all sale items have backend records and should use backend deletion
                              await onRemoveItem(item.product.id);
                            }}
                            disabled={isSalePaid || deletingItems.has(item.product.id)}
                            className={`h-10 w-10 p-0 ${
                              isSalePaid 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : deletingItems.has(item.product.id)
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-500 hover:text-red-700'
                            }`}
                            title={isSalePaid ? 'تم الدفع، لا يمكن التعديل' : 'إزالة العنصر'}
                          >
                            {deletingItems.has(item.product.id) ? (
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600"></div>
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Selection Dialog */}
      <BatchSelectionDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        product={selectedProductForBatch?.product || null}
        onBatchSelect={handleBatchSelect}
        selectedBatchId={selectedProductForBatch?.selectedBatchId || null}
      />
    </div>
  );
}; 