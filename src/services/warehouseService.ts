import apiClient, { getValidationErrors, getErrorMessage } from "../lib/axios";

export interface Warehouse {
  id: number;
  name: string;
  address?: string;
  contact_info?: string;
  header_text?: string;
  footer_text?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const warehouseService = {
  getAll: async (): Promise<Warehouse[]> => {
    const response = await apiClient.get("/warehouses");
    return response.data.data;
  },

  getById: async (id: number): Promise<Warehouse> => {
    const response = await apiClient.get(`/warehouses/${id}`);
    return response.data.data;
  },

  create: async (data: Partial<Warehouse>): Promise<Warehouse> => {
    const response = await apiClient.post("/warehouses", data);
    return response.data; // Resource returns object directly or wrapped in data
  },

  update: async (id: number, data: Partial<Warehouse>): Promise<Warehouse> => {
    const response = await apiClient.put(`/warehouses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/warehouses/${id}`);
  },

  getValidationErrors,
  getErrorMessage,
};
