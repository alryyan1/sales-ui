import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "sonner";
import { formatNumber, CURRENCY_DECIMALS } from "@/constants";
import type { SaleItem } from "@/services/saleService";
import { ProductImage } from "@/components/products/ProductImage";
import { useSettings } from "@/context/SettingsContext";

export interface SaleItemsTableProps {
  items: SaleItem[] | undefined;
  maxHeight?: number;
  /** When provided, quantity becomes editable and this is called on change (blur or Enter). */
  onQuantityChange?: (
    item: SaleItem,
    newQuantity: number,
  ) => void | Promise<void>;
  /** When provided, price becomes editable and this is called on change (blur or Enter). */
  onPriceChange?: (item: SaleItem, newPrice: number) => void | Promise<void>;
  /** ID of the sale item currently being deleted (e.g. during "remove all"); that row shows a loading spinner. */
  deletingItemId?: number | null;
  /** When provided, each row shows a delete button; called when user clicks it. Typically disabled when sale has payments. */
  onDeleteItem?: (item: SaleItem) => void | Promise<void>;
  /** When false, delete button is disabled (e.g. sale has payments). */
  canDeleteItems?: boolean;
  /** When true, quantity and price are read-only (e.g. when amount paid equals total after discount). */
  disableQuantityAndPriceEdit?: boolean;
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
  disableQuantityAndPriceEdit = false,
}) => {
  const { getSetting } = useSettings();
  const showExpiryDateColumn =
    !getSetting("hide_expiry_date", false) &&
    (getSetting("pos_show_expiry_date_column", true) as boolean);
  const currencyDecimals =
    CURRENCY_DECIMALS[getSetting("currency_code", "SDG") as string] ?? 0;
  // Most recently added item first (highest id on top), so the first item added to the
  // sale ends up at the bottom of the table.
  const list = useMemo(
    () => [...(items ?? [])].sort((a, b) => (b.id ?? Infinity) - (a.id ?? Infinity)),
    [items],
  );
  const [editingKey, setEditingKey] = useState<number | string | null>(null);
  const [editingField, setEditingField] = useState<"quantity" | "price" | null>(
    null,
  );
  const [editValue, setEditValue] = useState("");
  const [selectedRowKey, setSelectedRowKey] = useState<number | string | null>(
    null,
  );
  const [updatingKeys, setUpdatingKeys] = useState<Set<number | string>>(
    new Set(),
  );

  const trackUpdate = useCallback(
    async (key: number | string, operation: () => void | Promise<void>) => {
      setUpdatingKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      try {
        await operation();
      } finally {
        setUpdatingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (list.length === 0 || selectedRowKey == null) return;
        const currentIndex = list.findIndex(
          (item) => getItemKey(item) === selectedRowKey,
        );
        const nextIndex =
          e.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < list.length) {
          e.preventDefault();
          const nextItem = list[nextIndex];
          setSelectedRowKey(getItemKey(nextItem));
          // Auto-start editing quantity for the newly selected row
          if (onQuantityChange) {
            setEditingKey(getItemKey(nextItem));
            setEditingField("quantity");
            setEditValue(String(nextItem.quantity));
          } else {
            setEditingKey(null);
            setEditingField(null);
          }
        }
        return;
      }
      if (e.key === "Escape") {
        setSelectedRowKey(null);
        setEditingKey(null);
        setEditingField(null);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedRowKey,
    list,
    onQuantityChange,
    // we don't include setEditingKey/Field/Value in dep array usually as they are stable from useState
  ]);

  const handleQuantityBlur = useCallback(
    (item: SaleItem) => {
      const key = getItemKey(item);
      if (editingKey !== key || editingField !== "quantity") return;
      const raw = editValue.trim();
      const num = raw === "" ? NaN : Math.round(Number(raw));
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
      // onQuantityChange?.(item, num);
      const updateKey = `${getItemKey(item)}-quantity`;
      trackUpdate(updateKey, async () => {
        await onQuantityChange?.(item, num);
        setEditingKey(null);
        setEditingField(null);
      });
    },
    [editingKey, editingField, editValue, onQuantityChange, trackUpdate],
  );

  const handlePriceBlur = useCallback(
    (item: SaleItem) => {
      const key = getItemKey(item);
      if (editingKey !== key || editingField !== "price") return;
      const raw = editValue.trim();
      const num = raw === "" ? NaN : Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        setEditValue(String(Number(item.unit_price ?? 0)));
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
      // onPriceChange?.(item, num);
      const updateKey = `${getItemKey(item)}-price`;
      trackUpdate(updateKey, async () => {
        await onPriceChange?.(item, num);
        setEditingKey(null);
        setEditingField(null);
      });
    },
    [editingKey, editingField, editValue, onPriceChange, trackUpdate],
  );

  const handleQuantityKeyDown = useCallback(
    (e: React.KeyboardEvent, item: SaleItem) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent default form submit or newline

        // 1. Commit current value
        const raw = editValue.trim();
        const num = raw === "" ? NaN : Math.round(Number(raw));
        if (Number.isFinite(num) && num > 0) {
          // Only update if changed
          const current = Number(item.quantity);
          if (Math.abs(num - current) >= 1e-6) {
            // onQuantityChange?.(item, num);
            const updateKey = `${getItemKey(item)}-quantity`;
            trackUpdate(updateKey, () => onQuantityChange?.(item, num));
          }
        } else {
          // Invalid value (empty or <= 0), maybe revert?
          // For now, let's just not save invalid values or let blur handle revert
        }

        // 2. Move to next row
        const currentIndex = list.findIndex(
          (i) => getItemKey(i) === getItemKey(item),
        );
        if (currentIndex !== -1 && currentIndex < list.length - 1) {
          const nextItem = list[currentIndex + 1];
          setSelectedRowKey(getItemKey(nextItem));
          // Start editing next item's quantity
          if (onQuantityChange) {
            setEditingKey(getItemKey(nextItem));
            setEditingField("quantity");
            setEditValue(String(nextItem.quantity));
          }
        } else {
          // Last item, just blur/stop editing
          setEditingKey(null);
          setEditingField(null);
        }
      }
    },
    [list, editValue, onQuantityChange, trackUpdate],
  );

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
    [onQuantityChange],
  );

  const startEditingPrice = useCallback(
    (item: SaleItem) => {
      if (!onPriceChange || item.id == null) return;
      setEditingKey(getItemKey(item));
      setEditingField("price");
      setEditValue(String(Number(item.unit_price ?? 0)));
    },
    [onPriceChange],
  );

  const isEditing = useCallback(
    (item: SaleItem, field?: "quantity" | "price") => {
      if (editingKey !== getItemKey(item)) return false;
      if (field) return editingField === field;
      return editingField !== null;
    },
    [editingKey, editingField],
  );

  const isSelected = useCallback(
    (item: SaleItem) =>
      selectedRowKey !== null && getItemKey(item) === selectedRowKey,
    [selectedRowKey],
  );

  const handleRowClick = useCallback(
    (item: SaleItem) => {
      setSelectedRowKey(getItemKey(item));
      // Auto-start editing quantity
      if (onQuantityChange && item.id != null) {
        setEditingKey(getItemKey(item));
        setEditingField("quantity");
        setEditValue(String(item.quantity));
      } else {
        setEditingKey(null);
        setEditingField(null);
      }
    },
    [onQuantityChange],
  );

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "number",
        header: "#",
        cell: ({ row }) => {
          const item = row.original;
          if (deletingItemId != null && item.id === deletingItemId) {
            return (
              <CircularProgress
                size={20}
                sx={{ display: "block", mx: "auto" }}
              />
            );
          }
          if (isSelected(item)) {
            return (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  color: "primary.main",
                }}
              >
                <KeyboardArrowLeftIcon fontSize="small" />
              </Box>
            );
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
            const name =
              item.product_name ?? item.product?.name ?? `#${item.product_id}`;
            const scientificName = item.product?.scientific_name;
            const returnedQty = item.returned_quantity ?? 0;
            const isFullyReturned = returnedQty > 0 && returnedQty >= (item.quantity ?? 0);
            const sku = item.product?.sku ?? item.product_sku ?? null;
            const hasImage = Boolean(item.product?.image_url);
            return (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                {!hasImage && sku ? (
                  <Tooltip title={`نسخ الباركود: ${sku}`} arrow>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard
                          .writeText(sku)
                          .then(() => toast.success("تم نسخ الباركود"))
                          .catch(() => toast.error("تعذّر نسخ الباركود"));
                      }}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        border: "1px dashed",
                        borderColor: "divider",
                        flexShrink: 0,
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <ProductImage
                    imageUrl={item.product?.image_url}
                    productName={name}
                    size={32}
                    variant="rounded"
                  />
                )}
                <Tooltip title={scientificName ? `${name} (${scientificName})` : name} arrow>
                  <Typography
                    component="span"
                    dir="auto"
                    sx={{
                      maxWidth: { xs: 200, sm: 320, md: 440 },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                      fontSize: "0.8125rem",
                      textDecoration: isFullyReturned ? "line-through" : "none",
                      color: isFullyReturned ? "text.disabled" : "text.primary",
                    }}
                  >
                    {name}
                    {scientificName ? ` (${scientificName})` : ""}
                  </Typography>
                </Tooltip>
                {returnedQty > 0 && (
                  <Tooltip
                    title={isFullyReturned ? "تم إرجاع هذا الصنف بالكامل" : `تم إرجاع ${returnedQty} من أصل ${item.quantity}`}
                    arrow
                  >
                    <Chip
                      label={`مرتجع ${returnedQty}`}
                      size="small"
                      color={isFullyReturned ? "error" : "warning"}
                      variant="outlined"
                      sx={{ height: 17, fontSize: "0.65rem", cursor: "default" }}
                    />
                  </Tooltip>
                )}
              </Box>
            );
          },
          meta: { align: "left" },
        },
      ),
      columnHelper.accessor("quantity", {
        id: "quantity",
        header: "الكمية",
        meta: { align: "center" },
        cell: ({ row }) => {
          const item = row.original;
          const canEdit = Boolean(
            onQuantityChange && item.id != null && !disableQuantityAndPriceEdit,
          );
          const editing = isEditing(item, "quantity");
          const key = getItemKey(item);
          const isUpdating = updatingKeys.has(`${key}-quantity`);

          if (isUpdating) {
            return (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} thickness={4} />
              </Box>
            );
          }

          if (!canEdit) return formatNumber(item.quantity);
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
                  // onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => handleQuantityKeyDown(e, item)}
                  inputProps={{
                    min: 1,
                    step: 1,
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
            (typeof item.product?.stock_quantity === "number"
              ? item.product.stock_quantity
              : Number(item.product?.stock_quantity));
          const value = item.product?.is_service
            ? "خدمة"
            : stock != null && !Number.isNaN(stock)
              ? formatNumber(stock)
              : "—";
          const batch = item.batch_number_sold;
          return (
            <Box sx={{ textAlign: "center" }}>
              <Typography component="div" sx={{ fontSize: "0.8125rem" }}>
                {value}
              </Typography>
              {batch && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ color: "text.secondary", fontSize: "0.7rem" }}
                >
                  {batch}
                </Typography>
              )}
            </Box>
          );
        },
        meta: { align: "center" },
      }),
      ...(showExpiryDateColumn
        ? [
            columnHelper.display({
              id: "expiry_date",
              header: "تاريخ الانتهاء",
              cell: ({ row }) => {
                const item = row.original;
                const expiryDate =
                  item.expiry_date ||
                  item.purchase_item?.expiry_date ||
                  item.purchaseItemBatch?.expiry_date ||
                  item.earliest_expiry_date ||
                  item.product?.earliest_expiry_date;

                if (!expiryDate) {
                  return (
                    <Typography
                      component="span"
                      sx={{ fontSize: "0.8125rem", color: "text.disabled" }}
                    >
                      —
                    </Typography>
                  );
                }

                // Calculate days until expiry
                const today = new Date();
                const expiry = new Date(expiryDate);
                const diffDays = Math.ceil(
                  (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                );

                // Determine color based on expiry status
                let color = "text.primary";
                let bgcolor = "transparent";
                if (diffDays < 0) {
                  color = "error.main";
                  bgcolor = "error.lighter";
                } else if (diffDays <= 7) {
                  color = "error.main";
                  bgcolor = "error.lighter";
                } else if (diffDays <= 30) {
                  color = "warning.main";
                  bgcolor = "warning.lighter";
                }

                // Format date as YYYY-MM-DD
                const formattedDate = expiryDate.split("T")[0];

                return (
                  <Box
                    sx={{
                      display: "inline-block",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor,
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.8125rem",
                        color,
                        fontWeight: diffDays <= 7 ? 600 : 400,
                      }}
                    >
                      {formattedDate}
                    </Typography>
                  </Box>
                );
              },
              meta: { align: "center" },
            }),
          ]
        : []),
      columnHelper.accessor((row) => Number(row.unit_price ?? 0), {
        id: "price",
        header: "السعر",
        meta: { align: "right" },
        cell: ({ row }) => {
          const item = row.original;
          const canEdit = Boolean(
            onPriceChange && item.id != null && !disableQuantityAndPriceEdit,
          );
          const editing = isEditing(item, "price");
          const key = getItemKey(item);
          const isUpdating = updatingKeys.has(`${key}-price`);

          if (isUpdating) {
            return (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} thickness={4} />
              </Box>
            );
          }

          if (!canEdit)
            return formatNumber(Number(item.unit_price ?? 0), currencyDecimals);
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
                  // onFocus={(e) => e.target.select()}
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
              {formatNumber(Number(item.unit_price ?? 0), currencyDecimals)}
              <EditOutlinedIcon sx={{ fontSize: 14, opacity: 0.6 }} />
            </Box>
          );
        },
      }),
      columnHelper.accessor(
        (row) =>
          Number(row.total_price ?? row.quantity * Number(row.unit_price ?? 0)),
        {
          id: "total",
          header: "الإجمالي",
          cell: ({ getValue }) => formatNumber(getValue(), currencyDecimals),
          meta: { align: "right" },
        },
      ),
      ...(onDeleteItem
        ? [
            columnHelper.display({
              id: "actions",
              header: "",
              cell: ({ row }) => {
                const item = row.original;
                const isDeleting =
                  deletingItemId != null && item.id === deletingItemId;
                const disabled =
                  !canDeleteItems || isDeleting || item.id == null;
                if (isDeleting) {
                  return (
                    <CircularProgress
                      size={20}
                      sx={{ display: "block", mx: "auto" }}
                    />
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
    ],
    [
      onQuantityChange,
      onPriceChange,
      onDeleteItem,
      canDeleteItems,
      disableQuantityAndPriceEdit,
      showExpiryDateColumn,
      currencyDecimals,
      editingKey,
      editingField,
      editValue,
      isEditing,
      isSelected,
      handleQuantityBlur,
      handlePriceBlur,
      handleQuantityKeyDown,
      handlePriceKeyDown,
      startEditingQuantity,
      startEditingPrice,
      deletingItemId,
      list,
      updatingKeys,
    ],
  );

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
      <Table size="small" style={{direction:'ltr'}} stickyHeader>
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell
                  key={header.id}
                  align={
                    (
                      header.column.columnDef.meta as {
                        align?: "left" | "center" | "right";
                      }
                    )?.align ?? "left"
                  }
                  sx={headerSx}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
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
              const isDeleting =
                deletingItemId != null && item.id === deletingItemId;
              const returnedQty = item.returned_quantity ?? 0;
              const isFullyReturned = returnedQty > 0 && returnedQty >= (item.quantity ?? 0);
              const isPartiallyReturned = returnedQty > 0 && !isFullyReturned;
              return (
                <TableRow
                  key={row.id}
                  onClick={() => !isDeleting && handleRowClick(item)}
                  sx={{
                    cursor: isDeleting ? "wait" : "pointer",
                    backgroundColor: selected
                      ? "action.selected"
                      : isFullyReturned
                        ? "error.50"
                        : isPartiallyReturned
                          ? "warning.50"
                          : undefined,
                    opacity: isDeleting ? 0.7 : 1,
                    pointerEvents: isDeleting ? "none" : undefined,
                    "&:hover": {
                      backgroundColor: isDeleting
                        ? undefined
                        : selected
                          ? "action.selected"
                          : "action.hover",
                    },
                    "&:last-child td": { borderBottom: 0 },
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      align={
                        (
                          cell.column.columnDef.meta as {
                            align?: "left" | "center" | "right";
                          }
                        )?.align ?? "left"
                      }
                      sx={cellSx}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
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
