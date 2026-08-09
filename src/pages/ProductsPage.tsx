// src/pages/ProductsPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  FileText,
  Upload,
  Search,
  Layers,
  CloudUpload,
  Columns3,
  RefreshCcw,
  Percent,
  Sparkles,
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
import exportService, { exportInventoryAuditPdf } from "../services/exportService"; // Import export service
import { uploadProductsToFirestore } from "../services/firebaseStore"; // Import Firestore service
import { warehouseService, Warehouse } from "../services/warehouseService";

// Custom Components
import { ProductsTable } from "../components/products/ProductsTable"; // Use ProductsTable named export
import ProductFormModal from "../components/products/ProductFormModal"; // Use ProductFormModal
import ProductImportDialog from "../components/products/ProductImportDialog"; // Import dialog
import BarcodeLabelPdfDialog from "../components/products/BarcodeLabelPdfDialog";
import UnitsPage from "../pages/UnitsPage"; // Import UnitsPage
import { Button } from "@mui/material";

// Product type is now used directly from productService

const ProductsPage: React.FC = () => {
  const { t } = useTranslation(["products", "common"]);
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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockingUnits, setStockingUnits] = useState<Unit[]>([]);
  const [sellableUnits, setSellableUnits] = useState<Unit[]>([]);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | "">("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sortingLoading, setSortingLoading] = useState(false);

  // Sorting handler
  const handleSort = (column: string) => {
    // Prevent sorting while already sorting
    if (sortingLoading) return;
    
    setSortingLoading(true);
    if (sortBy === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const navigate = useNavigate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Use Product type directly
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isUnitsDialogOpen, setIsUnitsDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [selectedBulkUnit, setSelectedBulkUnit] = useState<number | "">("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const [isBulkSalePriceDialogOpen, setIsBulkSalePriceDialogOpen] = useState(false);
  const [bulkSalePricePercentage, setBulkSalePricePercentage] = useState<string>("");
  const [isBulkSalePriceUpdating, setIsBulkSalePriceUpdating] = useState(false);

  const [barcodeLabelProduct, setBarcodeLabelProduct] = useState<{ id: number; name: string; sku: string | null } | null>(null);

  // Column Visibility
  const COLUMN_KEYS = ["sku", "name", "category", "sellable_unit", "stocking_unit", "units_per_stocking", "stock", "cost", "sale_price", "description"] as const;
  type ColumnKey = typeof COLUMN_KEYS[number];
  const COLUMN_LABELS: Record<ColumnKey, string> = {
    sku: t("products:list.columnLabels.sku"), name: t("products:list.columnLabels.name"),
    category: t("products:list.columnLabels.category"), sellable_unit: t("products:list.columnLabels.sellable_unit"), stocking_unit: t("products:list.columnLabels.stocking_unit"),
    units_per_stocking: t("products:list.columnLabels.units_per_stocking"), stock: t("products:list.columnLabels.stock"), cost: t("products:list.columnLabels.cost"),
    sale_price: t("products:list.columnLabels.sale_price"), description: t("products:list.columnLabels.description"),
  };
  const defaultVisibility: Record<ColumnKey, boolean> = {
    sku: true, name: true, category: true,
    sellable_unit: true, stocking_unit: true, units_per_stocking: true,
    stock: true, cost: true, sale_price: true, description: true,
  };
  // On phones, default to a lean column set to avoid excessive horizontal scrolling.
  // Only used as the initial value when the user hasn't already saved a preference.
  const mobileDefaultVisibility: Record<ColumnKey, boolean> = {
    sku: true, name: true, category: false,
    sellable_unit: false, stocking_unit: false, units_per_stocking: false,
    stock: true, cost: false, sale_price: true, description: false,
  };
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem("products_table_columns");
      if (saved) return { ...defaultVisibility, ...JSON.parse(saved) };
      return window.innerWidth < 640 ? mobileDefaultVisibility : defaultVisibility;
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
    isFetching,
    isError,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProducts({
    // page: currentPage, // Handled internally by infinite query
    perPage: rowsPerPage,
    search: debouncedSearchTerm,
    sortBy,
    sortDirection,
    categoryId: selectedCategory,
    inStockOnly: showOnlyInStock,
    lowStockOnly: showLowStockOnly,
    warehouseId: selectedWarehouse ? (selectedWarehouse as number) : undefined,
  });

  // Flatten pages into a single array of products
  const products = data?.pages.flatMap((page) => page.data) || [];

  // Total product count from paginated response
  const totalProducts = data?.pages?.[0]?.meta?.total ?? 0;

  // Show loading when fetching initial data or refetching (e.g. warehouse/filter change)
  const isLoadingData = isLoading || (isFetching && !isFetchingNextPage);

  // Stop sorting loading when data finishes loading or changes
  useEffect(() => {
    if (!isLoading) {
      setSortingLoading(false);
    }
  }, [isLoading, data]);

  // Safety timeout: clear loading after 10 seconds to prevent hanging
  useEffect(() => {
    if (!sortingLoading) return;
    
    const timeout = setTimeout(() => {
      setSortingLoading(false);
      console.warn("Sort loading timed out - clearing loading state");
    }, 10000); // 10 seconds

    return () => clearTimeout(timeout);
  }, [sortingLoading]);

  // Extract error message if query fails
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : t("common:errorLoadingData")
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
        console.log("Stocking units:", stocking);
        console.log("Sellable units:", sellable);
        setStockingUnits(stocking);
        setSellableUnits(sellable);
      } catch (err) {
        console.error("Error fetching units:", err);
      }
    };
    fetchUnits();
  }, []);

  // --- Fetch Warehouses ---
  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const data = await warehouseService.getAll();
        setWarehouses(data);
      } catch (err) {
        console.error("Error fetching warehouses:", err);
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
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
    showSnackbar(t("products:list.productSavedSuccess"), "success");
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const handleDeleteSuccess = () => {
    closeModal();
    showSnackbar(t("products:list.productDeletedSuccess"), "success");
    // Reset queries to force a hard refresh and show loading state
    queryClient.resetQueries({ queryKey: ["products"] });
  };

  // --- Context Menu Handlers ---
  const handleDuplicateProduct = async (product: Product) => {
    try {
      const duplicatedData: ProductFormData = {
        name: `${product.name} ${t("products:list.duplicateSuffix")}`,
        sku: null, // Will be auto-generated
        description: product.description,
        image_url: product.image_url,
        stock_quantity: 0,
        stock_alert_level: product.stock_alert_level,
        category_id: product.category_id,
        stocking_unit_id: product.stocking_unit_id,
        sellable_unit_id: product.sellable_unit_id,
        units_per_stocking_unit: product.units_per_stocking_unit,
        cost_price: product.cost_price,
        sale_price: product.last_sale_price_per_sellable_unit,
      };

      await productService.createProduct(duplicatedData);
      showSnackbar(t("products:list.duplicateSuccess"), "success");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      console.error("Error duplicating product:", error);
      showSnackbar(t("products:list.duplicateFailed"), "error");
    }
  };

  const handleExportProduct = async (product: Product) => {
    try {
      // Export single product data
      const exportData = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category_name,
        stock_quantity: product.current_stock_quantity || product.stock_quantity,
        cost_price: product.latest_cost_per_sellable_unit,
        sale_price: product.last_sale_price_per_sellable_unit,
        sellable_unit: product.sellable_unit_name,
        stocking_unit: product.stocking_unit_name,
        units_per_stocking: product.units_per_stocking_unit,
      };

      // Create and download CSV
      const headers = Object.keys(exportData);
      const values = Object.values(exportData);
      const csvContent = [headers.join(','), values.join(',')].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `product_${product.sku || product.id}.csv`;
      link.click();

      showSnackbar(t("products:list.exportProductSuccess"), "success");
    } catch (error) {
      console.error("Error exporting product:", error);
      showSnackbar(t("products:list.exportProductFailed"), "error");
    }
  };

  const handleDeleteProduct = (product: Product) => {
    // This will trigger the delete confirmation in ProductFormModal
    openModal(product);
    // The modal will handle the delete confirmation
  };

  const handleCopyProductInfo = async (product: Product) => {
    try {
      const notSpecified = t("common:notSpecified");
      const productInfo = `
${t("products:product")}: ${product.name}
${product.sku ? `SKU: ${product.sku}` : ''}
${t("products:category")}: ${product.category_name || notSpecified}
${t("products:stock")}: ${product.current_stock_quantity || product.stock_quantity || 0} ${product.sellable_unit_name || ''}
${t("products:purchasePrice")}: ${product.latest_cost_per_sellable_unit ? formatCurrency(Number(product.latest_cost_per_sellable_unit)) : notSpecified}
${t("products:salePrice")}: ${product.last_sale_price_per_sellable_unit ? formatCurrency(Number(product.last_sale_price_per_sellable_unit)) : notSpecified}
      `.trim();

      await navigator.clipboard.writeText(productInfo);
      showSnackbar(t("products:list.copyInfoSuccess"), "success");
    } catch (error) {
      console.error("Error copying product info:", error);
      showSnackbar(t("products:list.copyInfoFailed"), "error");
    }
  };

  const handleToggleFavorite = (product: Product) => {
    // TODO: Implement favorites functionality
    showSnackbar(`${product.name} ${Math.random() > 0.5 ? t("products:list.addedToFavorites") : t("products:list.removedFromFavorites")}`, "info");
  };

  const handlePriceUpdate = async (productId: number, field: "sale_price" | "cost_price", value: number | null) => {
    // Optimistic update — patch the cache directly so no refetch/overlay is triggered
    queryClient.setQueriesData(
      { queryKey: ["products", "infinite"], exact: false },
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((p: any) =>
              p.id === productId ? { ...p, [field]: value } : p
            ),
          })),
        };
      }
    );
    try {
      await productService.updateProduct(productId, { [field]: value });
    } catch (error) {
      // Revert on failure
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showSnackbar(t("products:list.priceUpdateFailed"), "error");
    }
  };

  // --- Search Handlers ---
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  const handleCategoryChange = (event: SelectChangeEvent<number | null>) => {
    const categoryId = event.target.value as number | null;
    setSelectedCategory(categoryId);
  };
  const handleWarehouseChange = (event: SelectChangeEvent<number | "">) => {
    setSelectedWarehouse(event.target.value as number | "");
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
      showSnackbar(t("products:list.printReportSuccess"), "success");
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
      showSnackbar(t("products:list.excelExportSuccess"), "success");
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : "Failed to export Excel",
        "error",
      );
    }
  };

  const handleExportAuditReport = async () => {
    try {
      await exportInventoryAuditPdf({
        search: debouncedSearchTerm,
        category_id: selectedCategory,
        warehouse_id: selectedWarehouse ? Number(selectedWarehouse) : null,
      });
      showSnackbar(t("products:list.auditExportStarted"), "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : t("products:list.auditExportFailed"),
        "error",
      );
    }
  };

  const handleImportSuccess = () => {
    // Refresh the products list after successful import
    queryClient.invalidateQueries({ queryKey: ["products"] });
    showSnackbar(t("products:importSuccess"), "success");
  };

  const handleProductCreate = async (data: ProductFormData) => {
    try {
      await productService.createProduct(data);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showSnackbar(t("products:list.productAddedSuccess"), "success");
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : t("products:list.productAddFailed"),
        "error",
      );
      throw err; // Re-throw to let the table know it failed
    }
  };

  const handleSyncToFirestore = async () => {
    if (
      !window.confirm(t("products:list.confirmSyncFirebase"))
    ) {
      return;
    }

    try {
      setSyncLoading(true);
      showSnackbar(t("products:list.syncingProducts"), "success");

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
        showSnackbar(t("products:list.noProductsToSync"), "error");
        return;
      }

      // 2. Upload to Firestore
      const count = await uploadProductsToFirestore(
        allProducts,
        firebaseCollectionName,
      );

      showSnackbar(t("products:list.syncSuccess", { count }), "success");
    } catch (err) {
      console.error("Sync error:", err);
      showSnackbar(t("products:list.syncFailed"), "error");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!selectedBulkUnit) return;

    if (!window.confirm(t("products:list.confirmBulkUpdateUnits"))) {
      return;
    }

    try {
      setIsBulkUpdating(true);
      await productService.bulkUpdateUnits(selectedBulkUnit as number);
      showSnackbar(t("products:list.bulkUpdateUnitsSuccess"), "success");
      setIsBulkUpdateDialogOpen(false);
      setSelectedBulkUnit("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : t("products:list.bulkUpdateUnitsFailed"), "error");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkUpdateSalePrice = async () => {
    const pct = parseFloat(bulkSalePricePercentage);
    if (isNaN(pct) || pct <= 0) return;

    if (!window.confirm(t("products:list.confirmRaisePrices", { pct }))) {
      return;
    }

    try {
      setIsBulkSalePriceUpdating(true);
      const result = await productService.bulkUpdateSalePrice(pct);
      showSnackbar(result.message, "success");
      setIsBulkSalePriceDialogOpen(false);
      setBulkSalePricePercentage("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : t("products:list.raisePricesFailed"), "error");
    } finally {
      setIsBulkSalePriceUpdating(false);
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography
              component="h1"
              className="text-gray-800 dark:text-gray-100 font-semibold"
            >
              {t("products:pageTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("products:list.totalProducts", { count: totalProducts.toLocaleString() })}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {/* Columns Toggle */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Tooltip title={t("products:list.toggleColumns")}>
                <IconButton onClick={(e) => setColumnsAnchor(e.currentTarget)} color="default">
                  <Columns3 className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.columns")}</Typography>
            </Box>
            <Popover
              open={Boolean(columnsAnchor)}
              anchorEl={columnsAnchor}
              onClose={() => setColumnsAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Box sx={{ p: 2, minWidth: 200 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{t("products:list.visibleColumns")}</Typography>
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
              <Tooltip title={t("products:list.syncFirebase")}>
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
              <Typography variant="caption">{t("products:list.sync")}</Typography>
            </Box>

            {/* Print Products */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.printReportTooltip")}>
                <IconButton
                  onClick={() => handlePrintProducts()}
                  color="default"
                >
                  <Printer className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.print")}</Typography>
            </Box>

            {/* Price List PDF */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.priceListPdf")}>
                <IconButton
                  onClick={() => exportService.exportPriceListPdf()}
                  color="default"
                >
                  <FileText className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.priceList")}</Typography>
            </Box>

            {/* Export to Excel */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.exportToExcel")}>
                <IconButton onClick={() => handleExportExcel()} color="default">
                  <FileSpreadsheet className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">Excel</Typography>
            </Box>

            {/* Export Inventory Audit PDF */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.auditReportTooltip")}>
                <IconButton
                  onClick={() => handleExportAuditReport()}
                  color="secondary"
                >
                  <Sparkles className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.auditReport")}</Typography>
            </Box>

            {/* Import from File */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.importFromFile")}>
                <IconButton
                  onClick={() => setIsImportDialogOpen(true)}
                  color="default"
                >
                  <Upload className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.import")}</Typography>
            </Box>

            {/* Add Product */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.addNewProductTooltip")}>
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
              <Typography variant="caption">{t("products:list.add")}</Typography>
            </Box>

            {/* Manage Categories */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.manageCategoriesTooltip")}>
                <IconButton
                  onClick={() => navigate("/admin/categories")}
                  color="default"
                >
                  <Layers className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.categories")}</Typography>
            </Box>

            {/* Manage Units */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.manageUnitsTooltip")}>
                <IconButton
                  onClick={() => setIsUnitsDialogOpen(true)}
                  color="default"
                >
                  <Layers className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.unitsLabel")}</Typography>
            </Box>

            {/* Bulk Update Units */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.bulkUpdateUnitsTooltip")}>
                <IconButton
                  onClick={() => setIsBulkUpdateDialogOpen(true)}
                  color="secondary"
                >
                  <RefreshCcw className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.bulkUpdate")}</Typography>
            </Box>

            {/* Bulk Update Sale Price */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("products:list.raisePricesTooltip")}>
                <IconButton
                  onClick={() => setIsBulkSalePriceDialogOpen(true)}
                  color="success"
                >
                  <Percent className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("products:list.raisePrices")}</Typography>
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
                placeholder={t("products:list.searchPlaceholder")}
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
                  {t("products:filterByCategory")}
                </InputLabel>
                <Select
                  value={selectedCategory || ""}
                  onChange={handleCategoryChange}
                  label={t("products:filterByCategory")}
                  disabled={loadingCategories}
                >
                  <MenuItem value="">
                    <em>{t("products:list.allCategoriesOption")}</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Warehouse Filter */}
            <Box sx={{ flex: { md: 1 } }}>
              <FormControl fullWidth size="small">
                <InputLabel className="dark:text-gray-300">{t("products:list.filterByWarehouse")}</InputLabel>
                <Select
                  value={selectedWarehouse}
                  onChange={handleWarehouseChange}
                  label={t("products:list.filterByWarehouse")}
                  disabled={loadingWarehouses}
                >
                  <MenuItem value="">
                    <em>{t("products:list.allWarehousesOption")}</em>
                  </MenuItem>
                  {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Low Stock Toggle */}
            {/* <Box
              sx={{ flex: { md: 1 }, display: "flex", alignItems: "center" }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={showLowStockOnly}
                    onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                    color="warning"
                  />
                }
                label="المخزون المنخفض"
              />
            </Box> */}

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
                label={t("products:list.showLowQuantities")}
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
              onBarcodeLabel={(product) => setBarcodeLabelProduct({ id: product.id, name: product.name, sku: product.sku ?? null })}
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
              // Sorting Props
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleSort}
              sortingLoading={sortingLoading}
              // Context Menu Props
              onDuplicate={handleDuplicateProduct}
              onExport={handleExportProduct}
              onDelete={handleDeleteProduct}
              onCopyInfo={handleCopyProductInfo}
              onToggleFavorite={handleToggleFavorite}
              onPriceUpdate={handlePriceUpdate}
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
          <DialogContent>
            <UnitsPage />
          </DialogContent>
        </Dialog>

        {/* Bulk Update Units Dialog */}
        <Dialog
          open={isBulkUpdateDialogOpen}
          onClose={() => !isBulkUpdating && setIsBulkUpdateDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 600 }}>{t("products:list.unitsBulkUpdateTitle")}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t("products:list.unitsBulkUpdateDesc")}
              </Typography>

              <FormControl fullWidth>
                <InputLabel>{t("products:list.chooseUnit")}</InputLabel>
                <Select
                  value={selectedBulkUnit}
                  onChange={(e) => setSelectedBulkUnit(e.target.value as number)}
                  label={t("products:list.chooseUnit")}
                  disabled={isBulkUpdating}
                >
                  {sellableUnits.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 1 }}>
                <Button
                  onClick={() => setIsBulkUpdateDialogOpen(false)}
                  disabled={isBulkUpdating}
                >
                  {t("common:cancel")}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBulkUpdate}
                  disabled={!selectedBulkUnit || isBulkUpdating}
                  startIcon={isBulkUpdating && <RefreshCcw className="h-4 w-4 animate-spin" />}
                >
                  {isBulkUpdating ? t("products:list.updatingEllipsis") : t("products:list.updateAll")}
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
        {/* Barcode Label PDF Dialog */}
        <BarcodeLabelPdfDialog
          open={barcodeLabelProduct !== null}
          onClose={() => setBarcodeLabelProduct(null)}
          product={barcodeLabelProduct}
        />

        {/* Bulk Update Sale Price Dialog */}
        <Dialog
          open={isBulkSalePriceDialogOpen}
          onClose={() => !isBulkSalePriceUpdating && setIsBulkSalePriceDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 600 }}>{t("products:list.raisePricesTitle")}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t("products:list.raisePricesDesc")}
              </Typography>

              <TextField
                fullWidth
                label={t("products:list.increasePercent")}
                type="number"
                value={bulkSalePricePercentage}
                onChange={(e) => setBulkSalePricePercentage(e.target.value)}
                disabled={isBulkSalePriceUpdating}
                inputProps={{ min: 0, step: 0.1 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />

              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 1 }}>
                <Button
                  onClick={() => setIsBulkSalePriceDialogOpen(false)}
                  disabled={isBulkSalePriceUpdating}
                >
                  {t("common:cancel")}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleBulkUpdateSalePrice}
                  disabled={!bulkSalePricePercentage || parseFloat(bulkSalePricePercentage) <= 0 || isBulkSalePriceUpdating}
                  startIcon={isBulkSalePriceUpdating && <RefreshCcw className="h-4 w-4 animate-spin" />}
                >
                  {isBulkSalePriceUpdating ? t("products:list.updatingEllipsis") : t("common:apply")}
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </>
  );
};

export default ProductsPage;
