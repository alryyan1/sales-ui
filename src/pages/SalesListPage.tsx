// src/pages/SalesListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

// MUI Components (or shadcn/Tailwind equivalents)
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import AddIcon from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';

// Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';

// Day.js
import dayjs from 'dayjs';

// Services and Types
import saleService, { Sale } from '../services/saleService'; // Use sale service
import ConfirmationDialog from '../components/common/ConfirmationDialog'; // Reusable dialog
import { PaginatedResponse } from '@/services/clientService';
import { formatNumber } from '@/constants';

// Helper to format currency
// Helper to format date string

const SalesListPage: React.FC = () => {
    const { t } = useTranslation(['sales', 'common', 'clients']); // Load namespaces
    const navigate = useNavigate();

    // --- State ---
    const [salesResponse, setSalesResponse] = useState<PaginatedResponse<Sale> | null>(null);
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
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    // --- Data Fetching ---
    const fetchSales = useCallback(async (page: number /*, filters */) => {
        setIsLoading(true); setError(null);
        try {
            const data = await saleService.getSales(page /*, filters */); // Use saleService
            setSalesResponse(data);
        } catch (err) { setError(saleService.getErrorMessage(err)); }
        finally { setIsLoading(false); }
    }, []);

    // Effect to fetch data
    useEffect(() => { fetchSales(currentPage); }, [fetchSales, currentPage]);

    // --- Notification Handlers ---
    const showSnackbar = (message: string, type: 'success' | 'error') => { /* ... (same) ... */ };
    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => { /* ... (same) ... */ };

    // --- Deletion Handlers (if deletion is allowed) ---
    const openConfirmDialog = (id: number) => { setSaleToDeleteId(id); setIsConfirmOpen(true); };
    const closeConfirmDialog = () => { /* ... (same) ... */ };
    const handleDeleteConfirm = async () => {
        if (!saleToDeleteId) return; setIsDeleting(true);
        try {
            await saleService.deleteSale(saleToDeleteId); // Use saleService
            showSnackbar(t('sales:deleteSuccess'), 'success'); // Add key
            closeConfirmDialog();
            // Refetch logic
            if (salesResponse && salesResponse.data.length === 1 && currentPage > 1) { setCurrentPage(prev => prev - 1); }
            else { fetchSales(currentPage); }
        } catch (err) { showSnackbar(saleService.getErrorMessage(err), 'error'); closeConfirmDialog(); }
        finally { setIsDeleting(false); }
    };

    // --- Pagination Handler ---
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => { setCurrentPage(value); };

    // --- Navigation Handler ---
    const handleViewDetails = (id: number) => { navigate(`/sales/${id}`); }; // Define this route later

    // --- Render ---
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }} className="dark:bg-gray-900 min-h-screen">
            {/* Header & Add Button */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                <Typography variant="h4" component="h1" className="text-gray-800 dark:text-gray-100 font-semibold">
                    {t('sales:listTitle')} {/* Add key */}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    component={RouterLink}
                    to="/sales/add" // Define this route later
                >
                    {t('sales:addSale')} {/* Add key */}
                </Button>
            </Box>

            {/* Add Filters Section Here (Optional) */}

            {/* Loading / Error States */}
            {isLoading && ( <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}> <CircularProgress /> <Typography sx={{ ml: 2 }} className="text-gray-600 dark:text-gray-400">{t('common:loading')}</Typography> </Box> )}
            {!isLoading && error && ( <Alert severity="error" sx={{ my: 2 }}>{error}</Alert> )}

            {/* Content Area: Table and Pagination */}
            {!isLoading && !error && salesResponse && (
                 <Box sx={{mt: 2}}>
                     <TableContainer component={Paper} elevation={1} className="dark:bg-gray-800">
                         <Table sx={{ minWidth: 700 }} aria-label={t('sales:listTitle')}>
                             <TableHead sx={{ backgroundColor: 'action.hover' }} className="dark:bg-gray-700">
                                 <TableRow>
                                     {/* Add appropriate table headers */}
                                     <TableCell className="dark:text-gray-300">{t('sales:date')}</TableCell>
                                     <TableCell className="dark:text-gray-300">{t('sales:invoice')}</TableCell>
                                     <TableCell className="dark:text-gray-300">{t('clients:client')}</TableCell> {/* Use client namespace */}
                                     <TableCell align="center" className="dark:text-gray-300">{t('sales:status')}</TableCell>
                                     <TableCell align="right" className="dark:text-gray-300">{t('sales:totalAmount')}</TableCell>
                                     <TableCell align="right" className="dark:text-gray-300">{t('sales:paidAmount')}</TableCell>
                                     <TableCell align="right" className="dark:text-gray-300">{t('sales:dueAmount')}</TableCell> {/* Add key */}
                                     <TableCell align="center" className="dark:text-gray-300">{t('common:actions')}</TableCell>
                                 </TableRow>
                             </TableHead>
                             <TableBody>
                                 {salesResponse.data.map((sale) => (
                                     <TableRow key={sale.id} hover className="dark:text-gray-100">
                                         <TableCell className="dark:text-gray-100">{dayjs(sale.sale_date).format('YYYY-MM-DD')}</TableCell>
                                         <TableCell className="dark:text-gray-100">{sale.invoice_number || '---'}</TableCell>
                                         <TableCell className="dark:text-gray-100">{sale.client_name || t('common:n/a')}</TableCell>
                                         <TableCell align="center">
                                             <Chip
                                                 label={t(`sales:status_${sale.status}`)} // Add keys like status_completed etc.
                                                 size="small"
                                                 color={sale.status === 'completed' ? 'success' : sale.status === 'pending' ? 'warning' : sale.status === 'draft' ? 'info' : 'default'}
                                             />
                                         </TableCell>
                                         <TableCell align="right" className="dark:text-gray-100">{sale.total_amount}</TableCell>
                                         <TableCell align="right" className="dark:text-gray-100">{formatNumber(sale.paid_amount)}</TableCell>
                                         <TableCell align="right" className="dark:text-gray-100">{formatNumber(sale.due_amount)}</TableCell>
                                         <TableCell align="center">
                                             <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                <Tooltip title={t('common:view') || ''}>
                                                    <IconButton aria-label={t('common:view') || 'View'} color="default" size="small" onClick={() => handleViewDetails(sale.id)}>
                                                        <VisibilityIcon fontSize="small" className="dark:text-gray-300"/>
                                                    </IconButton>
                                                </Tooltip>
                                                 {/* Optional: Delete button if allowed */}
                                                 {/* <Tooltip title={t('common:delete') || ''}>...</Tooltip> */}
                                             </Box>
                                         </TableCell>
                                     </TableRow>
                                 ))}
                             </TableBody>
                         </Table>
                     </TableContainer>

                     {/* Pagination */}
                      {salesResponse.last_page > 1 && ( <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, mt: 3 }}> <Pagination count={salesResponse.last_page} page={currentPage} onChange={handlePageChange} color="primary" shape="rounded" showFirstButton showLastButton disabled={isLoading || isDeleting} /> </Box> )}
                       {/* No Sales Message */}
                      {salesResponse.data.length === 0 && ( <Typography sx={{ textAlign: 'center', py: 5 }} className="text-gray-500 dark:text-gray-400">{t('sales:noSales')}</Typography> )} {/* Add key */}
                 </Box>
            )}

            {/* --- Confirmation Dialog (if delete is enabled) --- */}
             {/* <ConfirmationDialog open={isConfirmOpen} onClose={closeConfirmDialog} onConfirm={handleDeleteConfirm} title={t('common:confirmDeleteTitle')} message={t('sales:deleteConfirm')} confirmText={t('common:delete')} cancelText={t('common:cancel')} isLoading={isDeleting} /> */}

            {/* --- Snackbar --- */}
            <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                 <Alert key={snackbarMessage} onClose={handleSnackbarClose} severity={snackbarSeverity} variant="filled" sx={{ width: '100%' }}>{snackbarMessage}</Alert>
            </Snackbar>

        </Box>
    );
};

export default SalesListPage;