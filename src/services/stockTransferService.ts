import apiClient, { getErrorMessage } from "../lib/axios";
import { PaginatedResponse } from "./clientService";
import { Product } from "./productService";
import { User } from "./authService";
import { Warehouse } from "./warehouseService";

export interface StockTransfer {
  id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  product_id: number;
  quantity: number;
  transfer_date: string;
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
  updated_at: string;
  // Relationships
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  product?: Product;
  user?: User;
}

export interface CreateStockTransferData {
  from_warehouse_id: number;
  to_warehouse_id: number;
  product_id: number;
  quantity: number;
  transfer_date: string;
  notes?: string;
}

const stockTransferService = {
  /**
   * List stock transfers
   */
  getAll: async (
    page: number = 1,
    perPage: number = 15,
    filters?: {
      from_warehouse_id?: number;
      to_warehouse_id?: number;
      product_id?: number;
    }
  ): Promise<PaginatedResponse<StockTransfer>> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("per_page", perPage.toString());
    if (filters?.from_warehouse_id)
      params.append("from_warehouse_id", filters.from_warehouse_id.toString());
    if (filters?.to_warehouse_id)
      params.append("to_warehouse_id", filters.to_warehouse_id.toString());
    if (filters?.product_id)
      params.append("product_id", filters.product_id.toString());

    const response = await apiClient.get<PaginatedResponse<StockTransfer>>(
      `/stock-transfers?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Create a new stock transfer
   */
  create: async (data: CreateStockTransferData): Promise<StockTransfer> => {
    try {
      const response = await apiClient.post<StockTransfer>(
        "/stock-transfers",
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default stockTransferService;
