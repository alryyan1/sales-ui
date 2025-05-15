// src/services/saleService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import axios, { AxiosError } from 'axios';
// Assuming PaginatedResponse is defined/exported from clientService or a shared types file
import { PaginatedResponse } from './clientService'; // Or adjust import path
import { Product } from './productService'; // For sale item details
import { Client } from './clientService';   // For sale header details
import { User } from './authService';     // For sale header details

// --- Interfaces ---

// Matches SaleItemResource structure from Laravel
export interface SaleItem {
    id: number;
    sale_id: number; // Often included by backend resource
    product_id: number;
    product_name?: string; // Included if eager loaded
    product_sku?: string;  // Included if eager loaded
    quantity: number;
    unit_price: string | number; // Allow string/number flexibility from API/form
    total_price: string | number; // Allow string/number flexibility
    // created_at?: string;
    product?: Product; // Optional: Full product details if loaded
}


// Interface for a single Payment (matches PaymentResource)
export interface Payment {
    id: number;
    sale_id: number;
    user_id: number | null;
    user_name?: string; // If eager loaded
    method: 'cash' | 'visa' | 'mastercard' | 'bank_transfer' | 'mada' | 'other' | 'store_credit'; // Match your enum
    amount: string | number; // Comes as string from API (decimal), number after parsing
    payment_date: string; // YYYY-MM-DD
    reference_number: string | null;
    notes: string | null;
    created_at: string;
}

// Update Sale interface to include payments
export interface Sale {
    id: number;
    client_id: number | null;
    client_name?: string;
    user_id: number | null; // User who made the sale
    user_name?: string;
    sale_date: string;
    invoice_number: string | null;
    status: 'completed' | 'pending' | 'draft' | 'cancelled';
    total_amount: string | number;
    paid_amount: string | number; // This is the sum of payments
    due_amount?: number | string;
    notes: string | null;
    created_at: string;
    updated_at?: string;
    items?: SaleItem[];
    payments?: Payment[]; // <-- Array of payments
    client?: Client;
    user?: User; // User who made the sale
}


// Data structure for creating a new sale (matches backend validation requirements)
export interface CreateSaleData {
    client_id: number;
    sale_date: string; // Format YYYY-MM-DD expected by backend
    invoice_number?: string | null;
    status: 'completed' | 'pending' | 'draft' | 'cancelled';
    paid_amount: number | string; // Backend validation handles numeric
    notes?: string | null;
    items: Array<{
        // No 'id' for creating new items
        product_id: number;
        quantity: number; // Backend validation expects integer
        unit_price: number | string; // Backend validation handles numeric
    }>;
}

// Data structure for updating an existing sale (includes item IDs)
export interface UpdateSaleData {
    // Include fields that can be updated in the header
    client_id?: number;
    sale_date?: string; // Format YYYY-MM-DD
    invoice_number?: string | null;
    status?: 'completed' | 'pending' | 'draft' | 'cancelled';
    paid_amount?: number | string;
    notes?: string | null;
    // Items array includes existing item IDs for updates/deletions
    items: Array<{
        id?: number | null; // ID of existing item to update, null/missing for new item
        product_id: number;
        quantity: number;
        unit_price: number | string;
        // _destroy?: boolean; // Alternative way to mark for deletion if backend supports it
    }>;
}

export interface ReturnableSaleItem extends SaleItem { // Extends SaleItem
    max_returnable_quantity: number;
}

// --- Service Object ---
const saleService = {

    /**
     * Get paginated list of sales.
     * @param page Page number.
     * @param search Search term (e.g., invoice number, client name).
     * @param status Filter by sale status.
     * @param startDate Filter by start date (YYYY-MM-DD).
     * @param endDate Filter by end date (YYYY-MM-DD).
     * @param limit Items per page.
     * @returns Promise resolving to paginated sales data.
     */
    getSales: async (
        page: number = 1,
        search: string = '',
        status: string = '',
        startDate: string = '',
        endDate: string = '',
        limit: number = 15,
        clientId: number | null = null,
    ): Promise<PaginatedResponse<Sale>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('per_page', limit.toString());
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (clientId) params.append('client_id', clientId.toString());

            const response = await apiClient.get<PaginatedResponse<Sale>>(`/sales?${params.toString()}`);
            console.log('getSales response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching sales:', error);
            throw error;
        }
    },

    /**
     * Get a single sale by ID (usually includes items).
     */
    getSale: async (id: number): Promise<Sale> => {
        try {
            // Assuming API returns { sale: { ... } } and eager loads relations
            const response = await apiClient.get<{ sale: Sale }>(`/sales/${id}`);
            return response.data.sale; // Adjust if response structure differs
        } catch (error) {
            console.error(`Error fetching sale ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create a new sale.
     */
    createSale: async (saleData: CreateSaleData): Promise<Sale> => {
        try {
            // Assuming API returns { sale: { ... } } after successful creation
            const response = await apiClient.post<{ sale: Sale }>('/sales', saleData);
            return response.data.sale; // Adjust if needed
        } catch (error) {
            console.error('Error creating sale:', error);
            // Check specifically for stock/validation errors if needed
            if (isAxiosError(error) && error.response?.status === 422) {
                console.warn("Validation error during sale creation (check stock?):", error.response.data);
            }
            throw error; // Rethrow for component/form handling
        }
    },

    /**
     * Update an existing sale.
     * NOTE: Ensure the backend '/sales/{sale}' PUT/PATCH route is enabled and implemented.
     */
    updateSale: async (id: number, saleData: UpdateSaleData): Promise<Sale> => {
        try {
            // Assuming API returns { sale: { ... } } after successful update
            const response = await apiClient.put<{ sale: Sale }>(`/sales/${id}`, saleData);
            return response.data.sale; // Adjust if needed
        } catch (error) {
            console.error(`Error updating sale ${id}:`, error);
             if (axios.isAxiosError(error) && error.response?.status === 422) {
                 console.warn(`Validation error during sale update (check stock?):`, error.response.data);
             }
            throw error;
        }
    },


    /**
     * Delete a sale (if allowed by backend).
     */
    deleteSale: async (id: number): Promise<void> => {
        try {
            // Note: Backend controller might return 403 Forbidden or handle stock reversal
            await apiClient.delete(`/sales/${id}`);
        } catch (error) {
            console.error(`Error deleting sale ${id}:`, error);
            // Provide more specific feedback for forbidden deletions
            if (isAxiosError(error) && error.response?.status === 403) {
                 console.warn("Deletion forbidden by server policy.");
                 // Throw a new error with a translated message
                 throw new Error(getErrorMessage(error, 'Deleting sales records is not allowed.'));
            }
            // Rethrow other errors
            throw error;
        }
    },
  /**
     * Get items from an original sale that are eligible for return.
     */
    getReturnableItems: async (originalSaleId: number): Promise<ReturnableSaleItem[]> => {
        try {
            // Backend returns a flat array of SaleItem resources with an added 'max_returnable_quantity' field
            const response = await apiClient.get<{ data: ReturnableSaleItem[] }>(`/sales/${originalSaleId}/returnable-items`);
            return response.data.data ?? response.data; // Handle if 'data' wrapper is present or not
        } catch (error) {
            console.error(`Error fetching returnable items for sale ${originalSaleId}:`, error);
            throw error;
        }
    },

    // --- Error Helpers (Imported from axios.ts) ---
    getValidationErrors,
    getErrorMessage,
};

// Re-usable Axios error check function (define or import)
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}


export default saleService;

// Export types for use in components
export type {
    SaleItem as SaleItemType,
    Sale as SaleType,
    CreateSaleData as CreateSaleDataType,
    UpdateSaleData as UpdateSaleDataType
};