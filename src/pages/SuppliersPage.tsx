// src/pages/SuppliersPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Pagination from "@mui/material/Pagination";
import AddIcon from "@mui/icons-material/Add";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Fade from "@mui/material/Fade";

// Services and Types
import supplierService, { Supplier } from "../services/supplierService";

// Custom Components
import SuppliersTable from "../components/suppliers/SuppliersTable";
import SupplierFormModal from "../components/suppliers/SupplierFormModal";
import ConfirmationDialog from "../components/common/ConfirmationDialog";

const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- State Management ---
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal & Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({
    isOpen: false,
    id: null,
  });

  // Notification State
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // --- Debounce Search Term ---
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // --- Queries ---
  const {
    data: suppliersResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["suppliers", currentPage, debouncedSearchTerm],
    queryFn: () =>
      supplierService.getSuppliers(currentPage, debouncedSearchTerm),
    placeholderData: keepPreviousData,
  });

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: supplierService.deleteSupplier,
    onSuccess: () => {
      showSnackbar("تم حذف المورد بنجاح", "success");
      setDeleteConfirmation({ isOpen: false, id: null });
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      // Adjust page if needed automatically by refetch
      if (
        suppliersResponse &&
        suppliersResponse.data.length === 1 &&
        currentPage > 1
      ) {
        setCurrentPage((prev) => prev - 1);
      }
    },
    onError: (err: any) => {
      showSnackbar(supplierService.getErrorMessage(err), "error");
      setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
    },
  });

  // --- Handlers ---
  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Modal Handlers
  const handleOpenModal = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingSupplier(null), 150);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
    showSnackbar(
      editingSupplier
        ? "تم تحديث بيانات المورد بنجاح"
        : "تم إضافة المورد بنجاح",
      "success"
    );
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  };

  // Delete Handlers
  const handleOpenDelete = (id: number) => {
    setDeleteConfirmation({ isOpen: true, id });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.id) {
      deleteMutation.mutate(deleteConfirmation.id);
    }
  };

  const handleViewLedger = (supplier: Supplier) => {
    navigate(`/suppliers/${supplier.id}/ledger`);
  };

  return (
    <Box
      sx={{ p: { xs: 2, sm: 3, md: 4 } }}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300"
      dir="rtl"
    >
      {/* Header Section */}
      <Paper elevation={0} className="bg-transparent" sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              className="text-gray-800 dark:text-gray-100 font-bold tracking-tight"
            >
              الموردون
            </Typography>
            <Typography
              variant="body2"
              className="text-gray-500 dark:text-gray-400 mt-1"
            >
              إدارة بيانات الموردين والمشتريات
            </Typography>
          </Box>

          <Button
            onClick={() => handleOpenModal()}
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              paddingX: 3,
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              "&:hover": {
                boxShadow:
                  "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
              },
            }}
          >
            إضافة مورد جديد
          </Button>
        </Box>

        {/* Search Bar */}
        <Box sx={{ mt: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="ابحث عن مورد بالاسم، البريد الإلكتروني أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-gray-400" />
                </InputAdornment>
              ),
              sx: {
                borderRadius: "12px",
                backgroundColor: "background.paper",
                "& fieldset": { border: "none" },
                boxShadow:
                  "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                transition: "all 0.2s",
                "&:hover": {
                  boxShadow:
                    "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                },
                "&.Mui-focused": {
                  boxShadow: "0 0 0 2px var(--mui-palette-primary-main)",
                },
              },
            }}
            className="dark:bg-gray-800"
          />
        </Box>
      </Paper>

      {/* Error State */}
      {isError && (
        <Fade in>
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {supplierService.getErrorMessage(error)}
          </Alert>
        </Fade>
      )}

      {/* Content Area */}
      <Box sx={{ position: "relative", minHeight: 400 }}>
        {isLoading && !suppliersResponse ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 300,
              gap: 2,
            }}
          >
            <CircularProgress size={40} thickness={4} />
            <Typography className="text-gray-500 animate-pulse">
              جاري تحميل البيانات...
            </Typography>
          </Box>
        ) : (
          <Fade in={!isLoading}>
            <Box>
              {/* Suppliers Table */}
              {suppliersResponse && (
                <SuppliersTable
                  suppliers={suppliersResponse.data}
                  onEdit={handleOpenModal}
                  onDelete={handleOpenDelete}
                  onViewLedger={handleViewLedger}
                  isLoading={deleteMutation.isPending}
                />
              )}

              {/* Empty State */}
              {suppliersResponse?.data.length === 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 6,
                    textAlign: "center",
                    borderRadius: 3,
                    bgcolor: "background.paper",
                    mt: 2,
                    border: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="h6" className="text-gray-500 mb-2">
                    لا توجد نتائج
                  </Typography>
                  <Typography variant="body2" className="text-gray-400">
                    جرّب تعديل مصطلحات البحث أو أضف موردًا جديدًا.
                  </Typography>
                </Paper>
              )}

              {/* Pagination */}
              {suppliersResponse && suppliersResponse.last_page > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <Pagination
                    count={suppliersResponse.last_page}
                    page={currentPage}
                    onChange={(_, page) => setCurrentPage(page)}
                    color="primary"
                    size="large"
                    shape="rounded"
                    showFirstButton
                    showLastButton
                    disabled={isLoading || deleteMutation.isPending}
                    sx={{
                      "& .MuiPaginationItem-root": {
                        fontSize: "1rem",
                        borderRadius: "8px",
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
          </Fade>
        )}
      </Box>

      {/* Supplier Add/Edit Modal */}
      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplierToEdit={editingSupplier}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Confirmation Dialog for Deletion */}
      <ConfirmationDialog
        open={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })
        }
        onConfirm={handleConfirmDelete}
        title="حذف المورد"
        message="هل أنت متأكد تمامًا من رغبتك في حذف هذا المورد؟ سيؤدي ذلك إلى فقدان بياناته نهائيًا."
        confirmText={deleteMutation.isPending ? "جاري الحذف..." : "نعم، احذف"}
        cancelText="تراجع"
        isLoading={deleteMutation.isPending}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2, boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SuppliersPage;
