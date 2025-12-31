import apiClient from '../lib/axios';

export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'new_sale'
  | 'purchase_received'
  | 'stock_requisition'
  | 'expiry_alert'
  | 'system'
  | 'warning'
  | 'error'
  | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    product_id?: number;
    sale_id?: number;
    purchase_id?: number;
    requisition_id?: number;
    batch_id?: number;
    [key: string]: any;
  };
  read_at: string | null;
  created_at: string;
}

export interface PaginatedNotificationResponse {
  data: Notification[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface UnreadCountResponse {
  count: number;
}

class NotificationService {
  /**
   * Get paginated notifications for the authenticated user
   */
  async getNotifications(
    page: number = 1,
    perPage: number = 15
  ): Promise<PaginatedNotificationResponse> {
    const response = await apiClient.get<PaginatedNotificationResponse>(
      '/notifications',
      {
        params: {
          page,
          per_page: perPage,
        },
      }
    );
    return response.data;
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>(
      '/notifications/unread-count'
    );
    return response.data.count;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient.post<{ notification: Notification }>(
      `/notifications/${notificationId}/read`
    );
    return response.data.notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }
}

export const notificationService = new NotificationService();

