import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { notificationService, Notification, NotificationType } from '../services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (page?: number, perPage?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Initialize socket connection
  useEffect(() => {
    const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/sales-api/public';
    const token = localStorage.getItem('authToken');

    if (!token) {
      return;
    }

    // For now, we'll use polling instead of socket.io since broadcasting setup is complex
    // Socket.io integration can be added later when broadcasting is properly configured
    // const newSocket = io(`${VITE_API_BASE_URL}`, {
    //   auth: {
    //     token: token,
    //   },
    //   transports: ['websocket', 'polling'],
    // });

    // newSocket.on('connect', () => {
    //   setIsConnected(true);
    //   console.log('Socket connected');
    // });

    // newSocket.on('disconnect', () => {
    //   setIsConnected(false);
    //   console.log('Socket disconnected');
    // });

    // newSocket.on('notification.created', (data: Notification) => {
    //   addNotification(data);
    //   refreshUnreadCount();
    // });

    // newSocket.on('notification.updated', (data: Notification) => {
    //   setNotifications((prev) =>
    //     prev.map((n) => (n.id === data.id ? data : n))
    //   );
    //   refreshUnreadCount();
    // });

    // newSocket.on('notification.deleted', (data: { id: string }) => {
    //   setNotifications((prev) => prev.filter((n) => n.id !== data.id));
    //   refreshUnreadCount();
    // });

    // setSocket(newSocket);

    // Polling for unread count every 30 seconds
    const pollInterval = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => {
      // if (newSocket) {
      //   newSocket.disconnect();
      // }
      clearInterval(pollInterval);
    };
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to refresh unread count:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async (page: number = 1, perPage: number = 15) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await notificationService.getNotifications(page, perPage);
      if (page === 1) {
        setNotifications(response.data);
      } else {
        setNotifications((prev) => [...prev, ...response.data]);
      }
      setCurrentPage(page);
      setHasMore(response.pagination.current_page < response.pagination.last_page);
      await refreshUnreadCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUnreadCount]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const updatedNotification = await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? updatedNotification : n))
      );
      await refreshUnreadCount();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      throw err;
    }
  }, [refreshUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      await refreshUnreadCount();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  }, [refreshUnreadCount]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await refreshUnreadCount();
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err;
    }
  }, [refreshUnreadCount]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(1);
  }, [fetchNotifications]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    if (!notification.read_at) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifications(1);
    refreshUnreadCount();
  }, [fetchNotifications, refreshUnreadCount]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    addNotification,
    isConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

