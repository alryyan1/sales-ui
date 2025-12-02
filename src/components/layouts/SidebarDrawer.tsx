// src/components/layouts/SidebarDrawer.tsx
import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Avatar,
    useTheme,
    alpha,
} from '@mui/material';
import { BarChart3, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import CollapsibleNavItem from './CollapsibleNavItem';
import { NavItem } from './types';

interface SidebarDrawerProps {
    navItems: NavItem[];
    reportItems: NavItem[];
    adminItems: NavItem[];
    openSections: Record<string, boolean>;
    onSectionToggle: (section: string) => void;
    onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
}

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
    navItems,
    reportItems,
    adminItems,
    openSections,
    onSectionToggle,
    onMenuOpen,
}) => {
    const theme = useTheme();
    const location = useLocation();
    const { user } = useAuth();
    const { can } = useAuthorization();

    const visibleReportItems = reportItems.filter(
        (item) => item.permission !== null && can(item.permission)
    );
    const visibleAdminItems = adminItems.filter(
        (item) => item.permission !== null && can(item.permission)
    );
    const canViewAnyReport = visibleReportItems.length > 0;
    const canManageAdmin = visibleAdminItems.length > 0;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Logo/Brand Section */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <TrendingUp size={24} color="white" />
                </Box>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        fontSize: '1.125rem',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    نظام إدارة المبيعات
                </Typography>
            </Box>

            {/* Navigation Items */}
            <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
                <List>
                    {navItems.map((item) => {
                        if (item.permission && !can(item.permission)) {
                            return null;
                        }
                        const isActive = location.pathname === item.to;
                        return (
                            <ListItem key={item.to} disablePadding>
                                <ListItemButton
                                    component={RouterLink}
                                    to={item.to}
                                    sx={{
                                        minHeight: 48,
                                        px: 2.5,
                                        borderRadius: 1,
                                        mx: 1,
                                        mb: 0.5,
                                        bgcolor: isActive
                                            ? alpha(theme.palette.primary.main, 0.15)
                                            : 'transparent',
                                        color: isActive
                                            ? theme.palette.primary.main
                                            : 'text.primary',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        },
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            justifyContent: 'center',
                                            mr: 2,
                                            color: isActive
                                                ? theme.palette.primary.main
                                                : 'text.secondary',
                                        }}
                                    >
                                        {item.icon && <item.icon size={20} />}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            fontSize: '0.875rem',
                                            fontWeight: isActive ? 600 : 400,
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}

                    {/* Reports Section */}
                    {canViewAnyReport && (
                        <CollapsibleNavItem
                            item={{
                                to: '#',
                                label: 'التقارير',
                                icon: BarChart3,
                                permission: 'view-reports',
                                children: visibleReportItems,
                            }}
                            open={openSections.reports}
                            onToggle={() => onSectionToggle('reports')}
                            can={can}
                            location={location}
                        />
                    )}

                    {/* Admin Section */}
                    {canManageAdmin && (
                        <CollapsibleNavItem
                            item={{
                                to: '#',
                                label: 'الإدارة',
                                icon: Settings,
                                permission: 'manage-settings',
                                children: visibleAdminItems,
                            }}
                            open={openSections.admin}
                            onToggle={() => onSectionToggle('admin')}
                            can={can}
                            location={location}
                        />
                    )}
                </List>
            </Box>

            {/* User Section */}
            {user && (
                <Box
                    sx={{
                        p: 2,
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            cursor: 'pointer',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                            },
                        }}
                        onClick={onMenuOpen}
                    >
                        <Avatar
                            sx={{
                                width: 36,
                                height: 36,
                                bgcolor: theme.palette.primary.main,
                            }}
                        >
                            {user.name.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.8125rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {user.name}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.75rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block',
                                }}
                            >
                                {user.email}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default SidebarDrawer;

