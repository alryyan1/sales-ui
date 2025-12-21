// src/components/reports/inventory/InventoryBatchDetailsTable.tsx
import React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PurchaseItem as PurchaseItemType } from "@/services/purchaseService"; // Use the detailed type
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
      <p className="px-4 py-2 text-xs text-muted-foreground">
        لا توجد دفعات متاحة لهذا المنتج
      </p>
    );
  }

  const displaySellableUnit = sellableUnitName || "وحدة";

  return (
    <Table className="my-2">
      <TableHeader>
        <TableRow className="text-xs bg-slate-100 dark:bg-slate-700">
          <TableHead>رقم الدفعة</TableHead>
          <TableHead className="text-center">
            الكمية المتبقية ({displaySellableUnit})
          </TableHead>
          <TableHead>تاريخ الانتهاء</TableHead>
          <TableHead className="text-right">
            التكلفة للوحدة ({displaySellableUnit})
          </TableHead>{" "}
          {/* Cost per Sellable Unit */}
          <TableHead className="text-right">
            {`سعر البيع المقترح (${displaySellableUnit})`}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow
            key={batch.id}
            className="text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <TableCell>{batch.batch_number || "-"}</TableCell>
            <TableCell className="text-center">
              {formatNumber(batch.remaining_quantity)}
            </TableCell>
            <TableCell>
              {batch.expiry_date ? formatDate(batch.expiry_date) : "-"}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(batch.cost_per_sellable_unit)}
            </TableCell>{" "}
            {/* Display cost_per_sellable_unit */}
            <TableCell className="text-right">
              {batch.sale_price ? formatCurrency(batch.sale_price) : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
