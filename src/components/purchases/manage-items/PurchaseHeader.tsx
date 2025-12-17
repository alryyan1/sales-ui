// src/components/purchases/manage-items/PurchaseHeader.tsx
import React from 'react';
import {
  Paper,
  Stack,
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import AutoDeleteIcon from '@mui/icons-material/AutoDelete';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { Plus } from 'lucide-react';

import PurchaseSummaryDialog from '@/components/purchases/PurchaseSummaryDialog';
import { formatCurrency } from '@/constants';
import { Purchase } from '@/services/purchaseService';
import { PurchaseSummary } from './types';

interface PurchaseHeaderProps {
  purchase: Purchase;
  summary: PurchaseSummary;
  isReadOnly: boolean;
  onBack: () => void;
  onOpenAddDialog: () => void;
  onAddAllProducts: () => void;
  onDeleteZeroQuantity: () => void;
  onStatusChange: (status: 'pending' | 'ordered' | 'received') => void;
  isAddAllPending: boolean;
  isDeleteZeroPending: boolean;
  isStatusPending: boolean;
  summaryDialogOpen: boolean;
  onOpenSummaryDialog: () => void;
  onCloseSummaryDialog: () => void;
}

const PurchaseHeader: React.FC<PurchaseHeaderProps> = ({
  purchase,
  summary,
  isReadOnly,
  onBack,
  onOpenAddDialog,
  onAddAllProducts,
  onDeleteZeroQuantity,
  onStatusChange,
  isAddAllPending,
  isDeleteZeroPending,
  isStatusPending,
  summaryDialogOpen,
  onOpenSummaryDialog,
  onCloseSummaryDialog,
}) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        {/* Title & Back */}
        <Stack direction="row" alignItems="center" gap={2}>
          <IconButton onClick={onBack} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              إدارة أصناف المشتريات #{purchase.id}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              المورد: {purchase.supplier_name || '—'}
            </Typography>
          </Box>
        </Stack>

        {/* Summary Cards */}
        <Stack direction="row" gap={1}>
          <Paper
            sx={{
              p: 1.5,
              minWidth: 80,
              textAlign: 'center',
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              {summary.totalItems}
            </Typography>
            <Typography variant="caption">عدد الأصناف</Typography>
          </Paper>
          <Paper
            sx={{
              p: 1.5,
              minWidth: 80,
              textAlign: 'center',
              bgcolor: 'skyblue',
              color: 'success.contrastText',
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {formatCurrency(summary.totalCost)}
            </Typography>
            <Typography variant="caption">إجمالي التكلفة</Typography>
          </Paper>
        </Stack>

        {/* Actions */}
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          {!isReadOnly && (
            <>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<Plus size={18} />}
                onClick={onOpenAddDialog}
              >
                إضافة صنف
              </Button>
              <Tooltip title="إضافة كل المنتجات إلى الفاتورة">
                <IconButton
                  onClick={onAddAllProducts}
                  disabled={isAddAllPending}
                  color="primary"
                  size="small"
                >
                  {isAddAllPending ? <CircularProgress size={20} /> : <LibraryAddCheckIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف الأصناف ذات الكمية صفر">
                <IconButton
                  onClick={onDeleteZeroQuantity}
                  disabled={isDeleteZeroPending}
                  color="error"
                  size="small"
                >
                  {isDeleteZeroPending ? <CircularProgress size={20} /> : <AutoDeleteIcon />}
                </IconButton>
              </Tooltip>
            </>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<SummarizeIcon />}
            onClick={onOpenSummaryDialog}
          >
            ملخص الفاتورة
          </Button>

          <Dialog open={summaryDialogOpen} onClose={onCloseSummaryDialog} fullWidth maxWidth="sm">
            <PurchaseSummaryDialog summary={summary} supplierName={purchase.supplier_name || '—'} />
          </Dialog>

          {/* Status Select */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={purchase.status}
              onChange={(e) => onStatusChange(e.target.value as 'received' | 'pending' | 'ordered')}
              disabled={isStatusPending}
            >
              <MenuItem value="pending">قيد الانتظار</MenuItem>
              <MenuItem value="ordered">تم الطلب</MenuItem>
              <MenuItem value="received">تم الاستلام</MenuItem>
            </Select>
          </FormControl>
          {isStatusPending && <CircularProgress size={20} />}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default PurchaseHeader;
