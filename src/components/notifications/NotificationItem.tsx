import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  alpha,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  AlertTriangle,
  AlertCircle,
  ShoppingCart,
  Package,
  FileText,
  Clock,
  Info,
  XCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Notification, NotificationType } from '../../services/notificationService';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  const iconProps = { size: 20 };
  switch (type) {
    case 'low_stock':
      return <AlertTriangle {...iconProps} color="#f59e0b" />;
    case 'out_of_stock':
      return <AlertCircle {...iconProps} color="#ef4444" />;
    case 'new_sale':
      return <ShoppingCart {...iconProps} color="#10b981" />;
    case 'purchase_received':
      return <Package {...iconProps} color="#3b82f6" />;
    case 'stock_requisition':
      return <FileText {...iconProps} color="#3b82f6" />;
    case 'expiry_alert':
      return <Clock {...iconProps} color="#f59e0b" />;
    case 'system':
      return <Info {...iconProps} color="#3b82f6" />;
    case 'warning':
      return <AlertTriangle {...iconProps} color="#f59e0b" />;
    case 'error':
      return <XCircle {...iconProps} color="#ef4444" />;
    case 'success':
      return <CheckCircle {...iconProps} color="#10b981" />;
    default:
      return <Info {...iconProps} color="#6b7280" />;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}) => {
  const theme = useTheme();
  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ar,
  });

  return (
    <Box
      onClick={handleClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        bgcolor: isUnread
          ? alpha(theme.palette.primary.main, 0.05)
          : 'transparent',
        transition: 'background-color 0.2s',
        position: 'relative',
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.08),
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Box
          sx={{
            mt: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 24,
          }}
        >
          {getNotificationIcon(notification.type)}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: isUnread ? 600 : 500,
              mb: 0.5,
              color: theme.palette.text.primary,
            }}
          >
            {notification.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              mb: 1,
              lineHeight: 1.5,
            }}
          >
            {notification.message}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.disabled,
              fontSize: '0.75rem',
            }}
          >
            {timeAgo}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
          {isUnread && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: theme.palette.primary.main,
                mt: 1,
              }}
            />
          )}
          <Tooltip title="حذف">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                opacity: 0.6,
                '&:hover': {
                  opacity: 1,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              <X size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};



