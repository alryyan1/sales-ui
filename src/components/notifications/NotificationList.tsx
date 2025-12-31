import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import { NotificationItem } from './NotificationItem';
import { Notification } from '../../services/notificationService';
import { useNotifications } from '../../context/NotificationContext';

interface NotificationListProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onNotificationClick,
}) => {
  const theme = useTheme();
  const {
    isLoading,
    markAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();
  const listRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);

  React.useEffect(() => {
    // Reset pagination when notifications change from context
    if (notifications.length > 0 && page === 1) {
      setHasMore(true);
    }
  }, [notifications.length, page]);

  const handleLoadMore = async () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      const currentLength = notifications.length;
      await fetchNotifications(nextPage);
      // If no new notifications were added, there are no more pages
      if (notifications.length === currentLength) {
        setHasMore(false);
      } else {
        setPage(nextPage);
      }
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick?.(notification);
  };

  if (isLoading && notifications.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (notifications.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            textAlign: 'center',
          }}
        >
          لا توجد إشعارات
        </Typography>
      </Box>
    );
  }

  return (
    <Box ref={listRef}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={markAsRead}
          onDelete={deleteNotification}
          onClick={() => handleNotificationClick(notification)}
        />
      ))}

      {hasMore && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Button
              variant="text"
              size="small"
              onClick={handleLoadMore}
              disabled={isLoading}
              sx={{
                color: theme.palette.primary.main,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  جاري التحميل...
                </>
              ) : (
                'تحميل المزيد'
              )}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

