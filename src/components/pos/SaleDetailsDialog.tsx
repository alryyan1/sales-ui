// src/components/pos/SaleDetailsDialog.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";

// MUI Icons
import {
  Close as CloseIcon,
} from "@mui/icons-material";

// Types
import { formatNumber } from "@/constants";
import { CartItem, Sale } from "./types";

interface SaleDetailsDialogProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

export const SaleDetailsDialog: React.FC<SaleDetailsDialogProps> = ({ 
  sale, 
  open, 
  onClose 
}) => {
  const { t } = useTranslation(['pos', 'common']);

  if (!sale) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {t('pos:saleDetails')} #{sale.transactionNumber}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('pos:transactionTime')}: {sale.timestamp.toLocaleString()}
          </Typography>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('pos:product')}</TableCell>
                <TableCell align="center">{t('pos:quantity')}</TableCell>
                <TableCell align="right">{t('pos:unitPrice')}</TableCell>
                <TableCell align="right">{t('pos:total')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.items.map((item) => (
                <TableRow key={item.product.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {item.product.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">
                        {item.product.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">{formatNumber(item.unitPrice)}</TableCell>
                  <TableCell align="right">{formatNumber(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'right' }}>
            {t('pos:total')}: {formatNumber(sale.total)}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>{t('common:close')}</Button>
      </DialogActions>
    </Dialog>
  );
}; 