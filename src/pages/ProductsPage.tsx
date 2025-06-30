// src/pages/ProductsPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

// Services and Types
import productService, { Product } from "../services/productService"; // Use product service

// New type that matches the actual API response structure
interface ProductPaginatedResponse {
  data: ProductTableItem[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

// Custom Components
import { ProductsTable } from "../components/products/ProductsTable"; // Use ProductsTable named export
import ProductFormModal from "../components/products/ProductFormModal"; // Use ProductFormModal
import ConfirmationDialog from "../components/common/ConfirmationDialog"; // Reusable confirmation dialog

// Debug components
import { useAuthorization } from "../hooks/useAuthorization";

// Type that matches the actual API response structure
type ProductTableItem = {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  category_id: number | null;
  stocking_unit_name: string | null;
  sellable_unit_name: string | null;
  units_per_stocking_unit: number;
  stock_quantity: number;
  stock_alert_level: number | null;
  created_at: string;
  updated_at: string;
  // Optional fields that ProductsTable expects but aren't in API response
  available_batches?: {
    batch_id: number;
    quantity: number;
    expiry_date?: string;
  }[];
  category_name?: string | null;
  latest_cost_per_sellable_unit?: string | number | null;
  suggested_sale_price_per_sellable_unit?: string | number | null;
};

const ProductsPage: React.FC = () => {
  const { t } = useTranslation(["products", "common", "validation"]);
  const { user, userAllPermissions, can } = useAuthorization(); // Add debug info

  // --- State ---
  const [productsResponse, setProductsResponse] =
    useState<ProductPaginatedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductTableItem | null>(null); // Use ProductTableItem type

  // Deletion State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<number | null>(
    null
  ); // Use product ID
  const [isDeleting, setIsDeleting] = useState(false);

  // Snackbar State
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for debounce timer

  // --- Debounce Search Term Effect ---
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      console.log(`Debouncing search for products: "${searchTerm}"`);
      setDebouncedSearchTerm(searchTerm); // Update the debounced value
      setCurrentPage(1); // Reset to page 1 when search term changes
    }, 500); // 500ms delay

    // Cleanup timeout on unmount or if searchTerm changes again
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]); // Runs whenever the raw searchTerm changes

  // --- Data Fetching (uses debounced term) ---
  const fetchProducts = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the *debounced* search term for the API call
      const data = await productService.getProducts(
        page,
        search /*, sorting? */
      );
      setProductsResponse(data as unknown as ProductPaginatedResponse);
    } catch (err) {
      setError(productService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed here

  // Effect to fetch data when page or *debounced* search term changes
  useEffect(() => {
    fetchProducts(currentPage, debouncedSearchTerm);
  }, [fetchProducts, currentPage, debouncedSearchTerm]); // Depend on debounced value

  // --- Notification Handlers ---
  const showSnackbar = (message: string, type: "success" | "error") => {
    setSnackbar({
      open: true,
      message,
      severity: type,
    });
  };
  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // --- Modal Handlers ---
  const openModal = (product: ProductTableItem | null = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
  };
  const handleSaveSuccess = () => {
    const messageKey = editingProduct
      ? "products:saveSuccess"
      : "products:saveSuccess"; // Add keys
    closeModal();
    showSnackbar(t(messageKey), "success");
    const pageToFetch = editingProduct ? currentPage : 1;
    fetchProducts(pageToFetch, debouncedSearchTerm); // Refetch
    if (!editingProduct) setCurrentPage(1);
  };

  // --- Deletion Handlers ---
  const openConfirmDialog = (id: number) => {
    setProductToDeleteId(id);
    setIsConfirmOpen(true);
  };
  const closeConfirmDialog = () => {
    if (!isDeleting) {
      setIsConfirmOpen(false);
      setTimeout(() => setProductToDeleteId(null), 300);
    }
  };
  const handleDeleteConfirm = async () => {
    if (!productToDeleteId) return;
    setIsDeleting(true);
    try {
      await productService.deleteProduct(productToDeleteId); // Use productService
      showSnackbar(t("products:deleteSuccess"), "success"); // Add key
      closeConfirmDialog();
      // Smart refetch
      if (
        productsResponse &&
        productsResponse.data.length === 1 &&
        currentPage > 1
      ) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchProducts(currentPage, debouncedSearchTerm);
      }
    } catch (err) {
      showSnackbar(productService.getErrorMessage(err), "error");
      closeConfirmDialog();
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Pagination & Search Handlers ---
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // --- Render ---
  return (
    <Box
      sx={{ 
        p: { xs: 1, sm: 2, md: 3 },
        width: '100%'
      }}
      className="dark:bg-gray-900 min-h-screen"
    >
      {/* Debug Info - Remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="h6">Debug Info (Dev Only)</Typography>
          <Typography variant="body2">User: {user?.name || 'Not logged in'}</Typography>
          <Typography variant="body2">
            Permissions: {userAllPermissions?.length || 0} total
            {userAllPermissions?.includes('edit products') ? ' ✅ edit products' : ' ❌ edit products'}
            {userAllPermissions?.includes('delete products') ? ' ✅ delete products' : ' ❌ delete products'}
            {userAllPermissions?.includes('adjust stock') ? ' ✅ adjust stock' : ' ❌ adjust stock'}
          </Typography>
          <Typography variant="body2">
            Can edit products: {can('edit products') ? 'Yes' : 'No'}
          </Typography>
        </Box>
      )}

      {/* Header & Add Button */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          className="text-gray-800 dark:text-gray-100 font-semibold"
        >
          {t("products:pageTitle")} {/* Add key */}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openModal()}
        >
          {t("products:addProduct")} {/* Add key */}
        </Button>
      </Box>
      {/* Search Input */}
    <Box sx={{ mb: 3 }}>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder={t("products:searchPlaceholder") || "Search Products..."}
        value={searchTerm}
        onChange={handleSearchChange}
        InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        sx: {
          backgroundColor: (theme) =>
            theme.palette.mode === "dark"
            ? theme.palette.background.paper
            : "#fff",
          color: (theme) =>
            theme.palette.mode === "dark"
            ? theme.palette.text.primary
            : "inherit",
          "& input": {
            color: (theme) =>
            theme.palette.mode === "dark"
              ? theme.palette.text.primary
              : "inherit",
          },
          "& fieldset": {
            borderColor: (theme) =>
            theme.palette.mode === "dark"
              ? theme.palette.grey[700]
              : theme.palette.grey[300],
          },
        },
        }}
        className="dark:bg-gray-800 [&>div>input]:text-gray-300 dark:[&>div>input]:text-gray-100 [&>div>fieldset]:border-gray-300 dark:[&>div>fieldset]:border-gray-600"
      />
    </Box>
      {/* Loading / Error States */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          
          <CircularProgress />
          <Typography
            sx={{ ml: 2 }}
            className="text-gray-600 dark:text-gray-400"
          >
            {t("common:loading")}
          </Typography>
        </Box>
      )}
      {!isLoading && error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
              )}
        {/* Content Area */}
      {!isLoading && !error && productsResponse && (
        <Box sx={{ mt: 2 }}>
          <ProductsTable
            products={productsResponse.data as ProductTableItem[]}
            onEdit={(product) => openModal(product as ProductTableItem)}
            onDelete={openConfirmDialog}
            isLoading={isDeleting}
          />
          {/* Pagination */}
          {productsResponse.meta.last_page > 1 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", p: 2, mt: 3 }}
            >
              
              <Pagination
                count={productsResponse.meta.last_page}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                disabled={isLoading || isDeleting}
              />
            </Box>
          )}
          {/* No Products Message */}
          {productsResponse.data.length === 0 && (
            <Typography
              sx={{ textAlign: "center", py: 5 }}
              className="text-gray-500 dark:text-gray-400"
            >
              {t("products:noProducts")}
            </Typography>
          )}
        </Box>
      )}
      {/* Modals and Snackbar */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        productToEdit={editingProduct as Product | null}
        onSaveSuccess={handleSaveSuccess}
      />
      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleDeleteConfirm}
        title={t("common:confirmDeleteTitle")}
        message={t("products:deleteConfirm")}
        confirmText={t("common:delete")}
        cancelText={t("common:cancel")}
        isLoading={isDeleting}
      />
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbar.message}
      />
      {/* Add deleteConfirm key */}
    </Box>
  );
};

export default ProductsPage;
