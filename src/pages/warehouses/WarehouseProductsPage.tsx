// src/pages/warehouses/WarehouseProductsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  alpha,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  CloudDownload as CloudDownloadIcon,
  Lock as LockIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import productService, { Product } from "../../services/productService";
import { warehouseService, Warehouse } from "../../services/warehouseService";
import { formatNumber, formatCurrency } from "../../constants";
import exportService, { exportWarehouseProductsPdf } from "../../services/exportService";

const WarehouseProductsPage: React.FC = () => {
  const { t } = useTranslation(["warehouses"]);
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Import Dialog State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  // Clear messages when dialog opens
  useEffect(() => {
    if (importDialogOpen) {
      setError(null);
      setSuccess(null);
    }
  }, [importDialogOpen]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Clear messages when search changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [debouncedSearchTerm]);

  // Fetch warehouse details
  useEffect(() => {
    const fetchWarehouse = async () => {
      if (!warehouseId) return;
      try {
        const data = await warehouseService.getById(Number(warehouseId));
        setWarehouse(data);
      } catch (error) {
        console.error("Error fetching warehouse:", error);
        setError(t("warehouses:productsPage.fetchWarehouseError"));
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
      setError(t("warehouses:productsPage.fetchProductsError"));
    } finally {
      setLoading(false);
    }
  }, [warehouseId, debouncedSearchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Header Section */}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          mb: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          borderRadius: 2
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={() => navigate("/admin/warehouses")}
              sx={{ color: 'white', '&:hover': { bgcolor: alpha('#fff', 0.1) } }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box display="flex" alignItems="center" gap={1.5}>
              <InventoryIcon />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {t("warehouses:productsPage.title")}
                </Typography>
                {warehouse && (
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {warehouse.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Search Bar Inline */}
          <Box sx={{ flex: 1, maxWidth: 300, mx: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={t("warehouses:productsPage.searchProductsPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: alpha('#fff', 0.15),
                  color: 'white',
                  '& fieldset': {
                    borderColor: alpha('#fff', 0.3),
                  },
                  '&:hover fieldset': {
                    borderColor: alpha('#fff', 0.5),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'white',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255,255,255,0.7)',
                    opacity: 1,
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                }
              }}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={async () => {
                if (!warehouseId) return;
                try {
                  await exportWarehouseProductsPdf(Number(warehouseId), {
                    search: debouncedSearchTerm
                  });
                } catch (error) {
                  setError(t('warehouses:productsPage.pdfExportError'));
                  console.error('PDF export error:', error);
                }
              }}
              sx={{
                bgcolor: alpha('#fff', 0.15),
                '&:hover': { bgcolor: alpha('#fff', 0.25) },
                borderRadius: 2,
                px: 2
              }}
            >
              {t('warehouses:productsPage.print')}
            </Button>

            <Button
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              onClick={() => {
                setImportDialogOpen(true);
                setPassword("");
                setError(null);
                setSuccess(null);
              }}
              sx={{
                bgcolor: alpha('#fff', 0.15),
                '&:hover': { bgcolor: alpha('#fff', 0.25) },
                borderRadius: 2,
                px: 2
              }}
            >
              {t('warehouses:productsPage.importMissing')}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      {/* Products Table */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {t('warehouses:productsPage.columnId')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {t('warehouses:productsPage.columnProductName')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  SKU
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {t('warehouses:productsPage.columnCategory')}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {t('warehouses:productsPage.columnQuantity')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {t('warehouses:productsPage.columnSalePrice')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {t('warehouses:productsPage.columnCost')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t('warehouses:productsPage.loadingEllipsis')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      {debouncedSearchTerm
                        ? t('warehouses:productsPage.noProductsMatchingSearch')
                        : t('warehouses:productsPage.noProductsInWarehouse')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.02)
                      }
                    }}
                  >
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      <Typography variant="body2" fontFamily="monospace">
                        #{product.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {product.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      <Typography variant="body2" fontFamily="monospace">
                        {product.sku || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {product.category_name || "—"}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        <Chip
                          label={formatNumber((product as any).warehouse_quantity || 0)}
                          color={(product as any).warehouse_quantity > 0 ? "success" : "default"}
                          size="small"
                          variant="outlined"
                        />
                        {product.sellable_unit_name && (
                          <Typography variant="caption" color="text.secondary">
                            {product.sellable_unit_name}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(Number(product.suggested_sale_price_per_sellable_unit || 0))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                      <Typography variant="body2">
                        {formatCurrency(Number(product.latest_cost_per_sellable_unit || 0))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Import Confirmation Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => !importLoading && setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon color="warning" />
          {t('warehouses:productsPage.importConfirmTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('warehouses:productsPage.importConfirmDesc')}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={t('warehouses:productsPage.passwordLabel')}
            type="password"
            fullWidth
            variant="outlined"
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setImportDialogOpen(false)}
            disabled={importLoading}
            sx={{ borderRadius: 2 }}
          >
            {t('warehouses:productsPage.cancel')}
          </Button>
          <Button
            onClick={async () => {
              if (password !== "alryyan1") {
                setError(t('warehouses:productsPage.incorrectPassword'));
                return;
              }

              setImportLoading(true);
              try {
                const res = await warehouseService.importMissingProducts(Number(warehouseId));
                setImportDialogOpen(false);
                fetchProducts();
                setError(null);
                setSuccess(res.message || t('warehouses:productsPage.importSuccess'));
                // Clear success message after 5 seconds
                setTimeout(() => setSuccess(null), 5000);
              } catch (err) {
                console.error(err);
                setError(t('warehouses:productsPage.importFailed'));
                setImportDialogOpen(false);
              } finally {
                setImportLoading(false);
              }
            }}
            variant="contained"
            disabled={importLoading || !password}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {importLoading ? t('warehouses:productsPage.importingEllipsis') : t('warehouses:productsPage.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WarehouseProductsPage;
