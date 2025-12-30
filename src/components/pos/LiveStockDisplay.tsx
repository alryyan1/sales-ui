import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import { formatNumber } from "@/constants";
import productService from "../../services/productService";
import { Product } from "../../services/productService";

interface LiveStockDisplayProps {
  product: Product;
  selectedBatchId?: number | null;
  selectedBatchNumber?: string | null;
  isLowStock: boolean;
  onStockClick?: (event: React.MouseEvent<HTMLElement>, product: any) => void;
  currentSaleQuantity?: number;
}

export const LiveStockDisplay: React.FC<LiveStockDisplayProps> = ({
  product,
  selectedBatchId,
  selectedBatchNumber,
  isLowStock,
  onStockClick,
  currentSaleQuantity = 0,
}) => {
  console.log(product,'product',selectedBatchId,'selectedBatchId',selectedBatchNumber,'selectedBatchNumber',isLowStock,'isLowStock',onStockClick,'onStockClick');
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState<number>(
    product.stock_quantity
  );

  useEffect(() => {
    let mounted = true;

    const fetchLatestStock = async () => {
      // Only fetch from backend if online
      if (!navigator.onLine) {
        // If offline, use the product stock_quantity that was passed in
        setCurrentStock(product.stock_quantity);
        return;
      }

      setLoading(true);
      try {
        // Fetch fresh stock from backend API
        const freshProduct = await productService.getProduct(product.id);

        if (mounted && freshProduct) {
          setCurrentStock(freshProduct.stock_quantity);
        }
      } catch (err) {
        console.error("Failed to fetch live stock from backend", err);
        // On error, fallback to the product stock_quantity that was passed in
        if (mounted) {
          setCurrentStock(product.stock_quantity);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLatestStock();

    return () => {
      mounted = false;
    };
  }, [product.id, currentSaleQuantity]); // Re-fetch if product ID or quantity changes

  // Calculate available stock (base stock minus quantity in current sale)
  const availableStock = Math.max(0, currentStock - currentSaleQuantity);

  const displayedStock = selectedBatchId
    ? product.available_batches?.find((b) => b.id === selectedBatchId)
        ?.remaining_quantity || 0
    : availableStock;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          "&:hover": { opacity: 0.8 },
        }}
        onClick={(e) => onStockClick && onStockClick(e, product)}
      >
        <InventoryIcon sx={{ fontSize: 16, color: "text.secondary" }} />

        {loading ? (
          <CircularProgress size={14} thickness={5} />
        ) : (
          <Typography
            variant="body2"
            fontWeight="medium"
            color={
              selectedBatchId
                ? "primary.main"
                : isLowStock // Note: isLowStock checks passed prop, might differ from fresh stock?
                ? // Ideally we calculate isLowStock here too but for now use prop logic visually
                  "error.main"
                : "success.main"
            }
          >
            {formatNumber(displayedStock)}
          </Typography>
        )}
      </Box>
      {selectedBatchId && selectedBatchNumber && (
        <Typography variant="caption" color="primary.main">
          الدفعة: {selectedBatchNumber}
        </Typography>
      )}
      {!selectedBatchId &&
        !loading &&
        /* We should ideally re-calc low stock based on fetched availableStock, 
           but passing isLowStock prop function is tricky from parent if it relies on value. 
           Let's rely on parent's isLowStock for now or simple check if we had alert level. */
        availableStock <= (product.stock_alert_level || 0) && (
          <Typography variant="caption" color="error.main">
            مخزون منخفض
          </Typography>
        )}
    </Box>
  );
};
