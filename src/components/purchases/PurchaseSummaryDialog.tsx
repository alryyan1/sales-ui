// src/components/purchases/PurchaseSummaryDialog.tsx
import React from 'react';
import { DialogTitle, DialogContent, Box, Typography, Paper, Stack, IconButton } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloseIcon from '@mui/icons-material/Close';
import { formatCurrency, formatNumber } from '@/constants';

export interface PurchaseSummary {
  totalItems: number;
  totalCost: number;
  totalSell: number;
  totalQuantity: number;
}

interface PurchaseSummaryDialogProps {
  summary: PurchaseSummary;
  supplierName?: string;
  onClose?: () => void;
}

const PurchaseSummaryDialog: React.FC<PurchaseSummaryDialogProps> = ({ summary, supplierName, onClose }) => {
  return (
    <>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <BarChartIcon color="primary" />
          <Typography variant="h6">ملخص المشتريات</Typography>
        </Box>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Total Items */}
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.lighter' }}>
            <Typography variant="h3" fontWeight="bold" color="primary.main">
              {summary.totalItems}
            </Typography>
            <Typography variant="body2" color="text.secondary">عدد الأصناف</Typography>
          </Paper>

          {/* Total Cost */}
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.lighter' }}>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {formatCurrency(summary.totalCost)}
            </Typography>
            <Typography variant="body2" color="text.secondary">إجمالي التكلفة</Typography>
          </Paper>

          {/* Total Sell Value */}
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.lighter' }}>
            <Typography variant="h4" fontWeight="bold" color="secondary.main">
              {formatCurrency(summary.totalSell)}
            </Typography>
            <Typography variant="body2" color="text.secondary">إجمالي قيمة البيع</Typography>
          </Paper>

          {/* Total Quantity */}
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.lighter' }}>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {formatNumber(summary.totalQuantity, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">إجمالي الكمية</Typography>
          </Paper>

          {/* Supplier */}
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100' }}>
            <Typography variant="h6" fontWeight="medium" color="text.primary">
              {supplierName || 'غير محدد'}
            </Typography>
            <Typography variant="body2" color="text.secondary">المورد</Typography>
          </Paper>
        </Stack>
      </DialogContent>
    </>
  );
};

export default PurchaseSummaryDialog;
