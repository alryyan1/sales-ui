// src/components/layouts/RootLayout.tsx
import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box, Drawer, useTheme, alpha, Toolbar } from "@mui/material";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { PosFilterProvider } from "@/context/PosFilterContext";
import SidebarPro from "./SidebarPro";
import TopAppBar from "./TopAppBar";
import { DRAWER_WIDTH } from "./types";
import { navItems } from "./navItems";

const COLLAPSED_DRAWER_WIDTH = 72;

// Routes that own the entire viewport themselves (their own header/footer chrome)
// and shouldn't be wrapped in the app shell's sidebar/top bar.
const FULL_BLEED_ROUTES = ["/sales/pos"];

const RootLayout: React.FC = () => {
  const { isLoading, user, roles, permissions } = useAuth();
  const theme = useTheme();
  const location = useLocation();
  const isFullBleed = FULL_BLEED_ROUTES.includes(location.pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  return (
    <PosFilterProvider>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Toaster richColors position="bottom-center" theme="system" />

        {!isFullBleed && (
          <TopAppBar
            onDrawerToggle={handleDrawerToggle}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        )}

      {/* Sidebar Drawer */}
      {!isFullBleed && (
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
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={
          isFullBleed
            ? {
                flexGrow: 1,
                overflow: "hidden",
                bgcolor: "background.default",
                height: "100vh",
                width: "100%",
              }
            : {
                flexGrow: 1,
                // overflowX: 'hidden',
                overflowY: "auto",
                p: 1,
                width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                bgcolor: "background.default",
                height: "100vh",
                order: { sm: 2 },
              }
        }
      >
        {!isFullBleed && <Toolbar />}
        <Outlet />
      </Box>
    </Box>
    </PosFilterProvider>
  );
};

export default RootLayout;
