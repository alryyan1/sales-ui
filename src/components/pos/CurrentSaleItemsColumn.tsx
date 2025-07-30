// src/components/pos/CurrentSaleItemsColumn.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Icons
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  Package,
  Calendar,
} from "lucide-react";

// Types
import { CartItem } from "./types";
import { formatNumber } from "@/constants";

interface CurrentSaleItemsColumnProps {
  currentSaleItems: CartItem[];
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onRemoveItem: (productId: number) => void;
}

export const CurrentSaleItemsColumn: React.FC<CurrentSaleItemsColumnProps> = ({
  currentSaleItems,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const { t } = useTranslation(['pos', 'common']);

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isExpiringSoon = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  };

  const isLowStock = (stockQuantity: number, alertLevel: number | null) => {
    return alertLevel !== null && stockQuantity <= alertLevel;
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>{t('pos:currentSaleItems')}</span>
            <Badge variant="secondary">{currentSaleItems.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {currentSaleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">{t('pos:noItemsInSale')}</h3>
              <p className="text-sm">{t('pos:addProductsToStart')}</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
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
                        <div className="flex flex-col items-center space-y-1">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">
                              {currentSaleItems.indexOf(item) + 1}
                            </span>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-sm">{item.product.name}</div>
                            <div className="text-xs text-gray-500">SKU: {item.product.sku || 'N/A'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-center">
                          <div className="font-medium text-sm">{formatNumber(item.unitPrice)}</div>
                          <div className="text-xs text-gray-500">per unit</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-bold text-green-600 text-sm">{formatNumber(item.total)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <div className="flex items-center space-x-1">
                            <Package className="h-3 w-3 text-gray-500" />
                            <span className={`text-sm font-medium ${
                              isLowStock(item.product.current_stock_quantity || item.product.stock_quantity, item.product.stock_alert_level) 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {formatNumber(item.product.current_stock_quantity || item.product.stock_quantity)}
                            </span>
                          </div>
                          {isLowStock(item.product.current_stock_quantity || item.product.stock_quantity, item.product.stock_alert_level) && (
                            <span className="text-xs text-red-500">Low Stock</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.product.earliest_expiry_date ? (
                          <div className="flex flex-col items-center space-y-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-gray-500" />
                              <span className={`text-sm font-medium ${
                                isExpiringSoon(item.product.earliest_expiry_date) 
                                  ? 'text-red-600' 
                                  : 'text-gray-700'
                              }`}>
                                {formatExpiryDate(item.product.earliest_expiry_date)}
                              </span>
                            </div>
                            {isExpiringSoon(item.product.earliest_expiry_date) && (
                              <span className="text-xs text-red-500">Expiring Soon</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No Expiry</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 