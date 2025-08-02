// src/pages/PurchasesListPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom"; // Use React Router Link

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
import Chip from "@mui/material/Chip"; // To display status

// Icons
import VisibilityIcon from "@mui/icons-material/Visibility"; // View details icon
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import HistoryIcon from "@mui/icons-material/History"; // Product history icon
import TableChartIcon from "@mui/icons-material/TableChart"; // Excel export icon
import InventoryIcon from "@mui/icons-material/Inventory"; // Manage items icon

// Services and Types
import purchaseService from "../../services/purchaseService"; // Use purchase service
import supplierService, { Supplier } from "../../services/supplierService";
import productService, { Product } from "../../services/productService";
import exportService from "../../services/exportService"; // Import export service
import dayjs from "dayjs";
import { CardContent } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const { t } = useTranslation(["purchases", "common"]); // Load namespaces
  const navigate = useNavigate(); // Hook for navigation

  // --- State ---
  const [purchasesResponse, setPurchasesResponse] =
    useState<any>(null);
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
  const [productHistoryDialogOpen, setProductHistoryDialogOpen] = useState(false);

  // Status options
  const statusOptions = [
    { value: "pending", label: t("purchases:status_pending") },
    { value: "ordered", label: t("purchases:status_ordered") },
    { value: "received", label: t("purchases:status_received") },
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
      const response = await productService.getProducts(1, "", "name", "asc", 1000); // Get all products for filter
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
         params.append('page', page.toString());
         
         if (filters.supplier_id) {
           params.append('supplier_id', filters.supplier_id.toString());
         }
         if (filters.reference_number) {
           params.append('reference_number', filters.reference_number);
         }
         if (filters.purchase_date) {
           params.append('purchase_date', filters.purchase_date);
         }
         if (filters.created_at) {
           params.append('created_at', filters.created_at);
         }
         if (filters.status) {
           params.append('status', filters.status);
         }
         if (filters.product_id) {
           params.append('product_id', filters.product_id.toString());
         }

         console.log('Filter params:', params.toString());

        const data = await purchaseService.getPurchases(page, params.toString());
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
  const handleFilterChange = (key: keyof PurchaseFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  // --- Pagination Handler ---
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };

  // --- Navigation Handler ---
  const handleViewDetails = (id: number) => {
    // Navigate to a dedicated page for purchase details (implement later)
    navigate(`/purchases/${id}/edit`);
    // Or open a details modal
  };

  // --- Product History Handler ---
  const handleViewProductHistory = async (product: Product) => {
    setSelectedProduct(product);
    setProductHistoryDialogOpen(true);
    setLoadingProductPurchases(true);
    
    try {
      const purchases = await purchaseService.getPurchasesForProduct(product.id);
      setProductPurchases(purchases);
    } catch (error) {
      console.error('Failed to fetch product purchases:', error);
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
      console.log('Excel export initiated successfully');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      // Show error message (you can add a toast notification here if needed)
    }
  };

  // --- Render ---
  return (
    <Box
      sx={{ p: { xs: 1, sm: 2, md: 3 } }}
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
          {t("purchases:listTitle")} {/* Add key */}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* Filter Toggle Button */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<FilterListIcon />}
          >
            {t("common:filters")}
          </Button>
          {/* Excel Export Button */}
          <Button
            variant="outline"
            onClick={handleExportExcel}
            startIcon={<TableChartIcon />}
          >
            {t("purchases:exportExcel")}
          </Button>
          {/* Link to the Add Purchase Page */}
          <Button asChild>
            <RouterLink to="/purchases/add">
              {t("purchases:addPurchase")} {/* Add key */}
            </RouterLink>
          </Button>
        </Box>
      </Box>

      {/* Filters Section */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3 }} className="dark:bg-gray-800">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" className="text-gray-800 dark:text-gray-100">
              {t("common:filters")}
            </Typography>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="small"
                onClick={clearFilters}
                startIcon={<ClearIcon />}
              >
                {t("common:clearFilters")}
              </Button>
            )}
          </Box>
          
                     <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(6, 1fr)" }, gap: 2 }}>
             {/* Supplier Filter */}
             <Autocomplete
               options={suppliers}
               getOptionLabel={(option) => option.name}
               value={suppliers.find(s => s.id === filters.supplier_id) || null}
               onChange={(event, newValue) => {
                 handleFilterChange('supplier_id', newValue?.id);
               }}
               loading={loadingSuppliers}
               renderInput={(params) => (
                 <TextField
                   {...params}
                   label={t("purchases:supplier")}
                   placeholder={t("purchases:selectSupplier")}
                   size="small"
                 />
               )}
             />

             {/* Product Filter */}
             <Autocomplete
               options={products}
               getOptionLabel={(option) => `${option.name}${option.sku ? ` (${option.sku})` : ''}`}
               value={products.find(p => p.id === filters.product_id) || null}
               onChange={(event, newValue) => {
                 handleFilterChange('product_id', newValue?.id);
               }}
               loading={loadingProducts}
               renderInput={(params) => (
                 <TextField
                   {...params}
                   label={t("purchases:product")}
                   placeholder={t("purchases:selectProduct")}
                   size="small"
                 />
               )}
             />

             {/* Reference Number Filter */}
             <TextField
               label={t("purchases:reference")}
               placeholder={t("purchases:referencePlaceholder")}
               value={filters.reference_number || ''}
               onChange={(e) => handleFilterChange('reference_number', e.target.value)}
               size="small"
             />

             {/* Status Filter */}
             <Autocomplete
               options={statusOptions}
               getOptionLabel={(option) => option.label}
               value={statusOptions.find(s => s.value === filters.status) || null}
               onChange={(event, newValue) => {
                 handleFilterChange('status', newValue?.value);
               }}
               renderInput={(params) => (
                 <TextField
                   {...params}
                   label={t("purchases:status")}
                   placeholder={t("purchases:selectStatus")}
                   size="small"
                 />
               )}
             />

             {/* Purchase Date Filter */}
             <TextField
               type="date"
               label={t("purchases:date")}
               value={filters.purchase_date || ''}
               onChange={(e) => handleFilterChange('purchase_date', e.target.value)}
               size="small"
               InputLabelProps={{
                 shrink: true,
               }}
               inputProps={{
                 max: dayjs().format('YYYY-MM-DD'), // Max date is today
               }}
             />

             {/* Created At Filter */}
             <TextField
               type="date"
               label={t("purchases:createdAt")}
               value={filters.created_at || ''}
               onChange={(e) => handleFilterChange('created_at', e.target.value)}
               size="small"
               InputLabelProps={{
                 shrink: true,
               }}
               inputProps={{
                 max: dayjs().format('YYYY-MM-DD'), // Max date is today
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
            {t("common:loading")}
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
        <Card>
          <CardContent>
            <Table aria-label={t("purchases:listTitle")} className="text-base">
                             <TableHeader>
                 <TableRow>
                   <TableCell align="center" className="font-semibold text-base">{t("purchases:id")}</TableCell>
                   <TableCell align="center" className="font-semibold text-base">{t("purchases:date")}</TableCell>
                   <TableCell align="center" className="font-semibold text-base">{t("purchases:createdAt")}</TableCell>
                   <TableCell align="center" className="font-semibold text-base">{t("purchases:reference")}</TableCell>
                   <TableCell align="center" className="font-semibold text-base">{t("purchases:supplier")}</TableCell>
                   <TableCell align="center" className="font-semibold text-base">{t("purchases:status")}</TableCell>
                   <TableCell align="center" className="font-semibold text-base">{t("purchases:totalAmount")}</TableCell>
                   <TableCell align="center" className="font-semibold text-base">{t("common:actions")}</TableCell>
                 </TableRow>
               </TableHeader>
              <TableBody>
                                 {purchasesResponse.data.map((purchase) => (
                   <TableRow key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                     <TableCell align="center" className="text-base">{purchase.id}</TableCell>
                     <TableCell align="center" className="text-base">
                       {dayjs(purchase.purchase_date).format("YYYY-MM-DD")}
                     </TableCell>
                     <TableCell align="center" className="text-base">
                       {dayjs(purchase.created_at).format("YYYY-MM-DD HH:mm")}
                     </TableCell>
                     <TableCell align="center" className="text-base">{purchase.reference_number || "---"}</TableCell>
                     <TableCell align="center" className="text-base">
                       <span className="font-bold text-gray-900 dark:text-gray-100">
                         {purchase.supplier_name || t("common:n/a")}
                       </span>
                     </TableCell>
                    {/* Handle possible null supplier */}
                    <TableCell align="center" className="text-base">
                      <Chip
                        label={t(`purchases:status_${purchase.status}`)} // Use status_received, status_pending etc keys
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
                    <TableCell align="center" className="text-base font-semibold">
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
                         <Tooltip title={t("common:view") || ""}>
                           <IconButton
                             aria-label={t("common:view") || "View"}
                             color="default"
                             size="small"
                             onClick={() => handleViewDetails(purchase.id)}
                           >
                             <VisibilityIcon fontSize="small" />
                           </IconButton>
                         </Tooltip>
                         
                         <Tooltip title={t("purchases:managePurchaseItems") || ""}>
                           <IconButton
                             aria-label={t("purchases:managePurchaseItems") || "Manage Items"}
                             color="primary"
                             size="small"
                             onClick={() => navigate(`/purchases/${purchase.id}/items`)}
                           >
                             <InventoryIcon fontSize="small" />
                           </IconButton>
                         </Tooltip>
                         
                         {/* Product History Button - only show if there's a product filter */}
                         {filters.product_id && (
                           <Tooltip title={t("purchases:viewProductHistory") || ""}>
                             <IconButton
                               aria-label={t("purchases:viewProductHistory") || "View Product History"}
                               color="primary"
                               size="small"
                               onClick={() => {
                                 const product = products.find(p => p.id === filters.product_id);
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
              {t("purchases:noPurchases")}
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
