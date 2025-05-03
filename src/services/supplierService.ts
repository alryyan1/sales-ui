// src/services/supplierService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios'; // Import base client and helpers
import { AxiosError } from 'axios';

// --- Interfaces ---

// Matches SupplierResource structure from Laravel
export interface Supplier {
    id: number;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    // website?: string | null; // Add if included in backend
    // notes?: string | null;   // Add if included in backend
    created_at: string;
    updated_at: string;
}

// Data type for creating/updating (excluding system-generated fields)
export type SupplierFormData = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>;

// Re-use PaginatedResponse type (or define it here if not exported globally)
// Assuming PaginatedResponse is exported from clientService or a shared types file
import { PaginatedResponse } from './clientService'; // Or define globally/import from shared types

// --- Service Object ---
const supplierService = {

    /**
     * Get paginated list of suppliers, optionally with search.
     */
    getSuppliers: async (page: number = 1, search: string = ''): Promise<PaginatedResponse<Supplier>> => {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append('page', page.toString());
            if (search) {
                params.append('search', search);
            }

            const response = await apiClient.get<PaginatedResponse<Supplier>>(`/suppliers?${params.toString()}`);
            console.log('getSuppliers response:', response.data); // Debug log
            return response.data;
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            throw error; // Rethrow for component handling
        }
    },

    /**
     * Get a single supplier by ID.
     */
    getSupplier: async (id: number): Promise<Supplier> => {
        try {
            // Assuming API returns { supplier: { ... } }
            const response = await apiClient.get<{ supplier: Supplier }>(`/suppliers/${id}`);
            return response.data.supplier; // Adjust if API returns supplier object directly
        } catch (error) {
            console.error(`Error fetching supplier ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create a new supplier.
     */
    createSupplier: async (supplierData: SupplierFormData): Promise<Supplier> => {
        try {
             // Assuming API returns { supplier: { ... } }
            const response = await apiClient.post<{ supplier: Supplier }>('/suppliers', supplierData);
            return response.data.supplier; // Adjust if API returns supplier object directly
        } catch (error) {
            console.error('Error creating supplier:', error);
            throw error;
        }
    },

    /**
     * Update an existing supplier.
     */
    updateSupplier: async (id: number, supplierData: Partial<SupplierFormData>): Promise<Supplier> => {
        try {
            // Assuming API returns { supplier: { ... } }
            const response = await apiClient.put<{ supplier: Supplier }>(`/suppliers/${id}`, supplierData);
            return response.data.supplier; // Adjust if API returns supplier object directly
        } catch (error) {
            console.error(`Error updating supplier ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete a supplier.
     */
    deleteSupplier: async (id: number): Promise<void> => {
        try {
            await apiClient.delete(`/suppliers/${id}`);
            // No content returned on successful delete usually
        } catch (error) {
            console.error(`Error deleting supplier ${id}:`, error);
            throw error;
        }
    },

    // --- Error Helpers (imported from axios.ts) ---
    getValidationErrors,
    getErrorMessage,
};

export default supplierService;

// Export types if needed elsewhere
// export type { Supplier, SupplierFormData };