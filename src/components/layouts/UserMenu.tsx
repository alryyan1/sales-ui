// src/components/layouts/UserMenu.tsx
import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import { LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface UserMenuProps {
    anchorEl: HTMLElement | null;
    onClose: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ anchorEl, onClose }) => {
    const { handleLogout } = useAuth();
    const navigate = useNavigate();

    const handleLogoutClick = () => {
        handleLogout();
        onClose();
        navigate('/login');
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

