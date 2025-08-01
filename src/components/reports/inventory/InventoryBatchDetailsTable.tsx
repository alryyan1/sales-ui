// src/components/reports/inventory/InventoryBatchDetailsTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["reports", "purchases", "common", "products"]);

  if (!batches || batches.length === 0) {
    return (
      <p className="px-4 py-2 text-xs text-muted-foreground">
        {t("reports:noBatchesAvailableForProduct")}
      </p>
    );
  }

  const displaySellableUnit =
    sellableUnitName || t("products:defaultSellableUnit");

  return (
    <Table size="sm" className="my-2">
      <TableHeader>
        <TableRow className="text-xs bg-slate-100 dark:bg-slate-700">
          <TableHead>{t("purchases:batchNumber")}</TableHead>
          <TableHead className="text-center">
            {t("reports:remainingQty")} ({displaySellableUnit})
          </TableHead>
          <TableHead>{t("purchases:expiryDate")}</TableHead>
          <TableHead className="text-right">
            {t("purchases:costPerUnit")} ({displaySellableUnit})
          </TableHead>{" "}
          {/* Cost per Sellable Unit */}
          <TableHead className="text-right">
            {t("purchases:intendedSalePricePerUnit", {
              unit: displaySellableUnit,
            })}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow
            key={batch.id}
            className="text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <TableCell>{batch.batch_number || t("common:n/a")}</TableCell>
            <TableCell className="text-center">
              {formatNumber(batch.remaining_quantity)}
            </TableCell>
            <TableCell>
              {batch.expiry_date
                ? formatDate(batch.expiry_date)
                : t("common:n/a")}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(batch.cost_per_sellable_unit)}
            </TableCell>{" "}
            {/* Display cost_per_sellable_unit */}
            <TableCell className="text-right">
              {batch.sale_price ? formatCurrency(batch.sale_price) : t("common:n/a")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
