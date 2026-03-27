// src/components/purchases/manage-items/PurchaseItemsTable.tsx
import React, { useMemo, useCallback } from "react";
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
import { formatCurrency, formatNumber } from "@/constants";
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
  currency?: string;
  showBatchNumber?: boolean;
  showExpiryDate?: boolean;
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
  currency,
  showBatchNumber = true,
  showExpiryDate = true,
}) => {
  // Helper to check if a specific field is being updated
  const isFieldUpdating = useCallback(
    (itemId: number, fieldName: string) => {
      return updatingField === `${itemId}-${fieldName}`;
    },
    [updatingField],
  );

  const columns = useMemo(
    () => [
      // 1. Index column (ID)
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

      // 2. Product Name column
      columnHelper.accessor("product_name", {
        header: "Product",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ minWidth: 150 }}>
              <Typography variant="body2" fontWeight="600" noWrap>
                {item.product_name ||
                  item.product?.name ||
                  `Product #${item.product_id}`}
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
                  label="Zero Qty"
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

      // 3. Batch Number column (optional)
      ...(showBatchNumber
        ? [
            columnHelper.accessor("batch_number", {
              header: "Batch Number",
              cell: ({ row }: { row: any }) => {
                const item = row.original;
                return (
                  <Box sx={{ position: "relative", minWidth: 100 }}>
                    <InstantTextField
                      value={item.batch_number || ""}
                      onChangeValue={(v: string) =>
                        onUpdate(item.id, "batch_number", v)
                      }
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
          ]
        : []),

      // 4. Expiry Date column (optional)
      ...(showExpiryDate
        ? [
            columnHelper.accessor("expiry_date", {
              header: "Expiry Date",
              cell: ({ row }: { row: any }) => {
                const item = row.original;
                return (
                  <Box sx={{ position: "relative", minWidth: 120 }}>
                    <InstantTextField
                      value={item.expiry_date || ""}
                      onChangeValue={(v: string) =>
                        onUpdate(item.id, "expiry_date", String(v) || null)
                      }
                      type="date"
                      disabled={false}
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
          ]
        : []),

      // 5. Unit Cost column
      columnHelper.accessor("unit_cost", {
        header: ({ table }) => {
          const firstItem = table.getRowModel().rows[0]?.original;
          const unitInfo = firstItem
            ? productUnits[firstItem.product_id]
            : null;
          return (
            <>
              Cost{" "}
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

      // 6. Retail (Sale Price) column
      columnHelper.accessor("sale_price", {
        header: ({ table }) => {
          const firstItem = table.getRowModel().rows[0]?.original;
          const unitInfo = firstItem
            ? productUnits[firstItem.product_id]
            : null;
          return <>Retail ({unitInfo?.sellable_unit_name || "unit"})</>;
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

      // 7. Quantity column
      columnHelper.accessor("quantity", {
        header: ({ table }) => {
          const firstItem = table.getRowModel().rows[0]?.original;
          const unitInfo = firstItem
            ? productUnits[firstItem.product_id]
            : null;
          return (
            <>
              Quantity{" "}
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

      // 8. Total Cost column
      columnHelper.display({
        id: "total_cost",
        header: "Total Cost",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Typography variant="body2" fontWeight="700" color="primary.main">
              {formatNumber(
                item.quantity * Number(item.unit_cost),
              )}
            </Typography>
          );
        },
        size: 120,
      }),

      // 9. Total Retail column (NEW)
      columnHelper.display({
        id: "total_retail",
        header: "Total Retail",
        cell: ({ row }) => {
          const item = row.original;
          const totalRetail = item.quantity * Number(item.sale_price || 0);
          return (
            <Typography variant="body2" fontWeight="700" color="success.main">
              {formatNumber(totalRetail)}
            </Typography>
          );
        },
        size: 120,
      }),

      // 10. Actions column
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              {!isReadOnly && (
                <Tooltip title="Delete">
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
      startIndex,
      totalCount,
      isFieldUpdating,
      currency,
      showBatchNumber,
      showExpiryDate,
    ],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <TableContainer dir="ltr" component={Paper}>
      <Table size="small" >
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
