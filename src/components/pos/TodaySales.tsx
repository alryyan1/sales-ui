// src/components/pos/TodaySales.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  Card,
  CardContent,
  Typography,
  Badge,
  Avatar,
  Grid,
} from "@mui/material";

// MUI Icons
import {
  Receipt as ReceiptIcon,
} from "@mui/icons-material";

// Types
import { formatNumber } from "@/constants";
import { CartItem, Sale } from "./types";

interface TodaySalesProps {
  sales: Sale[];
  onViewSale: (sale: Sale) => void;
}

export const TodaySales: React.FC<TodaySalesProps> = ({ sales, onViewSale }) => {
  const { t } = useTranslation(['pos', 'common']);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t('pos:todaySales')} ({sales.length})
          </Typography>
        </Box>
        
        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          {sales.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: 200,
              color: 'text.secondary'
            }}>
              <ReceiptIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body2">
                {t('pos:noSalesToday')}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {sales.map((sale) => (
                <Grid xs={6} key={sale.id}>
                  <Card
                    sx={{
                      width: 100,
                      height: 100,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => onViewSale(sale)}
                  >
                    <CardContent sx={{ 
                      p: 1, 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      <Badge
                        badgeContent={sale.items.length}
                        color="primary"
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '0.75rem',
                            height: 20,
                            minWidth: 20,
                          }
                        }}
                      >
                        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                          {sale.transactionNumber}
                        </Avatar>
                      </Badge>
                      
                      <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', fontWeight: 500 }}>
                        {formatNumber(sale.total)}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                        {sale.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}; 