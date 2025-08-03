// src/services/whatsappService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import { AxiosError } from 'axios';

// WhatsApp API Types
export interface WhatsAppMessageRequest {
  chatId: string; // Format: {phone_number}@c.us for individual, {group_id}@g.us for group
  text: string;
  quotedMessageId?: string; // Optional: ID of message to reply to
}

export interface WhatsAppMessageResponse {
  id: string;
  chatId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface WhatsAppTestResponse {
  success: boolean;
  message: string;
  data?: WhatsAppMessageResponse;
  error?: string;
}

export interface WhatsAppInstanceStatus {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  qrCode?: string;
  phoneNumber?: string;
  displayName?: string;
}

const whatsappService = {
  /**
   * Send a text message via WhatsApp API
   */
  sendMessage: async (messageData: WhatsAppMessageRequest): Promise<WhatsAppMessageResponse> => {
    try {
      const response = await apiClient.post<{ data: WhatsAppMessageResponse }>('/whatsapp/send-message', messageData);
      return response.data.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  },

  /**
   * Test WhatsApp API connection and send a test message
   */
  testConnection: async (testPhoneNumber: string): Promise<WhatsAppTestResponse> => {
    try {
      const response = await apiClient.post<WhatsAppTestResponse>('/whatsapp/test', {
        phoneNumber: testPhoneNumber,
        message: 'This is a test message from your sales system. If you receive this, WhatsApp integration is working correctly!'
      });
      return response.data;
    } catch (error) {
      console.error('Error testing WhatsApp connection:', error);
      throw error;
    }
  },

  /**
   * Get WhatsApp instance status
   */
  getInstanceStatus: async (): Promise<WhatsAppInstanceStatus> => {
    try {
      const response = await apiClient.get<{ data: WhatsAppInstanceStatus }>('/whatsapp/status');
      return response.data.data;
    } catch (error) {
      console.error('Error getting WhatsApp instance status:', error);
      throw error;
    }
  },

  /**
   * Send sale notification to customer
   */
  sendSaleNotification: async (saleData: {
    customerPhone: string;
    saleId: number;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    invoiceNumber?: string;
  }): Promise<WhatsAppMessageResponse> => {
    try {
      const message = `Thank you for your purchase!

Sale #${saleData.saleId}
${saleData.invoiceNumber ? `Invoice: ${saleData.invoiceNumber}` : ''}

Items:
${saleData.items.map(item => `• ${item.name} x${item.quantity} - $${item.price}`).join('\n')}

Total: $${saleData.totalAmount}

Thank you for choosing us!`;

      const response = await apiClient.post<{ data: WhatsAppMessageResponse }>('/whatsapp/send-sale-notification', {
        phoneNumber: saleData.customerPhone,
        message
      });
      return response.data.data;
    } catch (error) {
      console.error('Error sending sale notification:', error);
      throw error;
    }
  },

  // --- Error Helpers ---
  getValidationErrors,
  getErrorMessage,
};

// Re-usable Axios error check function
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}

export default whatsappService; 