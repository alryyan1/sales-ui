import apiClient, { getErrorMessage } from "../lib/axios";
import { PaginatedResponse } from "./clientService";
import { Product } from "./productService";
import { User } from "./authService";
import { Warehouse } from "./warehouseService";

export interface StockTransferItem {
  id: number;
  stock_transfer_id: number;
  product_id: number;
  quantity: number;
  product?: Product;
}

export interface StockTransfer {
  id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  transfer_date: string;
  notes?: string | null;
  user_id?: number | null;
  created_at: string;
  updated_at: string;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  user?: User;
  items?: StockTransferItem[];
}

export interface CreateStockTransferItemData {
  product_id: number;
  quantity: number;
}

export interface CreateStockTransferData {
  from_warehouse_id: number;
  to_warehouse_id: number;
  transfer_date: string;
  notes?: string;
  items: CreateStockTransferItemData[];
}

const stockTransferService = {
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

  create: async (data: CreateStockTransferData): Promise<void> => {
    try {
      await apiClient.post("/stock-transfers", data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default stockTransferService;
