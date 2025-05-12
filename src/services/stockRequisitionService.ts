// src/services/stockRequisitionService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import { AxiosError } from 'axios';
import { PaginatedResponse } from './clientService'; // Assuming shared type
import { Product } from './productService';
import { User } from './authService';
import { PurchaseItem } from './purchaseService'; // For batch info if needed in response

// --- Interfaces ---

// For a single item within a requisition (as returned by API or used in forms)
export interface StockRequisitionItem {
    id: number;
    stock_requisition_id: number;
    product_id: number;
    product_name?: string; // If eager loaded
    product_sku?: string;  // If eager loaded
    requested_quantity: number;
    issued_quantity: number;
    issued_from_purchase_item_id?: number | null; // Batch it was issued from
    issued_batch_number?: string | null;         // Batch number for display
    status: string; // 'pending', 'issued', 'rejected_item', etc.
    item_notes?: string | null;
    product?: Pick<Product, 'id' | 'name' | 'sku' | 'stock_quantity'>; // Eager loaded product info
    issuedFromPurchaseItemBatch?: PurchaseItem
    created_at?: string;
    updated_at?: string;
}

// For the main stock requisition record (as returned by API)
export interface StockRequisition {
    id: number;
    requester_user_id: number;
    requester_name?: string; // If eager loaded
    approved_by_user_id: number | null;
    approver_name?: string; // If eager loaded
    department_or_reason: string | null;
    notes: string | null;
    status: 'pending_approval' | 'approved' | 'rejected' | 'partially_issued' | 'issued' | 'cancelled';
    request_date: string; // YYYY-MM-DD
    issue_date: string | null; // YYYY-MM-DD
    created_at: string;
    updated_at?: string;
    items?: StockRequisitionItem[]; // Eager loaded items
}
type StockRequisitionResponse = {
      data :StockRequisition
}
// Data for creating a new stock requisition (frontend to backend)
export interface CreateStockRequisitionData {
    department_or_reason?: string | null;
    request_date: string; // YYYY-MM-DD
    notes?: string | null;
    items: Array<{
        product_id: number;
        requested_quantity: number;
        item_notes?: string | null;
    }>;
}

// Data for processing/issuing items in a requisition (frontend to backend)
export interface ProcessRequisitionItemData {
    id: number; // ID of the StockRequisitionItem to update
    issued_quantity: number;
    issued_from_purchase_item_id?: number | null; // Which batch to issue from
    status?: 'issued' | 'rejected_item' | 'pending'; // Item-level status update
    item_notes?: string | null; // Notes from manager for this item
}
export interface ProcessRequisitionData {
    status: 'approved' | 'rejected' | 'partially_issued' | 'issued' | 'cancelled'; // Overall requisition status
    issue_date?: string | null; // YYYY-MM-DD, required if status is 'issued' or 'partially_issued'
    notes?: string | null; // Overall notes from manager
    items: ProcessRequisitionItemData[]; // Array of items being processed
}


// --- Service Object ---
const stockRequisitionService = {

    /**
     * Create a new stock requisition.
     */
    createRequisition: async (data: CreateStockRequisitionData): Promise<StockRequisition> => {
        try {
            // Assuming backend returns { stock_requisition: StockRequisition }
            const response = await apiClient.post<StockRequisition >('/stock-requisitions', data);
            return response.data; // Adjust if API response differs
        } catch (error) {
            console.error('Error creating stock requisition:', error);
            throw error;
        }
    },

    /**
     * Get a paginated list of stock requisitions.
     */
    getRequisitions: async (
        page: number = 1,
        limit: number = 15,
        filters: {
            status?: string;
            requesterId?: number;
            startDate?: string; // YYYY-MM-DD
            endDate?: string;   // YYYY-MM-DD
            search?: string;    // Search term for reason/notes
        } = {}
    ): Promise<PaginatedResponse<StockRequisition>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('per_page', limit.toString());
            if (filters.status) params.append('status', filters.status);
            if (filters.requesterId) params.append('requester_user_id', filters.requesterId.toString());
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);
            if (filters.search) params.append('search', filters.search);

            const response = await apiClient.get<PaginatedResponse<StockRequisition>>(`/stock-requisitions?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching stock requisitions:', error);
            throw error;
        }
    },

    /**
     * Get details of a single stock requisition.
     */
    getRequisition: async (id: number): Promise<StockRequisition> => {
        try {
             // Assuming backend returns { stock_requisition: StockRequisition }
            const response = await apiClient.get< StockRequisitionResponse >(`/stock-requisitions/${id}`);
            return response.data.data; // Adjust if needed
        } catch (error) {
            console.error(`Error fetching stock requisition ${id}:`, error);
            throw error;
        }
    },

    /**
     * Process a stock requisition (approve/issue/reject items).
     * This calls the dedicated processing endpoint.
     */
    processRequisition: async (id: number, data: ProcessRequisitionData): Promise<StockRequisition> => {
        try {
            // Assuming backend returns { stock_requisition: StockRequisition }
            const response = await apiClient.post<{ stock_requisition: StockRequisition }>(`/stock-requisitions/${id}/process`, data);
            return response.data.stock_requisition; // Adjust if needed
        } catch (error) {
            console.error(`Error processing stock requisition ${id}:`, error);
            if (isAxiosError(error) && error.response?.status === 422) {
                console.warn("Validation error during requisition processing (check stock?):", error.response.data);
            }
            throw error;
        }
    },

    /**
     * Cancel a pending stock requisition (by requester or admin).
     * Might be a specific endpoint or part of a generic update status method.
     */
    cancelRequisition: async (id: number): Promise<StockRequisition> => {
        try {
            // Example: Using a specific endpoint for cancellation
            // const response = await apiClient.post<{ stock_requisition: StockRequisition }>(`/stock-requisitions/${id}/cancel`);
            // Or using a general update if backend supports it:
            const response = await apiClient.patch<{ stock_requisition: StockRequisition }>(`/stock-requisitions/${id}/status`, { status: 'cancelled' }); // Example endpoint
            return response.data.stock_requisition;
        } catch (error) {
            console.error(`Error cancelling stock requisition ${id}:`, error);
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

export default stockRequisitionService;
