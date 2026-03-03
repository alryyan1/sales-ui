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
  Chip,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import {
  Menu as MenuIcon,
  Warehouse,
  RefreshCcw,
  Keyboard,
  Clock,
  CalendarDays,
  TrendingUp,
  FileWarning as FileWarningIcon,
} from "lucide-react";
import ErrorIcon from "@mui/icons-material/Error";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Badge } from "@mui/material";
import { useSettings } from "@/context/SettingsContext";
import { ThemeToggle } from "../layout/ThemeToggle";
import { DRAWER_WIDTH } from "./types";
import { dbService, STORES } from "../../services/db";
import { offlineSaleService } from "../../services/offlineSaleService";
import { toast } from "sonner";
import { KeyboardShortcutsDialog } from "../common/KeyboardShortcutsDialog";

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
  const navigate = useNavigate(); // Initialize useNavigate
  const location = useLocation();
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = React.useState(false);
  const [expiryCounts, setExpiryCounts] = React.useState({
    nearExpiringCount: 0,
    expiredCount: 0,
  });

  React.useEffect(() => {
    const handleUpdateCounts = (e: Event) => {
      const customEvent = e as CustomEvent;
      setExpiryCounts(customEvent.detail);
    };
    window.addEventListener("update-expiry-counts", handleUpdateCounts);
    return () =>
      window.removeEventListener("update-expiry-counts", handleUpdateCounts);
  }, []);

  // Get POS mode setting
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  // Get POS filters - use a safe wrapper to avoid hook errors when not on POS page
  // We'll create a wrapper component for the filters section

  const handleResetData = async () => {
    if (
      !confirm(
        "Are you sure you want to refresh products and clients cache? Pending sales will be kept.",
      )
    ) {
      return;
    }

    try {
      toast.info("Clearing local data (keeping pending sales)...");
      await dbService.clearStore(STORES.PRODUCTS);
      await dbService.clearStore(STORES.CLIENTS);
      // await dbService.clearStore(STORES.PENDING_SALES); // Kept as per request
      // await dbService.clearStore(STORES.SYNC_QUEUE); // Kept as per request

      toast.info("Re-fetching products...");
      await offlineSaleService.initializeProducts(
        user?.warehouse_id || undefined,
      );
      await offlineSaleService.initializeClients();

      toast.success("Data reset and products re-fetched successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset data:", error);
      toast.error("Failed to reset data");
    }
  };

  const theme = useTheme();
  const width = isSidebarCollapsed
    ? `calc(100% - ${COLLAPSED_DRAWER_WIDTH}px)`
    : `calc(100% - ${DRAWER_WIDTH}px)`;

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: width },
        mr: {
          sm: isSidebarCollapsed
            ? `${COLLAPSED_DRAWER_WIDTH}px`
            : `${DRAWER_WIDTH}px`,
        },
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: "blur(12px)",
        color: "text.primary",
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: "none",
        direction: "rtl",
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
          {location.pathname === "/sales/pos-blank" && (
            <Button
              variant="contained"
              color="info"
              size="small"
              startIcon={<TrendingUp size={16} />}
              onClick={() =>
                window.dispatchEvent(new CustomEvent("open-top-selling-dialog"))
              }
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              الأكثر مبيعاً
            </Button>
          )}

          {location.pathname === "/sales/pos-blank" && (
            <>
        
            </>
          )}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={() => setShortcutsDialogOpen(true)}
            color="inherit"
            title="اختصارات لوحة المفاتيح"
          >
            <Keyboard size={20} />
          </IconButton>

          <IconButton
            onClick={handleResetData}
            color="error"
            title="Reset Offline Data"
          >
            <RefreshCcw size={20} />
          </IconButton>

          {/* Warehouse Display */}
          {user?.warehouse && (
            <Chip
              icon={<Warehouse size={16} />}
              label={user.warehouse.name}
              size="small"
              onClick={() =>
                user.warehouse &&
                navigate(`/admin/warehouses/${user.warehouse.id}/products`)
              }
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 500,
                height: 28,
                cursor: "pointer",
                "& .MuiChip-icon": {
                  color: theme.palette.primary.main,
                },
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            />
          )}

          <ThemeToggle />

          {/* POS Mode Indicator - Icon only */}
          <IconButton
            color="inherit"
            title={posMode === "shift" ? "وضع الوردية" : "وضع الأيام"}
            sx={{
              color:
                posMode === "shift"
                  ? theme.palette.info.main
                  : theme.palette.success.main,
            }}
          >
            {posMode === "shift" ? (
              <Clock size={20} />
            ) : (
              <CalendarDays size={20} />
            )}
          </IconButton>

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
                {user.name
                  ? user.name.substring(0, 2).toUpperCase()
                  : user.username?.substring(0, 2).toUpperCase() || "U"}
              </Avatar>
            </ButtonBase>
          )}
        </Box>
      </Toolbar>

      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />
    </AppBar>
  );
};

export default TopAppBar;
