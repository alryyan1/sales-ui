// src/pages/SalesListPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";

// MUI Components
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
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

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
    { id: 0, name: "جميع المستخدمين" },
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
      toast.success('تم إنشاء PDF بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('فشل إنشاء PDF');
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
      toast.error("خطأ في تحميل تفاصيل البيع");
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
          قائمة المبيعات
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handleExportPdf}
            disabled={isPdfLoading}
          >
            {isPdfLoading ? "جاري الإنشاء..." : "تصدير PDF"}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/sales/add"
          >
            إضافة بيع
          </Button>
        </Box>
      </Box>



      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }} className="dark:bg-gray-800">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6" className="dark:text-gray-100">
            الفلاتر
          </Typography>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          {/* Date Filters */}
          <TextField
            fullWidth
            type="date"
            label="تاريخ البداية"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
            className="dark:text-gray-100"
          />
          <TextField
            fullWidth
            type="date"
            label="تاريخ النهاية"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
            className="dark:text-gray-100"
          />

          {/* Time Filters */}
          <TextField
            fullWidth
            type="time"
            label="وقت البداية"
            value={filters.start_time}
            onChange={(e) => handleFilterChange('start_time', e.target.value)}
            InputLabelProps={{ shrink: true }}
            className="dark:text-gray-100"
          />
          <TextField
            fullWidth
            type="time"
            label="وقت النهاية"
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
                label="المستخدم"
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
                label="المنتج"
                className="dark:text-gray-100"
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          {/* Sale ID Filter */}
          <TextField
            fullWidth
            label="رقم البيع"
            value={filters.sale_id}
            onChange={(e) => handleFilterChange('sale_id', e.target.value)}
            placeholder="أدخل رقم البيع"
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
              تطبيق
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              disabled={isLoading}
            >
              مسح
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
      {!isLoading && !error && salesResponse && (
        <Card>
          <CardContent>
            <Table aria-label="قائمة المبيعات">
              <TableHead>
                <TableRow>
                  <TableCell align="center">الرقم</TableCell>
                  <TableCell align="center">التاريخ</TableCell>
                  <TableCell align="center">حالة الدفع</TableCell>
                  <TableCell align="center">العميل</TableCell>
                  <TableCell align="center">المستخدم</TableCell>
                  <TableCell align="center">الخصم</TableCell>
                  <TableCell align="center">المبلغ الإجمالي</TableCell>
                  <TableCell align="center">المبلغ المدفوع</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
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
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300 ${
                        isHighlighted ? 'bg-blue-100 dark:bg-blue-900' : ''
                      } ${
                        discountAmount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
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
                        {sale.client_name || "غير متاح"}
                      </TableCell>
                      <TableCell align="center">
                        {sale.user_name || "غير متاح"}
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
                      <TableCell
                        align="center"
                        className={`${isFullyPaid ? 'bg-green-50 dark:bg-green-900/20 rounded-tr-md rounded-br-md' : ''}`}
                      >
                        <Tooltip title="عرض">
                          <IconButton
                            aria-label="عرض"
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
              لا توجد مبيعات
            </Typography>
          )}
        </>
      )}

      {/* Sale Details Dialog */}
      <Dialog open={saleDetailsDialog.open} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 600, pb: 2 }}>
          تفاصيل البيع #{saleDetailsDialog.sale?.id}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '90vh', overflowY: 'auto' }}>
          
          {saleDetailsDialog.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : saleDetailsDialog.sale ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Sale Header Information */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">التاريخ</Typography>
                  <Typography variant="body1" fontWeight={600}>{dayjs(saleDetailsDialog.sale.sale_date).format("YYYY-MM-DD")}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">الفاتورة</Typography>
                  <Typography variant="body1" fontWeight={600}>{saleDetailsDialog.sale.invoice_number || `SALE-${saleDetailsDialog.sale.id}`}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">العميل</Typography>
                  <Typography variant="body1" fontWeight={600}>{saleDetailsDialog.sale.client_name || "غير متاح"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">المستخدم</Typography>
                  <Typography variant="body1" fontWeight={600}>{saleDetailsDialog.sale.user_name || "غير متاح"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">المبلغ الإجمالي</Typography>
                  <Typography variant="body1" fontWeight={600} color="success.main">
                    {formatCurrency(
                      saleDetailsDialog.sale.total_amount,
                      "en-US",
                      settings?.currency_symbol,
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">المبلغ المدفوع</Typography>
                  <Typography variant="body1" fontWeight={600} color="primary.main">
                    {formatCurrency(
                      saleDetailsDialog.sale.paid_amount,
                      "en-US",
                      settings?.currency_symbol,
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }
                    )}
                  </Typography>
                </Box>
              </Box>

              {/* Sale Items */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  عناصر البيع
                </Typography>
                <Paper variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>المنتج</TableCell>
                        <TableCell align="center">الكمية</TableCell>
                        <TableCell align="center">سعر الوحدة</TableCell>
                        <TableCell align="center">الإجمالي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {saleDetailsDialog.sale.items?.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {item.product_name || item.product?.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                SKU: {item.product_sku || item.product?.sku || 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="center">
                            {formatCurrency(
                              item.unit_price,
                              "en-US",
                              settings?.currency_symbol,
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 500 }}>
                            {formatCurrency(
                              Number(item.unit_price) * item.quantity,
                              "en-US",
                              settings?.currency_symbol,
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>

              {/* Payment Methods */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  المدفوعات
                </Typography>
                {saleDetailsDialog.sale.payments && saleDetailsDialog.sale.payments.length > 0 ? (
                  <Paper variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>طريقة الدفع</TableCell>
                          <TableCell align="center">المبلغ</TableCell>
                          <TableCell align="center">التاريخ</TableCell>
                          <TableCell>المرجع</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {saleDetailsDialog.sale.payments.map((payment, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: '16px',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  bgcolor: 'primary.light',
                                  color: 'primary.dark'
                                }}
                              >
                                {payment.method}
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 500 }}>
                              {formatCurrency(
                                payment.amount,
                                "en-US",
                                settings?.currency_symbol,
                                {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {dayjs(payment.payment_date).format("YYYY-MM-DD")}
                            </TableCell>
                            <TableCell>
                              {payment.reference_number || "غير متاح"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      لا توجد مدفوعات مسجلة
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SalesListPage;
