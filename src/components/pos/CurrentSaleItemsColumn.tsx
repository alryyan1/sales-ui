// src/components/pos/CurrentSaleItemsColumn.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// shadcn/ui Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Icons
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Package, 
  Calendar,
  Trash
} from "lucide-react";

// Types
import { CartItem } from "./types";
import { formatNumber } from "@/constants";

interface CurrentSaleItemsColumnProps {
  currentSaleItems: CartItem[];
  onUpdateQuantity: (productId: number, newQuantity: number) => Promise<void>;
  onRemoveItem: (productId: number) => Promise<void>;
  onClearAll?: () => void;
  isSalePaid?: boolean;
}

export const CurrentSaleItemsColumn: React.FC<CurrentSaleItemsColumnProps> = ({
  currentSaleItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  isSalePaid = false,
}) => {
  const { t } = useTranslation(['pos', 'common']);

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

  return (
    <div dir="ltr" className="w-full h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-0">
          {currentSaleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">{t('pos:noItemsInSale')}</h3>
              <p className="text-base">{t('pos:addProductsToStart')}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
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
                          <div className="font-medium text-3xl">{item.product.name}</div>
                          <div className="text-sm text-gray-500">SKU: {item.product.sku || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                                                     <Button
                             variant="outline"
                             size="sm"
                             onClick={async () => await onUpdateQuantity(item.product.id, item.quantity - 1)}
                             disabled={item.quantity <= 1 || isSalePaid}
                             className={`h-8 w-8 p-0 ${
                               (item.quantity <= 1 || isSalePaid) ? 'opacity-50 cursor-not-allowed' : ''
                             }`}
                           >
                             <Minus className="h-4 w-4" />
                           </Button>
                           <span className="w-10 text-center font-medium text-base">{item.quantity}</span>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={async () => await onUpdateQuantity(item.product.id, item.quantity + 1)}
                             disabled={isSalePaid || (item.quantity >= item.product.stock_quantity)}
                             className={`h-8 w-8 p-0 ${
                               (isSalePaid || (item.quantity >= item.product.stock_quantity)) ? 'opacity-50 cursor-not-allowed' : ''
                             }`}
                           >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-center">
                          <div className="font-medium text-base">{formatNumber(item.unitPrice)}</div>
                          <div className="text-sm text-gray-500">per unit</div>
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
                          disabled={isSalePaid}
                          className={`h-10 w-10 p-0 ${
                            isSalePaid 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-red-500 hover:text-red-700'
                          }`}
                          title={isSalePaid ? t('pos:salePaidCannotModify') : t('pos:removeItem')}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 