import React, { useMemo } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material";
import { LogOut, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { NavItem } from "./types";
import { Box, Typography, IconButton } from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { iconRegistry, navItems as fallbackNavItems } from "./navItems";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

interface SidebarProProps {
  navItems?: NavItem[]; // Optional now
  collapsed: boolean;
  toggled: boolean;
  onToggle: (toggled: boolean) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

interface ApiNavigationItem {
  route: string;
  label: string;
}

interface ApiNavigationCategory {
  category: string;
  items: ApiNavigationItem[];
}

const SidebarPro: React.FC<SidebarProProps> = ({
  navItems: propNavItems,
  collapsed,
  toggled,
  onToggle,
  onCollapsedChange,
}) => {
  const theme = useTheme();
  const location = useLocation();
  const { handleLogout, user } = useAuth();

  // Fetch navigation structure from API
  const { data: apiNavData } = useQuery<{ data: ApiNavigationCategory[] }>({
    queryKey: ["navigation-items"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/navigation-items");
      return response.data;
    },
    // Only fetch for admins or those who can manage users (matching backend policy)
    // Actually, we want the sidebar to be dynamic for everyone if possible,
    // but the backend endpoint is protected.
    enabled:
      !!user &&
      (user.username === "superadmin" || user.roles?.includes("admin")),
  });

  // Helper to check if user has access to a navigation route
  const hasNavAccess = React.useCallback(
    (route: string): boolean => {
      if (!user) return false;
      if (user.username === "superadmin" || user.allowed_navs === null) {
        return true;
      }
      return user.allowed_navs?.includes(route) ?? false;
    },
    [user],
  );

  // Build the navigation items list
  const filteredNavItems = useMemo(() => {
    // 1. If we have API data, use it to build the structure
    if (apiNavData?.data && apiNavData.data.length > 0) {
      return apiNavData.data
        .map((cat) => {
          const accessibleItems = cat.items.filter((item) =>
            hasNavAccess(item.route),
          );
          if (accessibleItems.length === 0) return null;

          // If it's the dashboard category and has only one item, maybe don't group it?
          // For now, let's follow the standard SidebarPro structure.

          const categoryIcon = iconRegistry[cat.category];

          return {
            to:
              accessibleItems.length === 1 &&
              accessibleItems[0].route === "/dashboard"
                ? "/dashboard"
                : "#",
            label: cat.category,
            icon: categoryIcon,
            children:
              accessibleItems.length === 1 &&
              accessibleItems[0].route === "/dashboard"
                ? undefined
                : accessibleItems.map((item) => ({
                    to: item.route,
                    label: item.label,
                  })),
          } as NavItem;
        })
        .filter((item): item is NavItem => item !== null);
    }

    // 2. Fallback to propNavItems or static navItems
    const sourceItems = propNavItems || fallbackNavItems;

    const filterItems = (items: NavItem[]): NavItem[] => {
      return items
        .map((item) => {
          if (item.children && item.children.length > 0) {
            const children = filterItems(item.children);
            if (children.length > 0 || hasNavAccess(item.to)) {
              return { ...item, children };
            }
            return null;
          }
          return hasNavAccess(item.to) ? item : null;
        })
        .filter((item): item is NavItem => item !== null);
    };

    return user ? filterItems(sourceItems) : [];
  }, [apiNavData, user, propNavItems, hasNavAccess]);

  // Helper to check if a menu item is active
  const isActive = (path: string) => location.pathname === path;

  // Recursively render items
  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      if (item.children && item.children.length > 0) {
        return (
          <SubMenu
            key={item.label}
            label={item.label}
            icon={item.icon ? <item.icon size={18} /> : null}
            active={item.children.some((child) =>
              location.pathname.startsWith(child.to),
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
          {renderNavItems(filteredNavItems)}
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
