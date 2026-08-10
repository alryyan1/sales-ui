// src/components/products/ProductsTable.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { ProductImage } from "./ProductImage";
import { ProductContextMenu } from "./ProductContextMenu";
import {
  AlertTriangle,
  Copy,
  Check,
  Plus,
  X,
  Save,
  Sparkles,
  Pencil,
  Tag,
  Barcode,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
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
  onCurrencyChange?: (productId: number, currency: "SDG" | "USD" | null) => void;
  onPriceUpdate?: (productId: number, field: "sale_price" | "cost_price", value: number | null) => Promise<void>;
  // Context Menu Handlers
  onDuplicate?: (product: ProductWithOptionalBatches) => void;
  onExport?: (product: ProductWithOptionalBatches) => void;
  onDelete?: (product: ProductWithOptionalBatches) => void;
  onCopyInfo?: (product: ProductWithOptionalBatches) => void;
  onToggleFavorite?: (product: ProductWithOptionalBatches) => void;
  // Inline Creation Props
  categories: Category[];
  stockingUnits: Unit[];
  sellableUnits: Unit[];
  onProductCreate: (data: ProductFormData) => Promise<void>;
  // Infinite Scroll Props
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  // Column Visibility
  visibleColumns?: {
    sku?: boolean; name?: boolean; scientific_name?: boolean; category?: boolean;
    sellable_unit?: boolean; stocking_unit?: boolean; units_per_stocking?: boolean;
    stock?: boolean; cost?: boolean; sale_price?: boolean; expire_date?: boolean;
    description?: boolean;
  };
  // Sorting Props
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  sortingLoading?: boolean;
}

interface ProductRowProps {
  product: ProductWithOptionalBatches;
  onEdit: (product: ProductWithOptionalBatches) => void;
  onBarcodeLabel: (product: ProductWithOptionalBatches) => void;
  copyToClipboard: (sku: string) => void;
  copiedSku: string | null;
  isLoading: boolean;
  vis: NonNullable<ProductsTableProps["visibleColumns"]>;
  // Context Menu Props
  onDuplicate: (product: ProductWithOptionalBatches) => void;
  onExport: (product: ProductWithOptionalBatches) => void;
  onDelete: (product: ProductWithOptionalBatches) => void;
  onCopyInfo: (product: ProductWithOptionalBatches) => void;
  onToggleFavorite: (product: ProductWithOptionalBatches) => void;
  onCurrencyChange?: (productId: number, currency: "SDG" | "USD" | null) => void;
  onPriceUpdate?: (productId: number, field: "sale_price" | "cost_price", value: number | null) => Promise<void>;
  activeField?: "sale_price" | "cost_price" | null;
  onFieldOpen?: (field: "sale_price" | "cost_price") => void;
  onFieldNext?: (field: "sale_price" | "cost_price") => void;
  isFavorite?: boolean;
}


const InlineEditCell: React.FC<{
  value: number | null | undefined;
  highlight?: boolean;
  forceOpen?: boolean;
  onOpen?: () => void;
  onNext?: () => void;
  onSave: (value: number | null) => Promise<void>;
}> = ({ value, highlight = false, forceOpen = false, onOpen, onNext, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open when forceOpen flips to true from outside
  useEffect(() => {
    if (forceOpen) {
      setInput(value != null ? String(value) : "");
      setEditing(true);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [forceOpen]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInput(value != null ? String(value) : "");
    setEditing(true);
    onOpen?.();
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = (andNext = false) => {
    const parsed = input.trim() === "" ? null : parseFloat(input);
    setEditing(false);
    if (andNext) onNext?.();           // move instantly, don't await
    if (parsed === value || (parsed == null && value == null)) return;
    setSaving(true);
    onSave(parsed).finally(() => setSaving(false));  // fire-and-forget
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commit(true); }
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <TextField
        inputRef={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={() => commit(false)}
        onKeyDown={handleKeyDown}
        type="number"
        size="small"
        slotProps={{ htmlInput: { step: "0.01" } }}
        sx={{ width: 90, "& input": { textAlign: "center", py: 0.4, px: 0.5, fontSize: "0.8rem" } }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <Box
      onClick={startEdit}
      sx={{ cursor: "text", display: "inline-flex", alignItems: "center", gap: 0.5,
        px: 0.5, py: 0.2, borderRadius: 1,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {saving && <CircularProgress size={10} thickness={5} />}
      {value != null ? (
        <Typography
          variant="body2"
          sx={{ fontWeight: highlight ? 700 : 400, color: highlight ? "primary.main" : "text.primary", fontSize: "0.85rem" }}
        >
          {formatNumber(Number(value), 2)}
        </Typography>
      ) : (
        <Typography variant="body2" sx={{ color: "text.disabled", fontSize: "0.78rem" }}>---</Typography>
      )}
    </Box>
  );
};

const PriceWithCurrency: React.FC<{
  value: number;
  currency: string;
  highlight?: boolean;
}> = ({ value, currency, highlight = false }) => {
  const isUSD = currency === "USD";
  return (
    <Stack direction="row" spacing={0.4} alignItems="center" justifyContent="center">
      <Typography
        variant="body2"
        sx={{ fontWeight: highlight ? 700 : 400, color: highlight ? "primary.main" : "text.primary" }}
      >
        {formatNumber(value.toFixed(2))}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          fontSize: "0.62rem",
          px: 0.5,
          py: 0.1,
          borderRadius: 0.75,
          lineHeight: 1.6,
          bgcolor: isUSD ? "success.light" : "info.light",
          color: isUSD ? "success.dark" : "info.dark",
        }}
      >
        {currency}
      </Typography>
    </Stack>
  );
};

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onEdit,
  onBarcodeLabel,
  copyToClipboard,
  copiedSku,
  isLoading,
  vis,
  onDuplicate,
  onExport,
  onDelete,
  onCopyInfo,
  onToggleFavorite,
  onCurrencyChange,
  onPriceUpdate,
  activeField,
  onFieldOpen,
  onFieldNext,
  isFavorite = false,
}) => {
  const { t } = useTranslation("products");
  const { t: tCommon } = useTranslation("common");
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

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

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

  // Context Menu Handlers
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : null,
    );
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Format expiry date
  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return "---";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-CA"); // YYYY-MM-DD format
  };

  return (
    <>
      <TableRow
        hover
        onContextMenu={handleContextMenu}
        sx={{
          cursor: "default",
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
      >
      <TableCell align="center" sx={{ width: 48, p: 0.5 }}>
        <ProductImage
          imageUrl={product.image_url}
          productName={product.name}
          size={36}
          variant="rounded"
        />
      </TableCell>
      <TableCell align="center">{product.id}</TableCell>
      {vis.sku !== false && (
        <TableCell sx={{ maxWidth: 100 }} align="center">
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
            <Typography variant="body2" component="span">{product.sku || "---"}</Typography>
            {product.sku && (
              <Tooltip title={copiedSku === product.sku ? t("copiedLabel") : t("copySku")}>
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
            <Tooltip title={t("printBarcode")}>
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
      {vis.description !== false && (
        <TableCell align="center" sx={{ maxWidth: 200 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-line", textAlign: "center" }}>
            {product.description || "---"}
          </Typography>
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
              <Tooltip title={isOutOfStock ? t("outOfStockTooltip") : t("lowStockWarning")}>
                <AlertTriangle style={{ width: 16, height: 16,
                  color: isOutOfStock ? "var(--mui-palette-error-main)" : "var(--mui-palette-warning-main)" }} />
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      )}
      {vis.cost !== false && (
        <TableCell align="center">
          <InlineEditCell
            value={product.cost_price ?? (product.latest_cost_per_sellable_unit != null ? Number(product.latest_cost_per_sellable_unit) : null)}
            forceOpen={activeField === "cost_price"}
            onOpen={() => onFieldOpen?.("cost_price")}
            onNext={() => onFieldNext?.("cost_price")}
            onSave={(val) => onPriceUpdate?.(product.id, "cost_price", val) ?? Promise.resolve()}
          />
        </TableCell>
      )}
      {vis.sale_price !== false && (
        <TableCell align="center">
          <Stack direction="row" spacing={0.3} alignItems="center" justifyContent="center">
            <InlineEditCell
              value={product.sale_price ?? (product.last_sale_price_per_sellable_unit != null ? Number(product.last_sale_price_per_sellable_unit) : null)}
              highlight={product.sale_price != null}
              forceOpen={activeField === "sale_price"}
              onOpen={() => onFieldOpen?.("sale_price")}
              onNext={() => onFieldNext?.("sale_price")}
              onSave={(val) => onPriceUpdate?.(product.id, "sale_price", val) ?? Promise.resolve()}
            />
            {product.sale_price != null && (
              <Tooltip title={t("manualSalePriceTooltip")}>
                <Tag style={{ width: 13, height: 13, color: "var(--mui-palette-primary-main)" }} />
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      )}
      {vis.expire_date !== false && (
        <TableCell sx={{ minWidth: 100 }} align="center">
          <Typography variant="body2" sx={{ color: isExpired ? "error.main" : "text.primary", fontWeight: isExpired ? 600 : 400 }}>
            {formatExpiryDate(product.earliest_expiry_date)}
          </Typography>
        </TableCell>
      )}
      <TableCell align="center">
        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
          {(["SDG", "USD"] as const).map((cur) => {
            const active = product.preferred_currency === cur;
            const isLastPurchase = !product.preferred_currency && product.last_purchase_currency === cur;
            return (
              <Typography
                key={cur}
                onClick={(e) => { e.stopPropagation(); onCurrencyChange?.(product.id, active ? null : cur); }}
                variant="caption"
                sx={{
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.62rem",
                  px: 0.6,
                  py: 0.15,
                  borderRadius: 0.75,
                  lineHeight: 1.6,
                  bgcolor: active ? (cur === "USD" ? "success.main" : "info.main") : "action.hover",
                  color: active ? "#fff" : "text.secondary",
                  outline: isLastPurchase ? "1.5px solid" : "none",
                  outlineColor: isLastPurchase ? "error.main" : "transparent",
                  "&:hover": { opacity: 0.8 },
                  transition: "all 0.15s",
                }}
              >
                {cur}
              </Typography>
            );
          })}
        </Stack>
      </TableCell>
      <TableCell align="center" sx={{ p: 0.5, width: 36 }}>
        <Tooltip title={tCommon("edit")}>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onEdit(product); }}
            sx={{ width: 28, height: 28, opacity: 0.45, "&:hover": { opacity: 1, color: "primary.main" } }}
          >
            <Pencil size={14} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>

    {/* Context Menu */}
    <ProductContextMenu
      anchorPosition={contextMenu ? { left: contextMenu.mouseX, top: contextMenu.mouseY } : undefined}
      open={Boolean(contextMenu)}
      onClose={handleContextMenuClose}
      product={product}
      onEdit={onEdit}
      onBarcodeLabel={onBarcodeLabel}
      onDuplicate={onDuplicate}
      onExport={onExport}
      onDelete={onDelete}
      onCopyInfo={onCopyInfo}
      onToggleFavorite={onToggleFavorite}
      isFavorite={isFavorite}
    />
    </>
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
  onDuplicate = () => {},
  onExport = () => {},
  onDelete = () => {},
  onCopyInfo = () => {},
  onToggleFavorite = () => {},
  onCurrencyChange,
  onPriceUpdate,
  categories,
  stockingUnits,
  sellableUnits,
  onProductCreate,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  visibleColumns: vc = {},
  sortBy,
  sortDirection,
  onSort,
  sortingLoading,
}) => {
  const { t } = useTranslation("products");
  const vis = vc;
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);
  const [activeCell, setActiveCell] = useState<{ productId: number; field: "sale_price" | "cost_price" } | null>(null);

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

  // Helper function to render sort icon
  const renderSortIcon = (column: string) => {
    if (!onSort) return null;

    const isActive = sortBy === column;
    
    // Show loading spinner if sorting and this is the active column
    if (sortingLoading && isActive) {
      return (
        <Loader2
          size={16}
          style={{
            marginLeft: 4,
            animation: 'spin 1s linear infinite',
            color: "#1976d2"
          }}
        />
      );
    }

    const Icon = isActive
      ? sortDirection === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;

    return (
      <Icon
        size={16}
        style={{
          marginLeft: 4,
          opacity: isActive ? 1 : 0.5,
          color: isActive ? "#1976d2" : "#666"
        }}
      />
    );
  };

  // Helper function to get sortable column styling
  const getSortableColumnSx = (column?: string) => ({
    cursor: sortingLoading ? 'not-allowed' : (onSort ? 'pointer' : 'default'),
    userSelect: 'none',
    opacity: sortingLoading && column !== sortBy ? 0.6 : 1,
    pointerEvents: sortingLoading ? 'none' : 'auto',
    '&:hover': onSort && !sortingLoading ? { bgcolor: 'rgba(25, 118, 210, 0.04)' } : {}
  });

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


  return (
    <>
      <Paper
        sx={{ width: "100%", borderRadius: 2, overflow: "hidden", mb: 2 }}
        elevation={0}
        dir="ltr"
      >
        <TableContainer>
          <Table stickyHeader size="small" sx={{ 
            minWidth: 650,
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" }
            }
          }}>
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
                <TableCell
                  align="center"
                  sx={{ width: 48, ...getSortableColumnSx('id') }}
                  onClick={() => !sortingLoading && onSort?.('id')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    #
                    {renderSortIcon('id')}
                  </Box>
                </TableCell>
                {vis.sku !== false && (
                  <TableCell
                    align="center"
                    sx={getSortableColumnSx('sku')}
                    onClick={() => !sortingLoading && onSort?.('sku')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      SKU
                      {renderSortIcon('sku')}
                    </Box>
                  </TableCell>
                )}
                {vis.name !== false && (
                  <TableCell
                    sx={{ minWidth: 300, cursor: onSort ? 'pointer' : 'default', userSelect: 'none' }}
                    align="center"
                    onClick={() => onSort?.('name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("productName")}
                      {renderSortIcon('name')}
                    </Box>
                  </TableCell>
                )}
                {vis.description !== false && (
                  <TableCell align="center" sx={{ minWidth: 150 }}>
                    {t("descriptionColumn")}
                  </TableCell>
                )}
                {vis.scientific_name !== false && (
                  <TableCell
                    align="center"
                    sx={{
                      cursor: onSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      '&:hover': onSort ? { bgcolor: 'rgba(25, 118, 210, 0.04)' } : {}
                    }}
                    onClick={() => onSort?.('scientific_name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("scientificName")}
                      {renderSortIcon('scientific_name')}
                    </Box>
                  </TableCell>
                )}
                {vis.category !== false && (
                  <TableCell
                    align="center"
                    sx={{
                      cursor: onSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      '&:hover': onSort ? { bgcolor: 'rgba(25, 118, 210, 0.04)' } : {}
                    }}
                    onClick={() => onSort?.('category_name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("categoryColumnShort")}
                      {renderSortIcon('category_name')}
                    </Box>
                  </TableCell>
                )}
                {vis.sellable_unit !== false && (
                  <TableCell
                    align="center"
                    sx={{
                      cursor: onSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      '&:hover': onSort ? { bgcolor: 'rgba(25, 118, 210, 0.04)' } : {}
                    }}
                    onClick={() => onSort?.('sellable_unit_name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("sellableUnit")}
                      {renderSortIcon('sellable_unit_name')}
                    </Box>
                  </TableCell>
                )}
                {vis.stocking_unit !== false && (
                  <TableCell
                    align="center"
                    sx={{
                      cursor: onSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      '&:hover': onSort ? { bgcolor: 'rgba(25, 118, 210, 0.04)' } : {}
                    }}
                    onClick={() => onSort?.('stocking_unit_name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("stockingUnit")}
                      {renderSortIcon('stocking_unit_name')}
                    </Box>
                  </TableCell>
                )}
                {vis.units_per_stocking !== false && (
                  <TableCell
                    align="center"
                    sx={{
                      cursor: onSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      '&:hover': onSort ? { bgcolor: 'rgba(25, 118, 210, 0.04)' } : {}
                    }}
                    onClick={() => onSort?.('units_per_stocking_unit')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("unitsCountColumn")}
                      {renderSortIcon('units_per_stocking_unit')}
                    </Box>
                  </TableCell>
                )}
                {/* <TableCell align="center">تنبيه المخزون</TableCell> */}
                {vis.stock !== false && (
                  <TableCell
                    align="center"
                    sx={getSortableColumnSx('stock_quantity')}
                    onClick={() => !sortingLoading && onSort?.('stock_quantity')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("stock")}
                      {renderSortIcon('stock_quantity')}
                    </Box>
                  </TableCell>
                )}
                {vis.cost !== false && (
                  <TableCell
                    align="center"
                    sx={getSortableColumnSx('latest_cost_per_sellable_unit')}
                    onClick={() => !sortingLoading && onSort?.('latest_cost_per_sellable_unit')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("costColumn")}
                      {renderSortIcon('latest_cost_per_sellable_unit')}
                    </Box>
                  </TableCell>
                )}
                {vis.sale_price !== false && (
                  <TableCell
                    align="center"
                    sx={getSortableColumnSx('suggested_sale_price_per_sellable_unit')}
                    onClick={() => !sortingLoading && onSort?.('suggested_sale_price_per_sellable_unit')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("salePrice")}
                      {renderSortIcon('suggested_sale_price_per_sellable_unit')}
                    </Box>
                  </TableCell>
                )}
                {vis.expire_date !== false && (
                  <TableCell
                    align="center"
                    sx={{
                      cursor: onSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      '&:hover': onSort ? { bgcolor: 'rgba(25, 118, 210, 0.04)' } : {}
                    }}
                    onClick={() => onSort?.('expire_date')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t("expiryDateColumn")}
                      {renderSortIcon('expire_date')}
                    </Box>
                  </TableCell>
                )}
                <TableCell align="center" sx={{ whiteSpace: 'nowrap', minWidth: 100 }}>
                  {t("currencyColumn")}
                </TableCell>
                <TableCell align="center" sx={{ width: 36 }} />
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
                      {t("noProductsToShow")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={onEdit}
                  onBarcodeLabel={onBarcodeLabel}
                  copyToClipboard={copyToClipboard}
                  copiedSku={copiedSku}
                  isLoading={isLoading}
                  vis={vis}
                  onDuplicate={onDuplicate}
                  onExport={onExport}
                  onDelete={onDelete}
                  onCopyInfo={onCopyInfo}
                  onToggleFavorite={onToggleFavorite}
                  onCurrencyChange={onCurrencyChange}
                  onPriceUpdate={onPriceUpdate}
                  activeField={activeCell?.productId === product.id ? activeCell.field : null}
                  onFieldOpen={(field) => setActiveCell({ productId: product.id, field })}
                  onFieldNext={(field) => {
                    const idx = products.findIndex((p) => p.id === product.id);
                    const next = products[idx + 1];
                    setActiveCell(next ? { productId: next.id, field } : null);
                  }}
                />
              ))}

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

      {/* Centered overlay for any loading state */}
      {(isLoading || isFetchingNextPage) && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255,255,255,0.45)",
            zIndex: 9999,
          }}
        >
          <CircularProgress size={48} />
        </Box>
      )}
    </>
  );
};
