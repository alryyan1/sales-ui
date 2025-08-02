// src/services/inventoryLogService.ts
import apiClient, { getErrorMessage, ApiErrorResponse } from '../lib/axios';
import { PaginatedResponse } from './clientService'; // Assuming shared type

export interface InventoryLogEntry {
    transaction_date: string; // YYYY-MM-DD or full datetime string
    type: 'purchase' | 'sale' | 'adjustment' | 'requisition_issue' | string; // Be flexible
    product_id: number;
    product_name: string;
    product_sku: string | null;
    batch_number: string | null;
    quantity_change: number; // Positive for in, negative for out
    document_reference: string | null; // PO#, Invoice#, Adjustment Reason, REQ ID
    document_id: number; // ID of the source document (Sale ID, Purchase ID etc.)
    user_name: string | null; // User who performed action
    reason_notes: string | null; // Additional notes
}

const inventoryLogService = {
    getInventoryLog: async (
        page: number = 1,
        limit: number = 25,
        filters: {
            startDate?: string | null; // YYYY-MM-DD
            endDate?: string | null;   // YYYY-MM-DD
            productId?: number | null;
            type?: string | null;
            search?: string | null;
        } = {}
    ): Promise<PaginatedResponse<InventoryLogEntry>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('per_page', limit.toString());
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);
            if (filters.productId) params.append('product_id', filters.productId.toString());
            if (filters.type) params.append('type', filters.type);
            if (filters.search) params.append('search', filters.search);

            const response = await apiClient.get<PaginatedResponse<InventoryLogEntry>>(`/reports/inventory-log?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching inventory log:', error);
            throw error;
        }
    },

    generatePdf: async (filters: {
        startDate?: string | null;
        endDate?: string | null;
        productId?: number | null;
        type?: string | null;
        search?: string | null;
    } = {}): Promise<Blob> => {
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);
            if (filters.productId) params.append('product_id', filters.productId.toString());
            if (filters.type) params.append('type', filters.type);
            if (filters.search) params.append('search', filters.search);

            const response = await apiClient.get(`/reports/inventory-log/pdf?${params.toString()}`, {
                responseType: 'blob',
            });
            return response.data;
        } catch (error) {
            console.error('Error generating inventory log PDF:', error);
            throw error;
        }
    },

    getErrorMessage, // Re-export if needed
};

export default inventoryLogService;