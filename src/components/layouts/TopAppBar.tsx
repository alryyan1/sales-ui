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
  TrendingUp,
  Bell,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button,
  Badge,
} from "@mui/material";
import { useSettings } from "@/context/SettingsContext";
import { DRAWER_WIDTH } from "./types";
import { KeyboardShortcutsDialog } from "../common/KeyboardShortcutsDialog";
import { DueRemindersDialog } from "../pos/DueRemindersDialog";
import LanguageSwitcher from "../common/LanguageSwitcher";
import saleReminderService, { DueReminder } from "@/services/saleReminderService";
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
  const { t } = useTranslation(["pos"]);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = React.useState(false);

  const [dueReminders, setDueReminders] = React.useState<DueReminder[]>([]);
  const [remindersDialogOpen, setRemindersDialogOpen] = React.useState(false);
  const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;
  const [firebaseConnected, setFirebaseConnected] = React.useState(false);

  React.useEffect(() => {
    saleReminderService.getDueReminders()
      .then((list) => setDueReminders(list))
      .catch(() => { /* silent fail */ });
  }, []);

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




  const theme = useTheme();
  const width = isSidebarCollapsed
    ? `calc(100% - ${COLLAPSED_DRAWER_WIDTH}px)`
    : `calc(100% - ${DRAWER_WIDTH}px)`;

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: width },
        // always "ml" — the RTL emotion cache auto-flips this to margin-right
        // when Arabic is active (see RootLayout.tsx's drawerAnchor note)
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
              {t("pos:topSellingButton")}
            </Button>
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

          <LanguageSwitcher />

          {/* Due Reminders Bell */}
          <Tooltip title={t("pos:dueReminders")}>
            <IconButton
              size="small"
              color={dueReminders.length > 0 ? "warning" : "default"}
              onClick={() => setRemindersDialogOpen(true)}
              sx={{
                bgcolor: dueReminders.length > 0 ? "warning.lighter" : undefined,
                "&:hover": { bgcolor: dueReminders.length > 0 ? "warning.light" : undefined },
              }}
            >
              <Badge badgeContent={dueReminders.length} color="warning" max={99}>
                <Bell size={20} fill={dueReminders.length > 0 ? "currentColor" : "none"} />
              </Badge>
            </IconButton>
          </Tooltip>

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

      <DueRemindersDialog
        open={remindersDialogOpen}
        reminders={dueReminders}
        onDismiss={(id) => setDueReminders((prev) => prev.filter((r) => r.id !== id))}
        onClose={() => setRemindersDialogOpen(false)}
      />

      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />
    </AppBar>
  );
};

export default TopAppBar;
