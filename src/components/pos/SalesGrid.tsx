// src/components/pos/SalesGrid.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Badge,
  Grid,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";

// MUI Icons
import {
  Receipt as ReceiptIcon,
  ShoppingCart as CartIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

// Types
import { formatNumber } from "@/constants";
import { Sale } from "./types";

interface SalesGridProps {
  sales: Sale[];
  onSaleClick: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
}

export const SalesGrid: React.FC<SalesGridProps> = ({
  sales,
  onSaleClick,
  onEditSale,
}) => {
  const { t } = useTranslation(['pos', 'common']);

  if (sales.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          color: 'text.secondary',
        }}
      >
        <CartIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" gutterBottom>
          {t('pos:noSalesToday')}
        </Typography>
        <Typography variant="body2">
          {t('pos:startMakingSales')}
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {sales.map((sale) => (
        <Grid item xs={12} sm={6} md={4} key={sale.id}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
              position: 'relative',
              height: '100%',
            }}
            onClick={() => onSaleClick(sale)}
          >
            <CardContent sx={{ p: 2 }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <ReceiptIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    #{sale.transactionNumber}
                  </Typography>
                </Box>
                
                <Tooltip title={t('pos:editSale')}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSale(sale);
                    }}
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Time */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {sale.timestamp.toLocaleTimeString()}
              </Typography>

              {/* Items Count */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Badge badgeContent={sale.items.length} color="primary">
                  <CartIcon fontSize="small" color="action" />
                </Badge>
                <Typography variant="body2" color="text.secondary">
                  {sale.items.length} {t('pos:items')}
                </Typography>
              </Box>

              {/* Total Amount */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {formatNumber(sale.total)}
                </Typography>
                
                <Chip
                  label={sale.status}
                  size="small"
                  color={sale.status === 'completed' ? 'success' : 'warning'}
                  variant="outlined"
                />
              </Box>

              {/* Quick Items Preview */}
              {sale.items.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.200' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {t('pos:itemsPreview')}:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {sale.items.slice(0, 3).map((item, index) => (
                      <Chip
                        key={index}
                        label={`${item.product.name} (${item.quantity})`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {sale.items.length > 3 && (
                      <Chip
                        label={`+${sale.items.length - 3} ${t('pos:more')}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}; 