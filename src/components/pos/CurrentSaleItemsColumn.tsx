// src/components/pos/CurrentSaleItemsColumn.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

// shadcn/ui Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Icons
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Package, 
  Calendar,
  Check,
  X
} from "lucide-react";

// Types
import { CartItem } from "./types";
import { formatNumber } from "@/constants";

interface CurrentSaleItemsColumnProps {
  currentSaleItems: CartItem[];
  onUpdateQuantity: (productId: number, newQuantity: number) => Promise<void>;
  onRemoveItem: (productId: number) => Promise<void>;
  isSalePaid?: boolean;
  deletingItems?: Set<number>; // Track which items are being deleted
  updatingItems?: Set<number>; // Track which items are being updated
  isLoading?: boolean; // Add loading state
}

export const CurrentSaleItemsColumn: React.FC<CurrentSaleItemsColumnProps> = ({
  currentSaleItems,
  onUpdateQuantity,
  onRemoveItem,
  isSalePaid = false,
  deletingItems = new Set(),
  updatingItems = new Set(),
  isLoading = false,
}) => {
  const { t } = useTranslation(['pos', 'common']);
  
  // State for editing quantity
  const [editingQuantity, setEditingQuantity] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [stockingMode, setStockingMode] = useState<Set<number>>(new Set()); // productIds in stocking mode

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isExpiringSoon = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
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

    // If stocking mode is on, interpret editValue as stocking units
    const isStocking = stockingMode.has(productId);
    const unitsPerStocking = (() => {
      const item = currentSaleItems.find(ci => ci.product.id === productId);
      // Fallback to 1 if missing
      return item && (Number((item as unknown as { product: { units_per_stocking_unit?: number } }).product.units_per_stocking_unit) || 1);
    })();
    const targetSellableQty = isStocking ? (newQuantity * (Number(unitsPerStocking) || 1)) : newQuantity;

    await onUpdateQuantity(productId, targetSellableQty);
    setEditingQuantity(null);
    setEditValue("");
  };

  const handleQuantityCancel = () => {
    setEditingQuantity(null);
    setEditValue("");
  };

  const handleKeyDown = (event: React.KeyboardEvent, productId: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleQuantitySave(productId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleQuantityCancel();
    }
  };

  const handleInputBlur = (productId: number) => {
    // Small delay to allow button clicks to register
    setTimeout(() => {
      if (editingQuantity === productId) {
        handleQuantityCancel();
      }
    }, 100);
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
                      <TableHead className="text-center">No.</TableHead>
                      <TableHead className="text-center">Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-center">Unit Price</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Expiry</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
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
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto"></div>
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
              <h3 className="text-xl font-medium mb-2">{t('pos:noItemsInSale')}</h3>
              <p className="text-base">{t('pos:addProductsToStart')}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">No.</TableHead>
                      <TableHead className="text-center">Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-center">Unit Price</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Expiry</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSaleItems.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell className="text-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                            <span className="text-sm font-bold text-blue-600">
                              {currentSaleItems.indexOf(item) + 1}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-center">
                            <div className="font-medium text-xl">{item.product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {item.product.sku || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const units = Number((item as unknown as { product: { units_per_stocking_unit?: number } }).product.units_per_stocking_unit) || 1;
                                const step = stockingMode.has(item.product.id) ? Math.max(1, Number(units) || 1) : 1;
                                await onUpdateQuantity(item.product.id, Math.max(1, item.quantity - step));
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
                                  onBlur={() => handleInputBlur(item.product.id)}
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
                                title={isSalePaid ? t('pos:salePaidCannotModify') : t('pos:clickToEditQuantity')}
                              >
                                {stockingMode.has(item.product.id)
                                  ? Math.max(1, Math.round(item.quantity / (Number((item as unknown as { product: { units_per_stocking_unit?: number } }).product.units_per_stocking_unit) || 1)))
                                  : item.quantity}
                              </span>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const units = Number((item as unknown as { product: { units_per_stocking_unit?: number } }).product.units_per_stocking_unit) || 1;
                                const step = stockingMode.has(item.product.id) ? Math.max(1, Number(units) || 1) : 1;
                                await onUpdateQuantity(item.product.id, item.quantity + step);
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
                            <div className="font-medium text-base">{formatNumber(item.unitPrice)}</div>
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
                                isLowStock(item.product.stock_quantity, item.product.stock_alert_level) 
                                  ? 'text-red-600' 
                                  : 'text-green-600'
                              }`}>
                                {formatNumber(item.product.stock_quantity)}
                              </span>
                            </div>
                            {isLowStock(item.product.stock_quantity, item.product.stock_alert_level) && (
                              <span className="text-sm text-red-500">Low Stock</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.product.earliest_expiry_date ? (
                            <div className="flex flex-col items-center space-y-1">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3 text-gray-500" />
                                <span className={`text-base font-medium ${
                                  isExpiringSoon(item.product.earliest_expiry_date) 
                                    ? 'text-red-600' 
                                    : 'text-gray-700'
                                }`}>
                                  {formatExpiryDate(item.product.earliest_expiry_date)}
                                </span>
                              </div>
                              {isExpiringSoon(item.product.earliest_expiry_date) && (
                                <span className="text-sm text-red-500">Expiring Soon</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-base text-gray-500">No Expiry</span>
                          )}
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
                            title={isSalePaid ? t('pos:salePaidCannotModify') : t('pos:removeItem')}
                          >
                            {deletingItems.has(item.product.id) ? (
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600"></div>
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}
                          </Button>
                          {/* Toggle sellable/stocking unit mode */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const next = new Set(stockingMode);
                              if (next.has(item.product.id)) next.delete(item.product.id);
                              else next.add(item.product.id);
                              setStockingMode(next);
                            }}
                            className="h-10 px-2 ms-2"
                            title={stockingMode.has(item.product.id) ? 'Selling by stocking unit' : 'Selling by sellable unit'}
                            disabled={isSalePaid}
                          >
                            {stockingMode.has(item.product.id) ? 'Stocking' : 'Sellable'}
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
    </div>
  );
}; 