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
  CircularProgress,
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
  DollarSign,
  Check,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Button,
  Popover,
  TextField,
  InputAdornment,
} from "@mui/material";
import { useSettings } from "@/context/SettingsContext";
import { ThemeToggle } from "../layout/ThemeToggle";
import { DRAWER_WIDTH } from "./types";
import { dbService, STORES } from "../../services/db";
import { offlineSaleService } from "../../services/offlineSaleService";
import { toast } from "sonner";
import { KeyboardShortcutsDialog } from "../common/KeyboardShortcutsDialog";
import packageService, { Package } from "@/services/packageService";
import { FileText } from "lucide-react";
import { Autocomplete } from "@mui/material";

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
    if (!user?.permissions?.includes("update-dollar-rate")) {
      toast.error("ليس لديك صلاحية لتعديل معامل تحويل الدولار");
      return;
    }
    setFactorAnchorEl(event.currentTarget);
  };

  const handleFactorClose = () => {
    setFactorAnchorEl(null);
  };

  const handleSaveFactor = async () => {
    const val = parseFloat(localFactor);
    if (isNaN(val) || val <= 0) {
      toast.error("يرجى إدخال معامل تحويل صحيح");
      return;
    }
    try {
      setIsUpdatingFactor(true);
      await updateSettings({ usd_to_sdg_factor: val });
      handleFactorClose();
    } catch (err) {
      console.error("Failed to update factor:", err);
    } finally {
      setIsUpdatingFactor(false);
    }
  };

  React.useEffect(() => {
    const handleUpdateCounts = () => {
      // Logic for updating counts if needed, but the state was removed
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
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            gap: 2,
            overflow: "hidden",
          }}
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
                    placeholder="إضافة مجموعة (Package)..."
                    size="small"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <FileText size={18} />
                        </InputAdornment>
                      ),
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
                  packageInputValue.trim() ? "لا توجد نتائج" : "اكتب للبحث"
                }
              />
            </Box>
          )}
        </Box>

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

          {/* USD to SDG Factor */}
          <Chip
            icon={<DollarSign size={16} />}
            label={`USD: ${usdFactor}`}
            size="small"
            onClick={handleFactorClick}
            sx={{
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.main,
              fontWeight: 600,
              height: 28,
              cursor: "pointer",
              "& .MuiChip-icon": {
                color: theme.palette.warning.main,
              },
              "&:hover": {
                bgcolor: alpha(theme.palette.warning.main, 0.2),
              },
            }}
          />

          <Popover
            open={Boolean(factorAnchorEl)}
            anchorEl={factorAnchorEl}
            onClose={handleFactorClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "center",
            }}
            PaperProps={{
              sx: { p: 2, width: 220, borderRadius: 2, mt: 1 },
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              معامل تحويل الدولار (USD → SDG)
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={localFactor}
              onChange={(e) => setLocalFactor(e.target.value)}
              placeholder="مثلاً: 3600"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveFactor();
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleSaveFactor}
                      disabled={isUpdatingFactor}
                      color="primary"
                    >
                      {isUpdatingFactor ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Popover>

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
