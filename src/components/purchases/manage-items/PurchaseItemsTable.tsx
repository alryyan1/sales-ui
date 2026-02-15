// src/components/purchases/manage-items/PurchaseItemsTable.tsx
import React, { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import { DeleteIcon } from "lucide-react";

import InstantTextField from "@/components/purchases/InstantTextField";
import { formatCurrency } from "@/constants";
import { PurchaseItem } from "@/services/purchaseService";
import { ProductUnitsMap } from "./types";

// Helper: round to exactly 3 decimal places
const roundToThreeDecimals = (value: number): number => {
  return Number(Number(value).toFixed(3));
};

interface PurchaseItemsTableProps {
  items: PurchaseItem[];
  productUnits: ProductUnitsMap;
  isReadOnly: boolean;
  isDeleting: boolean;
  onUpdate: (itemId: number, field: string, value: unknown) => void;
  onDelete: (itemId: number) => void;
  updatingField: string | null;
  startIndex: number; // For pagination numbering
  totalCount: number; // Total number of items across all pages
}

const columnHelper = createColumnHelper<PurchaseItem>();

const PurchaseItemsTable: React.FC<PurchaseItemsTableProps> = ({
  items,
  productUnits,
  isReadOnly,
  isDeleting,
  onUpdate,
  onDelete,
  updatingField,
  startIndex,
  totalCount,
}) => {
  // Helper to check if a specific field is being updated
  const isFieldUpdating = (itemId: number, fieldName: string) => {
    return updatingField === `${itemId}-${fieldName}`;
  };

  const columns = useMemo(
    () => [
      // Index column - For DESC sorted data (newest first), reverse the numbering
      columnHelper.display({
        id: "index",
        header: "#",
        cell: ({ row }) => {
          // Reverse numbering: newest item (index 0) gets highest number
          // Formula: total - (startIndex + rowIndex)
          const reversedNumber = totalCount - (startIndex + row.index);
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" fontWeight="600">
                {reversedNumber}
              </Typography>
            </Box>
          );
        },
        size: 50,
      }),

      // Product column
      columnHelper.accessor("product_name", {
        header: "المنتج",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ minWidth: 150 }}>
              <Typography variant="body2" fontWeight="600" noWrap>
                {item.product_name ||
                  item.product?.name ||
                  `منتج #${item.product_id}`}
              </Typography>
              {(item.product_sku || item.product?.sku) && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {item.product_sku || item.product?.sku}
                </Typography>
              )}
              {item.quantity === 0 && (
                <Chip
                  label="كمية صفر"
                  color="error"
                  size="small"
                  sx={{ height: 20, fontSize: "0.65rem", mt: 0.5 }}
                />
              )}
            </Box>
          );
        },
        size: 200,
      }),

      // Batch column
      columnHelper.accessor("batch_number", {
        header: "رقم الدفعة",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ position: "relative", minWidth: 100 }}>
              <InstantTextField
                value={item.batch_number || ""}
                onChangeValue={(v) => onUpdate(item.id, "batch_number", v)}
                type="text"
                placeholder="—"
                disabled={isReadOnly}
              />
              {isFieldUpdating(item.id, "batch_number") && (
                <CircularProgress
                  size={16}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              )}
            </Box>
          );
        },
        size: 120,
      }),

      // Quantity column
      columnHelper.accessor("quantity", {
        header: ({ table }) => {
          const firstItem = table.getRowModel().rows[0]?.original;
          const unitInfo = firstItem
            ? productUnits[firstItem.product_id]
            : null;
          return (
            <>
              الكمية{" "}
              {unitInfo?.stocking_unit_name
                ? `(${unitInfo.stocking_unit_name})`
                : ""}
            </>
          );
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ position: "relative", minWidth: 80 }}>
              <InstantTextField
                value={item.quantity}
                onChangeValue={(v) => {
                  if (v === "") return;
                  onUpdate(item.id, "quantity", Number(v));
                }}
                type="number"
                min={0}
                step={1}
                disabled={isReadOnly}
              />
              {isFieldUpdating(item.id, "quantity") && (
                <CircularProgress
                  size={16}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              )}
            </Box>
          );
        },
        size: 100,
      }),

      // Unit Cost column
      columnHelper.accessor("unit_cost", {
        header: ({ table }) => {
          const firstItem = table.getRowModel().rows[0]?.original;
          const unitInfo = firstItem
            ? productUnits[firstItem.product_id]
            : null;
          return (
            <>
              التكلفة{" "}
              {unitInfo?.stocking_unit_name
                ? `(${unitInfo.stocking_unit_name})`
                : ""}
            </>
          );
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ position: "relative", minWidth: 90 }}>
              <InstantTextField
                value={item.unit_cost}
                onChangeValue={(v) => {
                  if (v === "") return;
                  onUpdate(item.id, "unit_cost", Number(v));
                }}
                type="number"
                min={0}
                step={0.01}
                disabled={isReadOnly}
              />
              {isFieldUpdating(item.id, "unit_cost") && (
                <CircularProgress
                  size={16}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              )}
            </Box>
          );
        },
        size: 110,
      }),

      // Sale Price (Sellable) column
      columnHelper.accessor("sale_price", {
        header: ({ table }) => {
          const firstItem = table.getRowModel().rows[0]?.original;
          const unitInfo = firstItem
            ? productUnits[firstItem.product_id]
            : null;
          return <>البيع ({unitInfo?.sellable_unit_name || "وحدة"})</>;
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ position: "relative", minWidth: 90 }}>
              <InstantTextField
                value={item.sale_price ?? ""}
                onChangeValue={(v) => {
                  if (v === "") return;
                  onUpdate(
                    item.id,
                    "sale_price",
                    roundToThreeDecimals(Number(v)),
                  );
                }}
                type="number"
                min={0}
                step={0.001}
                disabled={isReadOnly}
              />
              {isFieldUpdating(item.id, "sale_price") && (
                <CircularProgress
                  size={16}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              )}
            </Box>
          );
        },
        size: 110,
      }),

      // Sale Price (Stocking) column
      columnHelper.accessor("sale_price_stocking_unit", {
        header: ({ table }) => {
          const firstItem = table.getRowModel().rows[0]?.original;
          const unitInfo = firstItem
            ? productUnits[firstItem.product_id]
            : null;
          return <>البيع ({unitInfo?.stocking_unit_name || "تخزين"})</>;
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ position: "relative", minWidth: 90 }}>
              <InstantTextField
                value={item.sale_price_stocking_unit ?? ""}
                onChangeValue={(v) => {
                  if (v === "") return;
                  onUpdate(
                    item.id,
                    "sale_price_stocking_unit",
                    roundToThreeDecimals(Number(v)),
                  );
                }}
                type="number"
                min={0}
                step={0.001}
                disabled={isReadOnly}
              />
              {isFieldUpdating(item.id, "sale_price_stocking_unit") && (
                <CircularProgress
                  size={16}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              )}
            </Box>
          );
        },
        size: 110,
      }),

      // Expiry Date column
      columnHelper.accessor("expiry_date", {
        header: "تاريخ الانتهاء",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ position: "relative", minWidth: 120 }}>
              <InstantTextField
                value={item.expiry_date || ""}
                onChangeValue={(v) =>
                  onUpdate(item.id, "expiry_date", String(v) || null)
                }
                type="date"
                disabled={isReadOnly}
              />
              {isFieldUpdating(item.id, "expiry_date") && (
                <CircularProgress
                  size={16}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              )}
            </Box>
          );
        },
        size: 140,
      }),

      // Total Cost column
      columnHelper.display({
        id: "total_cost",
        header: "إجمالي التكلفة",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Typography variant="body2" fontWeight="700" color="primary.main">
              {formatCurrency(item.quantity * Number(item.unit_cost))}
            </Typography>
          );
        },
        size: 120,
      }),

      // Actions column
      columnHelper.display({
        id: "actions",
        header: "إجراءات",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              {!isReadOnly && (
                <Tooltip title="حذف">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(item.id)}
                    disabled={isDeleting}
                    sx={{ "&:hover": { bgcolor: "error.lighter" } }}
                  >
                    <DeleteIcon size={20} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        },
        size: 80,
      }),
    ],
    [
      productUnits,
      isReadOnly,
      isDeleting,
      onUpdate,
      onDelete,
      updatingField,
      startIndex,
    ],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <TableContainer component={Paper}>
      <Table size="small" sx={{ minWidth: 1200 }}>
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell
                  key={header.id}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "grey.100",
                    whiteSpace: "nowrap",
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              sx={{
                bgcolor:
                  row.original.quantity === 0 ? "error.lighter" : "inherit",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  sx={{
                    py: 1,
                    borderBottom:
                      row.original.quantity === 0 ? "1px solid" : undefined,
                    borderColor: "error.main",
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default React.memo(PurchaseItemsTable);
