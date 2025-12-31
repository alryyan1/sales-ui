import React, { useState } from 'react';
import { IconButton, Badge, useTheme, alpha } from '@mui/material';
import { Bell } from 'lucide-react';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from '../../context/NotificationContext';
import { Notification } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    handleClose();
    
    // Navigate based on notification type
    if (notification.data) {
      if (notification.data.sale_id) {
        navigate(`/sales/${notification.data.sale_id}`);
      } else if (notification.data.product_id) {
        navigate(`/admin/products/${notification.data.product_id}`);
      } else if (notification.data.purchase_id) {
        navigate(`/purchases/${notification.data.purchase_id}`);
      } else if (notification.data.requisition_id) {
        navigate(`/stock-requisitions/${notification.data.requisition_id}`);
      }
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: theme.palette.text.primary,
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          },
        }}
      >
        <Badge
          badgeContent={unreadCount > 0 ? unreadCount : undefined}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.7rem',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
            },
          }}
        >
          <Bell size={20} />
        </Badge>
      </IconButton>

      <NotificationPanel
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onNotificationClick={handleNotificationClick}
      />
    </>
  );
};

