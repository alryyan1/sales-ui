import apiClient, { getErrorMessage } from "../lib/axios";
import { PaginatedResponse } from "./clientService";
import { Product } from "./productService";
import { User } from "./authService";
import { Warehouse } from "./warehouseService";
import { Supplier } from "./supplierService";

export interface TransitOrderItem {
  id: number;
  transit_order_id: number;
  product_id: number;
  quantity: number;
  is_received: boolean;
  product?: Product;
  current_stock_at_warehouse?: number;
}

export interface TransitOrder {
  id: number;
  order_number: number | null;
  order_date: string | null;
  warehouse_id: number;
  supplier_id: number | null;
  eta_date: string | null;
  notes?: string | null;
  status: string;
  user_id?: number | null;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  supplier?: Supplier;
  user?: User;
  items?: TransitOrderItem[];
}

export interface CreateTransitOrderItemData {
  product_id: number;
  quantity: number;
}

export interface CreateTransitOrderData {
  warehouse_id: number;
  supplier_id?: number;
  order_date?: string;
  eta_date?: string;
  notes?: string;
  items: CreateTransitOrderItemData[];
}

const transitOrderService = {
  getAll: async (
    page = 1,
    perPage = 15,
    filters?: { warehouse_id?: number }
  ): Promise<PaginatedResponse<TransitOrder>> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("per_page", perPage.toString());
    if (filters?.warehouse_id) {
      params.append("warehouse_id", filters.warehouse_id.toString());
    }
    const response = await apiClient.get<PaginatedResponse<TransitOrder>>(
      `/transit-orders?${params}`
    );
    return response.data;
  },

  create: async (data: CreateTransitOrderData): Promise<void> => {
    try {
      await apiClient.post("/transit-orders", data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default transitOrderService;
