import apiClient from '@/lib/axios';

export interface WhatsAppScheduler {
  id: number;
  name: string;
  phone_number: string;
  report_type: 'daily_sales' | 'inventory' | 'profit_loss';
  schedule_time: string;
  is_active: boolean;
  days_of_week: number[];
  notes?: string;
  last_sent_at?: string;
  created_at: string;
  updated_at: string;
  formatted_schedule_time?: string;
  formatted_days_of_week?: string;
  report_type_label?: string;
}

export interface WhatsAppSchedulerFormData {
  name: string;
  phone_number: string;
  report_type: 'daily_sales' | 'inventory' | 'profit_loss';
  schedule_time: string;
  is_active: boolean;
  days_of_week: number[];
  notes?: string;
}

export interface SchedulerOptions {
  report_types: Record<string, string>;
  days_of_week: Record<string, string>;
}

const whatsappSchedulerService = {
  /**
   * Get all WhatsApp schedulers
   */
  getSchedulers: async (): Promise<WhatsAppScheduler[]> => {
    try {
      const response = await apiClient.get<{ data: WhatsAppScheduler[] }>('/admin/whatsapp-schedulers');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching WhatsApp schedulers:', error);
      throw error;
    }
  },

  /**
   * Create a new WhatsApp scheduler
   */
  createScheduler: async (schedulerData: WhatsAppSchedulerFormData): Promise<WhatsAppScheduler> => {
    try {
      const response = await apiClient.post<{ data: WhatsAppScheduler }>('/admin/whatsapp-schedulers', schedulerData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating WhatsApp scheduler:', error);
      throw error;
    }
  },

  /**
   * Get a specific WhatsApp scheduler
   */
  getScheduler: async (id: number): Promise<WhatsAppScheduler> => {
    try {
      const response = await apiClient.get<{ data: WhatsAppScheduler }>(`/admin/whatsapp-schedulers/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching WhatsApp scheduler:', error);
      throw error;
    }
  },

  /**
   * Update a WhatsApp scheduler
   */
  updateScheduler: async (id: number, schedulerData: Partial<WhatsAppSchedulerFormData>): Promise<WhatsAppScheduler> => {
    try {
      const response = await apiClient.put<{ data: WhatsAppScheduler }>(`/admin/whatsapp-schedulers/${id}`, schedulerData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating WhatsApp scheduler:', error);
      throw error;
    }
  },

  /**
   * Delete a WhatsApp scheduler
   */
  deleteScheduler: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/admin/whatsapp-schedulers/${id}`);
    } catch (error) {
      console.error('Error deleting WhatsApp scheduler:', error);
      throw error;
    }
  },

  /**
   * Toggle scheduler active status
   */
  toggleScheduler: async (id: number): Promise<WhatsAppScheduler> => {
    try {
      const response = await apiClient.patch<{ data: WhatsAppScheduler }>(`/admin/whatsapp-schedulers/${id}/toggle`);
      return response.data.data;
    } catch (error) {
      console.error('Error toggling WhatsApp scheduler:', error);
      throw error;
    }
  },

  /**
   * Get scheduler options (report types, days of week)
   */
  getOptions: async (): Promise<SchedulerOptions> => {
    try {
      const response = await apiClient.get<{ data: SchedulerOptions }>('/admin/whatsapp-schedulers/options');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching scheduler options:', error);
      throw error;
    }
  },
};

export default whatsappSchedulerService; 