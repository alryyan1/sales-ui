// src/services/whatsappCloudApiService.ts
import apiClient from "../lib/axios";

export interface WhatsAppSenderNumber {
  configured: boolean;
  phone_number: string | null;
}

const whatsappCloudApiService = {
  /**
   * The phone number Meta actually sends WhatsApp messages from. Cheap to call —
   * the backend caches the Graph API lookup for hours.
   */
  getSenderNumber: async (): Promise<WhatsAppSenderNumber> => {
    const response = await apiClient.get<WhatsAppSenderNumber>(
      "/admin/whatsapp-cloud/sender-number",
    );
    return response.data;
  },
};

export default whatsappCloudApiService;
