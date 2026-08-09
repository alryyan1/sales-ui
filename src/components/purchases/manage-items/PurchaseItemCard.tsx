// src/components/purchases/manage-items/PurchaseItemCard.tsx
import React from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
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

interface PurchaseItemCardProps {
  item: PurchaseItem;
  index: number;
  productUnits: ProductUnitsMap;
  isReadOnly: boolean;
  isDeleting: boolean;
  onUpdate: (itemId: number, field: string, value: unknown) => void;
  onDelete: (itemId: number) => void;
  updatingField: string | null; // Format: "itemId-fieldName"
}

const PurchaseItemCard: React.FC<PurchaseItemCardProps> = ({
  item,
  index,
  productUnits,
  isReadOnly,
  isDeleting,
  onUpdate,
  onDelete,
  updatingField,
}) => {
  const unitInfo = productUnits[item.product_id];

  // Helper to check if a specific field is being updated
  const isFieldUpdating = (fieldName: string) => {
    return updatingField === `${item.id}-${fieldName}`;
  };

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: item.quantity === 0 ? "error.lighter" : "background.paper",
        border: item.quantity === 0 ? "1px solid" : "none",
        borderColor: "error.main",
        position: "relative",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: 2,
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(4, 1fr)",
            lg: "repeat(9, 1fr)",
          },
          gap: { xs: 2, md: 3 },
          alignItems: "start",
        }}
      >
        {/* Product Info - Spans full width on small screens */}
        <Box
          sx={{
            gridColumn: { xs: "1 / -1", lg: "span 1" },
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: { xs: 1, lg: 0 },
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: "primary.main",
              fontSize: "0.875rem",
              fontWeight: "bold",
            }}
          >
            {index + 1}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle2"
              fontWeight="700"
              noWrap
              sx={{ color: "text.primary" }}
            >
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

          {/* Mobile-only Delete button */}
          <Box sx={{ display: { xs: "block", lg: "none" } }}>
            {!isReadOnly && (
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(item.id)}
                disabled={isDeleting}
                sx={{
                  bgcolor: "error.lighter",
                  "&:hover": { bgcolor: "error.light" },
                }}
              >
                <DeleteIcon size={18} />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Batch */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="600">
            رقم الدفعة
          </Typography>
          <Box sx={{ position: "relative" }}>
            <InstantTextField
              value={item.batch_number || ""}
              onChangeValue={(v) => onUpdate(item.id, "batch_number", v)}
              type="text"
              placeholder="—"
              disabled={isReadOnly}
            />
            {isFieldUpdating("batch_number") && (
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
        </Box>

        {/* Quantity */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="600">
            الكمية{" "}
            {unitInfo?.stocking_unit_name
              ? `(${unitInfo.stocking_unit_name})`
              : ""}
          </Typography>
          <Box sx={{ position: "relative" }}>
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
            {isFieldUpdating("quantity") && (
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
        </Box>

        {/* Unit Cost */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="600">
            التكلفة{" "}
            {unitInfo?.stocking_unit_name
              ? `(${unitInfo.stocking_unit_name})`
              : ""}
          </Typography>
          <Box sx={{ position: "relative" }}>
            <InstantTextField
              value={item.unit_cost}
              onChangeValue={(v) => {
                if (v === "") return;
                onUpdate(item.id, "unit_cost", Number(v));
              }}
              type="number"
              min={0}
              step={0.001}
              disabled={isReadOnly}
            />
            {isFieldUpdating("unit_cost") && (
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
        </Box>

        {/* Sale Price (Sellable) */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="600">
            البيع ({unitInfo?.sellable_unit_name || "وحدة"})
          </Typography>
          <Box sx={{ position: "relative" }}>
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
            {isFieldUpdating("sale_price") && (
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
        </Box>

        {/* Sale Price (Stocking) */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="600">
            البيع ({unitInfo?.stocking_unit_name || "تخزين"})
          </Typography>
          <Box sx={{ position: "relative" }}>
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
            {isFieldUpdating("sale_price_stocking_unit") && (
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
        </Box>

        {/* Total Cost */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            justifyContent: "center",
            height: "100%",
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight="600">
            إجمالي التكلفة
          </Typography>
          <Typography variant="subtitle2" fontWeight="700" color="primary.main">
            {formatCurrency(item.quantity * Number(item.unit_cost))}
          </Typography>
        </Box>

        {/* Actions - Desktop */}
        <Box
          sx={{
            display: { xs: "none", lg: "flex" },
            justifyContent: "center",
            height: "100%",
            alignItems: "center",
          }}
        >
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
      </Box>
    </Paper>
  );
};

export default React.memo(PurchaseItemCard);
