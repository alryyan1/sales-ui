// src/components/reports/inventory/InventoryBatchDetailsTable.tsx
import React from "react";

// MUI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
} from "@mui/material";
import { PurchaseItem as PurchaseItemType } from "@/services/purchaseService";
import { formatCurrency, formatDate, formatNumber } from "@/constants";

interface InventoryBatchDetailsTableProps {
  batches: PurchaseItemType[];
  sellableUnitName?: string | null; // Pass from parent product
}

export const InventoryBatchDetailsTable: React.FC<
  InventoryBatchDetailsTableProps
> = ({ batches, sellableUnitName }) => {
  if (!batches || batches.length === 0) {
    return (
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          لا توجد دفعات متاحة لهذا المنتج
        </Typography>
      </Box>
    );
  }

  const displaySellableUnit = sellableUnitName || "وحدة";

  return (
    <Table size="small" sx={{ my: 1 }}>
      <TableHead>
        <TableRow sx={{ bgcolor: "grey.100" }}>
          <TableCell sx={{ fontSize: "0.75rem" }}>رقم الدفعة</TableCell>
          <TableCell align="center" sx={{ fontSize: "0.75rem" }}>
            الكمية المتبقية ({displaySellableUnit})
          </TableCell>
          <TableCell sx={{ fontSize: "0.75rem" }}>تاريخ الانتهاء</TableCell>
          <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
            التكلفة للوحدة ({displaySellableUnit})
          </TableCell>
          <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
            {`سعر البيع المقترح (${displaySellableUnit})`}
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {batches.map((batch) => (
          <TableRow
            key={batch.id}
            hover
            sx={{
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <TableCell sx={{ fontSize: "0.75rem" }}>
              {batch.batch_number || "-"}
            </TableCell>
            <TableCell align="center" sx={{ fontSize: "0.75rem" }}>
              {formatNumber(batch.remaining_quantity)}
            </TableCell>
            <TableCell sx={{ fontSize: "0.75rem" }}>
              {batch.expiry_date ? formatDate(batch.expiry_date) : "-"}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
              {formatCurrency(batch.cost_per_sellable_unit)}
            </TableCell>
            <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
              {batch.sale_price ? formatCurrency(batch.sale_price) : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
