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
  Wifi,
  WifiOff,
  Calculator,
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
  posMode?: "shift" | "days"; // POS operation mode

  // Date Management (for days mode)
  selectedDate?: string;
  onDateSelect?: (date: string) => void;

  // Search / Cart
  products: Product[];
  onAddToCart: (product: Product) => void;
  onNewSale: () => void;
  onPaymentShortcut: () => void; // Trigger for '+' key (opens payment dialog)
  isSaleSelected: boolean;
  isPageLoading?: boolean; // Page loading state to disable PDF button
  // Drawer
  onDrawerToggle?: () => void;
  onShowSummary?: () => void;
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
      selectedDate,
      onDateSelect,
      products,
      onAddToCart,
      onNewSale,
      onPaymentShortcut,
      isSaleSelected,
      onDrawerToggle,
      onPrintShiftReport,
      onShowSummary,
      isPageLoading = false,
      posMode = "shift",
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
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          transition: "all 0.2s ease-in-out",
        }}
      >
        <Toolbar sx={{ gap: 3, height: 80, px: { xs: 2, sm: 3 } }}>
          {/* Brand / Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                bgcolor: "grey.50",
              },
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={onDrawerToggle}
              sx={{
                display: { sm: "none" },
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  bgcolor: "grey.100",
                  transform: "scale(1.05)",
                },
              }}
            >
              <MenuIcon size={20} />
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
                px: 1,
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
              maxWidth: 900,
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
                PaperComponent={(props) => (
                  <Box
                    {...props}
                    sx={{
                      bgcolor: "white",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                      borderRadius: 2,
                      mt: 1,
                      border: "1px solid",
                      borderColor: "grey.200",
                      overflow: "hidden",
                    }}
                  />
                )}
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
                      transition: "all 0.2s ease-in-out",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        fontSize: "0.95rem",
                        padding: "4px 8px",
                        transition: "all 0.2s ease-in-out",
                        "& fieldset": {
                          borderColor: "grey.200",
                          borderWidth: 1.5,
                        },
                        "&:hover": {
                          bgcolor: "grey.100",
                          "& fieldset": {
                            borderColor: "primary.light",
                          },
                        },
                        "&.Mui-focused": {
                          bgcolor: "white",
                          boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                          "& fieldset": {
                            borderColor: "primary.main",
                            borderWidth: 2,
                          },
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
                  <li
                    {...props}
                    key={option.id}
                    style={{
                      padding: "12px 16px",
                      transition: "all 0.15s ease-in-out",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                        alignItems: "center",
                        py: 0.5,
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
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 3,
                  width: "100%",
                  border: "1px dashed",
                  borderColor: "grey.300",
                  transition: "all 0.2s ease-in-out",
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
            startIcon={<Plus size={16} />}
            sx={{
              borderRadius: 3,
              textTransform: "none",
              bgcolor: "primary.main",
              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
              transition: "all 0.2s ease-in-out",
              px: 2,
              py: 0.75,
              minHeight: 32,
              fontWeight: 600,
              fontSize: "0.85rem",
              gap: 0.5,
              display: { xs: "none", md: "flex" },
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.35)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
                boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)",
              },
            }}
          >
            بيع جديد
          </Button>

          {/* Right Section: Status & Controls */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "nowrap",
            }}
          >
            {/* Online/Offline Status Indicator */}
            <Tooltip title={isOnline ? "متصل" : "غير متصل"}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: isOnline
                    ? alpha(theme.palette.success.main, 0.1)
                    : alpha(theme.palette.error.main, 0.1),
                  border: "1px solid",
                  borderColor: isOnline
                    ? alpha(theme.palette.success.main, 0.2)
                    : alpha(theme.palette.error.main, 0.2),
                }}
              >
                {isOnline ? (
                  <Wifi size={16} color={theme.palette.success.main} />
                ) : (
                  <WifiOff size={16} color={theme.palette.error.main} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: isOnline ? "success.main" : "error.main",
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    display: { xs: "none", lg: "block" },
                  }}
                >
                  {isOnline ? "متصل" : "غير متصل"}
                </Typography>
              </Box>
            </Tooltip>
            {/* Shift Navigation (Previous/Next) - Only show in shift mode */}
            {posMode === "shift" && (
              <Box
                sx={{
                  display: { xs: "none", lg: "flex" },
                  alignItems: "center",
                  bgcolor: "grey.50",
                  border: "1px solid",
                  borderColor: "grey.200",
                  borderRadius: 2.5,
                  p: 0.5,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.light",
                    bgcolor: "grey.100",
                  },
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
                  sx={{
                    transition: "all 0.2s ease-in-out",
                    "&:hover:not(:disabled)": {
                      bgcolor: "primary.light",
                      color: "primary.main",
                      transform: "scale(1.1)",
                    },
                  }}
                >
                  <ChevronRight size={18} />
                </IconButton>
                <Typography
                  variant="body2"
                  fontWeight="600"
                  sx={{
                    mx: 2,
                    minWidth: 70,
                    textAlign: "center",
                    color: "text.primary",
                    fontSize: "0.875rem",
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
                  sx={{
                    transition: "all 0.2s ease-in-out",
                    "&:hover:not(:disabled)": {
                      bgcolor: "primary.light",
                      color: "primary.main",
                      transform: "scale(1.1)",
                    },
                  }}
                >
                  <ChevronLeft size={18} />
                </IconButton>
              </Box>
            )}

            {/* Date Picker - Only show in days mode */}
            {/* {posMode === "days" && (
              <Box
                sx={{
                  display: { xs: "none", lg: "flex" },
                  alignItems: "center",
                  bgcolor: "grey.50",
                  border: "1px solid",
                  borderColor: "grey.200",
                  borderRadius: 2.5,
                  p: 0.5,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.light",
                    bgcolor: "grey.100",
                  },
                }}
              >
                <TextField
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateSelect?.(e.target.value)}
                  size="small"
                  sx={{
                    width: 150,
                    "& .MuiOutlinedInput-root": {
                      fontSize: "0.875rem",
                      "& fieldset": {
                        border: "none",
                      },
                    },
                  }}
                />
              </Box>
            )} */}

            {/* Sync Trigger */}
            <Tooltip title={isSyncing ? "جاري المزامنة..." : "مزامنة البيانات"}>
              <IconButton
                onClick={onTriggerSync}
                disabled={isSyncing}
                sx={{
                  border: "2px solid",
                  borderColor: isSyncing ? "primary.light" : "grey.300",
                  color: isSyncing ? "primary.main" : "text.secondary",
                  bgcolor: isSyncing
                    ? alpha(theme.palette.primary.main, 0.1)
                    : "transparent",
                  borderRadius: 2,
                  width: 44,
                  height: 44,
                  transition: "all 0.2s ease-in-out",
                  "&:hover:not(:disabled)": {
                    borderColor: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    transform: "scale(1.05)",
                  },
                }}
              >
                <RefreshCw
                  size={22}
                  className={isSyncing ? "animate-spin" : ""}
                />
              </IconButton>
            </Tooltip>

            {/* Calculator Summary Trigger */}
            <Tooltip title="ملخص الحسابات">
              <IconButton
                onClick={onShowSummary}
                sx={{
                  border: "2px solid",
                  borderColor: "grey.300",
                  color: "text.secondary",
                  borderRadius: 2,
                  width: 44,
                  height: 44,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Calculator size={22} />
              </IconButton>
            </Tooltip>

            {/* Shift Report Button - Only show in shift mode */}
            {posMode === "shift" && (
              <Tooltip
                title={
                  isPageLoading ? "جاري تحميل البيانات..." : "تقرير الوردية"
                }
              >
                <IconButton
                  onClick={onPrintShiftReport}
                  disabled={
                    !selectedShiftId ||
                    shiftLoading ||
                    isSyncing ||
                    isPageLoading
                  }
                  sx={{
                    border: "2px solid",
                    borderColor: "grey.300",
                    color: "text.secondary",
                    borderRadius: 2,
                    width: 44,
                    height: 44,
                    transition: "all 0.2s ease-in-out",
                    "&:hover:not(:disabled)": {
                      borderColor: "primary.main",
                      color: "primary.main",
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  <Printer size={22} />
                </IconButton>
              </Tooltip>
            )}

            {/* Shift Status Button - Only show in shift mode */}
            {posMode === "shift" && (
              <>
                {shift && shift.is_open ? (
                  // <Tooltip title="إغلاق الوردية">
                  //   <Button
                  //     variant="outlined"
                  //     color="success"
                  //     startIcon={
                  //       <Box
                  //         sx={{
                  //           width: 6,
                  //           height: 6,
                  //           borderRadius: "50%",
                  //           bgcolor: "success.main",
                  //           boxShadow: `0 0 0 2px ${alpha(
                  //             theme.palette.success.main,
                  //             0.2
                  //           )}`,
                  //           mr: 0.5,
                  //         }}
                  //       />
                  //     }
                  //     onClick={onCloseShift}
                  //     sx={{
                  //       borderWidth: 2,
                  //       borderColor: "success.light",
                  //       color: "success.dark",
                  //       textTransform: "none",
                  //       display: { xs: "none", md: "flex" },
                  //       borderRadius: 2.5,
                  //       px: 2,
                  //       py: 0.75,
                  //       minHeight: 32,
                  //       fontWeight: 600,
                  //       fontSize: "0.85rem",
                  //       gap: 0.5,
                  //       transition: "all 0.2s ease-in-out",
                  //       boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  //       "&:hover": {
                  //         borderColor: "error.main",
                  //         color: "error.main",
                  //         bgcolor: alpha(theme.palette.error.main, 0.05),
                  //         transform: "translateY(-1px)",
                  //         boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  //       },
                  //     }}
                  //   >
                  //     وردية مفتوحة
                  //   </Button>
                  // </Tooltip>
                  ''
                ) : (
                  <Button
                    variant="contained"
                    color="inherit"
                    onClick={onOpenShift}
                    disabled={shiftLoading}
                    sx={{
                      bgcolor: "text.primary",
                      color: "background.paper",
                      textTransform: "none",
                      borderRadius: 2.5,
                      px: 2,
                      py: 0.75,
                      minHeight: 32,
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      transition: "all 0.2s ease-in-out",
                      "&:hover:not(:disabled)": {
                        bgcolor: "text.secondary",
                        transform: "translateY(-1px)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      },
                    }}
                  >
                    {shiftLoading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      "فتح وردية"
                    )}
                  </Button>
                )}

                {shift && shift.is_open && (
                  <Tooltip title="إغلاق الوردية">
                    <IconButton
                      onClick={onCloseShift}
                      disabled={shiftLoading}
                      sx={{
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: "error.main",
                        border: "2px solid",
                        borderColor: "error.light",
                        borderRadius: 2,
                        width: 44,
                        height: 44,
                        transition: "all 0.2s ease-in-out",
                        "&:hover:not(:disabled)": {
                          bgcolor: "error.main",
                          color: "white",
                          transform: "scale(1.05)",
                          boxShadow: `0 2px 8px ${alpha(
                            theme.palette.error.main,
                            0.3
                          )}`,
                        },
                      }}
                    >
                      <X size={22} />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
    );
  }
);
