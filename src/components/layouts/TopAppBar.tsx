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
  FileWarning as FileWarningIcon,
  Bell,
  DollarSign,
} from "lucide-react";
import ErrorIcon from "@mui/icons-material/Error";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Button,
  Badge,
  Popover,
  TextField,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import { useSettings } from "@/context/SettingsContext";
import { DRAWER_WIDTH } from "./types";
import { toast } from "sonner";
import { KeyboardShortcutsDialog } from "../common/KeyboardShortcutsDialog";
import { DueRemindersDialog } from "../pos/DueRemindersDialog";
import saleReminderService, { DueReminder } from "@/services/saleReminderService";
import { db } from "@/firebase";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import packageService, { Package } from "@/services/packageService";
import { formatNumber } from "@/constants";

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
  const { getSetting, updateSettings } = useSettings();
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = React.useState(false);
  
  // USD to SDG Factor state
  const usdFactor = getSetting("usd_to_sdg_factor", 1) as number;
  const [localFactor, setLocalFactor] = React.useState(String(usdFactor));
  const [factorAnchorEl, setFactorAnchorEl] =
    React.useState<HTMLDivElement | null>(null);
  const [isUpdatingFactor, setIsUpdatingFactor] = React.useState(false);

  // Packages state (Moved from POS)
  const [packageOptions, setPackageOptions] = React.useState<Package[]>([]);
  const [packageSearchLoading, setPackageSearchLoading] = React.useState(false);
  const [packageInputValue, setPackageInputValue] = React.useState("");
  const [isAddingPackage, setIsAddingPackage] = React.useState(false);
  
  const [expiryCounts, setExpiryCounts] = React.useState({
    nearExpiringCount: 0,
    expiredCount: 0,
  });
  const [dueReminders, setDueReminders] = React.useState<DueReminder[]>([]);
  const [remindersDialogOpen, setRemindersDialogOpen] = React.useState(false);
  const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;
  const [firebaseConnected, setFirebaseConnected] = React.useState(false);

  React.useEffect(() => {
    saleReminderService.getDueReminders()
      .then((list) => setDueReminders(list))
      .catch(() => { /* silent fail */ });
  }, []);

  // Search Packages logic
  React.useEffect(() => {
    const term = packageInputValue.trim();
    if (!term) {
      setPackageOptions([]);
      return;
    }
    const t = setTimeout(() => {
      setPackageSearchLoading(true);
      packageService
        .getPackages()
        .then((list) => {
          const filtered = list.filter((p) =>
            p.name.toLowerCase().includes(term.toLowerCase()),
          );
          setPackageOptions(filtered);
        })
        .catch(() => setPackageOptions([]))
        .finally(() => setPackageSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [packageInputValue]);

  // Listen for addition status from POS page
  React.useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsAddingPackage(customEvent.detail.isAdding);
      if (customEvent.detail.success) {
        setPackageInputValue("");
      }
    };
    window.addEventListener("package-addition-status", handleStatus);
    return () =>
      window.removeEventListener("package-addition-status", handleStatus);
  }, []);

  React.useEffect(() => {
    setLocalFactor(String(usdFactor));
  }, [usdFactor]);

  const handleFactorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setFactorAnchorEl(event.currentTarget);
  };

  const handleFactorClose = () => {
    setFactorAnchorEl(null);
  };

  const handleSaveFactor = async () => {
    const val = parseFloat(localFactor);
    if (isNaN(val) || val <= 0) {
      toast.error("يجب إدخال قيمة صحيحة موجبة");
      return;
    }
    try {
      setIsUpdatingFactor(true);
      await updateSettings({ usd_to_sdg_factor: val });
      handleFactorClose();
      toast.success("تم حفظ سعر الصرف بنجاح");
    } catch (err) {
      console.error("Failed to update factor:", err);
      toast.error("فشل حفظ سعر الصرف");
    } finally {
      setIsUpdatingFactor(false);
    }
  };

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

          {/* Package Search - Only on POS Page */}
          {location.pathname === "/sales/pos-blank" && (
            <Box sx={{ minWidth: 320 }}>
              <Autocomplete
                options={packageOptions}
                getOptionLabel={(option) => option.name}
                loading={packageSearchLoading || isAddingPackage}
                inputValue={packageInputValue}
                onInputChange={(_, value) => setPackageInputValue(value)}
                onChange={(_, value) => {
                  if (value) {
                    window.dispatchEvent(
                      new CustomEvent("add-package-to-sale", { detail: value }),
                    );
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="ابحث عن مجموعة"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {packageSearchLoading || isAddingPackage ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: alpha(theme.palette.background.paper, 0.5),
                        "& fieldset": {
                          borderColor: alpha(theme.palette.divider, 0.1),
                        },
                      },
                    }}
                  />
                )}
                noOptionsText={
                  packageInputValue.trim() ? "لا توجد مجموعات مطابقة" : "ابحث عن مجموعة"
                }
              />
            </Box>
          )}

          {/* USD Conversion Factor Display */}
          <Tooltip title={` SDG   ${formatNumber(usdFactor)} = 1 USD `}>
            <Box
              onClick={handleFactorClick}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                cursor: "pointer",
                height: 28,
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <DollarSign size={14} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {usdFactor.toFixed(2)}
              </Typography>
            </Box>
          </Tooltip>

          {/* USD Factor Popover */}
          <Popover
            open={Boolean(factorAnchorEl)}
            anchorEl={factorAnchorEl}
            onClose={handleFactorClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <Box sx={{ p: 2, minWidth: 250 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                تحديث سعر الصرف USD
              </Typography>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: 0.01, min: 0 }}
                label="سعر الصرف"
                value={localFactor}
                onChange={(e) => setLocalFactor(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleFactorClose}
                  disabled={isUpdatingFactor}
                >
                  إلغاء
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveFactor}
                  disabled={isUpdatingFactor}
                  startIcon={isUpdatingFactor ? <CircularProgress size={16} /> : undefined}
                >
                  حفظ
                </Button>
              </Box>
            </Box>
          </Popover>

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

          {/* Due Reminders Bell */}
          <Tooltip title="تذكيرات الدفع">
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
