// src/services/scheduledSaleService.ts
import apiClient, { getValidationErrors, getErrorMessage } from "../lib/axios";
import { PaginatedResponse } from "./clientService";

export type ScheduledSaleStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type ScheduledSaleWhatsappStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped_no_template"
  | "skipped_no_phone";

export interface ScheduledSaleItem {
  id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ScheduledSale {
  id: number;
  client_id: number;
  client?: { id: number; name: string; phone: string | null };
  user_id: number;
  user_name?: string;
  scheduled_at: string;
  status: ScheduledSaleStatus;
  discount_amount: number | null;
  discount_type: "percentage" | "fixed" | null;
  notes: string | null;

  sale_id: number | null;
  sale?: { id: number; number: number | null } | null;

  error_message: string | null;
  executed_at: string | null;

  whatsapp_customer_status: ScheduledSaleWhatsappStatus;
  whatsapp_customer_error: string | null;
  whatsapp_customer_sent_at: string | null;

  whatsapp_owner_status: ScheduledSaleWhatsappStatus;
  whatsapp_owner_error: string | null;
  whatsapp_owner_sent_at: string | null;

  items?: ScheduledSaleItem[];

  created_at: string;
  updated_at?: string;
}

export interface ScheduledSaleItemInput {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateScheduledSaleData {
  client_id: number;
  scheduled_at: string; // ISO datetime
  discount_amount?: number | null;
  discount_type?: "percentage" | "fixed" | null;
  notes?: string | null;
  items: ScheduledSaleItemInput[];
}

export type UpdateScheduledSaleData = CreateScheduledSaleData;

export interface ScheduledSaleListFilters {
  status?: ScheduledSaleStatus;
  client_id?: number;
  scheduled_from?: string;
  scheduled_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

const scheduledSaleService = {
  getScheduledSales: async (
    filters: ScheduledSaleListFilters = {},
  ): Promise<PaginatedResponse<ScheduledSale>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });
    const response = await apiClient.get<PaginatedResponse<ScheduledSale>>(
      `/scheduled-sales?${params.toString()}`,
    );
    return response.data;
  },

  getScheduledSale: async (id: number): Promise<ScheduledSale> => {
    const response = await apiClient.get<{ data: ScheduledSale } | ScheduledSale>(
      `/scheduled-sales/${id}`,
    );
    return "data" in response.data ? response.data.data : response.data;
  },

  createScheduledSale: async (
    data: CreateScheduledSaleData,
  ): Promise<ScheduledSale> => {
    const response = await apiClient.post<{ data: ScheduledSale }>(
      "/scheduled-sales",
      data,
    );
    return response.data.data;
  },

  updateScheduledSale: async (
    id: number,
    data: UpdateScheduledSaleData,
  ): Promise<ScheduledSale> => {
    const response = await apiClient.put<{ data: ScheduledSale } | ScheduledSale>(
      `/scheduled-sales/${id}`,
      data,
    );
    return "data" in response.data ? response.data.data : response.data;
  },

  cancelScheduledSale: async (id: number): Promise<ScheduledSale> => {
    const response = await apiClient.post<{ data: ScheduledSale } | ScheduledSale>(
      `/scheduled-sales/${id}/cancel`,
    );
    return "data" in response.data ? response.data.data : response.data;
  },

  retryScheduledSale: async (id: number): Promise<ScheduledSale> => {
    const response = await apiClient.post<{ data: ScheduledSale } | ScheduledSale>(
      `/scheduled-sales/${id}/retry`,
    );
    return "data" in response.data ? response.data.data : response.data;
  },

  resendWhatsapp: async (id: number): Promise<ScheduledSale> => {
    const response = await apiClient.post<{ data: ScheduledSale } | ScheduledSale>(
      `/scheduled-sales/${id}/resend-whatsapp`,
    );
    return "data" in response.data ? response.data.data : response.data;
  },

  // --- Error Helpers ---
  getValidationErrors,
  getErrorMessage,
};

export default scheduledSaleService;
