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
import AddIcon from "@mui/icons-material/Add";
import Snackbar from "@mui/material/Snackbar";
import Paper from "@mui/material/Paper";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip"; // To display status

// Icons
import VisibilityIcon from "@mui/icons-material/Visibility"; // View details icon
import DeleteIcon from "@mui/icons-material/Delete"; // Delete icon (if allowed)

// Services and Types
import purchaseService, {
  Purchase,
  PaginatedResponse,
} from "../../services/purchaseService"; // Use purchase service
import ConfirmationDialog from "../../components/common/ConfirmationDialog"; // Reusable dialog
import dayjs from "dayjs";
import { CardContent, Tab, TableHead } from "@mui/material";
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


const PurchasesListPage: React.FC = () => {
  const { t } = useTranslation(["purchases", "common"]); // Load namespaces
  const navigate = useNavigate(); // Hook for navigation

  // --- State ---
  const [purchasesResponse, setPurchasesResponse] =
    useState<PaginatedResponse<Purchase> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);




  // --- Data Fetching ---
  const fetchPurchases = useCallback(
    async (page: number /*, search: string, status: string, etc. */) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await purchaseService.getPurchases(
          page /*, search, status */
        ); // Use purchaseService
        setPurchasesResponse(data);
      } catch (err) {
        setError(purchaseService.getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    []
  ); // Add filter states to dependency array if they affect the fetch call

  // Effect to fetch data
  useEffect(() => {
    fetchPurchases(currentPage);
  }, [fetchPurchases, currentPage]);





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
        {/* Link to the Add Purchase Page */}
        <Button asChild>
          <RouterLink to="/purchases/add">
            {t("purchases:addPurchase")} {/* Add key */}
          </RouterLink>
        </Button>
      </Box>

      {/* Add Filters Section Here (Optional) */}
      {/* <Paper sx={{ p: 2, mb: 3 }}> ... Filter inputs ... </Paper> */}

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
            <Table aria-label={t("purchases:listTitle")}>
              <TableHeader>
                <TableRow>
                  <TableCell align="center">{t("purchases:id")}</TableCell>
                  <TableCell align="center">{t("purchases:date")}</TableCell>
                  <TableCell align="center">{t("purchases:reference")}</TableCell>
                  <TableCell align="center">{t("purchases:supplier")}</TableCell>
                  <TableCell align="center">{t("purchases:status")}</TableCell>
                  <TableCell align="center">{t("purchases:totalAmount")}</TableCell>
                  <TableCell align="center">{t("common:actions")}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchasesResponse.data.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell align="center">{purchase.id}</TableCell>
                    <TableCell align="center">
                      {dayjs(purchase.purchase_date).format("YYYY-MM-DD")}
                    </TableCell>
                    <TableCell align="center">{purchase.reference_number || "---"}</TableCell>
                    <TableCell align="center">
                      {purchase.supplier_name || t("common:n/a")}
                    </TableCell>
                    {/* Handle possible null supplier */}
                    <TableCell align="center">
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
                    <TableCell align="center">
                      {formatCurrency(purchase.total_amount)}
                    </TableCell>
                    <TableCell align="center">
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
                        {/* Optional: Add Delete button if allowed */}
                        {/* <Tooltip title={t('common:delete') || ''}>
                                                     <span>
                                                         <IconButton aria-label={t('common:delete') || 'Delete'} color="error" size="small" onClick={() => openConfirmDialog(purchase.id)} disabled={isDeleting}>
                                                             <DeleteIcon fontSize="small" />
                                                         </IconButton>
                                                     </span>
                                                 </Tooltip> */}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          {purchasesResponse.last_page > 1 && (
            <Box
              sx={{ display: "flex", justifyContent: "center", p: 2, mt: 3 }}
            >
              
              <Pagination
                count={purchasesResponse.last_page}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                disabled={isLoading }
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


    </Box>
  );
};

export default PurchasesListPage;
