// src/services/saleReturnService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import axios, { AxiosError } from 'axios';
// Assuming PaginatedResponse is defined/exported from clientService or a shared types file
import { PaginatedResponse } from './clientService';
import { Sale, SaleItem } from './saleService'; // For SaleReturnItem details
import { Client } from './clientService';
import { User } from './authService';
import { Product } from './productService';

// --- Interfaces ---

// Matches SaleReturnItem model (what backend expects/returns for an item in a return)
export interface SaleReturnItemData {
    id?: number; // For existing return items if editing a return (less common)
    original_sale_item_id: number;
    product_id: number; // Redundant if original_sale_item_id is present, but good for clarity
    quantity_returned: number;
    condition?: string | null; // e.g., 'resellable', 'damaged'
    // unit_price and total_returned_value are usually calculated/set by backend based on original_sale_item
}

// Data structure for creating a new Sale Return (matches backend validation)
export interface CreateSaleReturnData {
    original_sale_id: number;
    return_date: string; // Format YYYY-MM-DD
    status: 'pending' | 'completed' | 'cancelled';
    return_reason?: string | null;
    notes?: string | null;
    credit_action: 'refund' | 'store_credit' | 'none';
    refunded_amount?: number | string; // String for input, number for API
    items: SaleReturnItemData[];
}

// Matches SaleReturnResource structure (what backend returns for a SaleReturn)
export interface SaleReturn {
    id: number;
    original_sale_id: number;
    client_id: number | null;
    user_id: number | null;
    return_date: string;
    return_reason: string | null;
    notes: string | null;
    total_returned_amount: string | number;
    status: 'pending' | 'completed' | 'cancelled';
    credit_action: 'refund' | 'store_credit' | 'none';
    refunded_amount: string | number;
    created_at: string;
    updated_at?: string;
    // Eager loaded relations
    client?: Pick<Client, 'id' | 'name'>;
    user?: Pick<User, 'id' | 'name'>;
    originalSale?: Pick<Sale, 'id' | 'invoice_number'>;
    items?: Array<SaleItem & { // SaleReturnItem properties
        product?: Pick<Product, 'id' | 'name' | 'sku'>;
        condition?: string | null;
        // original_sale_item_id is part of SaleReturnItemData
    }>;
}


// --- Service Object ---
const saleReturnService = {

    /**
     * Create a new sale return.
     * Requires appropriate permissions.
     */
    createSaleReturn: async (returnData: CreateSaleReturnData): Promise<SaleReturn> => {
        try {
            // Backend endpoint might return the created sale_return object
            // or just a success message with an ID.
            // Assuming it returns { sale_return: SaleReturn }
            const response = await apiClient.post<{ sale_return: SaleReturn }>('/sale-returns', returnData);
            console.log('createSaleReturn response:', response.data);
            return response.data.sale_return; // Adjust if your API returns data differently
        } catch (error) {
            console.error('Error creating sale return:', error);
            // Handle specific validation errors (e.g., quantity exceeds returnable)
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                console.warn("Validation error during sale return creation:", error.response.data);
            }
            throw error; // Rethrow for form handling in the component
        }
    },

    /**
     * Get paginated list of sale returns.
     * Requires appropriate permissions.
     */
    getSaleReturns: async (
        page: number = 1,
        limit: number = 15,
        // Add filter parameters (e.g., originalSaleId, clientId, dateRange, status)
        originalSaleId?: number | null,
        clientId?: number | null,
        startDate?: string | null,
        endDate?: string | null,
        status?: string | null,
    ): Promise<PaginatedResponse<SaleReturn>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('per_page', limit.toString());
            if (originalSaleId) params.append('original_sale_id', originalSaleId.toString());
            if (clientId) params.append('client_id', clientId.toString());
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (status) params.append('status', status);

            const response = await apiClient.get<PaginatedResponse<SaleReturn>>(`/sale-returns?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching sale returns:', error);
            throw error;
        }
    },

    /**
     * Get a single sale return by ID.
     */
    getSaleReturn: async (id: number): Promise<SaleReturn> => {
        try {
            // Assuming API returns { sale_return: { ... } }
            const response = await apiClient.get<SaleReturn >(`/sale-returns/${id}`);
            return response.data; // Adjust if needed
        } catch (error) {
            console.error(`Error fetching sale return ${id}:`, error);
            throw error;
        }
    },

    // Update and Delete for SaleReturns are less common and complex due to stock/financial implications.
    // If implemented, they need careful backend logic.
    // updateSaleReturn: async (id: number, updateData: Partial<CreateSaleReturnData>): Promise<SaleReturn> => { ... },
    // deleteSaleReturn: async (id: number): Promise<void> => { ... },


    // --- Error Helpers ---
    getValidationErrors,
    getErrorMessage,
};

// Re-usable Axios error check function
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}

export default saleReturnService;
