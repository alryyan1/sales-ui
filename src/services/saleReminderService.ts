import apiClient from "@/lib/axios";

export interface SaleReminder {
  id: number;
  sale_id: number;
  remind_at: string;
  is_dismissed: boolean;
}

export interface DueReminder {
  id: number;
  sale_id: number;
  remind_at: string;
  sale: {
    id: number;
    client_name?: string;
    due_amount: number;
    client?: {
      name?: string;
      phone?: string;
    };
  };
}

const saleReminderService = {
  setReminder: async (saleId: number, days: number): Promise<SaleReminder> => {
    const response = await apiClient.post(`/sales/${saleId}/reminder`, { days });
    return response.data;
  },

  getReminder: async (saleId: number): Promise<SaleReminder | null> => {
    const response = await apiClient.get(`/sales/${saleId}/reminder`);
    return response.data ?? null;
  },

  removeReminder: async (saleId: number): Promise<void> => {
    await apiClient.delete(`/sales/${saleId}/reminder`);
  },

  getDueReminders: async (): Promise<DueReminder[]> => {
    const response = await apiClient.get("/sale-reminders/due");
    return response.data;
  },

  dismissReminder: async (reminderId: number): Promise<void> => {
    await apiClient.patch(`/sale-reminders/${reminderId}/dismiss`);
  },
};

export default saleReminderService;
