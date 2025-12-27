import React, { useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  TextField,
  Autocomplete,
  Tooltip,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Menu as MenuIcon,
  Printer,
} from "lucide-react";
import { Product } from "../../services/productService";
import { formatNumber } from "@/constants";

interface Shift {
  id: number;
  opened_at: string | null;
  closed_at: string | null;
  is_open: boolean;
}

interface PosOfflineHeaderProps {
  // Sync Status
  isOnline: boolean;
  isSyncing: boolean;
  onTriggerSync: () => void;

  // Shift Management
  shift: Shift | null;
  shiftLoading: boolean;
  onOpenShift: () => void;
  onCloseShift: () => void;
  selectedShiftId: number | null;
  availableShiftIds: number[];
  onShiftSelect: (id: number | null) => void;
  onPrintShiftReport: () => void;

  // Search / Cart
  products: Product[];
  onAddToCart: (product: Product) => void;
  onNewSale: () => void;
  onPaymentShortcut: () => void; // Trigger for '+' key (opens payment dialog)
  isSaleSelected: boolean;
  // Drawer
  onDrawerToggle?: () => void;
}

export interface PosOfflineHeaderRef {
  focusSearch: () => void;
}

export const PosOfflineHeader = React.forwardRef<
  PosOfflineHeaderRef,
  PosOfflineHeaderProps
>(
  (
    {
      isOnline,
      isSyncing,
      onTriggerSync,
      shift,
      shiftLoading,
      onOpenShift,
      onCloseShift,
      selectedShiftId,
      availableShiftIds,
      onShiftSelect,
      products,
      onAddToCart,
      onNewSale,
      onPaymentShortcut,
      isSaleSelected,
      onDrawerToggle,
      onPrintShiftReport,
    },
    ref
  ) => {
    const theme = useTheme();
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState("");
    const [autocompleteOpen, setAutocompleteOpen] = useState(false);

    React.useImperativeHandle(ref, () => ({
      focusSearch: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
    }));

    return (
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "white",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ gap: 2, height: 70 }}>
          {/* Brand / Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={onDrawerToggle}
              sx={{ display: { sm: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h5"
              fontWeight="900"
              sx={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                backgroundClip: "text",
                color: "transparent",
                letterSpacing: "-0.5px",
                display: { xs: "none", sm: "block" },
              }}
            >
              NEXT POS
            </Typography>
          </Box>

          {/* Center: Search Bar */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              maxWidth: 600,
              mx: "auto",
            }}
          >
            {isSaleSelected ? (
              <Autocomplete
                open={autocompleteOpen}
                onOpen={() => setAutocompleteOpen(true)}
                onClose={() => setAutocompleteOpen(false)}
                options={products}
                getOptionLabel={(option) =>
                  `${option.name} (${option.sku || "No SKU"})`
                }
                value={null}
                inputValue={inputValue}
                onInputChange={(_, newInputValue) => {
                  setInputValue(newInputValue);
                }}
                autoHighlight
                fullWidth
                onChange={(_, newValue) => {
                  if (newValue) {
                    onAddToCart(newValue);
                    setInputValue("");
                    // Keep focus
                    setTimeout(() => {
                      inputRef.current?.focus();
                    }, 100);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={inputRef}
                    autoFocus
                    placeholder="اسحب أو ابحث عن منتج..."
                    size="small"
                    sx={{
                      bgcolor: "grey.50",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        "& fieldset": { borderColor: "grey.200" },
                        "&:hover fieldset": { borderColor: "primary.main" },
                        "&.Mui-focused fieldset": {
                          borderColor: "primary.main",
                        },
                      },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <Search
                          size={18}
                          color={theme.palette.text.secondary}
                          style={{ marginRight: 8, marginLeft: 4 }}
                        />
                      ),
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "+") {
                        e.preventDefault();
                        onPaymentShortcut();
                        return;
                      }
                      if (e.key === "Enter" && inputValue) {
                        const exactMatch = products.find(
                          (p) =>
                            p.sku === inputValue || p.sku === inputValue.trim()
                        );
                        if (exactMatch) {
                          onAddToCart(exactMatch);
                          setInputValue("");
                          setAutocompleteOpen(false); // Close dropdown
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                      }
                      if (params.inputProps.onKeyDown) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (params.inputProps.onKeyDown as any)(e);
                      }
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.sku}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography color="primary.main" fontWeight="bold">
                          {(() => {
                            let price = Number(
                              option.last_sale_price_per_sellable_unit || 0
                            );
                            if (
                              price === 0 &&
                              option.available_batches &&
                              option.available_batches.length > 0
                            ) {
                              price = Number(
                                option.available_batches[0].sale_price || 0
                              );
                            }
                            return formatNumber(price);
                          })()}
                        </Typography>
                        {/* Stock Warning */}
                        {(() => {
                          const currentStock =
                            option.current_stock_quantity ?? 0;
                          const totalStock = option.stock_quantity ?? 0;

                          if (currentStock <= 0) {
                            if (totalStock > 0) {
                              return (
                                <Typography
                                  variant="caption"
                                  color="warning.main"
                                >
                                  {`المخزون الكلي: ${totalStock}`}
                                </Typography>
                              );
                            }
                            return (
                              <Typography variant="caption" color="error.main">
                                نفذت الكمية
                              </Typography>
                            );
                          }
                          return null;
                        })()}
                      </Box>
                    </Box>
                  </li>
                )}
                filterOptions={(options, state) => {
                  const val = state.inputValue.toLowerCase();
                  const filtered = options.filter(
                    (option) =>
                      option.name.toLowerCase().includes(val) ||
                      (option.sku && option.sku.toLowerCase().includes(val))
                  );
                  return filtered.sort((a, b) => {
                    const aSku = a.sku?.toLowerCase() || "";
                    const bSku = b.sku?.toLowerCase() || "";
                    const exactA = aSku === val;
                    const exactB = bSku === val;
                    if (exactA && !exactB) return -1;
                    if (!exactA && exactB) return 1;
                    return 0;
                  });
                }}
                clearOnBlur
                handleHomeEndKeys
              />
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{
                  p: 1,
                  bgcolor: "grey.50",
                  borderRadius: 2,
                  width: "100%",
                }}
              >
                يرجى تحديد أو إنشاء عملية بيع للبحث عن المنتجات
              </Typography>
            )}
          </Box>

          {/* Actions Button */}
          <Button
            variant="contained"
            onClick={onNewSale}
            startIcon={<Plus size={18} />}
            sx={{
              borderRadius: 8, // More rounded for "bubble" look
              textTransform: "none",
              bgcolor: "primary.main",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.5)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.5)",
                transform: "translateY(-2px)",
              },
              "&:active": {
                transform: "scale(0.95) translateY(0)",
                boxShadow: "0 2px 4px -1px rgba(59, 130, 246, 0.5)",
              },
              display: { xs: "none", md: "flex" },
              px: 3,
            }}
          >
            بيع جديد
          </Button>

          {/* Right Section: Status & Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Shift Navigation (Previous/Next) */}
            <Box
              sx={{
                display: { xs: "none", lg: "flex" },
                alignItems: "center",
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "grey.200",
                borderRadius: 2,
                p: 0.5,
              }}
            >
              <IconButton
                size="small"
                onClick={() =>
                  onShiftSelect(selectedShiftId ? selectedShiftId + 1 : null)
                }
                disabled={
                  !selectedShiftId ||
                  (availableShiftIds.length > 0 &&
                    selectedShiftId >= Math.max(...availableShiftIds))
                }
              >
                <ChevronRight size={18} />
              </IconButton>
              <Typography
                variant="body2"
                fontWeight="600"
                sx={{
                  mx: 2,
                  minWidth: 60,
                  textAlign: "center",
                  color: "text.primary",
                }}
              >
                وردية #{selectedShiftId || "-"}
              </Typography>

              <IconButton
                size="small"
                onClick={() =>
                  onShiftSelect(selectedShiftId ? selectedShiftId - 1 : null)
                }
                disabled={
                  !selectedShiftId ||
                  (availableShiftIds.length > 0 &&
                    selectedShiftId <= Math.min(...availableShiftIds))
                }
              >
                <ChevronLeft size={18} />
              </IconButton>
            </Box>

            {/* Sync Trigger */}
            <Tooltip title={isSyncing ? "جاري المزامنة..." : "مزامنة البيانات"}>
              <IconButton
                onClick={onTriggerSync}
                disabled={isSyncing}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  color: isSyncing ? "primary.main" : "text.secondary",
                  bgcolor: isSyncing
                    ? alpha(theme.palette.primary.main, 0.1)
                    : "transparent",
                }}
              >
                <RefreshCw
                  size={20}
                  className={isSyncing ? "animate-spin" : ""}
                />
              </IconButton>
            </Tooltip>

            {/* Shift Report Button */}
            <Tooltip title="تقرير الوردية">
              <IconButton
                onClick={onPrintShiftReport}
                disabled={!selectedShiftId}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                  mr: 1,
                }}
              >
                <Printer size={20} />
              </IconButton>
            </Tooltip>

            {/* Shift Status Button */}
            {shift && shift.is_open ? (
              <Tooltip title="إغلاق الوردية">
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                  }
                  onClick={onCloseShift}
                  sx={{
                    borderColor: "success.light",
                    color: "success.dark",
                    textTransform: "none",
                    display: { xs: "none", md: "flex" },
                    "&:hover": {
                      borderColor: "error.main",
                      color: "error.main",
                    },
                  }}
                >
                  وردية مفتوحة
                </Button>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                color="inherit"
                onClick={onOpenShift}
                disabled={shiftLoading || !isOnline}
                sx={{
                  bgcolor: "text.primary",
                  color: "background.paper",
                  "&:hover": { bgcolor: "text.secondary" },
                  textTransform: "none",
                }}
              >
                {shiftLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  "فتح وردية"
                )}
              </Button>
            )}

            {shift && shift.is_open && (
              <Tooltip title="إغلاق الوردية">
                <IconButton
                  onClick={onCloseShift}
                  disabled={shiftLoading || !isOnline}
                  size="small"
                  sx={{
                    bgcolor: "error.lighter",
                    color: "error.main",
                    border: "1px solid",
                    borderColor: "error.light",
                    "&:hover": { bgcolor: "error.main", color: "white" },
                  }}
                >
                  <X size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>
    );
  }
);
