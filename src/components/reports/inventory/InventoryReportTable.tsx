// src/components/reports/inventory/InventoryReportTable.tsx
import React, { useState } from "react";

// MUI Components
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Typography,
} from "@mui/material";

// Lucide Icons
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

// Child Component for batch details
import { InventoryBatchDetailsTable } from "./InventoryBatchDetailsTable"; // Ensure this path is correct

// Types
import { Product as ProductType } from "@/services/productService";
import { PurchaseItem as PurchaseItemType } from "@/services/purchaseService";
import { formatNumber, formatCurrency } from "@/constants";

// Interface for Product with potentially loaded batches
// This should match the structure of data coming from the API for this report
interface ProductWithBatches extends Omit<ProductType, "available_batches"> {
  available_batches?: PurchaseItemType[]; // Backend should provide this when 'include_batches' is true
  // Ensure ProductType itself has:
  // sku, name, stock_quantity, stock_alert_level,
  // latest_cost_per_sellable_unit, suggested_sale_price_per_sellable_unit,
  // sellable_unit_name
}

interface InventoryReportTableProps {
  products: ProductWithBatches[];
  isLoading?: boolean; // To disable actions if parent is still loading something else (e.g., filters)
  // fetchBatchesForProduct?: (productId: number) => Promise<void>; // For on-demand batch loading (more advanced)
}

export const InventoryReportTable: React.FC<InventoryReportTableProps> = ({
  products,
  isLoading = false, // Default to false
  // fetchBatchesForProduct
}) => {
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({}); // Tracks expanded rows by productId

  const toggleRow = (productId: number) => {
    setOpenRows((prev) => ({ ...prev, [productId]: !prev[productId] }));
    // If implementing on-demand batch loading:
    // const product = products.find(p => p.id === productId);
    // if (!prev[productId] && fetchBatchesForProduct && product && (!product.available_batches || product.available_batches.length === 0)) {
    //     fetchBatchesForProduct(productId);
    // }
  };

  if (products.length === 0) {
    return (
      <Box sx={{ py: 5, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          لم يتم العثور على أي منتجات
        </Typography>
      </Box>
    );
  }

  return (
    <Table sx={{ minWidth: "100%" }}>
      <TableHead>
        <TableRow sx={{ bgcolor: "grey.50" }}>
          <TableCell sx={{ width: 40, px: 1.5, py: 2 }}></TableCell>
          <TableCell sx={{ px: 2, py: 2, fontWeight: 600 }}>رمز المنتج (SKU)</TableCell>
          <TableCell sx={{ px: 2, py: 2, minWidth: 200, fontWeight: 600 }}>
            اسم المنتج
          </TableCell>
          <TableCell align="center" sx={{ px: 2, py: 2, fontWeight: 600 }}>
            إجمالي المخزون (وحدة)
          </TableCell>
          <TableCell align="center" sx={{ px: 2, py: 2, fontWeight: 600 }}>
            حد التنبيه
          </TableCell>
          <TableCell align="right" sx={{ px: 2, py: 2, fontWeight: 600 }}>
            أحدث تكلفة للوحدة
          </TableCell>
          <TableCell align="right" sx={{ px: 2, py: 2, fontWeight: 600 }}>
            آخر سعر بيع للوحدة
          </TableCell>
          <TableCell align="center" sx={{ px: 2, py: 2, fontWeight: 600 }}>
            إجمالي المشتريات
          </TableCell>
          <TableCell align="center" sx={{ px: 2, py: 2, fontWeight: 600 }}>
            إجمالي المبيعات
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {products.map((product) => {
          const isLow =
            product.stock_alert_level !== null &&
            product.stock_quantity <= product.stock_alert_level;
          const isOutOfStock = product.stock_quantity <= 0;
          const hasBatches =
            product.available_batches && product.available_batches.length > 0;
          const isOpen = !!openRows[product.id];
          const sellableUnitName = product.sellable_unit_name || "وحدة";

          return (
            <React.Fragment key={product.id}>
              <TableRow
                sx={{
                  bgcolor: isOutOfStock
                    ? "error.light"
                    : isLow
                    ? "warning.light"
                    : undefined,
                  transition: "background-color 0.2s ease",
                  "&:hover": {
                    bgcolor: isOutOfStock
                      ? "error.lighter"
                      : isLow
                      ? "warning.lighter"
                      : "action.hover",
                  },
                }}
              >
                <TableCell sx={{ px: 1.5, py: 1.5 }}>
                  {hasBatches ? (
                    <IconButton
                      size="small"
                      onClick={() => toggleRow(product.id)}
                      sx={{ 
                        width: 32, 
                        height: 32,
                        transition: "transform 0.2s ease",
                        "&:hover": {
                          transform: "scale(1.1)",
                        },
                      }}
                    >
                      {isOpen ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </IconButton>
                  ) : (
                    <Box sx={{ width: 32 }} />
                  )}
                </TableCell>
                <TableCell sx={{ px: 2, py: 1.5 }}>
                  {product.sku || "-"}
                </TableCell>
                <TableCell sx={{ px: 2, py: 1.5, fontWeight: 500 }}>
                  {product.name}
                </TableCell>
                <TableCell align="center" sx={{ px: 2, py: 1.5 }}>
                  <Box 
                    sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 0.75,
                    }}
                  >
                    {formatNumber(product.stock_quantity)} {sellableUnitName}
                    {(isLow || isOutOfStock) && (
                      <AlertTriangle 
                        size={16} 
                        style={{ 
                          color: "var(--mui-palette-warning-main)",
                        }} 
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ px: 2, py: 1.5 }}>
                  {product.stock_alert_level !== null
                    ? `${formatNumber(product.stock_alert_level)} ${sellableUnitName}`
                    : "-"}
                </TableCell>
                <TableCell align="right" sx={{ px: 2, py: 1.5 }}>
                  {product.latest_cost_per_sellable_unit
                    ? formatCurrency(product.latest_cost_per_sellable_unit)
                    : "-"}
                </TableCell>
                <TableCell align="right" sx={{ px: 2, py: 1.5 }}>
                  {product.last_sale_price_per_sellable_unit
                    ? formatCurrency(product.last_sale_price_per_sellable_unit)
                    : "-"}
                </TableCell>
                <TableCell align="center" sx={{ px: 2, py: 1.5 }}>
                  {product.total_items_purchased !== null &&
                  product.total_items_purchased !== undefined
                    ? formatNumber(product.total_items_purchased)
                    : "-"}
                </TableCell>
                <TableCell align="center" sx={{ px: 2, py: 1.5 }}>
                  {product.total_items_sold !== null &&
                  product.total_items_sold !== undefined
                    ? formatNumber(product.total_items_sold)
                    : "-"}
                </TableCell>
              </TableRow>
              {/* Collapsible Content for Batches */}
              {hasBatches && (
                <TableRow>
                  <TableCell colSpan={10} sx={{ p: 0, borderBottom: "none" }}>
                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                      <Box 
                        sx={{ 
                          p: 3, 
                          bgcolor: "grey.50", 
                          borderTop: 1, 
                          borderColor: "divider",
                        }}
                      >
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            mb: 2, 
                            fontWeight: 600,
                            color: "text.primary",
                          }}
                        >
                          {`تفاصيل الدفعات للمنتج: ${product.name}`}
                        </Typography>
                        <InventoryBatchDetailsTable
                          batches={product.available_batches!}
                          sellableUnitName={product.sellable_unit_name}
                        />
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};
