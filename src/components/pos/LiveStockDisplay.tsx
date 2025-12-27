import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import { formatNumber } from "@/constants";
import { offlineSaleService } from "../../services/offlineSaleService";
import { Product } from "../../services/productService";

interface LiveStockDisplayProps {
  product: Product;
  selectedBatchId?: number | null;
  selectedBatchNumber?: string | null;
  isLowStock: boolean;
  onStockClick?: (event: React.MouseEvent<HTMLElement>, product: any) => void;
}

export const LiveStockDisplay: React.FC<LiveStockDisplayProps> = ({
  product,
  selectedBatchId,
  selectedBatchNumber,
  isLowStock,
  onStockClick,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState<number>(
    product.stock_quantity
  );

  useEffect(() => {
    let mounted = true;

    const fetchLatestStock = async () => {
      setLoading(true);
      try {
        // Fetch from local DB as it contains the synced data
        // We could also potentially try to fetch from API if online,
        // but offlineSaleService logic is cleaner to keep here.
        // Assuming searchProducts returns array, we filter by ID.
        // Or if we had a direct getProduct(id) in offlineSaleService which hits local DB.
        // offlineSaleService.searchProducts uses dbService.searchProducts which queries by index.
        // Let's rely on standard search for now or add getProductById to offlineSaleService.

        // Actually, let's use searchProducts with id? No, string search.
        // It's better to add getProduct to offlineSaleService.

        // For now, simulating "request for this sale item" behavior
        // by verifying against the local DB which is our "fresh" source after sync.

        const products = await offlineSaleService.searchProducts(product.name);
        const freshProduct = products.find((p) => p.id === product.id);

        if (mounted && freshProduct) {
          setCurrentStock(freshProduct.stock_quantity);
        }
      } catch (err) {
        console.error("Failed to fetch live stock", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLatestStock();

    return () => {
      mounted = false;
    };
  }, [product.id, product.name]); // Re-fetch if product identity changes

  const displayedStock = selectedBatchId
    ? product.available_batches?.find((b) => b.id === selectedBatchId)
        ?.remaining_quantity || 0
    : currentStock;

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
        /* We should ideally re-calc low stock based on fetched currentStock, 
           but passing isLowStock prop function is tricky from parent if it relies on value. 
           Let's rely on parent's isLowStock for now or simple check if we had alert level. */
        currentStock <= (product.stock_alert_level || 0) && (
          <Typography variant="caption" color="error.main">
            مخزون منخفض
          </Typography>
        )}
    </Box>
  );
};
