// src/components/pos/BatchSelectionDialog.tsx
import React, { useState, useEffect } from "react";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Box,
  Typography,
  CircularProgress,
  Radio,
} from "@mui/material";

// MUI Icons
import InventoryIcon from '@mui/icons-material/Inventory';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WarningIcon from '@mui/icons-material/Warning';

// Types
import { Product } from "../../services/productService";
import apiClient from "../../lib/axios";

interface Batch {
  id: number;
  batch_number: string | null;
  remaining_quantity: number;
  expiry_date: string | null;
  sale_price: number;
  unit_cost: number;
}

interface BatchSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onBatchSelect: (batch: Batch) => void;
  selectedBatchId?: number | null;
}

export const BatchSelectionDialog: React.FC<BatchSelectionDialogProps> = ({
  open,
  onOpenChange,
  product,
  onBatchSelect,
  selectedBatchId,
}) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  useEffect(() => {
    if (open && product) {
      loadBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  useEffect(() => {
    if (selectedBatchId && batches.length > 0) {
      const batch = batches.find(b => b.id === selectedBatchId);
      setSelectedBatch(batch || null);
    }
  }, [selectedBatchId, batches]);

  const loadBatches = async () => {
    if (!product) return;

    // OFFLINE SUPPORT: Use product.available_batches if available locally
    if (product.available_batches && product.available_batches.length > 0) {
      // Map to Batch interface if necessary, though structure seems similar
      // Product interface has specific structure for available_batches, likely matches or compatible
      // casting or mapping might be needed if types usually don't match perfectly, 
      // but based on typical usage they often do. 
      // Let's assume they map for now or map safely.
      const localBatches = product.available_batches.map(b => ({
        id: b.id,
        batch_number: b.batch_number,
        remaining_quantity: b.remaining_quantity,
        expiry_date: b.expiry_date,
        sale_price: b.sale_price,
        unit_cost: b.unit_cost
      }));
      setBatches(localBatches);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(`/products/${product.id}/available-batches`);
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Error loading batches:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batch: Batch) => {
    setSelectedBatch(batch);
  };

  const handleConfirm = () => {
    if (selectedBatch) {
      onBatchSelect(selectedBatch);
      onOpenChange(false);
    }
  };

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    return expiryDate < today;
  };

  const getExpiryStatus = (dateString: string | null) => {
    if (isExpired(dateString)) return 'expired';
    if (isExpiringSoon(dateString)) return 'expiring-soon';
    return 'good';
  };

  if (!product) return null;

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InventoryIcon color="primary" />
        <Typography variant="h6">اختيار الدفعة - {product.name}</Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : batches.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, color: 'text.secondary' }}>
            <InventoryIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6">لا توجد دفعات متاحة</Typography>
            <Typography variant="body2">لا يوجد مخزون لهذا المنتج</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>اختيار</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>رقم الدفعة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>الكمية المتاحة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>تاريخ الانتهاء</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>سعر البيع</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>سعر التكلفة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {batches.map((batch) => {
                  const expiryStatus = getExpiryStatus(batch.expiry_date);
                  const isSelected = selectedBatch?.id === batch.id;

                  return (
                    <TableRow
                      key={batch.id}
                      hover
                      selected={isSelected}
                      onClick={() => handleBatchSelect(batch)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell align="center">
                        <Radio checked={isSelected} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={batch.batch_number || `ID: ${batch.id}`}
                          variant="outlined"
                          size="small"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <InventoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight="medium">{batch.remaining_quantity}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {expiryStatus === 'expired' && <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} />}
                            {expiryStatus === 'expiring-soon' && <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                            {expiryStatus === 'good' && <CalendarTodayIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                            <Typography
                              variant="body2"
                              color={
                                expiryStatus === 'expired' ? 'error.main' :
                                  expiryStatus === 'expiring-soon' ? 'warning.main' : 'success.main'
                              }
                            >
                              {formatExpiryDate(batch.expiry_date)}
                            </Typography>
                          </Box>
                          {expiryStatus === 'expired' && (
                            <Chip label="منتهي الصلاحية" size="small" color="error" />
                          )}
                          {expiryStatus === 'expiring-soon' && (
                            <Chip label="قريب الانتهاء" size="small" color="warning" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="medium">{batch.sale_price}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">{batch.unit_cost}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {batches.length > 0 && `إجمالي الدفعات المتاحة: ${batches.length}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!selectedBatch || batches.length === 0}
          >
            اختيار الدفعة
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
