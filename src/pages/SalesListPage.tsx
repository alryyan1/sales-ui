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
import Snackbar from "@mui/material/Snackbar";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import EditIcon from "@mui/icons-material/Edit"; // <-- Import Edit Icon

// Icons
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";

// Day.js
import dayjs from "dayjs";

// Services and Types
import saleService, { Sale } from "../services/saleService"; // Use sale service
import ConfirmationDialog from "../components/common/ConfirmationDialog"; // Reusable dialog
import { PaginatedResponse } from "@/services/clientService";
import { formatNumber } from "@/constants";

// Helper to format currency
// Helper to format date string

const SalesListPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common", "clients"]); // Load namespaces
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location

  // --- State for Highlight ---
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for timeout

  // --- State ---
  const [salesResponse, setSalesResponse] =
    useState<PaginatedResponse<Sale> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Add state for filters (search, status, dates) if needed

  // Deletion State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification State
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const handleEditSale = (id: number) => {
    navigate(`/sales/${id}/edit`); // <-- Navigate to the EDIT route
  };
  // --- Check navigation state on load/location change ---
  useEffect(() => {
    // Clear previous timeout if location changes rapidly
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Check if state contains the updated ID from navigation
    const updatedId = location.state?.updatedSaleId;
    console.log(updatedId,'updatedId')
    if (updatedId && typeof updatedId === "number") {
      console.log(`Highlighting Sale ID:  ${updatedId}`, );
      setHighlightedRowId(updatedId);
    //   alert(`Highlighting Sale ID:${updatedId}` ); // Debugging alert

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
    // Depend on location.state specifically if possible, or location.key
  }, [location.state, location.key, navigate]); // Add location.key to re-run if only state changes
  // --- Data Fetching ---
  const fetchSales = useCallback(async (page: number /*, filters */) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await saleService.getSales(page /*, filters */); // Use saleService
      setSalesResponse(data);
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

   // --- Notification Handlers (Implemented) ---
   const showSnackbar = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(type);
    setSnackbarOpen(true); // Open the snackbar
};

const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    // Prevent closing if user clicks away (optional)
    if (reason === 'clickaway') {
        return;
    }
    setSnackbarOpen(false); // Close the snackbar
    // Optionally reset message after close transition finishes?
    // setTimeout(() => setSnackbarMessage(''), 300);
};
const closeConfirmDialog = () => {
    console.log("Closing confirm dialog.");
    // Prevent closing if a delete operation is currently in progress
    if (isDeleting) return;
    setIsConfirmOpen(false);
    // It's good practice to clear the ID slightly after closing,
    // allowing fade-out animations if the dialog has them.
    setTimeout(() => {
         setSaleToDeleteId(null);
    }, 300); // Adjust delay if needed
};

// --- Deletion Handlers (Implemented open/close) ---
const openConfirmDialog = (id: number) => {
    console.log(`Opening confirm dialog for Sale ID: ${id}`);
    setSaleToDeleteId(id); // Set the ID of the sale to potentially delete
    setIsConfirmOpen(true); // Open the dialog
};

  const handleDeleteConfirm = async () => {
    if (!saleToDeleteId) return;
    setIsDeleting(true);
    try {
      await saleService.deleteSale(saleToDeleteId); // Use saleService
      showSnackbar(t("sales:deleteSuccess"), "success"); // Add key
      closeConfirmDialog();
      // Refetch logic
      if (salesResponse && salesResponse.data.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchSales(currentPage);
      }
    } catch (err) {
      showSnackbar(saleService.getErrorMessage(err), "error");
      closeConfirmDialog();
    } finally {
      setIsDeleting(false);
    }
  };

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
  }; // Define this route later

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
          {t("sales:listTitle")} {/* Add key */}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/sales/add" // Define this route later
        >
          {t("sales:addSale")} {/* Add key */}
        </Button>
      </Box>

      {/* Add Filters Section Here (Optional) */}

      {/* Loading / Error States */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          {" "}
          <CircularProgress />{" "}
          <Typography
            sx={{ ml: 2 }}
            className="text-gray-600 dark:text-gray-400"
          >
            {t("common:loading")}
          </Typography>{" "}
        </Box>
      )}
      {!isLoading && error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      {/* Content Area: Table and Pagination */}
      {!isLoading && !error && salesResponse && (
        <Box sx={{ mt: 2 }}>
          <TableContainer
            component={Paper}
            elevation={1}
            className="dark:bg-gray-800"
          >
            <Table sx={{ minWidth: 700 }} aria-label={t("sales:listTitle")}>
              <TableHead
                sx={{ backgroundColor: "action.hover" }}
                className="dark:bg-gray-700"
              >
                <TableRow>
                  {/* Add appropriate table headers */}
                  <TableCell className="dark:text-gray-300">
                    {t("sales:id")}
                  </TableCell> <TableCell className="dark:text-gray-300">
                    {t("sales:date")}
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {t("sales:invoice")}
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {t("clients:client")}
                  </TableCell>{" "}
                  {/* Use client namespace */}
                  <TableCell align="center" className="dark:text-gray-300">
                    {t("sales:status")}
                  </TableCell>
                  <TableCell align="right" className="dark:text-gray-300">
                    {t("sales:totalAmount")}
                  </TableCell>
                  <TableCell align="right" className="dark:text-gray-300">
                    {t("sales:paidAmount")}
                  </TableCell>
                  {/* <TableCell align="right" className="dark:text-gray-300">
                    {t("sales:dueAmount")}
                  </TableCell>{" "} */}
                  {/* Add key */}
                  <TableCell align="center" className="dark:text-gray-300">
                    {t("common:actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesResponse.data.map((sale) => {
                  const isHighlighted = sale.id === highlightedRowId;

                  return (
                    <TableRow // Apply conditional styling/class
                      sx={{
                        transition: "background-color 0.5s ease-out", // Smooth transition
                        backgroundColor: isHighlighted
                          ? (theme)=>theme.palette.primary.light// Example MUI theme color
                          : "inherit", // Example MUI theme color
                        // Or use theme-agnostic color:
                        // backgroundColor: isHighlighted ? '#e6ffed' : 'inherit',
                      }}
                      key={sale.id}
                      hover
                      className="dark:text-gray-100"
                    >
                        <TableCell className="dark:text-gray-100">
                            {sale.id}
                        </TableCell>
                      <TableCell className="dark:text-gray-100">
                        {dayjs(sale.sale_date).format("YYYY-MM-DD")}
                      </TableCell>
                      <TableCell className="dark:text-gray-100">
                        {sale.invoice_number || "---"}
                      </TableCell>
                      <TableCell className="dark:text-gray-100">
                        {sale.client_name || t("common:n/a")}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={t(`sales:status_${sale.status}`)} // Add keys like status_completed etc.
                          size="small"
                          color={
                            sale.status === "completed"
                              ? "success"
                              : sale.status === "pending"
                              ? "warning"
                              : sale.status === "draft"
                              ? "info"
                              : "default"
                          }
                        />
                      </TableCell>
                      <TableCell align="right" className="dark:text-gray-100">
                        {sale.total_amount}
                      </TableCell>
                      <TableCell align="right" className="dark:text-gray-100">
                        {formatNumber(sale.paid_amount)}
                      </TableCell>
                      {/* <TableCell align="right" className="dark:text-gray-100">
                        {formatNumber(sale.due_amount)}
                      </TableCell> */}
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
                              {" "}
                              {/* Span might be needed if button can be disabled */}
                              <IconButton
                                aria-label={t("common:edit") || "Edit"}
                                color="primary" // Use primary color for edit
                                size="small"
                                onClick={() => handleEditSale(sale.id)} // <-- Call edit handler
                                // disabled={isDeleting || sale.status === 'cancelled' /* Add conditions to disable editing */}
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
                              <VisibilityIcon
                                fontSize="small"
                                className="dark:text-gray-300"
                              />
                            </IconButton>
                          </Tooltip>
                          {/* Optional: Delete button if allowed */}
                          {/* <Tooltip title={t('common:delete') || ''}>...</Tooltip> */}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Pagination */}
          {salesResponse.last_page > 1 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", p: 2, mt: 3 }}
            >
              {" "}
              <Pagination
                count={salesResponse.last_page}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                disabled={isLoading || isDeleting}
              />{" "}
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
          )}{" "}
          {/* Add key */}
        </Box>
      )}

      {/* --- Confirmation Dialog (if delete is enabled) --- */}
      {/* <ConfirmationDialog open={isConfirmOpen} onClose={closeConfirmDialog} onConfirm={handleDeleteConfirm} title={t('common:confirmDeleteTitle')} message={t('sales:deleteConfirm')} confirmText={t('common:delete')} cancelText={t('common:cancel')} isLoading={isDeleting} /> */}

      {/* --- Snackbar --- */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          key={snackbarMessage}
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SalesListPage;
