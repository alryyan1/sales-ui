// src/pages/ClientsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// MUI Components (Import necessary components)
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination'; // MUI Pagination

// Services and Types
import clientService, { Client, PaginatedResponse } from '../services/clientService'; // Adjust path if needed

// Custom Components
import ClientsTable from '../components/clients/ClientsTable';         // Assuming this is ready
import ClientFormModal from '../components/clients/ClientFormModal'; // The hybrid modal
import ConfirmationDialog from '../components/common/ConfirmationDialog'; // The reusable dialog
import { useAuthorization } from '@/hooks/useAuthorization';
import { PlusIcon } from 'lucide-react';
import { CircularProgress } from '@mui/material';

const ClientsPage: React.FC = () => {
    // Translations - Load namespaces needed
    const { t } = useTranslation(['clients', 'common', 'validation']);
    const { can ,isAdmin} = useAuthorization(); // <-- Get the 'can' function
    console.log(isAdmin(),'isAdmin');
    console.log(can('create-clients'),'can create clients');
    console.log(can('edit-clients'),'can edit clients');

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
        } catch (e) {
            // Keep dialog open on error? Or close? Closing for now.
            closeConfirmDialog();
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Pagination Handler (for MUI Pagination) ---
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setCurrentPage(value);
    };

    // --- Render Component ---
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }} className="dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {t('clients:pageTitle')}
                </h1>
                {/* Conditionally render Add button */}
                {can('create-clients') && (
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    >
                        <PlusIcon className="h-5 w-5" />
                        {t('clients:addClient')}
                    </button>
                )}
                
            </Box>

            {/* Loading State */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }} className="text-gray-600 dark:text-gray-400">{t('common:loading')}</Typography>
                </Box>
            )}

            {/* Error State */}
            {!isLoading && error && (
                <Alert severity="error" sx={{ my: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Content Area: Table and Pagination */}
            {!isLoading && !error && clientsResponse && (
                <Box sx={{mt: 2}}> {/* Added Box wrapper with margin-top */}
                    {/* --- Clients Table --- */}
                    <ClientsTable
                        clients={clientsResponse.data}
                        canDelete={can('delete-clients')} // Pass permission check
                        canEdit ={can('edit-clients')} // Pass permission check
                        onEdit={openModal } // Pass handler only if allowed
                        onDelete={ openConfirmDialog } // Pass handler only if allowed
                        isLoading={isDeleting} // Pass deleting state to potentially disable actions in table
                    />

                    {/* --- MUI Pagination --- */}
                    {clientsResponse.last_page > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, mt: 3 }}> {/* Increased top margin */}
                            <Pagination
                                count={clientsResponse.last_page}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary" // MUI color prop
                                shape="rounded" // Optional shape
                                showFirstButton
                                showLastButton
                                // Apply Tailwind classes for specific styling if needed:
                                // className="[&>ul]:gap-2" // Example: target inner ul for gap
                            />
                        </Box>
                    )}
                     {/* Message if table is empty */}
                     {clientsResponse.data.length === 0 && (
                         <Typography sx={{ textAlign: 'center', py: 5 }} className="text-gray-500 dark:text-gray-400">
                             {t('clients:noClients')}
                         </Typography>
                     )}
                </Box>
            )}

            {/* --- Client Add/Edit Modal --- */}
            <ClientFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                clientToEdit={editingClient}
                onSaveSuccess={handleSaveSuccess}
            />

            {/* --- Confirmation Dialog --- */}
            <ConfirmationDialog
                open={isConfirmOpen}
                onClose={closeConfirmDialog}
                onConfirm={handleDeleteConfirm}
                title={t('common:confirmDeleteTitle') || "Confirm Deletion"} // Ensure key exists
                message={t('clients:deleteClientConfirm')}
                confirmText={t('common:delete')}
                cancelText={t('common:cancel')}
                isLoading={isDeleting}
            />

         

        </Box> // End main page container
    );
};

export default ClientsPage;