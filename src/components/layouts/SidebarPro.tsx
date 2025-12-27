import React from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material";
import { LogOut, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { NavItem } from "./types";
import { Box, Typography, IconButton } from "@mui/material";
import { useAuth } from "@/context/AuthContext";

interface SidebarProProps {
  navItems: NavItem[];
  collapsed: boolean;
  toggled: boolean;
  onToggle: (toggled: boolean) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

const SidebarPro: React.FC<SidebarProProps> = ({
  navItems,
  collapsed,
  toggled,
  onToggle,
  onCollapsedChange,
}) => {
  const theme = useTheme();
  const location = useLocation();
  const { handleLogout } = useAuth();

  // Helper to check if a menu item is active
  const isActive = (path: string) => location.pathname === path;

  // Helper to check if a submenu should be open (contains active route)
  // react-pro-sidebar submenu 'defaultOpen' is only read on mount.
  // We can let user control it, or force it open if we want.
  // Generally, purely CSS controlled active state is easier visually.

  // Recursively render items
  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      // Logic for permission check can go here if needed

      if (item.children && item.children.length > 0) {
        return (
          <SubMenu
            key={item.label}
            label={item.label}
            icon={item.icon ? <item.icon size={18} /> : null}
            active={item.children.some((child) =>
              location.pathname.startsWith(child.to)
            )}
            rootStyles={{
              ["& > .ps-menu-button"]: {
                backgroundColor: "transparent !important",
              },
            }}
          >
            {renderNavItems(item.children)}
          </SubMenu>
        );
      }

      return (
        <MenuItem
          key={item.to}
          component={<RouterLink to={item.to} />}
          icon={item.icon ? <item.icon size={18} /> : null}
          active={isActive(item.to)}
          rootStyles={{
            ".ps-menu-button": {
              backgroundColor: isActive(item.to)
                ? `${theme.palette.primary.main}15 !important`
                : "transparent",
              color: isActive(item.to)
                ? `${theme.palette.primary.main} !important`
                : "inherit",
              "&:hover": {
                backgroundColor: `${theme.palette.primary.main}10 !important`,
              },
            },
          }}
        >
          {item.label}
        </MenuItem>
      );
    });
  };

  return (
    <div style={{ display: "flex", height: "100%", direction: "rtl" }}>
      <Sidebar
        collapsed={collapsed}
        toggled={toggled}
        onBackdropClick={() => onToggle(false)}
        rtl={true}
        breakPoint="md"
        backgroundColor="#ffffff"
        rootStyles={{
          borderLeft: "1px solid #e5e7eb",
          color: "#374151", // slate-700
        }}
      >
        {/* Header / Logo */}
        <Box
          sx={{
            padding: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            borderBottom: "1px solid #f3f4f6",
            marginBottom: "10px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TrendingUp size={20} color="white" />
            </Box>
            {!collapsed && (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                جوده للمبيعات
              </Typography>
            )}
          </Box>
          {!collapsed && (
            <IconButton
              onClick={() => onCollapsedChange(!collapsed)}
              size="small"
            >
              <ChevronRight size={18} />
            </IconButton>
          )}
        </Box>

        {/* Navigation Content */}
        <Menu
          menuItemStyles={{
            button: {
              direction: "rtl",
              [`&.active`]: {
                backgroundColor: "#13395e",
                color: "#b6c8d9",
              },
            },
          }}
        >
          {renderNavItems(navItems)}
        </Menu>

        {/* Footer / Logout */}
        <Box sx={{ marginTop: "auto", borderTop: "1px solid #f3f4f6", p: 1 }}>
          <Menu>
            <MenuItem
              icon={<LogOut size={18} />}
              onClick={() => {
                handleLogout();
              }}
              rootStyles={{
                color: theme.palette.error.main,
                "&:hover": {
                  backgroundColor: `${theme.palette.error.main}10 !important`,
                },
              }}
            >
              {!collapsed && "تسجيل خروج"}
            </MenuItem>
          </Menu>
          {collapsed && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
              <IconButton
                onClick={() => onCollapsedChange(!collapsed)}
                size="small"
              >
                <ChevronLeft size={18} />
              </IconButton>
            </Box>
          )}
        </Box>
      </Sidebar>
    </div>
  );
};

export default SidebarPro;
