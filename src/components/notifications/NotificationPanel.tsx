import React, { useState } from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import { X, CheckCheck, Settings } from 'lucide-react';
import { NotificationList } from './NotificationList';
import { NotificationPreferencesDialog } from './NotificationPreferences';
import { useNotifications } from '../../context/NotificationContext';
import { Notification } from '../../services/notificationService';

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  anchorEl,
  open,
  onClose,
  onNotificationClick,
}) => {
  const theme = useTheme();
  const { notifications, unreadCount, markAllAsRead, isLoading } =
    useNotifications();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: {
          width: 400,
          maxWidth: '90vw',
          maxHeight: '80vh',
          mt: 1,
          boxShadow: theme.shadows[8],
          borderRadius: 2,
          overflow: 'hidden',
          direction: 'rtl',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
          الإشعارات
          {unreadCount > 0 && (
            <Typography
              component="span"
              sx={{
                ml: 1,
                fontSize: '0.875rem',
                color: theme.palette.primary.main,
                fontWeight: 500,
              }}
            >
              ({unreadCount})
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setPreferencesOpen(true)}
            title="إعدادات الإشعارات"
            sx={{
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
            }}
          >
            <Settings size={18} />
          </IconButton>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCheck size={16} />}
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
              sx={{
                fontSize: '0.75rem',
                minWidth: 'auto',
                px: 1,
                color: theme.palette.primary.main,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              تحديد الكل كمقروء
            </Button>
          )}
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              '&:hover': {
                bgcolor: alpha(theme.palette.error.main, 0.1),
              },
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          maxHeight: 'calc(80vh - 80px)',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: alpha(theme.palette.divider, 0.1),
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha(theme.palette.divider, 0.3),
            borderRadius: '4px',
            '&:hover': {
              bgcolor: alpha(theme.palette.divider, 0.5),
            },
          },
        }}
      >
        <NotificationList
          notifications={notifications}
          onNotificationClick={onNotificationClick}
        />
      </Box>

      <NotificationPreferencesDialog
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </Popover>
  );
};

