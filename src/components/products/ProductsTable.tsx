// src/components/products/ProductsTable.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Skeleton,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import {
  AlertTriangle,
  Copy,
  Check,
  Plus,
  X,
  Save,
  Sparkles,
  Tag,
  Barcode,
} from "lucide-react";

// Types
import { Category } from "@/services/CategoryService";
import { Unit } from "@/services/UnitService";
import { ProductFormData } from "@/services/productService";

import { formatNumber, formatCurrency } from "@/constants";
import { useSettings } from "@/context/SettingsContext";

// Interface for Product with potentially loaded batches
interface ProductWithOptionalBatches extends Omit<
  import("@/services/productService").Product,
  "latest_cost_per_sellable_unit" | "suggested_sale_price_per_sellable_unit"
> {
  category_name?: string | null;
  latest_cost_per_sellable_unit?: string | number | null;
  suggested_sale_price_per_sellable_unit?: string | number | null;
  sellable_unit_name?: string | null;
  stocking_unit_name?: string | null;
  units_per_stocking_unit?: number | null;
}

interface ProductsTableProps {
  products: ProductWithOptionalBatches[];
  isLoading?: boolean;
  onEdit: (product: ProductWithOptionalBatches) => void;
  onBarcodeLabel: (product: ProductWithOptionalBatches) => void;
  // Inline Creation Props
  categories: Category[];
  stockingUnits: Unit[];
  sellableUnits: Unit[];
  onProductCreate: (data: ProductFormData) => Promise<void>;
  // Inline Price Editing
  onQuickUpdatePrice: (
    productId: number,
    field: "cost_price" | "sale_price",
    value: number | null,
  ) => Promise<void>;
  // Infinite Scroll Props
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  // Column Visibility
  visibleColumns?: {
    sku?: boolean; name?: boolean; scientific_name?: boolean; category?: boolean;
    sellable_unit?: boolean; stocking_unit?: boolean; units_per_stocking?: boolean;
    stock?: boolean; cost?: boolean; sale_price?: boolean; expire_date?: boolean;
  };
}

// --- Inline Price Editing (cost / sale price) ---
type PriceField = "cost" | "sale_price";

const cellKey = (rowIndex: number, field: PriceField) => `${field}-${rowIndex}`;

const getDisplayPrice = (
  product: ProductWithOptionalBatches,
  field: PriceField,
): number | null => {
  if (field === "cost") {
    if (product.cost_price != null) return Number(product.cost_price);
    if (product.latest_cost_per_sellable_unit != null) {
      return Number(product.latest_cost_per_sellable_unit);
    }
    return null;
  }
  if (product.sale_price != null) return Number(product.sale_price);
  if (product.last_sale_price_per_sellable_unit != null) {
    return Number(product.last_sale_price_per_sellable_unit);
  }
  return null;
};

interface PriceEditControls {
  editingCell: { rowIndex: number; field: PriceField } | null;
  editValue: string;
  savingCell: { rowIndex: number; field: PriceField } | null;
  onStartEdit: (
    rowIndex: number,
    field: PriceField,
    product: ProductWithOptionalBatches,
  ) => void;
  onChangeValue: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  registerInputRef: (key: string, el: HTMLInputElement | null) => void;
}

interface ProductRowProps {
  product: ProductWithOptionalBatches;
  rowIndex: number;
  onEdit: (product: ProductWithOptionalBatches) => void;
  onBarcodeLabel: (product: ProductWithOptionalBatches) => void;
  copyToClipboard: (sku: string) => void;
  copiedSku: string | null;
  isLoading: boolean;
  vis: NonNullable<ProductsTableProps["visibleColumns"]>;
  priceEdit: PriceEditControls;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  rowIndex,
  onEdit,
  onBarcodeLabel,
  copyToClipboard,
  copiedSku,
  isLoading,
  vis,
  priceEdit,
}) => {
  const stockQty = Number(
    product.current_stock_quantity ?? product.stock_quantity ?? 0,
  );
  const isLow =
    product.stock_alert_level !== null &&
    stockQty <= (product.stock_alert_level as number);
  const isOutOfStock = stockQty <= 0;

  const isExpired = product.earliest_expiry_date
    ? new Date(product.earliest_expiry_date) < new Date()
    : false;

  const { getSetting } = useSettings();
  const colorHighlight = getSetting("product_row_color_highlight", true);

  const prevStockRef = useRef<number>(stockQty);
  const [animationClass, setAnimationClass] = useState("");

  useEffect(() => {
    if (stockQty > prevStockRef.current) {
      setAnimationClass("animate-flash-green");
    } else if (stockQty < prevStockRef.current) {
      setAnimationClass("animate-flash-red");
    }

    if (stockQty !== prevStockRef.current) {
      prevStockRef.current = stockQty;
      const timer = setTimeout(() => {
        setAnimationClass("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stockQty]);

  // Format expiry date
  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return "---";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-CA"); // YYYY-MM-DD format
  };

  return (
    <TableRow
      hover
      sx={{
        cursor: "pointer",
        bgcolor: colorHighlight
          ? isExpired
            ? "rgba(211, 47, 47, 0.08)"
            : isOutOfStock
              ? "rgba(237, 108, 2, 0.08)"
              : "transparent"
          : "transparent",
        "&:hover": {
          bgcolor: colorHighlight
            ? isExpired
              ? "rgba(211, 47, 47, 0.12) !important"
              : isOutOfStock
                ? "rgba(237, 108, 2, 0.12) !important"
                : undefined
            : undefined,
        },
      }}
      className={animationClass}
      onClick={() => onEdit(product)}
    >
      <TableCell align="center">{product.id}</TableCell>
      {vis.sku !== false && (
        <TableCell sx={{ maxWidth: 100 }} align="center">
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
            <Typography variant="body2" component="span">{product.sku || "---"}</Typography>
            {product.sku && (
              <Tooltip title={copiedSku === product.sku ? "تم النسخ" : "نسخ SKU"}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); copyToClipboard(product.sku!); }}
                  disabled={isLoading} sx={{ width: 24, height: 24, p: 0 }}>
                  {copiedSku === product.sku
                    ? <Check style={{ width: 14, height: 14, color: "var(--mui-palette-success-main)" }} />
                    : <Copy style={{ width: 14, height: 14 }} />}
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      )}
      {vis.name !== false && (
        <TableCell align="center">
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
            <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
            <Tooltip title="طباعة باركود">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onBarcodeLabel(product); }}
                sx={{ width: 20, height: 20, p: 0, opacity: 0.4, "&:hover": { opacity: 1 } }}
              >
                <Barcode style={{ width: 14, height: 14 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      )}
      {vis.scientific_name !== false && (
        <TableCell sx={{ minWidth: 300 }} align="center">{product.scientific_name || "---"}</TableCell>
      )}
      {vis.category !== false && (
        <TableCell align="center">
          {product.category_name
            ? <Chip label={product.category_name} size="small" variant="outlined" sx={{ fontSize: "0.75rem", height: 24 }} />
            : "---"}
        </TableCell>
      )}
      {vis.sellable_unit !== false && <TableCell align="center">{product.sellable_unit_name || "---"}</TableCell>}
      {vis.stocking_unit !== false && <TableCell align="center">{product.stocking_unit_name || "---"}</TableCell>}
      {vis.units_per_stocking !== false && <TableCell align="center">{product.units_per_stocking_unit || "---"}</TableCell>}
      {vis.stock !== false && (
        <TableCell align="center">
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
            <Typography variant="body1" fontWeight={600}>{formatNumber(stockQty)}</Typography>
            {(isLow || isOutOfStock) && (
              <Tooltip title={isOutOfStock ? "نفاد المخزون" : "تنبيه: المخزون منخفض"}>
                <AlertTriangle style={{ width: 16, height: 16,
                  color: isOutOfStock ? "var(--mui-palette-error-main)" : "var(--mui-palette-warning-main)" }} />
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      )}
      {vis.cost !== false && (
        <TableCell
          align="center"
          onClick={(e) => {
            e.stopPropagation();
            if (
              !(
                priceEdit.editingCell?.rowIndex === rowIndex &&
                priceEdit.editingCell?.field === "cost"
              )
            ) {
              priceEdit.onStartEdit(rowIndex, "cost", product);
            }
          }}
          sx={{ cursor: "text" }}
        >
          {priceEdit.editingCell?.rowIndex === rowIndex &&
          priceEdit.editingCell?.field === "cost" ? (
            <TextField
              inputRef={(el) => priceEdit.registerInputRef(cellKey(rowIndex, "cost"), el)}
              type="number"
              size="small"
              value={priceEdit.editValue}
              onChange={(e) => priceEdit.onChangeValue(e.target.value)}
              onKeyDown={priceEdit.onKeyDown}
              onBlur={priceEdit.onBlur}
              sx={{ width: 90 }}
            />
          ) : (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
              <Typography variant="body2">
                {product.latest_cost_per_sellable_unit
                  ? formatCurrency(Number(product.latest_cost_per_sellable_unit)) : "---"}
              </Typography>
              {priceEdit.savingCell?.rowIndex === rowIndex &&
                priceEdit.savingCell?.field === "cost" && (
                  <CircularProgress size={12} />
                )}
            </Stack>
          )}
        </TableCell>
      )}
      {vis.sale_price !== false && (
        <TableCell
          align="center"
          onClick={(e) => {
            e.stopPropagation();
            if (
              !(
                priceEdit.editingCell?.rowIndex === rowIndex &&
                priceEdit.editingCell?.field === "sale_price"
              )
            ) {
              priceEdit.onStartEdit(rowIndex, "sale_price", product);
            }
          }}
          sx={{ cursor: "text" }}
        >
          {priceEdit.editingCell?.rowIndex === rowIndex &&
          priceEdit.editingCell?.field === "sale_price" ? (
            <TextField
              inputRef={(el) => priceEdit.registerInputRef(cellKey(rowIndex, "sale_price"), el)}
              type="number"
              size="small"
              value={priceEdit.editValue}
              onChange={(e) => priceEdit.onChangeValue(e.target.value)}
              onKeyDown={priceEdit.onKeyDown}
              onBlur={priceEdit.onBlur}
              sx={{ width: 90 }}
            />
          ) : product.last_sale_price_per_sellable_unit ? (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
              <Typography
                variant="body2"
                sx={{ color: product.sale_price != null ? "primary.main" : "text.primary", fontWeight: product.sale_price != null ? 700 : 400 }}
              >
                {formatCurrency(Number(product.last_sale_price_per_sellable_unit))}
              </Typography>
              {product.sale_price != null && (
                <Tooltip title="سعر البيع مُحدد يدوياً على المنتج">
                  <Tag style={{ width: 13, height: 13, color: "var(--mui-palette-primary-main)" }} />
                </Tooltip>
              )}
              {priceEdit.savingCell?.rowIndex === rowIndex &&
                priceEdit.savingCell?.field === "sale_price" && (
                  <CircularProgress size={12} />
                )}
            </Stack>
          ) : (
            "---"
          )}
        </TableCell>
      )}
      {vis.expire_date !== false && (
        <TableCell sx={{ minWidth: 100 }} align="center">
          <Typography variant="body2" sx={{ color: isExpired ? "error.main" : "text.primary", fontWeight: isExpired ? 600 : 400 }}>
            {formatExpiryDate(product.earliest_expiry_date)}
          </Typography>
        </TableCell>
      )}
    </TableRow>
  );
};

// --- Inline Create Row Component ---
const InlineCreateRow: React.FC<{
  categories: Category[];
  stockingUnits: Unit[];
  sellableUnits: Unit[];
  onSave: (data: ProductFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({
  categories,
  stockingUnits,
  sellableUnits,
  onSave,
  onCancel,
  isLoading,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    scientific_name: "",
    category_id: "" as any,
    stocking_unit_id: "" as any,
    sellable_unit_id: "" as any,
    units_per_stocking_unit: 1,
    stock_alert_level: 10,
    stock_quantity: 0,
    description: "",
    cost_price: "",
    sale_price: "",
    expire_date: "",
  });

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => {
      const updates: any = { [field]: value };
      // Sync scientific name with name if scientific name is empty or was same as name
      if (field === "name") {
        updates.scientific_name = value;
      }
      return { ...prev, ...updates };
    });
  };

  // Set default units and category on mount
  useEffect(() => {
    const defaultStockingUnit = stockingUnits.find((u) => u.is_default);
    const defaultSellableUnit = sellableUnits.find((u) => u.is_default);
    const defaultCategory = categories.find((c) => c.is_default);

    setFormData((prev) => ({
      ...prev,
      stocking_unit_id: defaultStockingUnit?.id || ("" as any),
      sellable_unit_id: defaultSellableUnit?.id || ("" as any),
      category_id: defaultCategory?.id || ("" as any),
    }));
  }, [stockingUnits, sellableUnits, categories]);

  const handleSave = () => {
    // Basic validation
    if (!formData.name) return; // Add better validation if needed
    onSave(formData);
  };

  const generateSKU = () => {
    // Generate a random SKU: PRD-XXXXXX (6 random alphanumeric characters)
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    handleChange("sku", `PRD-${randomStr}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <TableRow sx={{ bgcolor: "action.hover" }}>
      <TableCell align="center">
        <IconButton
          size="small"
          onClick={handleSave}
          disabled={isLoading || !formData.name}
          color="primary"
        >
          <Save size={18} />
        </IconButton>
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <TextField
            size="small"
            placeholder="SKU"
            value={formData.sku || ""}
            onChange={(e) => handleChange("sku", e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ minWidth: 80 }}
          />
          <Tooltip title="Generate SKU">
            <IconButton size="small" onClick={generateSKU} color="secondary">
              <Sparkles size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
      <TableCell align="center">
        <TextField
          size="small"
          placeholder="Product Name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          onKeyDown={handleKeyDown}
          required
          sx={{
            minWidth: 120,
            width: `${Math.max(12, formData.name.length + 2)}ch`,
            transition: "width 0.2s ease",
          }}
        />
      </TableCell>
      <TableCell align="center">
        <TextField
          size="small"
          placeholder="Scientific Name"
          value={formData.scientific_name || ""}
          onChange={(e) => handleChange("scientific_name", e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            minWidth: 100,
            width: `${Math.max(10, (formData.scientific_name || "").length + 2)}ch`,
            transition: "width 0.2s ease",
          }}
        />
      </TableCell>

      <TableCell align="center">
        <FormControl size="small" fullWidth sx={{ minWidth: 100 }}>
          <Select
            value={formData.category_id || ""}
            displayEmpty
            onChange={(e) => handleChange("category_id", e.target.value)}
            renderValue={(selected) => {
              if (!selected) return <em style={{ color: "#aaa" }}>Category</em>;
              return categories.find((c) => c.id === selected)?.name;
            }}
          >
            <MenuItem value="" disabled>
              <em>Select Category</em>
            </MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell align="center">
        <FormControl size="small" fullWidth sx={{ minWidth: 80 }}>
          <Select
            value={formData.sellable_unit_id || ""}
            displayEmpty
            onChange={(e) => handleChange("sellable_unit_id", e.target.value)}
            renderValue={(selected) => {
              if (!selected) return <em style={{ color: "#aaa" }}>Unit</em>;
              return sellableUnits.find((u) => u.id === selected)?.name;
            }}
          >
            <MenuItem value="" disabled>
              <em>Unit</em>
            </MenuItem>
            {sellableUnits.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell align="center">
        <FormControl size="small" fullWidth sx={{ minWidth: 80 }}>
          <Select
            value={formData.stocking_unit_id || ""}
            displayEmpty
            onChange={(e) => handleChange("stocking_unit_id", e.target.value)}
            renderValue={(selected) => {
              if (!selected) return <em style={{ color: "#aaa" }}>Pkg</em>;
              return stockingUnits.find((u) => u.id === selected)?.name;
            }}
          >
            <MenuItem value="" disabled>
              <em>Package</em>
            </MenuItem>
            {stockingUnits.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell align="center">
        <TextField
          type="number"
          size="small"
          placeholder="Qty"
          value={formData.units_per_stocking_unit || ""}
          onChange={(e) =>
            handleChange("units_per_stocking_unit", e.target.value)
          }
          sx={{ width: 60 }}
        />
      </TableCell>
      <TableCell align="center">
        <TextField
          type="number"
          size="small"
          placeholder="Alert"
          value={formData.stock_alert_level || ""}
          onChange={(e) => handleChange("stock_alert_level", e.target.value)}
          sx={{ width: 60 }}
        />
      </TableCell>
      <TableCell align="center">
        <Typography variant="body2" color="text.secondary">
          0
        </Typography>
      </TableCell>
      {/* Latest Cost */}
      <TableCell align="center">
        <TextField
          type="number"
          size="small"
          placeholder="Cost"
          value={formData.cost_price || ""}
          onChange={(e) => handleChange("cost_price", e.target.value)}
          sx={{ width: 80 }}
        />
      </TableCell>
      {/* Last Sale Price */}
      <TableCell align="center">
        <TextField
          type="number"
          size="small"
          placeholder="Sale"
          value={formData.sale_price || ""}
          onChange={(e) => handleChange("sale_price", e.target.value)}
          sx={{ width: 80 }}
        />
      </TableCell>
      {/* Expiry Date */}
      <TableCell align="center">
        <TextField
          type="date"
          size="small"
          value={formData.expire_date || ""}
          onChange={(e) => handleChange("expire_date", e.target.value)}
          sx={{ width: 130 }}
        />
      </TableCell>
      <TableCell align="center">
        <IconButton size="small" onClick={onCancel} disabled={isLoading}>
          <X size={18} color="red" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  isLoading = false,
  onEdit,
  onBarcodeLabel,
  categories,
  stockingUnits,
  sellableUnits,
  onProductCreate,
  onQuickUpdatePrice,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  visibleColumns: vc = {},
}) => {
  const vis = vc;
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);

  const handleCreateSave = async (data: ProductFormData) => {
    setIsCreatingLoading(true);
    try {
      await onProductCreate(data);
      setIsCreating(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreatingLoading(false);
    }
  };

  // --- Inline Price Editing (cost / sale price) ---
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: PriceField } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingCell, setSavingCell] = useState<{ rowIndex: number; field: PriceField } | null>(null);
  const priceInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const enterPressedRef = useRef(false);

  const registerInputRef = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) {
      priceInputRefs.current.set(key, el);
    } else {
      priceInputRefs.current.delete(key);
    }
  }, []);

  useEffect(() => {
    if (!editingCell) return;
    const el = priceInputRefs.current.get(cellKey(editingCell.rowIndex, editingCell.field));
    el?.focus();
    el?.select();
  }, [editingCell]);

  const startEdit = useCallback(
    (rowIndex: number, field: PriceField, product: ProductWithOptionalBatches) => {
      setEditingCell({ rowIndex, field });
      const value = getDisplayPrice(product, field);
      setEditValue(value != null ? String(value) : "");
    },
    [],
  );

  const commitEdit = useCallback(
    (moveNext: boolean) => {
      if (!editingCell) return;
      const { rowIndex, field } = editingCell;
      const product = products[rowIndex];
      const backendField = field === "cost" ? "cost_price" : "sale_price";
      const trimmed = editValue.trim();
      const numericValue = trimmed === "" ? null : Number(trimmed);
      const isValid = trimmed === "" || !Number.isNaN(numericValue);

      if (isValid && product) {
        const currentValue = getDisplayPrice(product, field);
        if (currentValue !== numericValue) {
          setSavingCell({ rowIndex, field });
          onQuickUpdatePrice(product.id, backendField, numericValue)
            .catch((err) => console.error("Failed to update price:", err))
            .finally(() =>
              setSavingCell((s) =>
                s && s.rowIndex === rowIndex && s.field === field ? null : s,
              ),
            );
        }
      }

      if (moveNext) {
        const nextProduct = products[rowIndex + 1];
        if (nextProduct) {
          const nextValue = getDisplayPrice(nextProduct, field);
          setEditValue(nextValue != null ? String(nextValue) : "");
          setEditingCell({ rowIndex: rowIndex + 1, field });
          return;
        }
      }
      setEditingCell(null);
    },
    [editingCell, editValue, products, onQuickUpdatePrice],
  );

  const handlePriceCellKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        enterPressedRef.current = true;
        commitEdit(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditingCell(null);
      }
    },
    [commitEdit],
  );

  const handlePriceCellBlur = useCallback(() => {
    if (enterPressedRef.current) {
      enterPressedRef.current = false;
      return;
    }
    commitEdit(false);
  }, [commitEdit]);

  const priceEdit: PriceEditControls = {
    editingCell,
    editValue,
    savingCell,
    onStartEdit: startEdit,
    onChangeValue: setEditValue,
    onKeyDown: handlePriceCellKeyDown,
    onBlur: handlePriceCellBlur,
    registerInputRef,
  };

  // Intersection Observer for Infinite Scroll
  const observer = useRef<IntersectionObserver>();
  const lastElementRef = useCallback(
    (node: HTMLTableRowElement) => {
      if (isLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          onLoadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, onLoadMore],
  );

  const copyToClipboard = async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku);
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000);
    } catch (err) {
      console.error("Failed to copy SKU:", err);
    }
  };

  const renderSkeletonRow = (index: number) => (
    <TableRow key={`skeleton-${index}`}>
      <TableCell align="center">
        <Skeleton variant="text" width={20} />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="text" width={80} />
      </TableCell>
      <TableCell align="left">
        <Skeleton variant="text" width="80%" />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="text" width={100} />
      </TableCell>
      <TableCell align="center">
        <Skeleton
          variant="rectangular"
          width={60}
          height={24}
          sx={{ borderRadius: 1 }}
        />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="text" width={60} />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="text" width={60} />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="text" width={30} />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="text" width={80} />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="text" width={40} />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="text" width={80} />
      </TableCell>
      <TableCell align="center">
        <Skeleton variant="circular" width={18} height={18} />
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <Paper
        sx={{ width: "100%", borderRadius: 2, overflow: "hidden", mb: 2 }}
        elevation={0}
        dir="ltr"
      >
        <TableContainer>
          <Table stickyHeader size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center">
                  <Tooltip title="Add Product Inline">
                    <IconButton
                      size="small"
                      onClick={() => setIsCreating(true)}
                      color="primary"
                      sx={{
                        animation: "heartbeat 1.5s ease-in-out infinite",
                        "@keyframes heartbeat": {
                          "0%": {
                            transform: "scale(1)",
                          },
                          "14%": {
                            transform: "scale(1.2)",
                          },
                          "28%": {
                            transform: "scale(1)",
                          },
                          "42%": {
                            transform: "scale(1.2)",
                          },
                          "70%": {
                            transform: "scale(1)",
                          },
                        },
                      }}
                    >
                      <Plus size={16} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
                {vis.sku !== false && <TableCell align="center"> (SKU)</TableCell>}
                {vis.name !== false && <TableCell sx={{ minWidth: 300 }} align="center">اسم المنتج</TableCell>}
                {vis.scientific_name !== false && <TableCell align="center">الاسم العلمي</TableCell>}
                {vis.category !== false && <TableCell align="center">الفئة</TableCell>}
                {vis.sellable_unit !== false && <TableCell align="center">وحدة البيع</TableCell>}
                {vis.stocking_unit !== false && <TableCell align="center">وحدة التخزين</TableCell>}
                {vis.units_per_stocking !== false && <TableCell align="center">عدد الوحدات</TableCell>}
                {/* <TableCell align="center">تنبيه المخزون</TableCell> */}
                {vis.stock !== false && <TableCell align="center"> المخزون</TableCell>}
                {vis.cost !== false && <TableCell align="center">تكلفة</TableCell>}
                {vis.sale_price !== false && <TableCell align="center">سعر البيع</TableCell>}
                {vis.expire_date !== false && <TableCell align="center"> الصلاحية</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isCreating && (
                <InlineCreateRow
                  categories={categories}
                  stockingUnits={stockingUnits}
                  sellableUnits={sellableUnits}
                  onSave={handleCreateSave}
                  onCancel={() => setIsCreating(false)}
                  isLoading={isCreatingLoading}
                />
              )}

              {products.length === 0 && !isCreating && !isLoading && (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      لا توجد منتجات لعرضها
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {products.map((product, index) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  rowIndex={index}
                  onEdit={onEdit}
                  onBarcodeLabel={onBarcodeLabel}
                  copyToClipboard={copyToClipboard}
                  copiedSku={copiedSku}
                  isLoading={isLoading}
                  vis={vis}
                  priceEdit={priceEdit}
                />
              ))}

              {/* Skeletons for initial loading only */}
              {isLoading &&
                Array.from(new Array(10)).map((_, index) =>
                  renderSkeletonRow(index),
                )}

              {/* Sentinel for infinite scroll */}
              {!isLoading && !isFetchingNextPage && hasNextPage && (
                <TableRow ref={lastElementRef}>
                  <TableCell colSpan={13} sx={{ borderBottom: "none" }} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Centered Loading Indicator for Infinite Scroll */}
      {isFetchingNextPage && (
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
          }}
        >
          <CircularProgress size={50} />
        </Box>
      )}
    </>
  );
};
