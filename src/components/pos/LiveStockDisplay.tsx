import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import { formatNumber } from "@/constants";
import productService from "../../services/productService";
import { Product } from "../../services/productService";
import { backendHealthService } from "../../services/backendHealthService";

interface LiveStockDisplayProps {
  product: Product;
  selectedBatchId?: number | null;
  selectedBatchNumber?: string | null;
  isLowStock?: boolean; // Optional: for backward compatibility, but calculated internally
  onStockClick?: (event: React.MouseEvent<HTMLElement>, product: Product) => void;
  currentSaleQuantity?: number;
  isOnline?: boolean; // Optional: pass from parent to avoid health check
}

export const LiveStockDisplay: React.FC<LiveStockDisplayProps> = ({
  product,
  selectedBatchId,
  selectedBatchNumber,
  isLowStock: isLowStockProp,
  onStockClick,
  currentSaleQuantity = 0,
  isOnline: isOnlineProp,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState<number>(product.stock_quantity);
  const mountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 2000; // Minimum 2 seconds between fetches for same product

  // Determine if backend is accessible
  const checkBackendAccess = useCallback(async (): Promise<boolean> => {
    // If isOnline prop is provided, use it (more efficient)
    if (isOnlineProp !== undefined) {
      return isOnlineProp;
    }
    // Otherwise, check backend health (with caching)
    return await backendHealthService.checkBackendAccessible();
  }, [isOnlineProp]);

  // Fetch latest stock from backend
  const fetchLatestStock = useCallback(async () => {
    if (!mountedRef.current) return;

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    // Prevent too frequent fetches
    if (timeSinceLastFetch < MIN_FETCH_INTERVAL) {
      return;
    }

    const backendAccessible = await checkBackendAccess();
    
    if (!backendAccessible) {
      // If backend not accessible, keep current stock (don't update)
      return;
    }

    setLoading(true);
    lastFetchTimeRef.current = now;

    try {
      const freshProduct = await productService.getProduct(product.id);

      if (mountedRef.current && freshProduct) {
        setCurrentStock(freshProduct.stock_quantity);
      }
    } catch (err) {
      console.error("Failed to fetch live stock from backend", err);
      // On error, keep current stock (don't update to avoid showing stale data)
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [product.id, checkBackendAccess]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    fetchLatestStock();

    return () => {
      mountedRef.current = false;
    };
  }, [product.id, currentSaleQuantity, fetchLatestStock]);

  // Calculate available stock (base stock minus quantity in current sale)
  const availableStock = useMemo(
    () => Math.max(0, currentStock - currentSaleQuantity),
    [currentStock, currentSaleQuantity]
  );

  // Calculate displayed stock based on batch selection
  const displayedStock = useMemo(() => {
    if (selectedBatchId) {
        console.log("selectedBatchId", selectedBatchId,product,'product',product.available_batches ,'available_batches');
      // For batch selection, show batch remaining quantity
      const batch = product.available_batches?.find((b) => b.id === selectedBatchId);
      return batch?.remaining_quantity ?? currentStock;
    }
    // For general stock, show available stock (after deducting current sale quantity)
    return availableStock;
  }, [selectedBatchId, product.available_batches, availableStock]);

  // Calculate if stock is low based on current stock and alert level
  const isActuallyLowStock = useMemo(() => {
    if (selectedBatchId) {
      // For batch selection, check batch remaining quantity
      const batch = product.available_batches?.find((b) => b.id === selectedBatchId);
      return batch ? batch.remaining_quantity <= (product.stock_alert_level || 0) : false;
    }
    // Use calculated value, fallback to prop if calculation not possible
    const calculated = availableStock <= (product.stock_alert_level || 0);
    return product.stock_alert_level !== null && product.stock_alert_level !== undefined
      ? calculated
      : (isLowStockProp ?? false);
  }, [selectedBatchId, product.available_batches, product.stock_alert_level, availableStock, isLowStockProp]);

  // Determine stock color based on state
  const stockColor = useMemo(() => {
    if (selectedBatchId) {
      return "primary.main";
    }
    return isActuallyLowStock ? "error.main" : "success.main";
  }, [selectedBatchId, isActuallyLowStock]);

  // Handle stock click
  const handleStockClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (onStockClick) {
        onStockClick(e, product);
      }
    },
    [onStockClick, product]
  );

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
          cursor: onStockClick ? "pointer" : "default",
          "&:hover": onStockClick ? { opacity: 0.8 } : {},
          transition: "opacity 0.2s ease",
        }}
        onClick={handleStockClick}
        title={onStockClick ? "انقر لعرض تفاصيل المخزون" : undefined}
      >
        <InventoryIcon sx={{ fontSize: 16, color: "text.secondary" }} />

        {loading ? (
          <CircularProgress size={14} thickness={5} />
        ) : (
          <Typography
            variant="body2"
            fontWeight="medium"
            color={stockColor}
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
      
      {!selectedBatchId && !loading && isActuallyLowStock && (
        <Typography variant="caption" color="error.main">
          مخزون منخفض
        </Typography>
      )}
    </Box>
  );
};
