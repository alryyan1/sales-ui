// src/components/layouts/RootLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Drawer, Toolbar, useTheme, alpha } from '@mui/material';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import TopAppBar from './TopAppBar';
import SidebarDrawer from './SidebarDrawer';
import UserMenu from './UserMenu';
import { DRAWER_WIDTH } from './types';
import { navItems, reportItems, adminItems } from './navItems';

const RootLayout: React.FC = () => {
    const { isLoading } = useAuth();
    const { can } = useAuthorization();
    const theme = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        reports: false,
        admin: false,
    });
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                }}
            >
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: theme.palette.primary.main }} />
            </Box>
        );
    }

    const visibleNavItems = navItems.filter(
        (item) => item.permission === null || (item.permission !== null && can(item.permission))
    );

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleSectionToggle = (section: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Toaster richColors position="bottom-center" theme="system" />

            {/* <TopAppBar onDrawerToggle={handleDrawerToggle} /> */}

            {/* Sidebar Drawer */}
            <Box
                component="nav"
                sx={{
                    width: { sm: DRAWER_WIDTH },
                    flexShrink: { sm: 0 },
                    order: { sm: 2 },
                }}
            >
                <Drawer
                    variant="temporary"
                    anchor="left"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                            borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        },
                    }}
                >
                    <SidebarDrawer
                        navItems={visibleNavItems}
                        reportItems={reportItems}
                        adminItems={adminItems}
                        openSections={openSections}
                        onSectionToggle={handleSectionToggle}
                        onMenuOpen={handleMenuOpen}
                    />
                </Drawer>
                <Drawer
                    variant="permanent"
                    anchor="left"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                            borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        },
                    }}
                    open
                >
                    <SidebarDrawer
                        navItems={visibleNavItems}
                        reportItems={reportItems}
                        adminItems={adminItems}
                        openSections={openSections}
                        onSectionToggle={handleSectionToggle}
                        onMenuOpen={handleMenuOpen}
                    />
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                    bgcolor: 'background.default',
                    minHeight: '100vh',
                    order: { sm: 1 },
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>

            <UserMenu anchorEl={anchorEl} onClose={handleMenuClose} />
        </Box>
    );
};

export default RootLayout;
