// src/components/layouts/SidebarDrawer.tsx
import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  useTheme,
  alpha,
} from "@mui/material";
import {
  BarChart3,
  Settings,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CollapsibleNavItem from "./CollapsibleNavItem";
import { NavItem } from "./types";

interface SidebarDrawerProps {
  navItems: NavItem[];
  openSections: Record<string, boolean>;
  onSectionToggle: (section: string) => void;

  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  navItems,
  openSections,
  onSectionToggle,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const theme = useTheme();
  const location = useLocation();

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo/Brand Section */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          gap: isCollapsed ? 1 : 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isCollapsed ? "" : <TrendingUp size={24} color="white" />}
        </Box>
        {!isCollapsed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: "1.0rem",
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              جوده للمبيعات
            </Typography>
            {onToggleCollapse && (
              <IconButton
                size="small"
                edge="end"
                aria-label="collapse sidebar"
                onClick={onToggleCollapse}
              >
                <ChevronLeft size={18} />
              </IconButton>
            )}
          </Box>
        )}
        {isCollapsed && onToggleCollapse && (
          <IconButton
            size="small"
            edge="end"
            aria-label="expand sidebar"
            onClick={onToggleCollapse}
            sx={{ ml: 1 }}
          >
            <ChevronRight size={18} />
          </IconButton>
        )}
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
        <List>
          {navItems.map((item) => {
            // Check for children
            if (item.children && item.children.length > 0) {
              // Collapsible Group
              // Use label as key for openSections
              const sectionKey = item.label;

              if (isCollapsed) return null; // Don't show groups when collapsed (or implement popover)

              return (
                <CollapsibleNavItem
                  key={item.label}
                  item={item}
                  open={openSections[sectionKey] || false}
                  onToggle={() => onSectionToggle(sectionKey)}
                  location={location}
                />
              );
            }

            // Single Item
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
                      : "transparent",
                    color: isActive
                      ? theme.palette.primary.main
                      : "text.primary",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      justifyContent: "center",
                      // mr: 2,
                      color: isActive
                        ? theme.palette.primary.main
                        : "text.secondary",
                    }}
                  >
                    {item.icon && <item.icon size={20} />}
                  </ListItemIcon>
                  {!isCollapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.875rem",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default SidebarDrawer;
