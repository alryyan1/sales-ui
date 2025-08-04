// src/components/pos/TodaySalesColumn.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// shadcn/ui Components
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Icons
import { Receipt, ChevronLeft, ChevronRight, Check } from "lucide-react";

// Types
import { Sale } from "./types";

interface TodaySalesColumnProps {
  sales: Sale[];
  selectedSaleId: number | null;
  onSaleSelect: (sale: Sale) => Promise<void>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  filterByCurrentUser?: boolean;
  selectedDate?: string;
  loadingSaleId?: number | null;
  isLoading?: boolean; // Add loading state
}

export const TodaySalesColumn: React.FC<TodaySalesColumnProps> = ({
  sales,
  selectedSaleId,
  onSaleSelect,
  isCollapsed = false,
  onToggleCollapse,
  filterByCurrentUser = false,
  selectedDate,
  loadingSaleId = null,
  isLoading = false,
}) => {
  const { t } = useTranslation(['pos', 'common']);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col border-l border-gray-200">
        {/* Collapsed Header */}
        <div className="p-2 border-b border-gray-200 bg-blue-50 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Receipt className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-semibold text-blue-900">
              {filterByCurrentUser ? 'My Sales' : 'Sales'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-blue-100"
            onClick={onToggleCollapse}
          >
            <ChevronRight className="h-2.5 w-2.5 text-blue-600" />
          </Button>
        </div>
        
        {/* Collapsed Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-2">
          <div className="text-center">
            <Badge className="text-xs bg-green-100 text-green-800 border-green-200 mb-1">
              {sales.length}
            </Badge>
            <p className="text-xs text-gray-600">
              {selectedDate ? `Sales ${new Date(selectedDate).toLocaleDateString()}` : 'Sales Today'}
            </p>
            <p className="text-xs font-medium text-green-700">
              {formatCurrency(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="p-2 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Receipt className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">
                {filterByCurrentUser ? 'My Sales' : (selectedDate ? `Sales ${new Date(selectedDate).toLocaleDateString()}` : 'Today\'s Sales')}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-blue-100"
                onClick={onToggleCollapse}
              >
                <ChevronLeft className="h-2.5 w-2.5 text-blue-600" />
              </Button>
            </div>
          </div>
        </div>

        {/* Skeleton Sales List */}
        <div className="flex-1 p-1 overflow-y-auto h-full">
          <div className="grid grid-cols-1 gap-2 p-2">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="relative">
                <div className="w-[50px] h-[50px] bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="h-full flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="p-2 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Receipt className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-900">
              {filterByCurrentUser ? 'My Sales' : (selectedDate ? `Sales ${new Date(selectedDate).toLocaleDateString()}` : 'Today\'s Sales')}
            </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                {formatCurrency(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-blue-100"
                onClick={onToggleCollapse}
              >
                <ChevronLeft className="h-2.5 w-2.5 text-blue-600" />
              </Button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-4 text-gray-600">
          <Receipt className="h-6 w-6 mb-2 opacity-50" />
          <p className="text-xs text-center">{t('pos:noSalesToday')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="p-2 border-b border-gray-200 bg-blue-50 rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Receipt className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-semibold text-blue-900">
              {filterByCurrentUser ? 'My Sales' : (selectedDate ? `Sales ${new Date(selectedDate).toLocaleDateString()}` : 'Today\'s Sales')}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Badge className="text-xs bg-green-100 text-green-800 border-gray-200">
              {sales.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-blue-100"
              onClick={onToggleCollapse}
            >
              <ChevronLeft className="h-2.5 w-2.5 text-blue-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
        <div className="p-1">
          <div className="grid grid-cols-1 gap-2 p-2">
            {sales
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((sale) => (
                <div key={sale.id} className="relative">
                  {/* Badge outside card - show 0 for empty sales */}
                  <Badge className={`absolute -top-1 -right-1 z-10 text-xs ${
                    sale.items.length === 0 
                      ? 'bg-gray-100 text-gray-600 border-gray-200' 
                      : 'bg-orange-100 text-orange-800 border-orange-200'
                  }`}>
                    {sale.items.length}
                  </Badge>
                  
                  <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-sm border w-[50px] h-[50px] ${
                      loadingSaleId === sale.id
                        ? 'ring-1 ring-yellow-500 border-yellow-300 bg-yellow-50'
                        : selectedSaleId === sale.id
                        ? 'ring-1 ring-blue-500 border-blue-300 bg-blue-50'
                        : sale.status === 'draft'
                        ? 'border-dashed border-gray-300 hover:border-gray-400 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={async () => {
                      if (loadingSaleId !== sale.id && selectedSaleId !== sale.id) {
                        await onSaleSelect(sale);
                      }
                    }}
                    style={{ pointerEvents: (loadingSaleId === sale.id || selectedSaleId === sale.id) ? 'none' : 'auto' }}
                  >
                    <CardContent className="p-0 h-full flex items-center justify-center relative">
                      {loadingSaleId === sale.id ? (
                        <div className="text-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-yellow-600 mx-auto mb-1"></div>
                          <div className="text-xs text-yellow-700 font-medium">
                            Loading...
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="font-bold text-sm text-gray-900">
                            {sale.sale_order_number || sale.id}
                          </div>
                          {!filterByCurrentUser && sale.user_name && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {sale.user_name}
                            </div>
                          )}
                        </div>
                      )}
                     
                     {/* Green check mark when total amount equals total paid AND there are payments */}
                     {sale.total_amount === sale.paid_amount && sale.payments && sale.payments.length > 0 && (
                       <div className="absolute bottom-0 left-0 p-1">
                         <div className="h-3 w-3 bg-green-500 rounded-full flex items-center justify-center">
                           <Check className="h-2 w-2 text-white" />
                         </div>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               </div>
             ))}
           </div>
         </div>
       </div>
     </div>
   );
}; 