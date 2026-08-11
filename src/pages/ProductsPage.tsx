// src/pages/ProductsPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useProducts } from "../hooks/useProducts";
import { useLanguage } from "@/context/LanguageContext";
import { getLocalizedName } from "@/lib/utils";

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
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";

// Lucide Icons (shadcn)
import {
  Plus,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  Layers,
  Columns3,
  Package as PackageIcon,
  Edit,
  Trash2,
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
import { warehouseService, Warehouse } from "../services/warehouseService";

// Custom Components
import { ProductsTable } from "../components/products/ProductsTable"; // Use ProductsTable named export
import ProductFormModal from "../components/products/ProductFormModal"; // Use ProductFormModal
import BarcodeLabelPdfDialog from "../components/products/BarcodeLabelPdfDialog";
import PackageFormModal from "../components/products/PackageFormModal";
import packageService, { Package } from "../services/packageService";
import { toast } from "sonner";
import { Button } from "@mui/material";

// Product type is now used directly from productService

const ProductsPage: React.FC = () => {
  const { direction } = useLanguage();
  const { t, i18n } = useTranslation("products");
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
  // Tab State
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Package State
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const { data: packages, isLoading: isPackagesLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: () => packageService.getPackages(),
  });

  const deletePackageMutation = useMutation({
    mutationFn: (id: number) => packageService.deletePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success(t("packageDeletedToast"));
    },
  });

  const handleDeletePackage = (id: number) => {
    if (confirm(t("confirmDeletePackage"))) {
      deletePackageMutation.mutate(id);
    }
  };

  const openPackageModal = (pkg: Package | null = null) => {
    setEditingPackage(pkg);
    setIsPackageModalOpen(true);
  };

  const closePackageModal = () => {
    setIsPackageModalOpen(false);
    setEditingPackage(null);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Use Product type directly


  const [barcodeLabelProduct, setBarcodeLabelProduct] = useState<{ id: number; name: string; sku: string | null } | null>(null);

  // Column Visibility
  const COLUMN_KEYS = ["sku", "name", "scientific_name", "category", "sellable_unit", "stocking_unit", "units_per_stocking", "stock", "cost", "sale_price", "expire_date", "description"] as const;
  type ColumnKey = typeof COLUMN_KEYS[number];
  const COLUMN_LABELS: Record<ColumnKey, string> = {
    sku: "SKU", name: t("productName"), scientific_name: t("scientificName"),
    category: t("categoryColumnShort"), sellable_unit: t("sellableUnit"), stocking_unit: t("stockingUnit"),
    units_per_stocking: t("unitsCountColumn"), stock: t("stock"), cost: t("costColumn"),
    sale_price: t("salePrice"), expire_date: t("expiryDateColumn"), description: t("descriptionColumn"),
  };
  const defaultVisibility: Record<ColumnKey, boolean> = {
    sku: true, name: true, scientific_name: true, category: true,
    sellable_unit: true, stocking_unit: true, units_per_stocking: true,
    stock: true, cost: true, sale_price: true, expire_date: true, description: true,
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
      : t("loadDataError")
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
    showSnackbar(t("productSavedSuccess"), "success");
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const handleDeleteSuccess = () => {
    closeModal();
    showSnackbar(t("productDeletedSuccess"), "success");
    // Reset queries to force a hard refresh and show loading state
    queryClient.resetQueries({ queryKey: ["products"] });
  };

  // --- Context Menu Handlers ---
  const handleDuplicateProduct = async (product: Product) => {
    try {
      const duplicatedData: ProductFormData = {
        name: `${product.name} ${t("copySuffix")}`,
        scientific_name: product.scientific_name,
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
        has_expiry_date: product.has_expiry_date,
      };

      await productService.createProduct(duplicatedData);
      showSnackbar(t("productDuplicatedSuccess"), "success");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      console.error("Error duplicating product:", error);
      showSnackbar(t("productDuplicateFailed"), "error");
    }
  };

  const handleExportProduct = async (product: Product) => {
    try {
      // Export single product data
      const exportData = {
        id: product.id,
        name: product.name,
        scientific_name: product.scientific_name,
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

      showSnackbar(t("productExportedSuccess"), "success");
    } catch (error) {
      console.error("Error exporting product:", error);
      showSnackbar(t("productExportFailed"), "error");
    }
  };

  const handleDeleteProduct = (product: Product) => {
    // This will trigger the delete confirmation in ProductFormModal
    openModal(product);
    // The modal will handle the delete confirmation
  };

  const handleCopyProductInfo = async (product: Product) => {
    try {
      const notSpecified = t("notSpecified");
      const productInfo = `
${t("copyLabelProduct")} ${product.name}
${product.scientific_name ? `${t("copyLabelScientificName")} ${product.scientific_name}` : ''}
${product.sku ? `SKU: ${product.sku}` : ''}
${t("copyLabelCategory")} ${product.category_name || notSpecified}
${t("copyLabelStock")} ${product.current_stock_quantity || product.stock_quantity || 0} ${product.sellable_unit_name || ''}
${t("copyLabelCost")} ${product.latest_cost_per_sellable_unit ? formatCurrency(Number(product.latest_cost_per_sellable_unit)) : notSpecified}
${t("copyLabelPrice")} ${product.last_sale_price_per_sellable_unit ? formatCurrency(Number(product.last_sale_price_per_sellable_unit)) : notSpecified}
      `.trim();

      await navigator.clipboard.writeText(productInfo);
      showSnackbar(t("productInfoCopied"), "success");
    } catch (error) {
      console.error("Error copying product info:", error);
      showSnackbar(t("productInfoCopyFailed"), "error");
    }
  };

  const handleToggleFavorite = (product: Product) => {
    // TODO: Implement favorites functionality
    showSnackbar(`${product.name} ${Math.random() > 0.5 ? t("addedToFavorites") : t("removedFromFavorites")}`, "info");
  };

  const handleCurrencyChange = async (productId: number, currency: "SDG" | "USD" | null) => {
    try {
      await productService.updatePreferredCurrency(productId, currency);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      showSnackbar(t("currencyUpdateFailed"), "error");
    }
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
      showSnackbar(t("priceUpdateFailed"), "error");
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
      showSnackbar(t("pdfExportSuccess"), "success");
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
      showSnackbar(t("excelExportSuccess"), "success");
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
      showSnackbar(t("auditReportExporting"), "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : t("auditReportExportFailed"),
        "error",
      );
    }
  };

  const handleProductCreate = async (data: ProductFormData) => {
    try {
      await productService.createProduct(data);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showSnackbar(t("productAddedSuccess"), "success");
    } catch (err) {
      showSnackbar(
        err instanceof Error ? err.message : t("productAddFailed"),
        "error",
      );
      throw err; // Re-throw to let the table know it failed
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
              {t("pageTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("totalProductsLabel", { count: totalProducts.toLocaleString() })}
            </Typography>
          </Box>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{ mt: 1 }}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={t("productsTabLabel")} id="products-tab" />
            <Tab label={t("packagesTabLabel")} id="packages-tab" />
          </Tabs>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {/* Columns Toggle */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Tooltip title={t("toggleColumnsTooltip")}>
                <IconButton onClick={(e) => setColumnsAnchor(e.currentTarget)} color="default">
                  <Columns3 className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("columnsLabel")}</Typography>
            </Box>
            <Popover
              open={Boolean(columnsAnchor)}
              anchorEl={columnsAnchor}
              onClose={() => setColumnsAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: direction === "rtl" ? "right" : "left" }}
              transformOrigin={{ vertical: "top", horizontal: direction === "rtl" ? "right" : "left" }}
            >
              <Box sx={{ p: 2, minWidth: 200 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{t("visibleColumnsTitle")}</Typography>
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

            {/* Print Products */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("printReportTooltip")}>
                <IconButton
                  onClick={() => handlePrintProducts()}
                  color="default"
                >
                  <Printer className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("printLabel")}</Typography>
            </Box>

            {/* Price List PDF */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("priceListPdfTooltip")}>
                <IconButton
                  onClick={() => exportService.exportPriceListPdf()}
                  color="default"
                >
                  <FileText className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("priceListLabel")}</Typography>
            </Box>

            {/* Export to Excel */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("exportExcelTooltip")}>
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
              <Tooltip title={t("auditReportTooltip")}>
                <IconButton
                  onClick={() => handleExportAuditReport()}
                  color="secondary"
                >
                  <Sparkles className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("auditReportLabel")}</Typography>
            </Box>

            {/* Add Product */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={activeTab === 0 ? t("addProduct") : t("addNewPackageTooltip")}>
                <IconButton
                  onClick={activeTab === 0 ? () => openModal() : () => openPackageModal()}
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
              <Typography variant="caption">{t("addLabel")}</Typography>
            </Box>

            {/* Manage Categories */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Tooltip title={t("manageCategoriesTooltip")}>
                <IconButton
                  onClick={() => navigate("/admin/categories")}
                  color="default"
                >
                  <Layers className="h-5 w-5" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption">{t("categoriesLabel")}</Typography>
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
                placeholder={t("searchProductsPlaceholder")}
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
                  {t("filterByCategory")}
                </InputLabel>
                <Select
                  value={selectedCategory || ""}
                  onChange={handleCategoryChange}
                  label={t("filterByCategory")}
                  disabled={loadingCategories}
                >
                  <MenuItem value="">
                    <em>{t("allCategories")}</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {getLocalizedName(category, i18n.language)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Warehouse Filter */}
            <Box sx={{ flex: { md: 1 } }}>
              <FormControl fullWidth size="small">
                <InputLabel className="dark:text-gray-300">{t("filterByWarehouse")}</InputLabel>
                <Select
                  value={selectedWarehouse}
                  onChange={handleWarehouseChange}
                  label={t("filterByWarehouse")}
                  disabled={loadingWarehouses}
                >
                  <MenuItem value="">
                    <em>{t("allWarehouses")}</em>
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
                label={t("showLowQuantities")}
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
        {!error && activeTab === 0 && (
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
              onCurrencyChange={handleCurrencyChange}
              onPriceUpdate={handlePriceUpdate}
            />
          </Box>
        )}

        {!error && activeTab === 1 && (
          <Box sx={{ mt: 2, width: "100%", px: 2 }}>
            {isPackagesLoading ? (
              <Grid container spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Skeleton variant="rectangular" height={150} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {packages?.map((pkg) => (
                  <Grid item xs={12} sm={6} md={4} key={pkg.id}>
                    <Card elevation={2} sx={{ height: "100%", display: "flex", flexDirection: "column", "&:hover": { boxShadow: 6 } }}>
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <PackageIcon className="text-primary-main" />
                            <Typography variant="h6" fontWeight="bold">{pkg.name}</Typography>
                          </Box>
                          <Box>
                            <IconButton size="small" onClick={() => openPackageModal(pkg)}>
                              <Edit size={18} />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeletePackage(pkg.id!)}>
                              <Trash2 size={18} />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>
                          {t("itemsInPackage", { count: pkg.items?.length || 0 })}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {pkg.items?.slice(0, 3).map((item) => (
                            <Typography key={item.id} variant="caption" display="block">
                              • {item.product?.name}
                            </Typography>
                          ))}
                          {(pkg.items?.length || 0) > 3 && (
                            <Typography variant="caption" color="text.secondary">{t("andOthers")}</Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {(!packages || packages.length === 0) && (
                  <Box sx={{ width: "100%", textAlign: "center", py: 8 }}>
                    <PackageIcon size={64} className="text-gray-300 mb-4 mx-auto" strokeWidth={1} />
                    <Typography color="text.secondary" variant="h6" sx={{ mb: 3 }}>
                      {t("noPackagesYet")}
                    </Typography>
                    <Button variant="contained" startIcon={<Plus size={20} />} onClick={() => openPackageModal()} sx={{ borderRadius: 2, px: 4, py: 1.5 }}>
                      {t("createNewPackage")}
                    </Button>
                  </Box>
                )}
              </Grid>
            )}
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
        <PackageFormModal
          isOpen={isPackageModalOpen}
          onClose={closePackageModal}
          packageToEdit={editingPackage}
        />
        {/* Removed ConfirmationDialog */}
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          message={snackbar.message}
        />
        {/* Barcode Label PDF Dialog */}
        <BarcodeLabelPdfDialog
          open={barcodeLabelProduct !== null}
          onClose={() => setBarcodeLabelProduct(null)}
          product={barcodeLabelProduct}
        />

        {/* Add deleteConfirm key */}
      </Box>
    </>
  );
};

export default ProductsPage;
