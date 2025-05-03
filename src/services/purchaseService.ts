// src/services/purchaseService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import { AxiosError } from 'axios';
// Assuming PaginatedResponse is defined/exported from clientService or a shared types file
import { PaginatedResponse } from './clientService';
import { Product } from './productService'; // For purchase item details
import { Supplier } from './supplierService'; // For purchase header details

// --- Interfaces ---

// Matches PurchaseItemResource structure
export interface PurchaseItem {
    id: number;
    product_id: number;
    product_name?: string; // Included if eager loaded
    product_sku?: string;  // Included if eager loaded
    quantity: number;
    unit_cost: string;     // Comes as string
    total_cost: string;    // Comes as string
    // created_at?: string; // Optional
    product?: Product; // Optional: Full product details if loaded
}

// Matches PurchaseResource structure
export interface Purchase {
    id: number;
    supplier_id: number | null; // Can be null if supplier deleted + set null constraint
    supplier_name?: string; // Included if eager loaded
    user_id: number | null; // Can be null if user deleted + set null constraint
    user_name?: string; // Included if eager loaded
    purchase_date: string; // Format YYYY-MM-DD
    reference_number: string | null;
    status: 'received' | 'pending' | 'ordered';
    total_amount: string; // Comes as string
    notes: string | null;
    created_at: string;
    items?: PurchaseItem[]; // Array of items, included if eager loaded (e.g., on show)
    supplier?: Supplier; // Optional: Full supplier details if loaded
}

// Data structure for creating a new purchase (matches backend validation)
export interface CreatePurchaseData {
    supplier_id: number;
    purchase_date: string; // Format YYYY-MM-DD
    reference_number?: string | null;
    status: 'received' | 'pending' | 'ordered';
    notes?: string | null;
    items: Array<{
        product_id: number;
        quantity: number;
        unit_cost: number | string; // Allow string for input, backend handles numeric
    }>;
}

// --- Service Object ---
const purchaseService = {

    /**
     * Get paginated list of purchases.
     */
    getPurchases: async (
        page: number = 1,
        search: string = '',
        status: string = '',
        startDate: string = '',
        endDate: string = ''
    ): Promise<PaginatedResponse<Purchase>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await apiClient.get<PaginatedResponse<Purchase>>(`/purchases?${params.toString()}`);
            console.log('getPurchases response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching purchases:', error);
            throw error;
        }
    },

    /**
     * Get a single purchase by ID (usually includes items).
     */
    getPurchase: async (id: number): Promise<Purchase> => {
        try {
            // Assuming API returns { purchase: { ... } }
            const response = await apiClient.get<{ purchase: Purchase }>(`/purchases/${id}`);
            return response.data.purchase; // Adjust if needed
        } catch (error) {
            console.error(`Error fetching purchase ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create a new purchase.
     */
    createPurchase: async (purchaseData: CreatePurchaseData): Promise<Purchase> => {
        try {
            // Assuming API returns { purchase: { ... } }
            const response = await apiClient.post<{ purchase: Purchase }>('/purchases', purchaseData);
            return response.data.purchase; // Adjust if needed
        } catch (error) {
            console.error('Error creating purchase:', error);
            throw error;
        }
    },

    /**
     * Delete a purchase (if allowed by backend).
     */
    deletePurchase: async (id: number): Promise<void> => {
        try {
            // Note: Backend controller might return 403 Forbidden
            await apiClient.delete(`/purchases/${id}`);
        } catch (error) {
            console.error(`Error deleting purchase ${id}:`, error);
            // Check for specific status codes if needed
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                 // Handle forbidden error specifically if desired
                 console.warn("Deletion forbidden by server policy.");
                 throw new Error(getErrorMessage(error, 'Deleting purchases is not allowed.')); // Throw specific message
            }
            throw error; // Rethrow other errors
        }
    },

    // --- Error Helpers ---
    getValidationErrors,
    getErrorMessage,
};

export default purchaseService;

// Export types
export type { PurchaseItem as PurchaseItemType, Purchase as PurchaseType, CreatePurchaseData as CreatePurchaseDataType };

// Re-exporting AxiosError might be useful if components need it
import { AxiosError as GlobalAxiosError } from 'axios';
export type { GlobalAxiosError };