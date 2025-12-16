// src/pages/ClientsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import Button from '@mui/material/Button';
import { CircularProgress } from '@mui/material';

// Services and Types
import clientService, { Client, PaginatedResponse } from '../services/clientService';

// Custom Components
import ClientsTable from '../components/clients/ClientsTable';
import ClientFormModal from '../components/clients/ClientFormModal';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { PlusIcon } from 'lucide-react';

const ClientsPage: React.FC = () => {

    // --- State Management ---
    const [clientsResponse, setClientsResponse] = useState<PaginatedResponse<Client> | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Loading client list
    const [error, setError] = useState<string | null>(null); // Error fetching list
    const [currentPage, setCurrentPage] = useState(1); // Pagination

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null); // Client for editing

    // Deletion State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false); // Confirm dialog visibility
    const [clientToDeleteId, setClientToDeleteId] = useState<number | null>(null); // ID of client to delete
    const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete operation

   

    // --- Data Fetching ---
    const fetchClients = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await clientService.getClients(page);
            setClientsResponse(data);
        } catch (err) {
            setError(clientService.getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []); // Dependency array is empty

    // Effect to fetch data on mount and when page changes
    useEffect(() => {
        fetchClients(currentPage);
    }, [fetchClients, currentPage]);




    // --- Modal Handlers ---
    const openModal = (client: Client | null = null) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // editingClient is reset inside the modal's useEffect now
    };

    const handleSaveSuccess = () => {
        closeModal();
        const pageToFetch = editingClient ? currentPage : 1;
        fetchClients(pageToFetch);
        if (!editingClient) setCurrentPage(1);
    };

    // --- Deletion Handlers ---
    const openConfirmDialog = (id: number) => {
        setClientToDeleteId(id);
        setIsConfirmOpen(true);
    };

    const closeConfirmDialog = () => {
        if (isDeleting) return; // Prevent closing while processing
        setIsConfirmOpen(false);
        // Delay clearing ID slightly so dialog can fade out if needed
        setTimeout(() => setClientToDeleteId(null), 300);
    };

    const handleDeleteConfirm = async () => {
        if (!clientToDeleteId) return;
        setIsDeleting(true);

        try {
            await clientService.deleteClient(clientToDeleteId);
            closeConfirmDialog(); // Close confirmation dialog on success

            // Smart refetch/pagination adjustment
            if (clientsResponse && clientsResponse.data.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            } else {
                fetchClients(currentPage);
            }
        } catch {
            // Keep dialog open on error? Or close? Closing for now.
            closeConfirmDialog();
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Pagination Handler (for MUI Pagination) ---
    const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
        setCurrentPage(value);
    };

    // --- Render Component ---
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }} className="dark:bg-gray-900 min-h-screen">
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                <Typography variant="h4" className="text-gray-800 dark:text-gray-100" sx={{ fontWeight: 700 }}>
                    العملاء
                </Typography>
                <Button
                    onClick={() => openModal()}
                    variant="contained"
                    color="primary"
                    startIcon={<PlusIcon className="h-5 w-5" />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                    إضافة عميل
                </Button>
                
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }} className="text-gray-600 dark:text-gray-400">
                        جاري التحميل...
                    </Typography>
                </Box>
            )}

            {!isLoading && error && (
                <Alert severity="error" sx={{ my: 2 }}>
                    {error}
                </Alert>
            )}

            {!isLoading && !error && clientsResponse && (
                <Box sx={{ mt: 2 }}>
                    <ClientsTable
                        clients={clientsResponse.data}
                        canDelete={true}
                        canEdit={true}
                        onEdit={openModal}
                        onDelete={openConfirmDialog}
                        onViewLedger={(id) => window.location.hash = `#/clients/${id}/ledger`}
                        canViewLedger={true}
                        isLoading={isDeleting}
                    />

                    {clientsResponse.last_page > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, mt: 3 }}>
                            <Pagination
                                count={clientsResponse.last_page}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                shape="rounded"
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    )}
                     {clientsResponse.data.length === 0 && (
                         <Typography sx={{ textAlign: 'center', py: 5 }} className="text-gray-500 dark:text-gray-400">
                             لا يوجد عملاء حاليًا
                         </Typography>
                     )}
                </Box>
            )}

            <ClientFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                clientToEdit={editingClient}
                onSaveSuccess={handleSaveSuccess}
            />

            <ConfirmationDialog
                open={isConfirmOpen}
                onClose={closeConfirmDialog}
                onConfirm={handleDeleteConfirm}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذه العملية."
                confirmText="حذف"
                cancelText="إلغاء"
                isLoading={isDeleting}
            />

         

        </Box>
    );
};

export default ClientsPage;