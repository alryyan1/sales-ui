// src/pages/warehouses/WarehouseProductsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  CloudDownload as CloudDownloadIcon,
} from "@mui/icons-material";
import productService, { Product } from "../../services/productService";
import { warehouseService, Warehouse } from "../../services/warehouseService";
import { formatNumber, formatCurrency } from "../../constants";

const WarehouseProductsPage: React.FC = () => {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Import Dialog State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch warehouse details
  useEffect(() => {
    const fetchWarehouse = async () => {
      if (!warehouseId) return;
      try {
        const data = await warehouseService.getById(Number(warehouseId));
        setWarehouse(data);
      } catch (error) {
        console.error("Error fetching warehouse:", error);
        setError("فشل تحميل بيانات المستودع");
      }
    };
    fetchWarehouse();
  }, [warehouseId]);

  // Fetch products for warehouse
  const fetchProducts = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getProducts(
        1,
        debouncedSearchTerm,
        "name",
        "asc",
        1000, // Get all products
        null,
        false,
        false,
        false
      );

      // Filter products that have stock in this warehouse
      const warehouseProducts = response.data.filter((product) => {
        if (product.warehouses && product.warehouses.length > 0) {
          const warehouseStock = product.warehouses.find(
            (w) => w.id === Number(warehouseId)
          );
          return warehouseStock && warehouseStock.pivot.quantity > 0;
        }
        return false;
      });

      // Map to include warehouse-specific quantity
      const productsWithWarehouseQty = warehouseProducts.map((product) => {
        const warehouseStock = product.warehouses?.find(
          (w) => w.id === Number(warehouseId)
        );
        return {
          ...product,
          warehouse_quantity: warehouseStock?.pivot.quantity || 0,
        };
      });

      setProducts(productsWithWarehouseQty);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("فشل تحميل المنتجات");
    } finally {
      setLoading(false);
    }
  }, [warehouseId, debouncedSearchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate("/admin/warehouses")}>
          <ArrowBackIcon />
        </IconButton>
        <Box display="flex" alignItems="center" gap={1} flex={1}>
          <InventoryIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h4" component="h1">
              منتجات المستودع
            </Typography>
            {warehouse && (
              <Typography variant="subtitle1" color="text.secondary">
                {warehouse.name}
              </Typography>
            )}
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<CloudDownloadIcon />}
          onClick={() => {
            setImportDialogOpen(true);
            setPassword("");
            setError(null);
          }}
        >
          استيراد نواقص المنتجات
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box mb={2}>
        <TextField
          fullWidth
          placeholder="البحث عن المنتجات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>
                <strong>المعرف</strong>
              </TableCell>
              <TableCell>
                <strong>اسم المنتج</strong>
              </TableCell>
              <TableCell>
                <strong>SKU</strong>
              </TableCell>
              <TableCell>
                <strong>الفئة</strong>
              </TableCell>
              <TableCell align="right">
                <strong>الكمية في المستودع</strong>
              </TableCell>
              <TableCell align="right">
                <strong>سعر البيع المقترح</strong>
              </TableCell>
              <TableCell align="right">
                <strong>تكلفة الوحدة</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {debouncedSearchTerm
                    ? "لا توجد منتجات تطابق البحث"
                    : "لا توجد منتجات في هذا المستودع"}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {product.name}
                      </Typography>
                      {product.scientific_name && (
                        <Typography variant="caption" color="text.secondary">
                          {product.scientific_name}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{product.sku || "-"}</TableCell>
                  <TableCell>{product.category_name || "-"}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={formatNumber(
                        (product as any).warehouse_quantity || 0
                      )}
                      color={
                        (product as any).warehouse_quantity > 0
                          ? "success"
                          : "default"
                      }
                      size="small"
                    />
                    {product.sellable_unit_name && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {product.sellable_unit_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(
                      Number(
                        product.suggested_sale_price_per_sellable_unit || 0
                      )
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(
                      Number(product.latest_cost_per_sellable_unit || 0)
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Password Dialog for Import */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
      >
        <DialogTitle>تأكيد الاستيراد</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            سيقوم هذا الإجراء باستيراد جميع المنتجات غير الموجودة في هذا
            المستودع مع كمياتها الحالية. يرجى إدخال كلمة المرور للمتابعة.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="كلمة المرور"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={async () => {
              if (password !== "alryyan1") {
                setError("كلمة المرور غير صحيحة");
                // Don't close, let them try again
                return;
              }

              setImportLoading(true);
              // setImportDialogOpen(false); // keep open while loading or close?
              // better to show loading state inside dialog or close and show global loading.
              // I'll keep it open but disabled
              try {
                const res = await warehouseService.importMissingProducts(
                  Number(warehouseId)
                );
                setImportDialogOpen(false);
                fetchProducts(); // Refresh
                setError(null);
                alert(res.message); // Simple feedback
              } catch (err) {
                console.error(err);
                setError("فشل الاستيراد");
                setImportDialogOpen(false);
              } finally {
                setImportLoading(false);
              }
            }}
            variant="contained"
            disabled={importLoading}
          >
            {importLoading ? "جاري الاستيراد..." : "تأكيد"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WarehouseProductsPage;
