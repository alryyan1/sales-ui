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
import EditIcon from "@mui/icons-material/Edit";

// Icons
import VisibilityIcon from "@mui/icons-material/Visibility";

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

// Define the actual API response structure (Laravel pagination)
interface SalesApiResponse {
  data: Sale[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  first_page_url: string;
  last_page_url: string;
  next_page_url: string | null;
  prev_page_url: string | null;
  path: string;
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

  // --- State ---
  const [salesResponse, setSalesResponse] = useState<SalesApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleEditSale = (id: number) => {
    navigate(`/sales/${id}/edit`);
  };

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
  }, [location.state, location.key, navigate]);

  // --- Data Fetching ---
  const fetchSales = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await saleService.getSales(page);
      console.log('Sales API response:', data);
      
      // Handle both paginated response and simple array
      if (data && typeof data === 'object' && 'data' in data && 'current_page' in data) {
        // This is a paginated response
        setSalesResponse(data as SalesApiResponse);
      } else if (Array.isArray(data)) {
        // This is a simple array - create a mock paginated response
        const salesArray = data as Sale[];
        setSalesResponse({
          data: salesArray,
          current_page: 1,
          last_page: 1,
          per_page: salesArray.length,
          total: salesArray.length,
          from: 1,
          to: salesArray.length,
          first_page_url: '',
          last_page_url: '',
          next_page_url: null,
          prev_page_url: null,
          path: ''
        });
      } else {
        throw new Error('Unexpected response format from API');
      }
    } catch (err) {
      setError(saleService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect to fetch data
  useEffect(() => {
    fetchSales(currentPage);
  }, [fetchSales, currentPage]);

  // --- Pagination Handler ---
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };

  // --- Navigation Handler ---
  const handleViewDetails = (id: number) => {
    navigate(`/sales/${id}`);
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/sales/add"
        >
          {t("sales:addSale")}
        </Button>
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

      {/* Content Area: Table and Pagination */}
      {!isLoading && !error && salesResponse && (
        <Card>
          <CardContent>
            <Table aria-label={t("sales:listTitle")}>
              <TableHeader>
                <TableRow>
                  <TableCell align="center">{t("sales:id")}</TableCell>
                  <TableCell align="center">{t("sales:date")}</TableCell>
                  <TableCell align="center">{t("sales:invoice")}</TableCell>
                  <TableCell align="center">{t("clients:client")}</TableCell>
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
                        {dayjs(sale.sale_date).format("YYYY-MM-DD")}
                      </TableCell>
                      <TableCell align="center">{sale.invoice_number || `SALE-${sale.id}`}</TableCell>
                      <TableCell align="center">
                        {sale.client_name || t("common:n/a")}
                      </TableCell>
                      <TableCell align="center">
                        {discountAmount > 0 
                          ? formatCurrency(discountAmount, "en-US", settings?.currency_symbol)
                          : "---"
                        }
                      </TableCell>
                      <TableCell align="center">
                        {formatCurrency(
                          sale.total_amount,
                          "en-US",
                          settings?.currency_symbol
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {formatNumber(sale.paid_amount)}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          {/* --- Edit Button --- */}
                          <Tooltip title={t("common:edit") || ""}>
                            <span>
                              <IconButton
                                aria-label={t("common:edit") || "Edit"}
                                color="primary"
                                size="small"
                                onClick={() => handleEditSale(sale.id)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t("common:view") || ""}>
                            <IconButton
                              aria-label={t("common:view") || "View"}
                              color="default"
                              size="small"
                              onClick={() => handleViewDetails(sale.id)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
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
          {salesResponse.last_page > 1 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", p: 2, mt: 3 }}
            >
              <Pagination
                count={salesResponse.last_page}
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
    </Box>
  );
};

export default SalesListPage;
