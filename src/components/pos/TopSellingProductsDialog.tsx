import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import reportService, { BestSellingProduct } from "@/services/reportService";
import { formatNumber } from "@/constants";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { toast } from "sonner";

interface TopSellingProductsDialogProps {
  open: boolean;
  onClose: () => void;
  onAddProduct: (productId: number, productName: string) => Promise<void>;
}

export default function TopSellingProductsDialog({
  open,
  onClose,
  onAddProduct,
}: TopSellingProductsDialogProps) {
  const [products, setProducts] = useState<BestSellingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  const fetchTopSelling = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch top 20 best-selling products from the last 30 days
      const data = await reportService.getBestSellingProducts(30, 20);
      setProducts(data || []);
    } catch (err) {
      console.error("Failed to fetch top selling products:", err);
      toast.error("فشل جلب الأدوية الأكثر مبيعاً");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTopSelling();
    }
  }, [open, fetchTopSelling]);

  const handleAdd = async (product: BestSellingProduct) => {
    if (product.current_stock <= 0) {
      toast.error("هذا المنتج غير متوفر في المخزون");
      return;
    }
    try {
      setAddingId(product.id);
      await onAddProduct(product.id, product.name);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ m: 0, p: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <TrendingUpIcon color="primary" />
        الأدوية الأكثر مبيعاً (آخر 30 يوم)
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : products.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            لا توجد بيانات متاحة
          </Box>
        ) : (
          <List sx={{ pt: 0, pb: 0 }}>
            {products.map((product, index) => (
              <React.Fragment key={product.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  sx={{
                    pl: 2,
                    pr: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                  secondaryAction={
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={
                        addingId === product.id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <AddShoppingCartIcon />
                        )
                      }
                      onClick={() => handleAdd(product)}
                      disabled={
                        addingId === product.id || product.current_stock <= 0
                      }
                      color={product.current_stock > 0 ? "primary" : "inherit"}
                    >
                      إضافة
                    </Button>
                  }
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: "primary.light",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                    }}
                  >
                    {index + 1}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight="bold">
                        {product.name}
                      </Typography>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          الباركود:{" "}
                          <strong dir="ltr">{product.sku || "-"}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          | المباع:{" "}
                          <strong>
                            {formatNumber(product.total_quantity_sold)}
                          </strong>
                        </Typography>
                        {product.current_stock <= 0 ? (
                          <Chip
                            label="نفذت الكمية"
                            size="small"
                            color="error"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        ) : (
                          <Chip
                            label={`بالمخزن: ${product.current_stock}`}
                            size="small"
                            color="success"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
