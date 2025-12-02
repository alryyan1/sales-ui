// src/components/layouts/TopAppBar.tsx
import React from 'react';
import { AppBar, Toolbar, Box, IconButton, useTheme, alpha } from '@mui/material';
import { Menu as MenuIcon } from 'lucide-react';
import { ThemeToggle } from '../layout/ThemeToggle';
import { DRAWER_WIDTH } from './types';

interface TopAppBarProps {
    onDrawerToggle: () => void;
}

const TopAppBar: React.FC<TopAppBarProps> = ({ onDrawerToggle }) => {
    const theme = useTheme();

    return (
        <AppBar
            position="fixed"
            sx={{
                width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                mr: { sm: `${DRAWER_WIDTH}px` },
                bgcolor: 'background.paper',
                color: 'text.primary',
                boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.12)}`,
            }}
        >
            <Toolbar>
                <Box sx={{ flexGrow: 1 }} />
                <ThemeToggle />
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="end"
                    onClick={onDrawerToggle}
                    sx={{ ml: 2, display: { sm: 'none' } }}
                >
                    <MenuIcon />
                </IconButton>
            </Toolbar>
        </AppBar>
    );
};

export default TopAppBar;

