// src/pages/SuppliersPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import AddIcon from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';

// Services and Types
import supplierService, { Supplier } from '../services/supplierService';
import { PaginatedResponse } from '../services/clientService';

// Custom Components
import SuppliersTable from '../components/suppliers/SuppliersTable';
import SupplierFormModal from '../components/suppliers/SupplierFormModal';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
const SuppliersPage: React.FC = () => {
    const navigate = useNavigate();
    // --- State Management ---
    const [suppliersResponse, setSuppliersResponse] = useState<PaginatedResponse<Supplier> | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Loading supplier list
    const [error, setError] = useState<string | null>(null); // Error fetching list
    const [currentPage, setCurrentPage] = useState(1); // Pagination state
    const [searchTerm, setSearchTerm] = useState(''); // Controlled search input state
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // Debounced search term for API call

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null); // Supplier being edited

    // Deletion State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false); // Confirm dialog visibility
    const [supplierToDeleteId, setSupplierToDeleteId] = useState<number | null>(null); // ID of supplier to delete
    const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete operation

    // Notification State
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    // --- Debounce Search Term ---
    useEffect(() => {
        // Set up a timer to update debouncedSearchTerm after user stops typing
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1); // Reset to page 1 whenever the search term is finalized
        }, 500); // 500ms delay

        // Clear the timer if searchTerm changes before the delay is over, or on unmount
        return () => clearTimeout(timerId);
    }, [searchTerm]); // Effect runs when searchTerm changes

    // --- Data Fetching (using useCallback) ---
    const fetchSuppliers = useCallback(async (page: number, search: string) => {
        console.log(`Fetching suppliers - Page: ${page}, Search: "${search}"`);
        setIsLoading(true);
        setError(null);
        try {
            const data = await supplierService.getSuppliers(page, search); // Pass search term
            setSuppliersResponse(data);
        } catch (err) {
            console.error("Failed to fetch suppliers:", err);
            setError(supplierService.getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []); // useCallback: dependency array is empty, function is stable

    // Effect to fetch data on mount and when page or debounced search term changes
    useEffect(() => {
        fetchSuppliers(currentPage, debouncedSearchTerm);
    }, [fetchSuppliers, currentPage, debouncedSearchTerm]);

    // --- Notification Handlers ---
    const showSnackbar = (message: string, type: 'success' | 'error') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(type);
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    // --- Modal Handlers ---
    const openModal = (supplier: Supplier | null = null) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // No need to reset editingSupplier here, modal's useEffect handles it
    };

    const handleSaveSuccess = () => {
        closeModal();
        showSnackbar(
            editingSupplier ? 'تم تحديث بيانات المورد بنجاح' : 'تم إضافة المورد بنجاح',
            'success'
        );
        const pageToFetch = editingSupplier ? currentPage : 1;
        fetchSuppliers(pageToFetch, debouncedSearchTerm);
        if (!editingSupplier) setCurrentPage(1);
    };

    // --- Deletion Handlers ---
    const openConfirmDialog = (id: number) => {
        setSupplierToDeleteId(id);
        setIsConfirmOpen(true);
    };

    const closeConfirmDialog = () => {
        if (isDeleting) return; // Prevent closing while processing
        setIsConfirmOpen(false);
        setTimeout(() => setSupplierToDeleteId(null), 300); // Clear ID after potential fade out
    };

    const handleDeleteConfirm = async () => {
        if (!supplierToDeleteId) return;
        setIsDeleting(true);

        try {
            await supplierService.deleteSupplier(supplierToDeleteId);
            showSnackbar('تم حذف المورد بنجاح', 'success');
            closeConfirmDialog(); // Close confirmation dialog

            // Smart refetch/pagination adjustment
            if (suppliersResponse && suppliersResponse.data.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1); // Go to previous page if last item deleted
            } else {
                // Refetch current page with current search term
                fetchSuppliers(currentPage, debouncedSearchTerm);
            }
        } catch (err) {
            showSnackbar(supplierService.getErrorMessage(err), 'error');
            closeConfirmDialog(); // Also close dialog on error
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Pagination Handler ---
    const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
        setCurrentPage(value);
    };

     // --- Search Handler ---
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    // --- Ledger Handler ---
    const handleViewLedger = (supplier: Supplier) => {
        navigate(`/suppliers/${supplier.id}/ledger`);
    };

    // --- Render Component ---
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }} className="dark:bg-gray-900 min-h-screen" style={{direction: 'rtl'}}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                <Typography variant="h4" component="h1" className="text-gray-800 dark:text-gray-100 font-semibold">
                    الموردون
                </Typography>
                <Button
                    onClick={() => openModal()}
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                    إضافة مورد
                </Button>
            </Box>

             <Box sx={{ mb: 3 }}>
                 <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="ابحث عن مورد..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                        startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon color="action" />
                        </InputAdornment>
                        ),
                    }}
                    className="dark:bg-gray-800 [&>div>input]:text-gray-900 dark:[&>div>input]:text-gray-100 [&>div>fieldset]:border-gray-300 dark:[&>div>fieldset]:border-gray-600"
                />
             </Box>

            {/* Loading State */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }} className="text-gray-600 dark:text-gray-400">
                        جاري التحميل...
                    </Typography>
                </Box>
            )}

            {/* Error State */}
            {!isLoading && error && (
                <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
            )}

            {/* Content Area: Table and Pagination */}
            {!isLoading && !error && suppliersResponse && (
                <Box sx={{mt: 2}}>
                    {/* Suppliers Table */}
                    <SuppliersTable
                        suppliers={suppliersResponse.data}
                        onEdit={openModal}
                        onDelete={openConfirmDialog}
                        onViewLedger={handleViewLedger}
                        isLoading={isDeleting} // Pass deleting state
                    />

                    {/* MUI Pagination */}
                    {suppliersResponse.last_page > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, mt: 3 }}>
                            <Pagination
                                count={suppliersResponse.last_page}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                shape="rounded"
                                showFirstButton
                                showLastButton
                                disabled={isLoading || isDeleting} // Disable pagination during loading/deleting
                            />
                        </Box>
                    )}

                    {/* No Suppliers Message */}
                    {suppliersResponse.data.length === 0 && (
                        <Typography sx={{ textAlign: 'center', py: 5 }} className="text-gray-500 dark:text-gray-400">
                            لا يوجد موردون حاليًا
                        </Typography>
                    )}
                </Box>
            )}

            {/* Supplier Add/Edit Modal */}
            <SupplierFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                supplierToEdit={editingSupplier}
                onSaveSuccess={handleSaveSuccess}
            />

            {/* Confirmation Dialog for Deletion */}
            <ConfirmationDialog
                open={isConfirmOpen}
                onClose={closeConfirmDialog}
                onConfirm={handleDeleteConfirm}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذا المورد؟ لا يمكن التراجع عن هذه العملية."
                confirmText="حذف"
                cancelText="إلغاء"
                isLoading={isDeleting}
            />

            {/* MUI Snackbar for Notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {/* Added key to Alert */}
                <Alert key={snackbarMessage} onClose={handleSnackbarClose} severity={snackbarSeverity} variant="filled" sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

        </Box>
    );
};

export default SuppliersPage;