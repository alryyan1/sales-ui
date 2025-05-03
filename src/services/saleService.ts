// src/services/saleService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import { AxiosError } from 'axios';
// Assuming PaginatedResponse is defined/exported from clientService or a shared types file
import { PaginatedResponse } from './clientService'; // Or adjust import path
import { Product } from './productService';
import { Client } from './clientService'; // Use Client type

// --- Interfaces ---

// Matches SaleItemResource structure
export interface SaleItem {
    id: number;
    product_id: number;
    product_name?: string;
    product_sku?: string;
    quantity: number;
    unit_price: string; // Comes as string
    total_price: string; // Comes as string
    product?: Product; // Optional full details
}

// Matches SaleResource structure
export interface Sale {
    id: number;
    client_id: number | null;
    client_name?: string;
    user_id: number | null;
    user_name?: string;
    sale_date: string; // Format YYYY-MM-DD
    invoice_number: string | null;
    status: 'completed' | 'pending' | 'draft' | 'cancelled';
    total_amount: string;
    paid_amount: string;
    due_amount?: number; // Calculated field from backend resource
    notes: string | null;
    created_at: string;
    updated_at?: string;
    items?: SaleItem[]; // Included if eager loaded
    client?: Client; // Optional full details
}

// Data structure for creating a new sale
export interface CreateSaleData {
    client_id: number;
    sale_date: string; // Format YYYY-MM-DD
    invoice_number?: string | null;
    status: 'completed' | 'pending' | 'draft' | 'cancelled';
    paid_amount: number | string; // Allow string for input
    notes?: string | null;
    items: Array<{
        product_id: number;
        quantity: number;
        unit_price: number | string; // Allow string for input
    }>;
}

// --- Service Object ---
const saleService = {

    /**
     * Get paginated list of sales.
     */
    getSales: async (
        page: number = 1,
        search: string = '',
        status: string = '',
        startDate: string = '',
        endDate: string = ''
    ): Promise<PaginatedResponse<Sale>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

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
            // Assuming API returns { sale: { ... } }
            const response = await apiClient.get<{ sale: Sale }>(`/sales/${id}`);
            return response.data.sale; // Adjust if needed
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
            // Assuming API returns { sale: { ... } }
            const response = await apiClient.post<{ sale: Sale }>('/sales', saleData);
            return response.data.sale; // Adjust if needed
        } catch (error) {
            console.error('Error creating sale:', error);
            // Important: Handle 422 specifically for stock errors if needed
             if (axios.isAxiosError(error) && error.response?.status === 422) {
                 console.warn("Validation error during sale creation (could be stock related):", error.response.data);
             }
            throw error; // Rethrow for component handling
        }
    },

    /**
     * Delete a sale (if allowed by backend).
     */
    deleteSale: async (id: number): Promise<void> => {
        try {
            // Note: Backend controller might return 403 Forbidden
            await apiClient.delete(`/sales/${id}`);
        } catch (error) {
            console.error(`Error deleting sale ${id}:`, error);
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                 console.warn("Deletion forbidden by server policy.");
                 throw new Error(getErrorMessage(error, 'Deleting sales records is not allowed.'));
            }
            throw error;
        }
    },

    // --- Error Helpers ---
    getValidationErrors,
    getErrorMessage,
};

// Add axios check function if not globally available or imported from axios.ts
function axios.isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}


export default saleService;

// Export types
export type { SaleItem as SaleItemType, Sale as SaleType, CreateSaleData as CreateSaleDataType };