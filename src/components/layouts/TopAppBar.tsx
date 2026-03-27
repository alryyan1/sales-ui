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
  Tooltip,
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
import {
  Button,
  Badge,
} from "@mui/material";
import { useSettings } from "@/context/SettingsContext";
import { ThemeToggle } from "../layout/ThemeToggle";
import { DRAWER_WIDTH } from "./types";
import { dbService, STORES } from "../../services/db";
import { offlineSaleService } from "../../services/offlineSaleService";
import { toast } from "sonner";
import { KeyboardShortcutsDialog } from "../common/KeyboardShortcutsDialog";
import { db } from "@/firebase";
import { collection, query, limit, onSnapshot } from "firebase/firestore";

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
  const [firebaseConnected, setFirebaseConnected] = React.useState(false);
  const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;

  React.useEffect(() => {
    const q = query(collection(db, "pharmacies", firebaseCollectionName, "shifts"), limit(1));
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        setFirebaseConnected(!snapshot.metadata.fromCache);
      },
      () => {
        setFirebaseConnected(false);
      }
    );
    return () => unsubscribe();
  }, [firebaseCollectionName]);




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
              {/* Near Expiring Products Button */}
              <IconButton
                color="warning"
                size="small"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("open-near-expiring-dialog"),
                  )
                }
                sx={{
                  bgcolor: "warning.lighter",
                  "&:hover": { bgcolor: "warning.light" },
                  ml: 1,
                }}
              >
                <Badge
                  badgeContent={expiryCounts.nearExpiringCount}
                  color="warning"
                >
                  <FileWarningIcon size={20} />
                </Badge>
              </IconButton>

              {/* Expired Products Button */}
              <IconButton
                color="error"
                size="small"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-expired-dialog"))
                }
                sx={{
                  bgcolor: "error.lighter",
                  "&:hover": { bgcolor: "error.light" },
                  ml: 1,
                }}
              >
                <Badge
                  badgeContent={expiryCounts.expiredCount}
                  color={expiryCounts.expiredCount === 0 ? "info" : "error"}
                >
                  <ErrorIcon
                    fontSize="small"
                    color={expiryCounts.expiredCount === 0 ? "info" : "error"}
                  />
                </Badge>
              </IconButton>
            </>
          )}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>

          {/* Firebase Connection Indicator */}
          <Tooltip title={`pharmacies/${firebaseCollectionName}/shifts`}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, cursor: "default" }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: firebaseConnected ? "#22c55e" : "#9ca3af",
                  boxShadow: firebaseConnected
                    ? "0 0 0 3px rgba(34,197,94,0.25)"
                    : "none",
                  transition: "all 0.3s ease",
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: firebaseConnected ? "#22c55e" : "text.disabled",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  letterSpacing: 0.3,
                  transition: "color 0.3s ease",
                }}
              >
                {firebaseCollectionName}
              </Typography>
            </Box>
          </Tooltip>

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

          {/* <ThemeToggle /> */}

          {/* USD to SDG Factor */}
    


    

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
