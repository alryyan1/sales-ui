// src/pages/ProductsPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts } from "../hooks/useProducts";
import { useSettings } from "../context/SettingsContext";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

// Lucide Icons (shadcn)
import {
  Plus,
  Printer,
  FileSpreadsheet,
  Upload,
  Search,
  Layers,
  CloudUpload,
  Columns3,
} from "lucide-react";
import Popover from "@mui/material/Popover";
import Checkbox from "@mui/material/Checkbox";

// Services and Types
import productService, {
  Product,
  ProductFormData,
} from "../services/productService"; // Use product service
import unitService, { Unit } from "../services/UnitService"; // Import unit service
import categoryService, { Category } from "../services/CategoryService"; // Import category service
import exportService from "../services/exportService"; // Import export service
import { uploadProductsToFirestore } from "../services/firebaseStore"; // Import Firestore service

// Custom Components
import { ProductsTable } from "../components/products/ProductsTable"; // Use ProductsTable named export
import ProductFormModal from "../components/products/ProductFormModal"; // Use ProductFormModal
import ProductImportDialog from "../components/products/ProductImportDialog"; // Import dialog
import UnitsPage from "../pages/UnitsPage"; // Import UnitsPage

// Product type is now used directly from productService

const ProductsPage: React.FC = () => {
  const { getSetting } = useSettings();
  const firebaseCollectionName = getSetting(
    "firebase_collection_name",
    "put here the colloection name if not present in the settings",
  );
  // --- State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const rowsPerPage = 50;
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockingUnits, setStockingUnits] = useState<Unit[]>([]);
  const [sellableUnits, setSellableUnits] = useState<Unit[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const navigate = useNavigate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Use Product type directly
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isUnitsDialogOpen, setIsUnitsDialogOpen] = useState(false);

  // Column Visibility
  const COLUMN_KEYS = ["sku", "name", "scientific_name", "category", "sellable_unit", "stocking_unit", "units_per_stocking", "stock", "cost", "sale_price", "expire_date"] as const;
  type ColumnKey = typeof COLUMN_KEYS[number];
  const COLUMN_LABELS: Record<ColumnKey, string> = {
    sku: "SKU", name: "اسم المنتج", scientific_name: "الاسم العلمي",
    category: "الفئة", sellable_unit: "وحدة البيع", stocking_unit: "وحدة التخزين",
    units_per_stocking: "عدد الوحدات", stock: "المخزون", cost: "تكلفة",
    sale_price: "سعر البيع", expire_date: "الصلاحية",
  };
  const defaultVisibility: Record<ColumnKey, boolean> = {
    sku: true, name: true, scientific_name: true, category: true,
    sellable_unit: true, stocking_unit: true, units_per_stocking: true,
    stock: true, cost: true, sale_price: true, expire_date: true,
  };
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem("products_table_columns");
      return saved ? { ...defaultVisibility, ...JSON.parse(saved) } : defaultVisibility;
    } catch { return defaultVisibility; }
  });
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLButtonElement | null>(null);
  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("products_table_columns", JSON.stringify(next));
      return next;
    });
  };

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
    }, 500); // 500ms delay

    // Cleanup timeout on unmount or if searchTerm changes again
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]); // Runs whenever the raw searchTerm changes

  // --- React Query Hook (Infinite) ---
  const {
    data,
    isLoading,
    isError,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProducts({
    // page: currentPage, // Handled internally by infinite query
    perPage: rowsPerPage,
    search: debouncedSearchTerm,
    categoryId: selectedCategory,
    inStockOnly: showOnlyInStock,
  });

  // Flatten pages into a single array of products
  const products = data?.pages.flatMap((page) => page.data) || [];

  // Show loading when fetching initial data
  const isLoadingData = isLoading;

  // Extract error message if query fails
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : "حدث خطأ أثناء تحميل البيانات"
    : null;

  // Refetch mechanism via QueryClient (imported below)
  // const queryClient = useQueryClient(); // Requires import

  // --- Fetch Categories (Could also be moved to useQuery) ---
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await categoryService.getCategories(
        1,
        9999,
        "",
        false,
        true,
      );
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

  // --- Fetch Units ---
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const [stocking, sellable] = await Promise.all([
          unitService.getStockingUnits(),
          unitService.getSellableUnits(),
        ]);
        setStockingUnits(stocking);
        setSellableUnits(sellable);
      } catch (err) {
        console.error("Error fetching units:", err);
      }
    };
    fetchUnits();
  }, []);

  // --- Notification Handlers ---
  const showSnackbar = (message: string, type: "success" | "error") => {
    setSnackbar({
      open: true,
      message,
      severity: type,
    });
  };
  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // --- Modal Handlers ---
  const openModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
  };
  const queryClient = useQueryClient();

  const handleSaveSuccess = () => {
    closeModal();
    showSnackbar("تم حفظ المنتج بنجاح", "success");
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const handleDeleteSuccess = () => {
    closeModal();
    showSnackbar("تم حذف المنتج بنجاح", "success");
    // Reset queries to force a hard refresh and show loading state
    queryClient.resetQueries({ queryKey: ["products"] });
  };

  // --- Search Handlers ---
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  const handleCategoryChange = (event: SelectChangeEvent<number | null>) => {
    const categoryId = event.target.value as number | null;
    setSelectedCategory(categoryId);
  };

  const handlePrintProducts = async () => {
    try {
      // Pass current filters to the PDF export
      const filters = {
        search: debouncedSearchTerm,
        category_id: selectedCategory,
        // in_stock_only: showOnlyInStock, // User requested to show all products in export
        // low_stock_only: showLowStockOnly, // Fixed: showLowStockOnly was undefined
      };

      await exportService.exportProductsPdf(filters);
      showSnackbar("تم تصدير تقرير المنتجات إلى PDF بنجاح", "success");
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "Failed to export PDF",
        "error",
      );
    }
  };

  const handleExportExcel = async () => {
    try {
      // Pass current filters to the Excel export
      const filters = {
        search: debouncedSearchTerm,
        category_id: selectedCategory,
        // in_stock_only: showOnlyInStock, // User requested to show all products in export
        // low_stock_only: showLowStockOnly, // Fixed: showLowStockOnly was undefined
      };

      await exportService.exportProductsExcel(filters);
      showSnackbar("تم تصدير المنتجات إلى Excel بنجاح", "success");
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "Failed to export Excel",
        "error",
      );
    }
  };

  const handleImportSuccess = () => {
    // Refresh the products list after successful import
    queryClient.invalidateQueries({ queryKey: ["products"] });
    showSnackbar("تم استيراد المنتجات بنجاح", "success");
  };

  const handleProductCreate = async (data: ProductFormData) => {
    try {
      await productService.createProduct(data);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showSnackbar("تم إضافة المنتج بنجاح", "success");
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "فشل إضافة المنتج",
        "error",
      );
      throw err; // Re-throw to let the table know it failed
    }
  };

  const handleSyncToFirestore = async () => {
    if (
      !window.confirm(
        "هل أنت متأكد من رغبتك في مزامنة جميع المنتجات مع قاعدة بيانات Firebase؟ قد تستغرق هذه العملية بعض الوقت.",
      )
    ) {
      return;
    }

    try {
      setSyncLoading(true);
      showSnackbar("جاري جلب المنتجات والمزامنة...", "success");

      // 1. Fetch all products (large limit)
      // Note: adjust limit if you have more than 10000 products
      const response = await productService.getProducts(
        1,
        "",
        "id",
        "asc",
        9999,
      );
      const allProducts = response.data;

      if (allProducts.length === 0) {
        showSnackbar("لا توجد منتجات للمزامنة", "error");
        return;
      }

      // 2. Upload to Firestore
      const count = await uploadProductsToFirestore(
        allProducts,
        firebaseCollectionName,
      );

      showSnackbar(`تمت مزامنة ${count} منتج بنجاح!`, "success");
    } catch (err) {
      console.error("Sync error:", err);
      showSnackbar("فشل المزامنة مع Firebase", "error");
    } finally {
      setSyncLoading(false);
    }
  };

  // --- Render ---
  return (
    <>
      <Box>
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
            component="h1"
            className="text-gray-800 dark:text-gray-100 font-semibold"
          >
            إدارة المنتجات
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {/* Columns Toggle */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Tooltip title="إظهار/إخفاء الأعمدة">
                <IconButton onClick={(e) => setColumnsAnchor(e.currentTarget)} color="default">
                  <Columns3 className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">الأعمدة</Typography>
            </Box>
            <Popover
              open={Boolean(columnsAnchor)}
              anchorEl={columnsAnchor}
              onClose={() => setColumnsAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Box sx={{ p: 2, minWidth: 200 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>الأعمدة المرئية</Typography>
                {COLUMN_KEYS.map((key) => (
                  <Box key={key} sx={{ display: "flex", alignItems: "center" }}>
                    <Checkbox
                      size="small"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      // name=true is always required — prevent hiding it:
                      disabled={key === "name"}
                    />
                    <Typography variant="body2">{COLUMN_LABELS[key]}</Typography>
                  </Box>
                ))}
              </Box>
            </Popover>
            {/* Sync to Firestore */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title="مزامنة مع Firebase">
                <IconButton
                  onClick={handleSyncToFirestore}
                  color="warning" // Warning color to stand out but not primary action
                  disabled={syncLoading || isLoading}
                >
                  {syncLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <CloudUpload className="h-5 w-5" />
                  )}
                </IconButton>
              </Tooltip>
              <Typography variant="caption">مزامنة</Typography>
            </Box>

            {/* Print Products */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title="طباعة تقرير المنتجات">
                <IconButton
                  onClick={() => handlePrintProducts()}
                  color="default"
                >
                  <Printer className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">طباعة</Typography>
            </Box>

            {/* Export to Excel */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title="تصدير إلى Excel">
                <IconButton onClick={() => handleExportExcel()} color="default">
                  <FileSpreadsheet className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">Excel</Typography>
            </Box>

            {/* Import from File */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title="استيراد من ملف">
                <IconButton
                  onClick={() => setIsImportDialogOpen(true)}
                  color="default"
                >
                  <Upload className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">استيراد</Typography>
            </Box>

            {/* Add Product */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title="إضافة منتج جديد">
                <IconButton
                  onClick={() => openModal()}
                  color="primary"
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  <Plus className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">إضافة</Typography>
            </Box>

            {/* Manage Categories */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title="إدارة الفئات">
                <IconButton
                  onClick={() => navigate("/admin/categories")}
                  color="default"
                >
                  <Layers className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">الفئات</Typography>
            </Box>

            {/* Manage Units */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title="إدارة الوحدات">
                <IconButton
                  onClick={() => setIsUnitsDialogOpen(true)}
                  color="default"
                >
                  <Layers className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">الوحدات</Typography>
            </Box>
          </Box>
        </Box>
        {/* Search and Filters */}
        <Box sx={{ mb: 3, px: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
            }}
          >
            {/* Search Input */}
            <Box sx={{ flex: { md: 2 } }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="ابحث عن منتج..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        className="h-5 w-5"
                        style={{ color: "var(--mui-palette-action-active)" }}
                      />
                    </InputAdornment>
                  ),
                }}
                className="dark:bg-gray-800 [&>div>input]:text-gray-300 dark:[&>div>input]:text-gray-100 [&>div>fieldset]:border-gray-300 dark:[&>div>fieldset]:border-gray-600"
              />
            </Box>

            {/* Category Filter */}
            <Box sx={{ flex: { md: 1 } }}>
              <FormControl fullWidth size="small">
                <InputLabel className="dark:text-gray-300">
                  تصفية حسب الفئة
                </InputLabel>
                <Select
                  value={selectedCategory || ""}
                  onChange={handleCategoryChange}
                  label="تصفية حسب الفئة"
                  disabled={loadingCategories}
                >
                  <MenuItem value="">
                    <em>كل الفئات</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Out of Stock Toggle */}
            <Box
              sx={{ flex: { md: 1 }, display: "flex", alignItems: "center" }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={!showOnlyInStock}
                    onChange={() => setShowOnlyInStock(!showOnlyInStock)}
                    color="primary"
                  />
                }
                label="عرض الكميات المنخفضه"
              />
            </Box>
          </Box>
        </Box>
        {/* Loading / Error States - Only show error here as loading is handled by skeleton table */}
        {!isLoadingData && error && (
          <Alert severity="error" sx={{ my: 2, mx: 2 }}>
            {error}
          </Alert>
        )}
        {/* Content Area */}
        {!error && (
          <Box sx={{ mt: 2, width: "100%", px: 2 }}>
            <ProductsTable
              products={(products as Product[]) || []}
              onEdit={(product) => openModal(product as Product)}
              isLoading={isLoadingData}
              // Infinite Scroll
              onLoadMore={fetchNextPage}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              // Inline Creation Props
              categories={categories}
              stockingUnits={stockingUnits}
              sellableUnits={sellableUnits}
              onProductCreate={handleProductCreate}
              visibleColumns={visibleColumns}
            />
          </Box>
        )}
        {/* Modals and Snackbar */}
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          productToEdit={editingProduct as Product | null}
          onSaveSuccess={handleSaveSuccess}
          onDeleteSuccess={handleDeleteSuccess}
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
        {/* Units Management Dialog */}
        <Dialog
          open={isUnitsDialogOpen}
          onClose={() => setIsUnitsDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>إدارة الوحدات</DialogTitle>
          <DialogContent>
            <UnitsPage />
          </DialogContent>
        </Dialog>
        {/* Add deleteConfirm key */}
      </Box>
    </>
  );
};

export default ProductsPage;
