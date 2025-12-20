// src/pages/PurchasesListPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Pagination from "@mui/material/Pagination";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

// Icons
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import HistoryIcon from "@mui/icons-material/History";
import TableChartIcon from "@mui/icons-material/TableChart";
import InventoryIcon from "@mui/icons-material/Inventory";

// Services and Types
import purchaseService from "../../services/purchaseService";
import supplierService, { Supplier } from "../../services/supplierService";
import productService, { Product } from "../../services/productService";
import exportService from "../../services/exportService";
import dayjs from "dayjs";
import { formatCurrency } from "@/constants";
import { PurchaseItemDetailsDialog } from "@/components/purchases/PurchaseItemDetailsDialog";

// Filter interface
interface PurchaseFilters {
  supplier_id?: number;
  reference_number?: string;
  purchase_date?: string;
  created_at?: string;
  status?: string;
  product_id?: number;
}

const PurchasesListPage: React.FC = () => {
  const navigate = useNavigate(); // Hook for navigation

  // --- State ---
  const [purchasesResponse, setPurchasesResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [filters, setFilters] = useState<PurchaseFilters>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Product history dialog states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPurchases, setProductPurchases] = useState<any[]>([]);
  const [loadingProductPurchases, setLoadingProductPurchases] = useState(false);
  const [productHistoryDialogOpen, setProductHistoryDialogOpen] =
    useState(false);

  // Status options
  const statusOptions = [
    { value: "pending", label: "قيد الانتظار" },
    { value: "ordered", label: "تم الطلب" },
    { value: "received", label: "تم الاستلام" },
  ];

  // --- Data Fetching ---
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const response = await supplierService.getSuppliers(1, ""); // Get all suppliers for filter
      setSuppliers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const response = await productService.getProducts(
        1,
        "",
        "name",
        "asc",
        1000
      ); // Get all products for filter
      setProducts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchPurchases = useCallback(
    async (page: number, filters: PurchaseFilters = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append("page", page.toString());

        if (filters.supplier_id) {
          params.append("supplier_id", filters.supplier_id.toString());
        }
        if (filters.reference_number) {
          params.append("reference_number", filters.reference_number);
        }
        if (filters.purchase_date) {
          params.append("purchase_date", filters.purchase_date);
        }
        if (filters.created_at) {
          params.append("created_at", filters.created_at);
        }
        if (filters.status) {
          params.append("status", filters.status);
        }
        if (filters.product_id) {
          params.append("product_id", filters.product_id.toString());
        }

        console.log("Filter params:", params.toString());

        const data = await purchaseService.getPurchases(
          page,
          params.toString()
        );
        setPurchasesResponse(data);
      } catch (err) {
        setError(purchaseService.getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Effect to fetch data
  useEffect(() => {
    fetchPurchases(currentPage, filters);
  }, [fetchPurchases, currentPage, filters]);

  // Effect to fetch suppliers and products on component mount
  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [fetchSuppliers, fetchProducts]);

  // --- Filter Handlers ---
  const handleFilterChange = (
    key: keyof PurchaseFilters,
    value: string | number | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== null && value !== ""
  );

  // --- Pagination Handler ---
  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };

  // --- PDF Report Handler ---
  const handleViewPdfReport = async (id: number) => {
    try {
      // Generate and view PDF report for the purchase
      await exportService.exportPurchasePdf(id);
      console.log("PDF report generated successfully");
    } catch (error) {
      console.error("Failed to generate PDF report:", error);
      // Show error message (you can add a toast notification here if needed)
    }
  };

  // --- Product History Handler ---
  const handleViewProductHistory = async (product: Product) => {
    setSelectedProduct(product);
    setProductHistoryDialogOpen(true);
    setLoadingProductPurchases(true);

    try {
      const purchases = await purchaseService.getPurchasesForProduct(
        product.id
      );
      setProductPurchases(purchases);
    } catch (error) {
      console.error("Failed to fetch product purchases:", error);
      setProductPurchases([]);
    } finally {
      setLoadingProductPurchases(false);
    }
  };

  const handleCloseProductHistory = () => {
    setProductHistoryDialogOpen(false);
    setSelectedProduct(null);
    setProductPurchases([]);
  };

  // --- Excel Export Handler ---
  const handleExportExcel = async () => {
    try {
      // Pass current filters to the Excel export
      await exportService.exportPurchasesExcel(filters);
      // Show success message (you can add a toast notification here if needed)
      console.log("Excel export initiated successfully");
    } catch (error) {
      console.error("Failed to export Excel:", error);
      // Show error message (you can add a toast notification here if needed)
    }
  };

  // --- Render ---
  return (
    <Box
      sx={{ p: { xs: 1, sm: 2, md: 3 }, direction: "rtl" }}
      className="dark:bg-gray-900 min-h-screen"
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
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          className="text-gray-800 dark:text-gray-100 font-semibold"
        >
          قائمة المشتريات
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* Filter Toggle Button */}
          <Button
            variant="outlined"
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<FilterListIcon />}
          >
            الفلاتر
          </Button>
          {/* Excel Export Button */}
          <Button
            variant="outlined"
            onClick={handleExportExcel}
            startIcon={<TableChartIcon />}
          >
            تصدير إلى Excel
          </Button>
          {/* Link to the Add Purchase Page */}
          <Button
            variant="contained"
            component={RouterLink}
            to="/purchases/add"
          >
            إضافة عملية شراء
          </Button>
        </Box>
      </Box>

      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3 }} className="dark:bg-gray-800">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              className="text-gray-800 dark:text-gray-100"
            >
              الفلاتر
            </Typography>
            {hasActiveFilters && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearFilters}
                startIcon={<ClearIcon />}
              >
                مسح الفلاتر
              </Button>
            )}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(6, 1fr)" },
              gap: 2,
            }}
          >
            {/* Supplier Filter */}
            <Autocomplete
              options={suppliers}
              getOptionLabel={(option) => option.name}
              value={
                suppliers.find((s) => s.id === filters.supplier_id) || null
              }
              onChange={(event, newValue) => {
                handleFilterChange("supplier_id", newValue?.id);
              }}
              loading={loadingSuppliers}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="المورد"
                  placeholder="اختر المورد"
                  size="small"
                />
              )}
            />

            {/* Product Filter */}
            <Autocomplete
              options={products}
              getOptionLabel={(option) =>
                `${option.name}${option.sku ? ` (${option.sku})` : ""}`
              }
              value={products.find((p) => p.id === filters.product_id) || null}
              onChange={(event, newValue) => {
                handleFilterChange("product_id", newValue?.id);
              }}
              loading={loadingProducts}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="المنتج"
                  placeholder="اختر المنتج"
                  size="small"
                />
              )}
            />

            {/* Reference Number Filter */}
            <TextField
              label="رقم المرجع"
              placeholder="أدخل رقم المرجع"
              value={filters.reference_number || ""}
              onChange={(e) =>
                handleFilterChange("reference_number", e.target.value)
              }
              size="small"
            />

            {/* Status Filter */}
            <Autocomplete
              options={statusOptions}
              getOptionLabel={(option) => option.label}
              value={
                statusOptions.find((s) => s.value === filters.status) || null
              }
              onChange={(event, newValue) => {
                handleFilterChange("status", newValue?.value);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="الحالة"
                  placeholder="اختر الحالة"
                  size="small"
                />
              )}
            />

            {/* Purchase Date Filter */}
            <TextField
              type="date"
              label="تاريخ الشراء"
              value={filters.purchase_date || ""}
              onChange={(e) =>
                handleFilterChange("purchase_date", e.target.value)
              }
              size="small"
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                max: dayjs().format("YYYY-MM-DD"), // Max date is today
              }}
            />

            {/* Created At Filter */}
            <TextField
              type="date"
              label="تاريخ الإنشاء"
              value={filters.created_at || ""}
              onChange={(e) => handleFilterChange("created_at", e.target.value)}
              size="small"
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                max: dayjs().format("YYYY-MM-DD"), // Max date is today
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Loading / Error States */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
          <Typography
            sx={{ ml: 2 }}
            className="text-gray-600 dark:text-gray-400"
          >
            جاري التحميل...
          </Typography>
        </Box>
      )}
      {!isLoading && error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      {/* Content Area: Table and Pagination */}
      {!isLoading && !error && purchasesResponse && (
        <Card style={{ direction: "rtl" }}>
          <CardContent>
            <Table aria-label="قائمة المشتريات" className="text-base">
              <TableHead>
                <TableRow>
                  <TableCell align="center" className="font-semibold text-base">
                    #
                  </TableCell>
                  <TableCell align="center" className="font-semibold text-base">
                    تاريخ الشراء
                  </TableCell>
                  <TableCell align="center" className="font-semibold text-base">
                    تاريخ الإنشاء
                  </TableCell>
                  <TableCell align="center" className="font-semibold text-base">
                    رقم المرجع
                  </TableCell>
                  <TableCell align="center" className="font-semibold text-base">
                    المورد
                  </TableCell>
                  <TableCell align="center" className="font-semibold text-base">
                    الحالة
                  </TableCell>
                  <TableCell align="center" className="font-semibold text-base">
                    إجمالي المبلغ
                  </TableCell>
                  <TableCell align="center" className="font-semibold text-base">
                    إجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchasesResponse.data.map((purchase) => (
                  <TableRow
                    key={purchase.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() =>
                      navigate(`/purchases/${purchase.id}/manage-items`)
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell align="center" className="text-base">
                      {purchase.id}
                    </TableCell>
                    <TableCell align="center" className="text-base">
                      {dayjs(purchase.purchase_date).format("YYYY-MM-DD")}
                    </TableCell>
                    <TableCell align="center" className="text-base">
                      {dayjs(purchase.created_at).format("YYYY-MM-DD HH:mm")}
                    </TableCell>
                    <TableCell align="center" className="text-base">
                      {purchase.reference_number || "---"}
                    </TableCell>
                    <TableCell align="center" className="text-base">
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {purchase.supplier_name || "-"}
                      </span>
                    </TableCell>
                    {/* Handle possible null supplier */}
                    <TableCell align="center" className="text-base">
                      <Chip
                        label={
                          purchase.status === "received"
                            ? "تم الاستلام"
                            : purchase.status === "pending"
                            ? "قيد الانتظار"
                            : "تم الطلب"
                        }
                        size="small"
                        color={
                          purchase.status === "received"
                            ? "success"
                            : purchase.status === "pending"
                            ? "warning"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell
                      align="center"
                      className="text-base font-semibold"
                    >
                      {formatCurrency(purchase.total_amount)}
                    </TableCell>
                    <TableCell align="center" className="text-base">
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Tooltip title="عرض تقرير PDF">
                          <IconButton
                            aria-label="عرض تقرير PDF"
                            color="default"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPdfReport(purchase.id);
                            }}
                          >
                            <PictureAsPdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="إدارة بنود الشراء">
                          <IconButton
                            aria-label="إدارة بنود الشراء"
                            color="primary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/purchases/${purchase.id}/manage-items`
                              );
                            }}
                          >
                            <InventoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Product History Button - only show if there's a product filter */}
                        {filters.product_id && (
                          <Tooltip title="سجل مشتريات المنتج">
                            <IconButton
                              aria-label="سجل مشتريات المنتج"
                              color="primary"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                const product = products.find(
                                  (p) => p.id === filters.product_id
                                );
                                if (product) {
                                  handleViewProductHistory(product);
                                }
                              }}
                            >
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          {purchasesResponse?.meta?.last_page > 1 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", p: 2, mt: 3 }}
            >
              <Pagination
                count={purchasesResponse.meta.last_page}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                disabled={isLoading}
              />
            </Box>
          )}
          {/* No Purchases Message */}
          {purchasesResponse.data.length === 0 && (
            <Typography
              sx={{ textAlign: "center", py: 5 }}
              className="text-gray-500 dark:text-gray-400"
            >
              لا توجد عمليات شراء مسجلة.
            </Typography>
          )}
        </Card>
      )}

      {/* Product History Dialog */}
      <PurchaseItemDetailsDialog
        open={productHistoryDialogOpen}
        onClose={handleCloseProductHistory}
        product={selectedProduct}
        purchases={productPurchases}
        isLoading={loadingProductPurchases}
      />
    </Box>
  );
};

export default PurchasesListPage;
