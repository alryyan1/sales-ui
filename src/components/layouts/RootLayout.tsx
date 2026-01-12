// src/components/layouts/RootLayout.tsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, Drawer, useTheme, alpha, Toolbar } from "@mui/material";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { PosFilterProvider } from "@/context/PosFilterContext";
import SidebarPro from "./SidebarPro";
import TopAppBar from "./TopAppBar";
import UserMenu from "./UserMenu";
import { DRAWER_WIDTH } from "./types";
import { navItems } from "./navItems";

const COLLAPSED_DRAWER_WIDTH = 72;

const RootLayout: React.FC = () => {
  const { isLoading, user, roles, permissions } = useAuth();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Loader2
          className="h-10 w-10 animate-spin"
          style={{ color: theme.palette.primary.main }}
        />
      </Box>
    );
  }

  const visibleNavItems = navItems;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <PosFilterProvider>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Toaster richColors position="bottom-center" theme="system" />

        <TopAppBar
          onDrawerToggle={handleDrawerToggle}
          isSidebarCollapsed={isSidebarCollapsed}
          onMenuOpen={handleMenuOpen}
        />

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{
          width: {
            sm: isSidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
          },
          flexShrink: { sm: 0 },
          order: { sm: 1 },
        }}
      >
        {/* ... Drawer logic ... */}
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            },
          }}
        >
          <SidebarPro
            navItems={visibleNavItems}
            collapsed={false}
            toggled={mobileOpen}
            onToggle={handleDrawerToggle}
            onCollapsedChange={() => {}}
          />
        </Drawer>
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: isSidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              overflowX: "hidden",
            },
          }}
          open
        >
          <SidebarPro
            navItems={visibleNavItems}
            collapsed={isSidebarCollapsed}
            toggled={false} // Desktop mode
            onToggle={() => {}}
            onCollapsedChange={setIsSidebarCollapsed}
          />
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // overflowX: 'hidden',
          overflowY: "auto",
          p: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: "background.default",
          height: "100vh",
          order: { sm: 2 },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <UserMenu anchorEl={anchorEl} onClose={handleMenuClose} />
    </Box>
    </PosFilterProvider>
  );
};

export default RootLayout;
