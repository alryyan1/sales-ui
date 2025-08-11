// src/pages/SalesListPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";

// MUI Components (or shadcn/Tailwind equivalents)
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Autocomplete from "@mui/material/Autocomplete";


// Icons
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterListIcon from "@mui/icons-material/FilterList";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ClearIcon from "@mui/icons-material/Clear";

// Day.js
import dayjs from "dayjs";

// Services and Types
import saleService, { Sale } from "../../services/saleService";
import { formatCurrency, formatNumber } from "@/constants";
import { useSettings } from "@/context/SettingsContext";
import { Card } from "@/components/ui/card";
import { CardContent } from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateDailySalesPdf } from "../../services/exportService";
import { toast } from "sonner";
import apiClient from "../../lib/axios";

// Define the actual API response structure (Laravel pagination)
interface SalesApiResponse {
  data: Sale[];
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

// Filter interface
interface SalesFilters {
  start_date: string;
  end_date: string;
  user_id: string;
  product_id: string;
  sale_id: string;
  start_time: string;
  end_time: string;
}

const SalesListPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common", "clients"]);
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, fetchSettings } = useSettings();
  
  // Fetch settings on load
  useEffect(() => {
    const fetchData = async () => {
      await fetchSettings();
    };
    fetchData();
  }, [fetchSettings]);

  // --- State for Highlight ---
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // --- Dialog State ---
  const [saleDetailsDialog, setSaleDetailsDialog] = useState<{
    open: boolean;
    sale: Sale | null;
    loading: boolean;
  }>({
    open: false,
    sale: null,
    loading: false,
  });

  // --- State ---
  const [salesResponse, setSalesResponse] = useState<SalesApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  


  // --- Filter State ---
  const [filters, setFilters] = useState<SalesFilters>({
    start_date: new Date().toISOString().split('T')[0], // Current day
    end_date: new Date().toISOString().split('T')[0], // Current day
    user_id: "",
    product_id: "",
    sale_id: "",
    start_time: "00:00", // Start of day
    end_time: "23:59", // End of day
  });

  // --- Users and Products for filter dropdowns ---
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string }>>([]);
  
  // Add "All Users" option to users array
  const usersWithAllOption = [
    { id: 0, name: t("common:all", "All Users") },
    ...users
  ];



  // --- Check navigation state on load/location change ---
  useEffect(() => {
    // Clear previous timeout if location changes rapidly
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Check if state contains the updated ID from navigation
    const updatedId = location.state?.updatedSaleId;
    console.log(updatedId, "updatedId");
    if (updatedId && typeof updatedId === "number") {
      console.log(`Highlighting Sale ID:  ${updatedId}`);
      setHighlightedRowId(updatedId);

      // Set a timer to remove the highlight after a few seconds
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedRowId(null);
        // Optional: Clear the state from location history to prevent re-highlight on refresh/back
        navigate(location.pathname, { replace: true, state: {} });
      }, 3000); // Highlight for 3 seconds (adjust as needed)
    } else {
      setHighlightedRowId(null); // Ensure highlight is off if no state
    }

    // Cleanup timeout on component unmount or location change
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [location.state, location.key, location.pathname, navigate]);

  // --- Fetch Users and Products for filters ---
  const fetchFilterData = useCallback(async () => {
    try {
      // Fetch products using the API client
      const productsResponse = await apiClient.get('/products?per_page=1000');
      if (productsResponse.data && productsResponse.data.data) {
        setProducts(productsResponse.data.data);
      }

      // Fetch users using the public route
      try {
        const usersResponse = await apiClient.get('/users/list');
        if (usersResponse.data && usersResponse.data.data) {
          setUsers(usersResponse.data.data);
        }
      } catch (usersError) {
        console.log('Users fetch failed, using current user only:', usersError);
        // If users fetch fails, try to get current user info
        try {
          const currentUserResponse = await apiClient.get('/user');
          if (currentUserResponse.data) {
            setUsers([currentUserResponse.data]);
          }
        } catch (userError) {
          console.error('Error fetching current user:', userError);
        }
      }
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  }, []);

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // --- Data Fetching ---
  const fetchSales = useCallback(async (page: number, appliedFilters?: SalesFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      
      const filtersToUse = appliedFilters || filters;
      
      if (filtersToUse.start_date) params.append('start_date', filtersToUse.start_date);
      if (filtersToUse.end_date) params.append('end_date', filtersToUse.end_date);
      if (filtersToUse.user_id) params.append('user_id', filtersToUse.user_id);
      if (filtersToUse.product_id) params.append('product_id', filtersToUse.product_id);
      if (filtersToUse.sale_id) params.append('sale_id', filtersToUse.sale_id);
      if (filtersToUse.start_time) params.append('start_time', filtersToUse.start_time);
      if (filtersToUse.end_time) params.append('end_time', filtersToUse.end_time);

      const data = await saleService.getSales(page, params.toString());
      console.log('Sales API response:', data);
      
      // Handle Laravel pagination response structure
      if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
        // This is a Laravel pagination response
        setSalesResponse(data as unknown as SalesApiResponse);
      } else if (Array.isArray(data)) {
        // This is a simple array - create a mock paginated response
        const salesArray = data as Sale[];
        setSalesResponse({
          data: salesArray,
          links: {
            first: '',
            last: '',
            prev: null,
            next: null
          },
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: salesArray.length,
            total: salesArray.length,
            from: 1,
            to: salesArray.length,
            path: '',
            links: []
          }
        });
      } else {
        throw new Error('Unexpected response format from API');
      }
    } catch (err) {
      setError(saleService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Effect to fetch data
  useEffect(() => {
    fetchSales(currentPage);
  }, [fetchSales, currentPage]);

  // --- Filter Handlers ---
  const handleFilterChange = (field: keyof SalesFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    fetchSales(1, filters);
  };

  const clearFilters = () => {
    const clearedFilters: SalesFilters = {
      start_date: new Date().toISOString().split('T')[0], // Current day
      end_date: new Date().toISOString().split('T')[0], // Current day
      user_id: "",
      product_id: "",
      sale_id: "",
      start_time: "00:00", // Start of day
      end_time: "23:59", // End of day
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    fetchSales(1, clearedFilters);
  };

  // --- PDF Export Handler ---
  const handleExportPdf = async () => {
    setIsPdfLoading(true);
    try {
      // Build filter parameters for PDF
      const filterParams = new URLSearchParams();
      if (filters.start_date) filterParams.append('start_date', filters.start_date);
      if (filters.end_date) filterParams.append('end_date', filters.end_date);
      if (filters.user_id) filterParams.append('user_id', filters.user_id);
      if (filters.product_id) filterParams.append('product_id', filters.product_id);
      if (filters.sale_id) filterParams.append('sale_id', filters.sale_id);
      if (filters.start_time) filterParams.append('start_time', filters.start_time);
      if (filters.end_time) filterParams.append('end_time', filters.end_time);

      await generateDailySalesPdf(filterParams.toString());
      toast.success(t('sales:pdfGenerated', 'PDF generated successfully'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('sales:pdfGenerationFailed', 'Failed to generate PDF'));
    } finally {
      setIsPdfLoading(false);
    }
  };

  // --- Pagination Handler ---
  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };



  // --- Dialog Handlers ---
  const handleViewDetails = async (id: number) => {
    setSaleDetailsDialog(prev => ({ ...prev, open: true, loading: true }));
    
    try {
      const saleData = await saleService.getSale(id);
      setSaleDetailsDialog(prev => ({ 
        ...prev, 
        sale: saleData, 
        loading: false 
      }));
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast.error(t("common:errorLoadingData", "Error loading sale details"));
      setSaleDetailsDialog(prev => ({ 
        ...prev, 
        open: false, 
        loading: false 
      }));
    }
  };

  const handleCloseDialog = () => {
    setSaleDetailsDialog(prev => ({ 
      ...prev, 
      open: false, 
      sale: null 
    }));
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
          {t("sales:listTitle")}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handleExportPdf}
            disabled={isPdfLoading}
          >
            {isPdfLoading ? t("common:generating") : t("sales:exportPdf")}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/sales/add"
          >
            {t("sales:addSale")}
          </Button>
        </Box>
      </Box>



      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }} className="dark:bg-gray-800">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6" className="dark:text-gray-100">
            {t("sales:filters", "Filters")}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          {/* Date Filters */}
          <TextField
            fullWidth
            type="date"
            label={t("sales:startDate", "Start Date")}
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
            className="dark:text-gray-100"
          />
          <TextField
            fullWidth
            type="date"
            label={t("sales:endDate", "End Date")}
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
            className="dark:text-gray-100"
          />

          {/* Time Filters */}
          <TextField
            fullWidth
            type="time"
            label={t("sales:startTime", "Start Time")}
            value={filters.start_time}
            onChange={(e) => handleFilterChange('start_time', e.target.value)}
            InputLabelProps={{ shrink: true }}
            className="dark:text-gray-100"
          />
          <TextField
            fullWidth
            type="time"
            label={t("sales:endTime", "End Time")}
            value={filters.end_time}
            onChange={(e) => handleFilterChange('end_time', e.target.value)}
            InputLabelProps={{ shrink: true }}
            className="dark:text-gray-100"
          />

          {/* User Filter */}
          <Autocomplete
            options={usersWithAllOption}
            getOptionLabel={(option) => option.name}
            value={usersWithAllOption.find(user => user.id.toString() === filters.user_id) || 
                   (filters.user_id === "" ? usersWithAllOption[0] : null)}
            onChange={(_, newValue) => {
              handleFilterChange('user_id', newValue && newValue.id !== 0 ? newValue.id.toString() : '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("sales:user", "User")}
                className="dark:text-gray-100"
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          {/* Product Filter */}
          <Autocomplete
            options={products}
            getOptionLabel={(option) => `${option.name} (${option.sku})`}
            value={products.find(product => product.id.toString() === filters.product_id) || null}
            onChange={(_, newValue) => {
              handleFilterChange('product_id', newValue ? newValue.id.toString() : '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("sales:product", "Product")}
                className="dark:text-gray-100"
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          {/* Sale ID Filter */}
          <TextField
            fullWidth
            label={t("sales:saleId", "Sale ID")}
            value={filters.sale_id}
            onChange={(e) => handleFilterChange('sale_id', e.target.value)}
            placeholder={t("sales:enterSaleId", "Enter Sale ID")}
            className="dark:text-gray-100"
          />

          {/* Filter Actions */}
          <Box sx={{ display: 'flex', gap: 1, height: '100%', alignItems: 'center' }}>
            <Button
              variant="contained"
              onClick={applyFilters}
              disabled={isLoading}
              sx={{ flex: 1 }}
            >
              {t("common:apply", "Apply")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              disabled={isLoading}
            >
              {t("common:clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Paper>

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
      {!isLoading && !error && salesResponse && (
        <Card>
          <CardContent>
            <Table aria-label={t("sales:listTitle")}>
              <TableHeader>
                <TableRow>
                  <TableCell align="center">{t("sales:id")}</TableCell>
                  <TableCell align="center">{t("sales:date")}</TableCell>
                  <TableCell align="center">{t("sales:paymentStatus", "Payment")}</TableCell>
                  <TableCell align="center">{t("clients:client")}</TableCell>
                  <TableCell align="center">{t("sales:user", "User")}</TableCell>
                  <TableCell align="center">{t("sales:discount")}</TableCell>
                  <TableCell align="center">{t("sales:totalAmount")}</TableCell>
                  <TableCell align="center">{t("sales:paidAmount")}</TableCell>
                  <TableCell align="center">{t("common:actions")}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesResponse.data.map((sale) => {
                  const isHighlighted = sale.id === highlightedRowId;
                  const discountAmount = typeof sale.discount_amount === 'string' 
                    ? parseFloat(sale.discount_amount) 
                    : (sale.discount_amount as number) || 0;
                  const total = typeof sale.total_amount === 'string' ? parseFloat(sale.total_amount) : (sale.total_amount as number) || 0;
                  const paid = typeof sale.paid_amount === 'string' ? parseFloat(sale.paid_amount) : (sale.paid_amount as number) || 0;
                  const isFullyPaid = paid >= total - 0.0001;

                  return (
                    <TableRow
                      key={sale.id}
                      className={`hover:bg-gray-50 dark:hoverbg-gray-800 transition-colors duration-300 ${
                        isHighlighted ? 'bg-blue-100 dark:bg-blue-900' : ''
                      } ${
                        discountAmount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                      } ${
                        isFullyPaid ? 'border-r-4 border-green-500' : 'border-r-4 border-transparent'
                      }`}
                    >
                      <TableCell align="center">{sale.id}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant="body2" component="div">
                            {dayjs(sale.sale_date).format("YYYY-MM-DD")}
                          </Typography>
                          <Typography variant="caption" component="div" color="text.secondary">
                            {dayjs(sale.created_at).format("HH:mm")}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <span className={`inline-block h-2.5 w-2.5 rounded-full ${isFullyPaid ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              {isFullyPaid ? (
                                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                              ) : null}
                            </Box>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        {sale.client_name || t("common:n/a")}
                      </TableCell>
                      <TableCell align="center">
                        {sale.user_name || t("common:n/a")}
                      </TableCell>
                      <TableCell align="center">
                        {discountAmount > 0 
                          ? formatCurrency(discountAmount, "en-US", settings?.currency_symbol, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            })
                          : "---"
                        }
                      </TableCell>
                      <TableCell align="center">
                        {formatCurrency(
                          sale.total_amount,
                          "en-US",
                          settings?.currency_symbol,
                          {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {formatNumber(sale.paid_amount)}
                      </TableCell>
                      <TableCell align="center" className={`${isFullyPaid ? 'border-r-4 border-green-500' : ''}`}>
                        <Tooltip title={t("common:view") || ""}>
                          <IconButton
                            aria-label={t("common:view") || "View"}
                            color="primary"
                            size="small"
                            onClick={() => handleViewDetails(sale.id)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {salesResponse && (
        <>
          {/* Pagination */}
          {salesResponse.meta.last_page > 1 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", p: 2, mt: 3 }}
            >
              <Pagination
                count={salesResponse.meta.last_page}
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
          {/* No Sales Message */}
          {salesResponse.data.length === 0 && (
            <Typography
              sx={{ textAlign: "center", py: 5 }}
              className="text-gray-500 dark:text-gray-400"
            >
              {t("sales:noSales")}
            </Typography>
          )}
        </>
      )}

      {/* Sale Details Dialog */}
      <Dialog open={saleDetailsDialog.open} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("sales:saleDetails", "Sale Details")} #{saleDetailsDialog.sale?.id}
            </DialogTitle>
          </DialogHeader>
          
          {saleDetailsDialog.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : saleDetailsDialog.sale ? (
            <div className="space-y-6">
              {/* Sale Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("sales:date", "Date")}</p>
                  <p className="font-semibold">{dayjs(saleDetailsDialog.sale.sale_date).format("YYYY-MM-DD")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("sales:invoice", "Invoice")}</p>
                  <p className="font-semibold">{saleDetailsDialog.sale.invoice_number || `SALE-${saleDetailsDialog.sale.id}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("clients:client", "Client")}</p>
                  <p className="font-semibold">{saleDetailsDialog.sale.client_name || t("common:n/a")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("sales:user", "User")}</p>
                  <p className="font-semibold">{saleDetailsDialog.sale.user_name || t("common:n/a")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("sales:totalAmount", "Total Amount")}</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(
                      saleDetailsDialog.sale.total_amount,
                      "en-US",
                      settings?.currency_symbol,
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("sales:paidAmount", "Paid Amount")}</p>
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(
                      saleDetailsDialog.sale.paid_amount,
                      "en-US",
                      settings?.currency_symbol,
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }
                    )}
                  </p>
                </div>
              </div>

              {/* Sale Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  {t("sales:saleItems", "Sale Items")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("sales:product", "Product")}
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("sales:quantity", "Quantity")}
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("sales:unitPrice", "Unit Price")}
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("sales:totalPrice", "Total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {saleDetailsDialog.sale.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            <div>
                              <p className="font-medium">{item.product_name || item.product?.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                SKU: {item.product_sku || item.product?.sku || 'N/A'}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                            {formatCurrency(
                              item.unit_price,
                              "en-US",
                              settings?.currency_symbol,
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(
                              Number(item.unit_price) * item.quantity,
                              "en-US",
                              settings?.currency_symbol,
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  {t("sales:paymentsMadeTitle", "Payments")}
                </h3>
                {saleDetailsDialog.sale.payments && saleDetailsDialog.sale.payments.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t("sales:paymentMethod", "Method")}
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t("sales:paymentAmount", "Amount")}
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t("sales:paymentDate", "Date")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t("sales:paymentReference", "Reference")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {saleDetailsDialog.sale.payments.map((payment, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {payment.method}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                payment.amount,
                                "en-US",
                                settings?.currency_symbol,
                                {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                              {dayjs(payment.payment_date).format("YYYY-MM-DD")}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {payment.reference_number || t("common:n/a")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t("sales:noPaymentsRecorded", "No payments recorded")}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SalesListPage;
