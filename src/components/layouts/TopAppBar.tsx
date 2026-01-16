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
  TextField,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import {
  Menu as MenuIcon,
  Warehouse,
  RefreshCcw,
  Keyboard,
  Calendar,
  Hash,
  Clock,
  CalendarDays,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom"; // Import useNavigate and useLocation
import { usePosFilters } from "@/context/PosFilterContext";
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

// Separate component for POS filters to safely use the hook
const PosFiltersSection: React.FC = () => {
  const theme = useTheme();
  const posFilters = usePosFilters();

  const handleDateChange = async (date: string | null) => {
    posFilters.setFilterDate(date);
    if (date) {
      await posFilters.onFetchSalesByDate(date);
    } else {
      // If date is cleared, we should reload normal sales
      // This will be handled by PosPageOffline when it detects date change
      // For now, just clear the filter
    }
  };

  const handleIdKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && posFilters.filterSaleId.trim() !== "") {
      const searchId = Number(posFilters.filterSaleId.trim());
      if (!isNaN(searchId) && searchId > 0) {
        await posFilters.onFetchSaleById(searchId);
      }
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mr: 2,
      }}
    >
      {/* Date Filter */}
      <TextField
        type="date"
        size="small"
        value={posFilters.filterDate || ""}
        onChange={(e) => handleDateChange(e.target.value || null)}
        placeholder="التاريخ"
        disabled={posFilters.isLoadingDate}
        sx={{
          width: 160,
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            fontSize: "0.85rem",
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            "& fieldset": {
              borderColor: alpha(theme.palette.divider, 0.2),
            },
            "&:hover fieldset": {
              borderColor: theme.palette.primary.light,
            },
            "&.Mui-focused fieldset": {
              borderColor: theme.palette.primary.main,
            },
          },
        }}
        InputProps={{
          startAdornment: posFilters.isLoadingDate ? (
            <CircularProgress size={14} sx={{ mr: 1 }} />
          ) : (
            <Calendar
              size={16}
              color={theme.palette.text.secondary}
              style={{ marginRight: 8 }}
            />
          ),
        }}
      />

      {/* ID Filter */}
      <TextField
        type="number"
        size="small"
        value={posFilters.filterSaleId}
        onChange={(e) => {
          const value = e.target.value;
          // Only allow numeric input
          if (value === "" || /^\d+$/.test(value)) {
            posFilters.setFilterSaleId(value);
          }
        }}
        onKeyDown={handleIdKeyDown}
        placeholder="رقم العملية (Enter للبحث)"
        disabled={posFilters.isLoadingId}
        sx={{
          width: 180,
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            fontSize: "0.85rem",
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            "& fieldset": {
              borderColor: alpha(theme.palette.divider, 0.2),
            },
            "&:hover fieldset": {
              borderColor: theme.palette.primary.light,
            },
            "&.Mui-focused fieldset": {
              borderColor: theme.palette.primary.main,
            },
          },
        }}
        InputProps={{
          startAdornment: posFilters.isLoadingId ? (
            <CircularProgress size={14} sx={{ mr: 1 }} />
          ) : (
            <Hash
              size={16}
              color={theme.palette.text.secondary}
              style={{ marginRight: 8 }}
            />
          ),
        }}
      />
    </Box>
  );
};

const TopAppBar: React.FC<TopAppBarProps> = ({
  onDrawerToggle,
  isSidebarCollapsed,
  onMenuOpen,
}) => {
  const navigate = useNavigate(); // Initialize useNavigate
  const location = useLocation(); // Get current location
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = React.useState(false);

  // Check if we're on the POS offline page
  const isPosOfflinePage = location.pathname === "/sales/pos-offline";

  // Get POS mode setting
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  // Get POS filters - use a safe wrapper to avoid hook errors when not on POS page
  // We'll create a wrapper component for the filters section

  const handleResetData = async () => {
    if (
      !confirm(
        "Are you sure you want to refresh products and clients cache? Pending sales will be kept."
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
        user?.warehouse_id || undefined
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
          {/* Dynamic title could go here */}
        </Typography>

        {/* POS Filters - Only visible on POS Offline page */}
        {isPosOfflinePage && <PosFiltersSection />}

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
