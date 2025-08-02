// src/services/whatsappService.ts
import apiClient from '../lib/axios';

// WhatsApp API Configuration
const WAAPI_BASE_URL = 'https://waapi.app/api/v1';
const INSTANCE_ID = '45517';
const TOKEN = 'c4bilrmBGK6KwM2WgQ8beMhHJflSeR9bvKCTfA3He7be7d59';

// Types for WhatsApp scheduler
export interface WhatsAppScheduler {
  id?: number;
  name: string;
  report_type: 'daily_sales' | 'inventory' | 'profit_loss' | 'monthly_revenue';
  phone_numbers: string[];
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_time: string; // HH:mm format
  schedule_days?: string[]; // For weekly/monthly schedules
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppSchedulerFormData {
  name: string;
  report_type: 'daily_sales' | 'inventory' | 'profit_loss' | 'monthly_revenue';
  phone_numbers: string[];
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_time: string;
  schedule_days?: string[];
  is_active: boolean;
}

// Report types available for scheduling
export const REPORT_TYPES = [
  { value: 'daily_sales', label: 'Daily Sales Report' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'profit_loss', label: 'Profit & Loss Report' },
  { value: 'monthly_revenue', label: 'Monthly Revenue Report' },
];

// Schedule types
export const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

// Days of the week
export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const whatsappService = {
  /**
   * Send a PDF report via WhatsApp
   * Based on WaAPI documentation: https://waapi.readme.io/reference/send-media-message
   */
  sendPdfReport: async (phoneNumber: string, pdfUrl: string, caption?: string): Promise<any> => {
    try {
      const response = await fetch(`${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          chatId: `${phoneNumber}@c.us`,
          media: {
            url: pdfUrl,
            type: 'document',
            caption: caption || 'Your requested report',
            filename: 'report.pdf'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  },

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
  toggleScheduler: async (id: number, isActive: boolean): Promise<WhatsAppScheduler> => {
    try {
      const response = await apiClient.patch<{ data: WhatsAppScheduler }>(`/admin/whatsapp-schedulers/${id}/toggle`, {
        is_active: isActive
      });
      return response.data.data;
    } catch (error) {
      console.error('Error toggling WhatsApp scheduler:', error);
      throw error;
    }
  },

  /**
   * Test send a report to a phone number
   */
  testSendReport: async (phoneNumber: string, reportType: string): Promise<any> => {
    try {
      const response = await apiClient.post('/admin/whatsapp-schedulers/test', {
        phone_number: phoneNumber,
        report_type: reportType
      });
      return response.data;
    } catch (error) {
      console.error('Error testing WhatsApp report:', error);
      throw error;
    }
  },

  /**
   * Generate PDF report URL
   */
  generateReportUrl: async (reportType: string, date?: string): Promise<string> => {
    try {
      const response = await apiClient.post<{ data: { url: string } }>('/admin/reports/generate-pdf', {
        report_type: reportType,
        date: date || new Date().toISOString().split('T')[0]
      });
      return response.data.data.url;
    } catch (error) {
      console.error('Error generating report URL:', error);
      throw error;
    }
  }
};

export default whatsappService; 