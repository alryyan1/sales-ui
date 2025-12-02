// src/components/pos/TodaySalesColumn.tsx
import React from "react";

// MUI Components
import {
  Card,
  CardContent,
  Badge,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";

// MUI Icons
import {
  Receipt as ReceiptIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Check as CheckIcon,
} from "@mui/icons-material";

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
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid', borderColor: 'divider' }}>
        {/* Collapsed Header */}
        <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ReceiptIcon sx={{ fontSize: 12, color: 'primary.main' }} />
          </Box>
          <Button
            variant="text"
            size="small"
            onClick={onToggleCollapse}
            sx={{ minWidth: 16, p: 0 }}
          >
            <ChevronRightIcon sx={{ fontSize: 10, color: 'primary.main' }} />
          </Button>
        </Box>
        
        {/* Collapsed Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Badge badgeContent={sales.length} color="success" sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {selectedDate ? `مبيعات ${new Date(selectedDate).toLocaleDateString('ar-SA')}` : 'مبيعات اليوم'}
            </Typography>
            <Typography variant="caption" fontWeight={500} color="success.main">
              {formatCurrency(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid', borderColor: 'divider' }}>
        {/* Header */}
        <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.light', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ReceiptIcon sx={{ fontSize: 12, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="primary.dark">
                {filterByCurrentUser ? 'مبيعاتي' : (selectedDate ? `مبيعات ${new Date(selectedDate).toLocaleDateString('ar-SA')}` : 'مبيعات اليوم')}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ height: 16, width: 48, bgcolor: 'grey.300', borderRadius: 1, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <Button
                variant="text"
                size="small"
                onClick={onToggleCollapse}
                sx={{ minWidth: 16, p: 0 }}
              >
                <ChevronLeftIcon sx={{ fontSize: 10, color: 'primary.main' }} />
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Skeleton Sales List */}
        <Box sx={{ flex: 1, p: 0.5, overflowY: 'auto', height: '100%', width: '100%' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, p: 1 }}>
            {[...Array(8)].map((_, index) => (
              <Box key={index} sx={{ position: 'relative' }}>
                <Box sx={{ width: 50, height: 50, bgcolor: 'grey.300', borderRadius: 1, mx: 'auto', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  if (sales.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid', borderColor: 'divider' }}>
        {/* Header */}
        <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.light' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ReceiptIcon sx={{ fontSize: 12, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="primary.dark">
                {filterByCurrentUser ? 'مبيعاتي' : (selectedDate ? `مبيعات ${new Date(selectedDate).toLocaleDateString('ar-SA')}` : 'مبيعات اليوم')}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Badge badgeContent={formatCurrency(sales.reduce((sum, sale) => sum + sale.total_amount, 0))} color="success" />
              <Button
                variant="text"
                size="small"
                onClick={onToggleCollapse}
                sx={{ minWidth: 16, p: 0 }}
              >
                <ChevronLeftIcon sx={{ fontSize: 10, color: 'primary.main' }} />
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Empty State */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 2, color: 'text.secondary' }}>
          <ReceiptIcon sx={{ fontSize: 24, mb: 1, opacity: 0.5 }} />
          <Typography variant="caption" textAlign="center">لا توجد مبيعات اليوم</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid', borderColor: 'divider' }}>
      {/* Header */}
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.light', borderRadius: '4px 4px 0 0', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ReceiptIcon sx={{ fontSize: 12, color: 'primary.main' }} />
            <Typography variant="caption" fontWeight={600} color="primary.dark">
              {filterByCurrentUser ? 'مبيعاتي' : (selectedDate ? `مبيعات ${new Date(selectedDate).toLocaleDateString('ar-SA')}` : 'مبيعات اليوم')}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Badge badgeContent={sales.length} color="success" />
            <Button
              variant="text"
              size="small"
              onClick={onToggleCollapse}
              sx={{ minWidth: 16, p: 0 }}
            >
              <ChevronLeftIcon sx={{ fontSize: 10, color: 'primary.main' }} />
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Sales List */}
      <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
        <Box sx={{ p: 0.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, p: 1 }}>
            {sales
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((sale) => (
                <Box key={sale.id} sx={{ position: 'relative' }}>
                  {/* Badge outside card - show 0 for empty sales */}
                  <Badge
                    badgeContent={sale.items.length}
                    color={sale.items.length === 0 ? 'default' : 'warning'}
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      zIndex: 10,
                    }}
                  />
                  
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      width: 50,
                      height: 50,
                      border: '1px solid',
                      ...(loadingSaleId === sale.id
                        ? {
                            borderColor: 'warning.main',
                            bgcolor: 'warning.light',
                            boxShadow: '0 0 0 1px',
                            boxShadowColor: 'warning.main',
                          }
                        : selectedSaleId === sale.id
                        ? {
                            borderColor: 'primary.main',
                            bgcolor: 'primary.light',
                            boxShadow: '0 0 0 1px',
                            boxShadowColor: 'primary.main',
                          }
                        : sale.status === 'draft'
                        ? {
                            borderColor: 'grey.300',
                            borderStyle: 'dashed',
                            bgcolor: 'grey.50',
                            '&:hover': { borderColor: 'grey.400' },
                          }
                        : {
                            borderColor: 'grey.200',
                            bgcolor: 'white',
                            '&:hover': { borderColor: 'grey.300', boxShadow: 1 },
                          }),
                      pointerEvents: (loadingSaleId === sale.id || selectedSaleId === sale.id) ? 'none' : 'auto',
                    }}
                    onClick={async () => {
                      if (loadingSaleId !== sale.id && selectedSaleId !== sale.id) {
                        await onSaleSelect(sale);
                      }
                    }}
                  >
                    <CardContent sx={{ p: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {loadingSaleId === sale.id ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <CircularProgress size={16} sx={{ mb: 0.5, color: 'warning.main' }} />
                          <Typography variant="caption" color="warning.dark" fontWeight={500}>
                            جاري التحميل...
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" fontWeight={700} color="text.primary">
                            {sale.sale_order_number || sale.id}
                          </Typography>
                          {!filterByCurrentUser && sale.user_name && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sale.user_name}
                            </Typography>
                          )}
                        </Box>
                      )}
                     
                     {/* Green check mark when total amount equals total paid AND there are payments */}
                     {sale.total_amount === sale.paid_amount && sale.payments && sale.payments.length > 0 && (
                       <Box sx={{ position: 'absolute', bottom: 0, left: 0, p: 0.5 }}>
                         <Box sx={{ height: 12, width: 12, bgcolor: 'success.main', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <CheckIcon sx={{ fontSize: 8, color: 'white' }} />
                         </Box>
                       </Box>
                     )}
                   </CardContent>
                 </Card>
               </Box>
             ))}
           </Box>
         </Box>
       </Box>
     </Box>
   );
 };