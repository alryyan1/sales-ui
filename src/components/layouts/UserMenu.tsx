// src/components/layouts/UserMenu.tsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import { LogOut, UserCircle, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface UserMenuProps {
    anchorEl: HTMLElement | null;
    onClose: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ anchorEl, onClose }) => {
    const { handleLogout } = useAuth();

    const handleLogoutClick = async () => {
        onClose();
        await handleLogout();
    };

    return (
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={onClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
            <MenuItem component={RouterLink} to="/profile" onClick={onClose}>
                <ListItemIcon>
                    <UserCircle size={20} />
                </ListItemIcon>
                <ListItemText>الملف الشخصي</ListItemText>
            </MenuItem>
            <MenuItem component={RouterLink} to="/admin/settings" onClick={onClose}>
                <ListItemIcon>
                    <SettingsIcon size={20} />
                </ListItemIcon>
                <ListItemText>الإعدادات</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogoutClick} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                    <LogOut size={20} />
                </ListItemIcon>
                <ListItemText>تسجيل الخروج</ListItemText>
            </MenuItem>
        </Menu>
    );
};

export default UserMenu;

