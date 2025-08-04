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
import FilterListIcon from "@mui/icons-material/FilterList";
import PrintIcon from "@mui/icons-material/Print";
import TableChartIcon from "@mui/icons-material/TableChart";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

// Services and Types
import productService, { Product } from "../services/productService"; // Use product service
import categoryService, { Category } from "../services/CategoryService"; // Import category service
import exportService from "../services/exportService"; // Import export service

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
import ProductImportDialog from "../components/products/ProductImportDialog"; // Import dialog

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

  // --- State ---
  const [productsResponse, setProductsResponse] =
    useState<ProductPaginatedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductTableItem | null>(null); // Use ProductTableItem type
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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
  const fetchProducts = useCallback(async (page: number, search: string, categoryId: number | null, perPage: number, inStockOnly: boolean, lowStockOnly: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the *debounced* search term for the API call
      const data = await productService.getProducts(
        page,
        search,
        "created_at",
        "desc",
        perPage,
        categoryId,
        inStockOnly,
        lowStockOnly
      );
      setProductsResponse(data as unknown as ProductPaginatedResponse);
    } catch (err) {
      setError(productService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed here

  // Fetch categories for filter dropdown
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await categoryService.getCategories(1, 9999, "", false, true);
      setCategories(data as Category[]);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Effect to fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Effect to fetch data when page, debounced search term, category, or rows per page changes
  useEffect(() => {
    fetchProducts(currentPage, debouncedSearchTerm, selectedCategory, rowsPerPage, showOnlyInStock, showLowStockOnly);
  }, [fetchProducts, currentPage, debouncedSearchTerm, selectedCategory, rowsPerPage, showOnlyInStock, showLowStockOnly]);

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
    fetchProducts(pageToFetch, debouncedSearchTerm, selectedCategory, rowsPerPage, showOnlyInStock, showLowStockOnly); // Refetch
    if (!editingProduct) setCurrentPage(1);
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
  const handleCategoryChange = (event: SelectChangeEvent<number | null>) => {
    const categoryId = event.target.value as number | null;
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };
  const handleRowsPerPageChange = (event: SelectChangeEvent<number>) => {
    const newRowsPerPage = event.target.value as number;
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to page 1 when rows per page changes
  };
  const handleStockFilterToggle = () => {
    setShowOnlyInStock(!showOnlyInStock);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const handleLowStockFilterToggle = () => {
    setShowLowStockOnly(!showLowStockOnly);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const handlePrintProducts = async () => {
    try {
      // Pass current filters to the PDF export
      const filters = {
        search: debouncedSearchTerm,
        category_id: selectedCategory,
        in_stock_only: showOnlyInStock,
        low_stock_only: showLowStockOnly,
      };
      
      await exportService.exportProductsPdf(filters);
      showSnackbar(t("products:printSuccess"), "success");
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : "Failed to export PDF", "error");
    }
  };

  const handleExportExcel = async () => {
    try {
      // Pass current filters to the Excel export
      const filters = {
        search: debouncedSearchTerm,
        category_id: selectedCategory,
        in_stock_only: showOnlyInStock,
        low_stock_only: showLowStockOnly,
      };
      
      await exportService.exportProductsExcel(filters);
      showSnackbar(t("products:excelSuccess"), "success");
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : "Failed to export Excel", "error");
    }
  };

  const handleImportSuccess = () => {
    // Refresh the products list after successful import
    fetchProducts(currentPage, debouncedSearchTerm, selectedCategory, rowsPerPage, showOnlyInStock, showLowStockOnly);
    showSnackbar(t("products:importSuccess"), "success");
  };

  // --- Render ---
  return (
    <>
      <style>
        {`
          .products-page-full-width {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        `}
      </style>
      <Box
        className="dark:bg-gray-900 h-[calc(100vh-100px)] w-full max-w-none products-page-full-width"
        sx={{
          width: '100%',
          maxWidth: 'none',
          margin: 0,
          padding: 0,
          // Override any container constraints from parent layout
          '&': {
            maxWidth: 'none !important',
            margin: '0 !important',
          }
        }}
      >
   

      {/* Header & Add Button */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 2,
          px: 2, // Add some horizontal padding for the header
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          className="text-gray-800 dark:text-gray-100 font-semibold"
        >
          {t("products:pageTitle")} {/* Add key */}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={showOnlyInStock ? "contained" : "outlined"}
            startIcon={<FilterListIcon />}
            onClick={handleStockFilterToggle}
            color={showOnlyInStock ? "primary" : "inherit"}
          >
            {showOnlyInStock ? t("products:showAllProducts") : t("products:showInStockOnly")}
          </Button>
          <Button
            variant={showLowStockOnly ? "contained" : "outlined"}
            startIcon={<FilterListIcon />}
            onClick={handleLowStockFilterToggle}
            color={showLowStockOnly ? "primary" : "inherit"}
          >
            {showLowStockOnly ? t("products:showAllProducts") : t("products:showLowStockOnly")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => handlePrintProducts()}
          >
            {t("products:printProducts")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<TableChartIcon />}
            onClick={() => handleExportExcel()}
          >
            {t("products:exportExcel")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => setIsImportDialogOpen(true)}
          >
            {t("products:importProducts")}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openModal()}
          >
            {t("products:addProduct")}
          </Button>
        </Box>
      </Box>
      {/* Search and Filters */}
      <Box sx={{ mb: 3, px: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {/* Search Input */}
          <Box sx={{ flex: { md: 2 } }}>
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

          {/* Category Filter */}
          <Box sx={{ flex: { md: 1 } }}>
            <FormControl fullWidth size="small">
              <InputLabel className="dark:text-gray-300">
                {t("products:filterByCategory")}
              </InputLabel>
              <Select
                value={selectedCategory || ""}
                onChange={handleCategoryChange}
                label={t("products:filterByCategory")}
                disabled={loadingCategories}
                sx={{
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : "#fff",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? theme.palette.text.primary
                      : "inherit",
                  "& .MuiSelect-icon": {
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
                }}
              >
                <MenuItem value="">
                  <em>{t("products:allCategories")}</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Rows Per Page Filter */}
          <Box sx={{ flex: { md: 1 } }}>
            <FormControl fullWidth size="small">
              <InputLabel className="dark:text-gray-300">
                {t("products:rowsPerPage")}
              </InputLabel>
              <Select
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                label={t("products:rowsPerPage")}
                sx={{
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : "#fff",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? theme.palette.text.primary
                      : "inherit",
                  "& .MuiSelect-icon": {
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
                }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={200}>200</MenuItem>
                <MenuItem value={500}>500</MenuItem>
                <MenuItem value={1000}>1000</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>
      {/* Loading / Error States */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5, px: 2 }}>
          
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
        <Alert severity="error" sx={{ my: 2, mx: 2 }}>
          {error}
        </Alert>
              )}
        {/* Content Area */}
      {!isLoading && !error && productsResponse && (
        <Box sx={{ mt: 2, width: '100%', px: 2 }}>
          <ProductsTable
            products={productsResponse.data as ProductTableItem[]}
            onEdit={(product) => openModal(product as ProductTableItem)}
            isLoading={false} // Removed isDeleting
          />
          {/* Pagination */}
          {productsResponse.meta.last_page > 1 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", p: 2, mt: 3, px: 2 }}
            >
              
              <Pagination
                count={productsResponse.meta.last_page}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                disabled={isLoading} // Removed isDeleting
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
      <ProductImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
      {/* Removed ConfirmationDialog */}
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbar.message}
      />
      {/* Add deleteConfirm key */}
    </Box>
    </>
  );
};

export default ProductsPage;
