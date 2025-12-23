// src/components/purchases/manage-items/PurchaseItemCard.tsx
import React from 'react';
import { Box, Paper, Typography, Avatar, Chip, IconButton, Tooltip } from '@mui/material';
import { DeleteIcon } from 'lucide-react';

import InstantTextField from '@/components/purchases/InstantTextField';
import { formatCurrency } from '@/constants';
import { PurchaseItem } from '@/services/purchaseService';
import { ProductUnitsMap } from './types';

// Helper: round to exactly 3 decimal places
const roundToThreeDecimals = (value: number): number => {
  return Number(Number(value).toFixed(3));
};

interface PurchaseItemCardProps {
  item: PurchaseItem;
  index: number;
  totalItems: number;
  productUnits: ProductUnitsMap;
  isReadOnly: boolean;
  isDeleting: boolean;
  onUpdate: (itemId: number, field: string, value: unknown) => void;
  onDelete: (itemId: number) => void;
}

const PurchaseItemCard: React.FC<PurchaseItemCardProps> = ({
  item,
  index,
  totalItems,
  productUnits,
  isReadOnly,
  isDeleting,
  onUpdate,
  onDelete,
}) => {
  const unitInfo = productUnits[item.product_id];

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: item.quantity === 0 ? 'error.lighter' : 'background.paper',
        border: item.quantity === 0 ? '1px solid' : 'none',
        borderColor: 'error.main',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(9, 1fr)' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        {/* Product Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
            {totalItems - index}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="medium">
              {item.product_name || item.product?.name || `منتج #${item.product_id}`}
            </Typography>
            {(item.product_sku || item.product?.sku) && (
              <Typography variant="caption" color="text.secondary">
                باركود: {item.product_sku || item.product?.sku}
              </Typography>
            )}
            {item.quantity === 0 && (
              <Chip label="كمية صفر" color="error" size="small" sx={{ mt: 0.5 }} />
            )}
          </Box>
        </Box>

        {/* Batch */}
        <Box sx={{ textAlign: 'center' }}>
          <InstantTextField
            value={item.batch_number || ''}
            onChangeValue={(v) => onUpdate(item.id, 'batch_number', v)}
            type="text"
            placeholder="—"
            disabled={isReadOnly}
          />
          <Typography variant="caption" color="text.secondary">
            رقم الدفعة
          </Typography>
        </Box>

        {/* Quantity */}
        <Box sx={{ textAlign: 'center' }}>
          <InstantTextField
            value={item.quantity}
            onChangeValue={(v) => {
              if (v === '') return;
              onUpdate(item.id, 'quantity', Number(v));
            }}
            type="number"
            min={0}
            step={1}
            disabled={isReadOnly}
          />
          <Typography variant="caption" color="text.secondary">
            الكمية {unitInfo?.stocking_unit_name ? `(${unitInfo.stocking_unit_name})` : ''}
          </Typography>
        </Box>

        {/* Unit Cost */}
        <Box sx={{ textAlign: 'center' }}>
          <InstantTextField
            value={item.unit_cost}
            onChangeValue={(v) => {
              if (v === '') return;
              onUpdate(item.id, 'unit_cost', Number(v));
            }}
            type="number"
            min={0}
            step={0.01}
            disabled={isReadOnly}
          />
          <Typography variant="caption" color="text.secondary">
            سعر التكلفة {unitInfo?.stocking_unit_name ? `(${unitInfo.stocking_unit_name})` : ''}
          </Typography>
        </Box>

        {/* Sale Price (Sellable) */}
        <Box sx={{ textAlign: 'center' }}>
          <InstantTextField
            value={item.sale_price ?? ''}
            onChangeValue={(v) => {
              if (v === '') return;
              onUpdate(item.id, 'sale_price', roundToThreeDecimals(Number(v)));
            }}
            type="number"
            min={0}
            step={0.001}
            disabled={isReadOnly}
          />
          <Typography variant="caption" color="text.secondary">
            سعر البيع {unitInfo?.sellable_unit_name ? `(${unitInfo.sellable_unit_name})` : '(وحدة بيع)'}
          </Typography>
        </Box>

        {/* Sale Price (Stocking) */}
        <Box sx={{ textAlign: 'center' }}>
          <InstantTextField
            value={item.sale_price_stocking_unit ?? ''}
            onChangeValue={(v) => {
              if (v === '') return;
              onUpdate(item.id, 'sale_price_stocking_unit', roundToThreeDecimals(Number(v)));
            }}
            type="number"
            min={0}
            step={0.001}
            disabled={isReadOnly}
          />
          <Typography variant="caption" color="text.secondary">
            سعر البيع ({unitInfo?.stocking_unit_name || 'وحدة تخزين'})
          </Typography>
        </Box>

        {/* Expiry Date */}
        <Box sx={{ textAlign: 'center' }}>
          <InstantTextField
            value={item.expiry_date || ''}
            onChangeValue={(v) => onUpdate(item.id, 'expiry_date', String(v) || null)}
            type="date"
            disabled={isReadOnly}
          />
          <Typography variant="caption" color="text.secondary">
            تاريخ الانتهاء
          </Typography>
        </Box>

        {/* Total Cost */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(item.quantity * Number(item.unit_cost))}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            إجمالي التكلفة
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {!isReadOnly && (
            <Tooltip title="حذف">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(item.id)}
                disabled={isDeleting}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default PurchaseItemCard;
