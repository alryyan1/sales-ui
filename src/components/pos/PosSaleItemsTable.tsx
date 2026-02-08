// src/components/pos/PosSaleItemsTable.tsx
// Read-only table of sale items (e.g. for PosBlankPage sale details)

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { formatNumber } from "@/constants";
import type { SaleItem } from "@/services/saleService";

export interface PosSaleItemsTableProps {
  items: SaleItem[] | undefined;
  maxHeight?: number;
}

export const PosSaleItemsTable: React.FC<PosSaleItemsTableProps> = ({
  items = [],
  maxHeight = 220,
}) => {
  const list = items ?? [];

  return (
    <TableContainer sx={{ maxHeight, mb: 1.5 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", py: 0.75 }}>
              المنتج
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem", py: 0.75 }}>
              الكمية
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem", py: 0.75 }}>
              السعر
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem", py: 0.75 }}>
              الإجمالي
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                align="center"
                sx={{ py: 2, color: "text.secondary", fontSize: "0.8rem" }}
              >
                لا توجد عناصر
              </TableCell>
            </TableRow>
          ) : (
            list.map((item) => (
              <TableRow key={item.id ?? `${item.product_id}-${item.quantity}`}>
                <TableCell sx={{ fontSize: "0.8rem", py: 0.5 }}>
                  {item.product_name ?? item.product?.name ?? `#${item.product_id}`}
                </TableCell>
                <TableCell align="center" sx={{ fontSize: "0.8rem", py: 0.5 }}>
                  {formatNumber(item.quantity)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: "0.8rem", py: 0.5 }}>
                  {formatNumber(Number(item.unit_price ?? 0))}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: "0.8rem", py: 0.5, fontWeight: 500 }}>
                  {formatNumber(
                    Number(item.total_price ?? item.quantity * Number(item.unit_price ?? 0))
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
