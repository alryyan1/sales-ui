// src/pages/ClientsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Services and Types
import clientService, { Client, PaginatedResponse } from '../services/clientService'; // Adjust path if needed

// Custom Components (using Tailwind & RHF / MUI)
import ClientsTable from '../components/clients/ClientsTable';         // Expects Tailwind styling or className compatibility
import ClientFormModal from '../components/clients/ClientFormModal'; // Hybrid: MUI Dialog + RHF + Tailwind

// Icons (Heroicons)
import { PlusIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const ClientsPage: React.FC = () => {
    // Translations - Load namespaces needed for this page and its children/placeholders
    const { t } = useTranslation(['clients', 'common', 'validation']);

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

    // Notification State
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // --- Data Fetching ---
    const fetchClients = useCallback(async (page: number) => {
        console.log(`Fetching clients for page: ${page}`);
        setIsLoading(true);
        setError(null);
        try {
            const data = await clientService.getClients(page);
            setClientsResponse(data);
        } catch (err) {
            console.error("Failed to fetch clients:", err);
            setError(clientService.getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []); // useCallback: dependency array is empty, function is stable

    // Effect to fetch data on mount and when page changes
    useEffect(() => {
        fetchClients(currentPage);
    }, [fetchClients, currentPage]); // Refetch when currentPage or fetchClients changes

    // --- Notification Handler ---
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        // Auto-hide after a delay
        const timer = setTimeout(() => setNotification(null), 5000); // Hide after 5 seconds
        return () => clearTimeout(timer); // Cleanup timeout on unmount or if new notification appears
    };

    // --- Modal Handlers ---
    // Accepts optional client. If client exists, it's edit mode.
    const openModal = (client: Client | null = null) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // No need to reset editingClient here, it's handled by modal's useEffect
    };

    const handleSaveSuccess = () => {
        const messageKey = editingClient ? 'clients:saveSuccess' : 'clients:saveSuccess'; // Could differentiate messages later
        closeModal(); // Close the modal first
        showNotification(t(messageKey), 'success'); // Show success message
        // Refetch logic: Fetch page 1 if adding, current page if editing
        const pageToFetch = editingClient ? currentPage : 1;
        fetchClients(pageToFetch);
        if (!editingClient) {
             setCurrentPage(1); // Reset to page 1 if adding
        }
    };

    // --- Deletion Handlers ---
    const openConfirmDialog = (id: number) => {
        setClientToDeleteId(id);
        setIsConfirmOpen(true);
    };

    const closeConfirmDialog = () => {
        if (isDeleting) return; // Prevent closing while deleting
        setIsConfirmOpen(false);
        setClientToDeleteId(null);
    };

    const handleDeleteConfirm = async () => {
        if (!clientToDeleteId) return;
        setIsDeleting(true);
        // Keep confirm dialog open during API call? Optional. Closing it immediately:
        // closeConfirmDialog();

        try {
            await clientService.deleteClient(clientToDeleteId);
            showNotification(t('clients:deleteSuccess'), 'success');
            closeConfirmDialog(); // Close on success

            // Smart refetch/pagination adjustment
            if (clientsResponse && clientsResponse.data.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1); // Go to previous page if last item deleted
            } else {
                fetchClients(currentPage); // Otherwise, refetch current page
            }
        } catch (err) {
            showNotification(clientService.getErrorMessage(err), 'error');
            // Optionally keep dialog open on error:
             closeConfirmDialog(); // Close even on error for this implementation
        } finally {
            setIsDeleting(false);
            // clientToDeleteId is cleared in closeConfirmDialog
        }
    };

    // --- Pagination Handler ---
    const handlePageChange = (newPage: number) => {
        // Basic validation, though MUI pagination handles this better
        if (newPage >= 1 && newPage <= (clientsResponse?.last_page ?? 1) && newPage !== currentPage) {
            setCurrentPage(newPage);
        }
    };

    // --- Render Component ---
    return (
        <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-900 min-h-screen"> {/* Added dark bg and min height */}
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
                    {t('clients:pageTitle')}
                </h1>
                <button
                    onClick={() => openModal()} // Open modal in 'add' mode
                    className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:border-blue-900 focus:ring focus:ring-blue-300 disabled:opacity-25 transition dark:focus:ring-blue-700"
                >
                    <PlusIcon className="h-5 w-5 me-2" />
                    {t('clients:addClient')}
                </button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center items-center py-10">
                    <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ms-3 text-gray-600 dark:text-gray-400">{t('common:loading')}</span>
                </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
                    <strong className="font-bold">{t('common:error')}!</strong>
                    <span className="block sm:inline ms-2">{error}</span>
                </div>
            )}

            {/* Content Area: Table and Pagination */}
            {!isLoading && !error && clientsResponse && (
                <div className="space-y-6">
                    {/* --- Integrate ClientsTable --- */}
                    <ClientsTable
                        clients={clientsResponse.data}
                        onEdit={openModal} // Pass the handler directly
                        onDelete={openConfirmDialog} // Pass the handler to open confirmation
                        isLoading={isDeleting} // Indicate loading state during delete actions
                    />

                    {/* --- Basic Tailwind Pagination --- */}
                    {clientsResponse.last_page > 1 && (
                         <nav className="flex justify-center items-center pt-4" aria-label="Pagination">
                             <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || isDeleting}
                                className="relative inline-flex items-center px-3 py-1 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('common:previous')}
                            </button>
                            <span className="px-3 py-1 text-sm text-gray-800 dark:text-gray-100">
                                {t('common:page')} {currentPage} / {clientsResponse.last_page}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === clientsResponse.last_page || isDeleting}
                                className="relative inline-flex items-center px-3 py-1 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('common:next')}
                            </button>
                         </nav>
                     )}
                </div>
            )}
            {/* Render if no clients found after loading */}
             {!isLoading && !error && !clientsResponse?.data.length && (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                     {t('clients:noClients')}
                 </div>
             )}


            {/* --- Integrate ClientFormModal --- */}
            {/* Render the modal component, passing state and handlers */}
            <ClientFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                clientToEdit={editingClient}
                onSaveSuccess={handleSaveSuccess}
            />

            {/* --- Basic Tailwind Confirmation Dialog --- */}
            {isConfirmOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" aria-labelledby="confirm-dialog-title" role="dialog" aria-modal="true">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                         <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('common:confirmDeleteTitle')}</h3>
                         <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{t('clients:deleteClientConfirm')}</p>
                         <div className="flex justify-end gap-3">
                             <button
                                 type="button"
                                 onClick={closeConfirmDialog}
                                 disabled={isDeleting}
                                 className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
                             >
                                 {t('common:cancel')}
                             </button>
                             <button
                                 type="button"
                                 onClick={handleDeleteConfirm}
                                 disabled={isDeleting}
                                 className={`inline-flex items-center px-4 py-2 rounded-md text-white ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition`}
                             >
                                  {isDeleting && (
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                  )}
                                 {t('common:delete')}
                             </button>
                         </div>
                     </div>
                 </div>
             )}

             {/* --- Basic Tailwind Notification (Snackbar) --- */}
             {notification && (
                 // Added transition classes
                 <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-md shadow-lg text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} transition-opacity duration-300 ease-out`}
                      role="alert"
                 >
                     <div className="flex items-center">
                         {notification.type === 'success' ?
                           <CheckCircleIcon className="h-5 w-5 me-2"/> :
                           <ExclamationTriangleIcon className="h-5 w-5 me-2"/>
                         }
                         {notification.message}
                          {/* Optional close button */}
                         <button onClick={() => setNotification(null)} className="ms-4 text-xl font-semibold leading-none opacity-70 hover:opacity-100">×</button>
                     </div>
                 </div>
             )}

        </div> // End main page container
    );
};

export default ClientsPage;