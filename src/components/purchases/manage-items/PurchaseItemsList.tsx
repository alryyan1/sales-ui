// src/components/purchases/manage-items/PurchaseItemsList.tsx
import React from 'react';
import { Card, CardContent, Typography, Divider, Stack, Box } from '@mui/material';

import PurchaseItemCard from './PurchaseItemCard';
import { PurchaseItem } from '@/services/purchaseService';
import { ProductUnitsMap } from './types';

interface PurchaseItemsListProps {
  items: PurchaseItem[];
  productUnits: ProductUnitsMap;
  isReadOnly: boolean;
  isDeleting: boolean;
  onUpdate: (itemId: number, field: string, value: unknown) => void;
  onDelete: (itemId: number) => void;
}

const PurchaseItemsList: React.FC<PurchaseItemsListProps> = ({
  items,
  productUnits,
  isReadOnly,
  isDeleting,
  onUpdate,
  onDelete,
}) => {
  const sortedItems = [...items].sort((a, b) => b.id - a.id);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          أصناف المشتريات
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {sortedItems.length > 0 ? (
          <Stack spacing={2}>
            {sortedItems.map((item, index) => (
              <PurchaseItemCard
                key={item.id}
                item={item}
                index={index}
                totalItems={items.length}
                productUnits={productUnits}
                isReadOnly={isReadOnly}
                isDeleting={isDeleting}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">لا توجد أصناف في هذه المشتريات</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PurchaseItemsList;
