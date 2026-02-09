import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Box,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { formatNumber } from "@/constants";
import type { SaleItem } from "@/services/saleService";

export interface SaleItemsTableProps {
  items: SaleItem[] | undefined;
  maxHeight?: number;
  /** When provided, quantity becomes editable and this is called on change (blur or Enter). */
  onQuantityChange?: (item: SaleItem, newQuantity: number) => void | Promise<void>;
  /** When provided, price becomes editable and this is called on change (blur or Enter). */
  onPriceChange?: (item: SaleItem, newPrice: number) => void | Promise<void>;
  /** ID of the sale item currently being deleted (e.g. during "remove all"); that row shows a loading spinner. */
  deletingItemId?: number | null;
  /** When provided, each row shows a delete button; called when user clicks it. Typically disabled when sale has payments. */
  onDeleteItem?: (item: SaleItem) => void | Promise<void>;
  /** When false, delete button is disabled (e.g. sale has payments). */
  canDeleteItems?: boolean;
}

function getItemKey(item: SaleItem): number | string {
  return item.id ?? `${item.product_id}-${item.quantity}`;
}

const columnHelper = createColumnHelper<SaleItem>();

const cellSx = {
  fontSize: "0.8125rem",
  py: 1,
  px: 1.5,
  borderBottom: "1px solid",
  borderColor: "divider",
} as const;

const headerSx = {
  fontWeight: 600,
  fontSize: "0.8125rem",
  py: 1,
  px: 1.5,
  backgroundColor: "grey.50",
  borderBottom: "1px solid",
  borderColor: "divider",
  color: "text.secondary",
} as const;

export const SaleItemsTable: React.FC<SaleItemsTableProps> = ({
  items = [],
  maxHeight = 360,
  onQuantityChange,
  onPriceChange,
  deletingItemId = null,
  onDeleteItem,
  canDeleteItems = true,
}) => {
  const list = items ?? [];
  const [editingKey, setEditingKey] = useState<number | string | null>(null);
  const [editingField, setEditingField] = useState<"quantity" | "price" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedRowKey, setSelectedRowKey] = useState<number | string | null>(null);
  const [quantityInputBuffer, setQuantityInputBuffer] = useState("");
  const quantityBufferRef = useRef("");
  quantityBufferRef.current = quantityInputBuffer;

  const selectedItem = useMemo(
    () => (selectedRowKey == null ? null : list.find((item) => getItemKey(item) === selectedRowKey) ?? null),
    [list, selectedRowKey]
  );

  useEffect(() => {
    if (selectedRowKey == null) setQuantityInputBuffer("");
  }, [selectedRowKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Node;
      const isInput = target && (
        (target as HTMLElement).tagName === "INPUT" ||
        (target as HTMLElement).tagName === "TEXTAREA" ||
        (target as HTMLElement).tagName === "SELECT" ||
        (target as HTMLElement).isContentEditable
      );

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (list.length === 0) return;
        const currentIndex = selectedRowKey == null
          ? -1
          : list.findIndex((item) => getItemKey(item) === selectedRowKey);
        const nextIndex = e.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < list.length) {
          e.preventDefault();
          setSelectedRowKey(getItemKey(list[nextIndex]));
          setQuantityInputBuffer("");
          setEditingKey(null);
          setEditingField(null);
        }
        return;
      }

      if (selectedRowKey == null || selectedItem == null || !onQuantityChange || selectedItem.id == null) return;
      if (isInput) return;

      if (e.key === "Enter") {
        e.preventDefault();
        const raw = quantityBufferRef.current.trim();
        const num = raw === "" ? NaN : Number(raw);
        if (Number.isFinite(num) && num > 0) {
          onQuantityChange(selectedItem, num);
          setQuantityInputBuffer("");
        }
        return;
      }
      if (e.key === "Escape") {
        setSelectedRowKey(null);
        setQuantityInputBuffer("");
        setEditingKey(null);
        setEditingField(null);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setQuantityInputBuffer((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key.length === 1 && (/\d/.test(e.key) || e.key === ".")) {
        e.preventDefault();
        setQuantityInputBuffer((prev) => {
          if (e.key === "." && prev.includes(".")) return prev;
          if (prev === "0" && e.key !== ".") return e.key;
          return prev + e.key;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRowKey, selectedItem, onQuantityChange, list]);

  const handleQuantityBlur = useCallback(
    (item: SaleItem) => {
      const key = getItemKey(item);
      if (editingKey !== key || editingField !== "quantity") return;
      const raw = editValue.trim();
      const num = raw === "" ? NaN : Number(raw);
      if (!Number.isFinite(num) || num <= 0) {
        setEditValue(String(item.quantity));
        setEditingKey(null);
        setEditingField(null);
        return;
      }
      const current = Number(item.quantity);
      if (Math.abs(num - current) < 1e-6) {
        setEditingKey(null);
        setEditingField(null);
        return;
      }
      onQuantityChange?.(item, num);
      setEditingKey(null);
      setEditingField(null);
    },
    [editingKey, editingField, editValue, onQuantityChange]
  );

  const handlePriceBlur = useCallback(
    (item: SaleItem) => {
      const key = getItemKey(item);
      if (editingKey !== key || editingField !== "price") return;
      const raw = editValue.trim();
      const num = raw === "" ? NaN : Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        setEditValue(String(item.unit_price ?? 0));
        setEditingKey(null);
        setEditingField(null);
        return;
      }
      const current = Number(item.unit_price ?? 0);
      if (Math.abs(num - current) < 1e-6) {
        setEditingKey(null);
        setEditingField(null);
        return;
      }
      onPriceChange?.(item, num);
      setEditingKey(null);
      setEditingField(null);
    },
    [editingKey, editingField, editValue, onPriceChange]
  );

  const handleQuantityKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const handlePriceKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const startEditingQuantity = useCallback(
    (item: SaleItem) => {
      if (!onQuantityChange || item.id == null) return;
      setEditingKey(getItemKey(item));
      setEditingField("quantity");
      setEditValue(String(item.quantity));
    },
    [onQuantityChange]
  );

  const startEditingPrice = useCallback(
    (item: SaleItem) => {
      if (!onPriceChange || item.id == null) return;
      setEditingKey(getItemKey(item));
      setEditingField("price");
      setEditValue(String(item.unit_price ?? 0));
    },
    [onPriceChange]
  );

  const isEditing = useCallback(
    (item: SaleItem, field?: "quantity" | "price") => {
      if (editingKey !== getItemKey(item)) return false;
      if (field) return editingField === field;
      return editingField !== null;
    },
    [editingKey, editingField]
  );

  const isSelected = useCallback(
    (item: SaleItem) => selectedRowKey !== null && getItemKey(item) === selectedRowKey,
    [selectedRowKey]
  );

  const handleRowClick = useCallback((item: SaleItem) => {
    setSelectedRowKey(getItemKey(item));
    setEditingKey(null);
    setEditingField(null);
  }, []);

  const columns = useMemo(() => [
    columnHelper.display({
      id: "number",
      header: "#",
      cell: ({ row }) => {
        const item = row.original;
        if (deletingItemId != null && item.id === deletingItemId) {
          return <CircularProgress size={20} sx={{ display: "block", mx: "auto" }} />;
        }
        return row.index + 1;
      },
      meta: { align: "center" },
    }),
    columnHelper.accessor(
      (row) => row.product_name ?? row.product?.name ?? `#${row.product_id}`,
      {
        id: "product",
        header: "المنتج",
        cell: ({ row }) => {
          const item = row.original;
          const name = item.product_name ?? item.product?.name ?? `#${item.product_id}`;
          const scientificName = item.product?.scientific_name;
          return (
            <Box>
              <Typography component="span" sx={{ fontSize: "0.8125rem" }}>
                {name}
                {scientificName ? ` (${scientificName})` : ""}
              </Typography>
            </Box>
          );
        },
        meta: { align: "left" },
      }
    ),
    columnHelper.accessor("quantity", {
      id: "quantity",
      header: "الكمية",
      meta: { align: "center" },
      cell: ({ row }) => {
        const item = row.original;
        const canEdit = Boolean(onQuantityChange && item.id != null);
        const editing = isEditing(item, "quantity");
        const selected = isSelected(item);
        const showBuffer = selected && quantityInputBuffer !== "";
        if (!canEdit) return formatNumber(item.quantity);
        if (showBuffer) {
          return (
            <Box
              component="span"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                startEditingQuantity(item);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  startEditingQuantity(item);
                }
              }}
              aria-label="تعديل الكمية أو Enter للحفظ"
              sx={{
                fontWeight: 500,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 2,
                "&:hover": { opacity: 0.85 },
              }}
            >
              {quantityInputBuffer || "0"}
            </Box>
          );
        }
        if (editing) {
          return (
            <Box
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              sx={{ display: "inline-block" }}
            >
              <TextField
                size="small"
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleQuantityBlur(item)}
                onKeyDown={handleQuantityKeyDown}
                inputProps={{
                  min: 0.01,
                  step: 0.01,
                  "aria-label": "الكمية",
                }}
                sx={{
                  width: 88,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "background.paper",
                    fontSize: "0.8125rem",
                    "& fieldset": {
                      borderColor: "primary.main",
                      borderWidth: 1.5,
                    },
                    "&:hover fieldset": { borderColor: "primary.main" },
                    "&.Mui-focused fieldset": { borderWidth: 2 },
                  },
                  "& .MuiInputBase-input": { py: 0.5, textAlign: "center" },
                }}
                autoFocus
              />
            </Box>
          );
        }
        return (
          <Box
            component="span"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              startEditingQuantity(item);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                startEditingQuantity(item);
              }
            }}
            aria-label="تعديل الكمية"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              cursor: "pointer",
              border: "1px solid",
              borderColor: "transparent",
              color: "text.primary",
              transition: "background-color 0.15s, border-color 0.15s",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "divider",
              },
              "&:focus-visible": {
                outline: "2px solid",
                outlineOffset: 2,
                outlineColor: "primary.main",
              },
            }}
          >
            {formatNumber(item.quantity)}
            <EditOutlinedIcon sx={{ fontSize: 14, opacity: 0.6 }} />
          </Box>
        );
      },
    }),
    columnHelper.display({
      id: "stock",
      header: "المخزون",
      cell: ({ row }) => {
        const item = row.original;
        const stock =
          item.current_stock_quantity ??
          item.product?.current_stock_quantity ??
          (typeof item.product?.stock_quantity === "number" ? item.product.stock_quantity : Number(item.product?.stock_quantity));
        const value = stock != null && !Number.isNaN(stock) ? formatNumber(stock) : "—";
        return (
          <Typography component="span" sx={{ fontSize: "0.8125rem" }}>
            {value}
          </Typography>
        );
      },
      meta: { align: "center" },
    }),
    columnHelper.accessor((row) => Number(row.unit_price ?? 0), {
      id: "price",
      header: "السعر",
      meta: { align: "right" },
      cell: ({ row }) => {
        const item = row.original;
        const canEdit = Boolean(onPriceChange && item.id != null);
        const editing = isEditing(item, "price");
        if (!canEdit) return formatNumber(Number(item.unit_price ?? 0));
        if (editing) {
          return (
            <Box
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              sx={{ display: "inline-block" }}
            >
              <TextField
                size="small"
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handlePriceBlur(item)}
                onKeyDown={handlePriceKeyDown}
                inputProps={{
                  min: 0,
                  step: 0.01,
                  "aria-label": "السعر",
                }}
                sx={{
                  width: 100,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "background.paper",
                    fontSize: "0.8125rem",
                    "& fieldset": {
                      borderColor: "primary.main",
                      borderWidth: 1.5,
                    },
                    "&:hover fieldset": { borderColor: "primary.main" },
                    "&.Mui-focused fieldset": { borderWidth: 2 },
                  },
                  "& .MuiInputBase-input": { py: 0.5, textAlign: "right" },
                }}
                autoFocus
              />
            </Box>
          );
        }
        return (
          <Box
            component="span"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              startEditingPrice(item);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                startEditingPrice(item);
              }
            }}
            aria-label="تعديل السعر"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              cursor: "pointer",
              border: "1px solid",
              borderColor: "transparent",
              color: "text.primary",
              transition: "background-color 0.15s, border-color 0.15s",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "divider",
              },
              "&:focus-visible": {
                outline: "2px solid",
                outlineOffset: 2,
                outlineColor: "primary.main",
              },
            }}
          >
            {formatNumber(Number(item.unit_price ?? 0))}
            <EditOutlinedIcon sx={{ fontSize: 14, opacity: 0.6 }} />
          </Box>
        );
      },
    }),
    columnHelper.accessor(
      (row) =>
        Number(
          row.total_price ?? row.quantity * Number(row.unit_price ?? 0)
        ),
      {
        id: "total",
        header: "الإجمالي",
        cell: ({ getValue }) => formatNumber(getValue()),
        meta: { align: "right" },
      }
    ),
    ...(onDeleteItem
      ? [
          columnHelper.display({
            id: "actions",
            header: "",
            cell: ({ row }) => {
              const item = row.original;
              const isDeleting = deletingItemId != null && item.id === deletingItemId;
              const disabled = !canDeleteItems || isDeleting || item.id == null;
              if (isDeleting) {
                return (
                  <CircularProgress size={20} sx={{ display: "block", mx: "auto" }} />
                );
              }
              return (
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item);
                  }}
                  disabled={disabled}
                  aria-label="حذف الصنف"
                  sx={{ p: 0.25 }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
              );
            },
            meta: { align: "center" },
          }),
        ]
      : []),
  ], [
    onQuantityChange,
    onPriceChange,
    onDeleteItem,
    canDeleteItems,
    editingKey,
    editingField,
    editValue,
    isEditing,
    isSelected,
    quantityInputBuffer,
    handleQuantityBlur,
    handlePriceBlur,
    handleQuantityKeyDown,
    handlePriceKeyDown,
    startEditingQuantity,
    startEditingPrice,
    deletingItemId,
  ]);

  const table = useReactTable({
    data: list,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(getItemKey(row)),
  });

  return (
    <TableContainer
      sx={{
        maxHeight,
        mb: 1.5,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        overflow: "auto",
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell
                  key={header.id}
                  align={(header.column.columnDef.meta as { align?: "left" | "center" | "right" })?.align ?? "left"}
                  sx={headerSx}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                align="center"
                sx={{
                  py: 4,
                  color: "text.secondary",
                  fontSize: "0.875rem",
                }}
              >
                لا توجد عناصر
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const item = row.original;
              const selected = isSelected(item);
              const isDeleting = deletingItemId != null && item.id === deletingItemId;
              return (
              <TableRow
                key={row.id}
                onClick={() => !isDeleting && handleRowClick(item)}
                sx={{
                  cursor: isDeleting ? "wait" : "pointer",
                  backgroundColor: selected ? "action.selected" : undefined,
                  opacity: isDeleting ? 0.7 : 1,
                  pointerEvents: isDeleting ? "none" : undefined,
                  "&:hover": {
                    backgroundColor: isDeleting ? undefined : selected ? "action.selected" : "action.hover",
                  },
                  "&:last-child td": { borderBottom: 0 },
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    align={
                      (cell.column.columnDef.meta as { align?: "left" | "center" | "right" })?.align ?? "left"
                    }
                    sx={cellSx}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
