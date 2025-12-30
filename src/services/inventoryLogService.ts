// src/services/inventoryLogService.ts
import apiClient, { getErrorMessage, ApiErrorResponse } from "../lib/axios";
import { PaginatedResponse } from "./clientService";

export interface InventoryLogEntry {
  transaction_date: string;
  type: "purchase" | "sale" | "adjustment" | "requisition_issue" | string;
  product_id: number;
  product_name: string;
  product_sku: string | null;
  batch_number: string | null;
  quantity_change: number;
  document_reference: string | null;
  document_id: number;
  user_name: string | null;
  reason_notes: string | null;
  warehouse_id: number;
  warehouse_name: string;
}

const inventoryLogService = {
  getInventoryLog: async (
    page: number = 1,
    limit: number = 25,
    filters: {
      startDate?: string | null;
      endDate?: string | null;
      productId?: number | null;
      type?: string | null;
      search?: string | null;
      warehouseId?: number | null;
    } = {}
  ): Promise<PaginatedResponse<InventoryLogEntry>> => {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("per_page", limit.toString());
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.productId)
        params.append("product_id", filters.productId.toString());
      if (filters.type) params.append("type", filters.type);
      if (filters.search) params.append("search", filters.search);
      if (filters.warehouseId)
        params.append("warehouse_id", filters.warehouseId.toString());

      const response = await apiClient.get<
        PaginatedResponse<InventoryLogEntry>
      >(`/reports/inventory-log?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching inventory log:", error);
      throw error;
    }
  },

  generatePdf: async (
    filters: {
      startDate?: string | null;
      endDate?: string | null;
      productId?: number | null;
      type?: string | null;
      search?: string | null;
      warehouseId?: number | null;
    } = {}
  ): Promise<Blob> => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.productId)
        params.append("product_id", filters.productId.toString());
      if (filters.type) params.append("type", filters.type);
      if (filters.search) params.append("search", filters.search);
      if (filters.warehouseId)
        params.append("warehouse_id", filters.warehouseId.toString());

      const response = await apiClient.get(
        `/reports/inventory-log/pdf?${params.toString()}`,
        {
          responseType: "blob",
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error generating inventory log PDF:", error);
      throw error;
    }
  },

  getErrorMessage,
};

export default inventoryLogService;
