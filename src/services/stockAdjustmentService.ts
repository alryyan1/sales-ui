// src/services/stockAdjustmentService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import axios, { AxiosError } from 'axios';
import { PaginatedResponse } from './clientService'; // Assuming shared type
import { Product } from './productService';
import { User } from './authService';
import { PurchaseItem } from './purchaseService'; // For batch info

// --- Interfaces ---

// Data structure for creating a new adjustment
export interface CreateStockAdjustmentData {
    product_id: number;
    purchase_item_id?: number | null; // Optional batch ID
    quantity_change: number; // Positive or negative integer
    reason: string;
    notes?: string | null;
}

// Data structure for the adjustment log record from API
export interface StockAdjustment {
    id: number;
    product_id: number;
    purchase_item_id: number | null;
    user_id: number | null;
    quantity_change: number;
    quantity_before: number;
    quantity_after: number;
    reason: string;
    notes: string | null;
    created_at: string; // ISO date string
    // Include related data if eager loaded by backend
    product?: Pick<Product, 'id' | 'name' | 'sku'>; // Select specific fields
    user?: Pick<User, 'id' | 'name'>;
    purchaseItemBatch?: Pick<PurchaseItem, 'id' | 'batch_number'>; // Select specific fields
}

// --- Service Object ---
const stockAdjustmentService = {

    /**
     * Create a new stock adjustment.
     * Requires 'adjust-stock' permission.
     */
    createAdjustment: async (adjustmentData: CreateStockAdjustmentData): Promise<{adjustment: StockAdjustment, product: Product}> => { // Return adjustment log and updated product
        try {
            // Backend endpoint likely returns the log and updated product state
            const response = await apiClient.post<{adjustment: StockAdjustment, product: Product}>('/stock-adjustments', adjustmentData);
            return response.data;
        } catch (error) {
            console.error('Error creating stock adjustment:', error);
            // Handle specific validation errors (e.g., negative stock result)
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                console.warn("Validation error during stock adjustment:", error.response.data);
            }
            throw error; // Rethrow for form handling
        }
    },

    /**
     * Get paginated list of stock adjustments (history).
     * Requires 'view-stock-adjustments' permission.
     */
    getAdjustments: async (
        page: number = 1,
        limit: number = 20,
        // Add filter parameters if implemented on backend (productId, userId, dateRange, reason)
        productId?: number | null,
        userId?: number | null,
        startDate?: string | null, // YYYY-MM-DD
        endDate?: string | null,   // YYYY-MM-DD
    ): Promise<PaginatedResponse<StockAdjustment>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('per_page', limit.toString());
            if (productId) params.append('product_id', productId.toString());
            if (userId) params.append('user_id', userId.toString());
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await apiClient.get<PaginatedResponse<StockAdjustment>>(`/stock-adjustments?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching stock adjustments:', error);
            throw error;
        }
    },

    // --- Error Helpers ---
    getValidationErrors,
    getErrorMessage,
};

// Re-usable Axios error check function
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}


export default stockAdjustmentService;
