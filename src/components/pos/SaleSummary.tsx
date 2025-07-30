// src/components/pos/SaleSummary.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Stack,
} from "@mui/material";

// MUI Icons
import {
  Payment as PaymentIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

// Types
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import { CartItem } from "./types";

interface SaleSummaryProps {
  items: CartItem[];
  onProceedToPayment: () => void;
  onClearSale: () => void;
}

export const SaleSummary: React.FC<SaleSummaryProps> = ({ 
  items, 
  onProceedToPayment, 
  onClearSale 
}) => {
  const { t } = useTranslation(['pos', 'common']);

  const subtotal = preciseSum(items.map(item => item.total), 2);
  const total = subtotal; // No tax calculation

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t('pos:saleSummary')}
          </Typography>
        </Box>
        
        <Box sx={{ p: 2, flex: 1 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {t('pos:itemsCount')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {items.length}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {t('pos:subtotal')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {formatNumber(subtotal)}
              </Typography>
            </Box>
            

            
            <Divider />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('pos:total')}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {formatNumber(total)}
              </Typography>
            </Box>
          </Stack>
        </Box>
        
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack spacing={1}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={onProceedToPayment}
              disabled={items.length === 0}
              startIcon={<PaymentIcon />}
            >
              {t('pos:proceedToPayment')}
            </Button>
            
            <Button
              fullWidth
              variant="outlined"
              size="medium"
              onClick={onClearSale}
              disabled={items.length === 0}
              startIcon={<DeleteIcon />}
            >
              {t('pos:clearSale')}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}; 