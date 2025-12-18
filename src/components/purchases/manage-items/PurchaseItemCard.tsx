// src/components/purchases/manage-items/PurchaseItemCard.tsx
import React, { memo, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Avatar, Chip, IconButton, Tooltip, Stack } from '@mui/material';
import { Trash2 } from 'lucide-react';

import InstantTextField from '@/components/purchases/InstantTextField';
import { formatCurrency } from '@/constants';
import { PurchaseItem } from '@/services/purchaseService';
import { ProductUnitsMap } from './types';

// Helper: round to exactly 3 decimal places
const roundToThreeDecimals = (value: number): number =>
  Math.round(value * 1000) / 1000;

// ==================== SUB-COMPONENTS ====================

interface FieldCellProps {
  label: string;
  children: React.ReactNode;
}

const FieldCell = memo<FieldCellProps>(({ label, children }) => (
  <Box sx={{ textAlign: 'center' }}>
    {children}
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
  </Box>
));
FieldCell.displayName = 'FieldCell';

// ==================== MAIN COMPONENT ====================

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

const PurchaseItemCard: React.FC<PurchaseItemCardProps> = memo(({
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
  const isZeroQuantity = item.quantity === 0;

  // Memoized values
  const productName = item.product_name || item.product?.name || `منتج #${item.product_id}`;
  const productSku = item.product_sku || item.product?.sku;
  const itemNumber = totalItems - index;
  const totalCost = useMemo(() => item.quantity * Number(item.unit_cost), [item.quantity, item.unit_cost]);

  // Unit labels
  const stockingUnitLabel = unitInfo?.stocking_unit_name || 'وحدة تخزين';
  const sellableUnitLabel = unitInfo?.sellable_unit_name || 'وحدة بيع';

  // Callbacks for updates
  const handleBatchChange = useCallback(
    (v: string | number) => onUpdate(item.id, 'batch_number', v),
    [item.id, onUpdate]
  );

  const handleQuantityChange = useCallback(
    (v: string | number) => {
      if (v === '') return;
      onUpdate(item.id, 'quantity', Number(v));
    },
    [item.id, onUpdate]
  );

  const handleUnitCostChange = useCallback(
    (v: string | number) => {
      if (v === '') return;
      onUpdate(item.id, 'unit_cost', Number(v));
    },
    [item.id, onUpdate]
  );

  const handleSalePriceChange = useCallback(
    (v: string | number) => {
      if (v === '') return;
      onUpdate(item.id, 'sale_price', roundToThreeDecimals(Number(v)));
    },
    [item.id, onUpdate]
  );

  const handleSalePriceStockingChange = useCallback(
    (v: string | number) => {
      if (v === '') return;
      onUpdate(item.id, 'sale_price_stocking_unit', roundToThreeDecimals(Number(v)));
    },
    [item.id, onUpdate]
  );

  const handleExpiryChange = useCallback(
    (v: string | number) => onUpdate(item.id, 'expiry_date', String(v) || null),
    [item.id, onUpdate]
  );

  const handleDelete = useCallback(() => onDelete(item.id), [item.id, onDelete]);

  return (
    <Paper
      elevation={isZeroQuantity ? 0 : 1}
      sx={{
        p: 2,
        bgcolor: isZeroQuantity ? 'error.50' : 'background.paper',
        border: '1px solid',
        borderColor: isZeroQuantity ? 'error.main' : 'divider',
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: isReadOnly ? 1 : 3,
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: '2fr repeat(7, 1fr) auto',
          },
          gap: 2,
          alignItems: 'center',
        }}
      >
        {/* Product Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: isZeroQuantity ? 'error.main' : 'primary.main',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {itemNumber}
          </Avatar>
          <Stack spacing={0.25}>
            <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ maxWidth: 180 }}>
              {productName}
            </Typography>
            {productSku && (
              <Typography variant="caption" color="text.secondary">
                {productSku}
              </Typography>
            )}
            {isZeroQuantity && (
              <Chip
                label="كمية صفر"
                color="error"
                size="small"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Stack>
        </Box>

        {/* Batch Number */}
        <FieldCell label="رقم الدفعة">
          <InstantTextField
            value={item.batch_number || ''}
            onChangeValue={handleBatchChange}
            type="text"
            placeholder="—"
            disabled={isReadOnly}
          />
        </FieldCell>

        {/* Quantity */}
        <FieldCell label={`الكمية (${stockingUnitLabel})`}>
          <InstantTextField
            value={item.quantity}
            onChangeValue={handleQuantityChange}
            type="number"
            min={0}
            step={1}
            disabled={isReadOnly}
          />
        </FieldCell>

        {/* Unit Cost */}
        <FieldCell label={`سعر التكلفة (${stockingUnitLabel})`}>
          <InstantTextField
            value={item.unit_cost}
            onChangeValue={handleUnitCostChange}
            type="number"
            min={0}
            step={0.01}
            disabled={isReadOnly}
          />
        </FieldCell>

        {/* Sale Price (Sellable) */}
        <FieldCell label={`سعر البيع (${sellableUnitLabel})`}>
          <InstantTextField
            value={item.sale_price ?? ''}
            onChangeValue={handleSalePriceChange}
            type="number"
            min={0}
            step={0.001}
            disabled={isReadOnly}
          />
        </FieldCell>

        {/* Sale Price (Stocking) */}
        <FieldCell label={`سعر البيع (${stockingUnitLabel})`}>
          <InstantTextField
            value={item.sale_price_stocking_unit ?? ''}
            onChangeValue={handleSalePriceStockingChange}
            type="number"
            min={0}
            step={0.001}
            disabled={isReadOnly}
          />
        </FieldCell>

        {/* Expiry Date */}
        <FieldCell label="تاريخ الانتهاء">
          <InstantTextField
            value={item.expiry_date || ''}
            onChangeValue={handleExpiryChange}
            type="date"
            disabled={isReadOnly}
          />
        </FieldCell>

        {/* Total Cost */}
        <FieldCell label="إجمالي التكلفة">
          <Typography
            variant="body2"
            fontWeight={600}
            color={isZeroQuantity ? 'error.main' : 'success.main'}
          >
            {formatCurrency(totalCost)}
          </Typography>
        </FieldCell>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {!isReadOnly && (
            <Tooltip title="حذف الصنف">
              <IconButton
                size="small"
                color="error"
                onClick={handleDelete}
                disabled={isDeleting}
                sx={{
                  '&:hover': {
                    bgcolor: 'error.50',
                  },
                }}
              >
                <Trash2 size={18} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
});

PurchaseItemCard.displayName = 'PurchaseItemCard';

export default PurchaseItemCard;
