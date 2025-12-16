// src/components/layouts/CollapsibleNavItem.tsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    List,
    useTheme,
    alpha,
} from '@mui/material';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { CollapsibleNavItemProps } from './types';

const CollapsibleNavItem: React.FC<CollapsibleNavItemProps> = ({
    item,
    open,
    onToggle,
    location,
}) => {
    const theme = useTheme();
    const hasActiveChild = item.children?.some(
        (child) => location.pathname === child.to
    );
    const isOpen = open || hasActiveChild;

    return (
        <>
            <ListItem disablePadding>
                <ListItemButton
                    onClick={onToggle}
                    sx={{
                        minHeight: 48,
                        px: 2.5,
                        borderRadius: 1,
                        mx: 1,
                        mb: 0.5,
                        bgcolor: isOpen
                            ? alpha(theme.palette.primary.main, 0.1)
                            : 'transparent',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                        },
                    }}
                >
                    <ListItemIcon
                        sx={{
                            minWidth: 0,
                            justifyContent: 'center',
                            color: isOpen
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
                            fontWeight: isOpen ? 600 : 400,
                            color: isOpen
                                ? theme.palette.primary.main
                                : 'text.primary',
                        }}
                    />
                    {isOpen ? (
                        <ChevronDown size={18} />
                    ) : (
                        <ChevronRight size={18} />
                    )}
                </ListItemButton>
            </ListItem>
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                    {item.children?.map((child) => {
                        const isActive = location.pathname === child.to;
                        return (
                            <ListItem key={child.to} disablePadding>
                                <ListItemButton
                                    component={RouterLink}
                                    to={child.to}
                                    sx={{
                                        minHeight: 40,
                                        pl: 6,
                                        pr: 2.5,
                                        borderRadius: 1,
                                        mx: 1,
                                        mb: 0.5,
                                        bgcolor: isActive
                                            ? alpha(theme.palette.primary.main, 0.15)
                                            : 'transparent',
                                        '&:hover': {
                                            bgcolor: alpha(
                                                theme.palette.primary.main,
                                                0.1
                                            ),
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={child.label}
                                        primaryTypographyProps={{
                                            fontSize: '0.8125rem',
                                            fontWeight: isActive ? 500 : 400,
                                            color: isActive
                                                ? theme.palette.primary.main
                                                : 'text.secondary',
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Collapse>
        </>
    );
};

export default CollapsibleNavItem;

