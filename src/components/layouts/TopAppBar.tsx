// src/components/layouts/TopAppBar.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  useTheme,
  alpha,
  Typography,
  Avatar,
  ButtonBase,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { Menu as MenuIcon, Bell } from "lucide-react";
import { ThemeToggle } from "../layout/ThemeToggle";
import { DRAWER_WIDTH } from "./types";

const COLLAPSED_DRAWER_WIDTH = 72;

interface TopAppBarProps {
  onDrawerToggle: () => void;
  isSidebarCollapsed: boolean;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
}

const TopAppBar: React.FC<TopAppBarProps> = ({
  onDrawerToggle,
  isSidebarCollapsed,
  onMenuOpen,
}) => {
  const { user } = useAuth();
  const theme = useTheme();
  const width = isSidebarCollapsed
    ? `calc(100% - ${COLLAPSED_DRAWER_WIDTH}px)`
    : `calc(100% - ${DRAWER_WIDTH}px)`;

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: width },
        ml: {
          sm: isSidebarCollapsed
            ? `${COLLAPSED_DRAWER_WIDTH}px`
            : `${DRAWER_WIDTH}px`,
        },
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: "blur(12px)",
        color: "text.primary",
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: "none",
        transition: theme.transitions.create(["width", "margin"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2, display: { sm: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Placeholder for Page Title or Breadcrumbs */}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ flexGrow: 1, fontSize: "1rem", fontWeight: 600 }}
        >
          {/* Dynamic title could go here */}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton size="small" color="inherit">
            <Bell size={20} />
          </IconButton>
          <ThemeToggle />

          {user && (
            <ButtonBase
              onClick={onMenuOpen}
              sx={{
                ml: 1,
                borderRadius: "50%",
                p: 0.5,
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: theme.palette.primary.main,
                  fontSize: "0.9rem",
                }}
              >
                {user.name.substring(0, 2).toUpperCase()}
              </Avatar>
            </ButtonBase>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopAppBar;
