// src/components/pos/SaleItemsTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  CircularProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

// MUI Icons
import {
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

// Types
import { formatNumber } from "@/constants";
import { CartItem } from "./types";

interface SaleItemsTableProps {
  items: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  loading: boolean;
}

export const SaleItemsTable: React.FC<SaleItemsTableProps> = ({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  loading 
}) => {
  const { t } = useTranslation(['pos', 'common']);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t('pos:currentSaleItems')} ({items.length})
          </Typography>
        </Box>
        
        {items.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 300,
            color: 'text.secondary'
          }}>
            <CartIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t('pos:noItemsInSale')}
            </Typography>
            <Typography variant="body2">
              {t('pos:addProductsToStart')}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ flex: 1 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t('pos:product')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">{t('pos:quantity')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">{t('pos:unitPrice')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">{t('pos:total')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">{t('pos:actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.product.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                          {item.product.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {item.product.sku || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <RemoveIcon />
                        </IconButton>
                        <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'center', fontWeight: 500 }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatNumber(item.unitPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {formatNumber(item.total)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onRemoveItem(item.product.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}; 