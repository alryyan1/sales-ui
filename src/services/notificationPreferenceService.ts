import apiClient from '../lib/axios';
import { NotificationType } from './notificationService';

export interface NotificationPreferences {
  [key: string]: boolean; // notification_type -> enabled
}

class NotificationPreferenceService {
  /**
   * Get notification preferences for the authenticated user
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<{ preferences: NotificationPreferences }>(
      '/notifications/preferences'
    );
    return response.data.preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    const response = await apiClient.put<{ preferences: NotificationPreferences }>(
      '/notifications/preferences',
      { preferences }
    );
    return response.data.preferences;
  }

  /**
   * Toggle a single notification preference
   */
  async togglePreference(type: NotificationType): Promise<{ type: string; enabled: boolean }> {
    const response = await apiClient.post<{ preference: { type: string; enabled: boolean } }>(
      `/notifications/preferences/${type}/toggle`
    );
    return response.data.preference;
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();

