import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  IconButton,
  Avatar,
  Slide,
  useTheme,
  alpha,
  Skeleton,
  Stack,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import QrCodeOutlinedIcon from "@mui/icons-material/QrCodeOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import reportService, { BestSellingProduct } from "@/services/reportService";
import { formatNumber } from "@/constants";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface TopSellingProductsDialogProps {
  open: boolean;
  onClose: () => void;
  onAddProduct: (productId: number, productName: string) => Promise<void>;
}

const Transition = React.forwardRef(function Transition(
  props: React.ComponentPropsWithoutRef<typeof Slide>,
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function TopSellingProductsDialog({
  open,
  onClose,
  onAddProduct,
}: TopSellingProductsDialogProps) {
  const { t } = useTranslation(["pos"]);
  const theme = useTheme();
  const [products, setProducts] = useState<BestSellingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  const fetchTopSelling = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reportService.getBestSellingProducts(30, 20);
      setProducts(data || []);
    } catch (err) {
      console.error("Failed to fetch top selling products:", err);
      toast.error(t("pos:topSellingDialog.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTopSelling();
    }
  }, [open, fetchTopSelling]);

  const handleAdd = async (product: BestSellingProduct) => {
    if (product.current_stock <= 0) {
      toast.error(t("pos:topSellingDialog.outOfStock"));
      return;
    }
    try {
      setAddingId(product.id);
      await onAddProduct(product.id, product.name);
    } finally {
      setAddingId(null);
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return { bg: "#FFD700", text: "#8B6508" }; // Gold
      case 1:
        return { bg: "#E0E0E0", text: "#616161" }; // Silver
      case 2:
        return { bg: "#CD7F32", text: "#5C3A21" }; // Bronze
      default:
        return {
          bg: alpha(theme.palette.primary.main, 0.1),
          text: theme.palette.primary.main,
        };
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 24px 48px rgba(0,0,0,0.5)"
              : "0 24px 48px rgba(0,0,0,0.1)",
          overflow: "hidden",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          px: 3,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "#fff",
              backdropFilter: "blur(10px)",
            }}
          >
            <TrendingUpIcon />
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              fontWeight="bold"
              color="white"
              sx={{ lineHeight: 1.2 }}
            >
              {t("pos:topSellingDialog.title")}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.8)" }}
            >
              {t("pos:topSellingDialog.subtitle")}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: "white",
            bgcolor: "rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent
        sx={{
          p: 0,
          background: theme.palette.mode === "dark" ? "#121212" : "#F8FAFC",
        }}
      >
        {loading ? (
          <Box sx={{ p: 3 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  gap: 2,
                  mb: 2,
                  p: 2,
                  bgcolor: "background.paper",
                  borderRadius: 2,
                }}
              >
                <Skeleton variant="circular" width={44} height={44} />
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Skeleton
                    variant="text"
                    width="60%"
                    height={24}
                    sx={{ borderRadius: 1 }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width="40%"
                    height={20}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
                <Skeleton
                  variant="rectangular"
                  width={120}
                  height={40}
                  sx={{ borderRadius: "10px" }}
                />
              </Box>
            ))}
          </Box>
        ) : products.length === 0 ? (
          <Box
            sx={{
              p: 8,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: alpha(theme.palette.text.secondary, 0.1),
                color: "text.secondary",
                mb: 2,
              }}
            >
              <Inventory2OutlinedIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h6" color="text.secondary" fontWeight="bold">
              {t("pos:topSellingDialog.noDataTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("pos:topSellingDialog.noDataSubtitle")}
            </Typography>
          </Box>
        ) : (
          <List
            sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {products.map((product, index) => {
              const rank = getRankColor(index);
              const isOutOfStock = product.current_stock <= 0;

              return (
                <ListItem
                  key={product.id}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    p: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.2s ease",
                    border: "1px solid",
                    borderColor:
                      theme.palette.mode === "dark" ? "divider" : "transparent",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 2.5,
                    }}
                  >
                    {/* RANK INDICATOR */}
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: "12px",
                        bgcolor: rank.bg,
                        color: rank.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        boxShadow:
                          index < 3
                            ? `0 4px 12px ${alpha(rank.bg, 0.4)}`
                            : "none",
                      }}
                    >
                      #{index + 1}
                    </Box>

                    {/* PRODUCT INFO */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="700"
                        sx={{
                          mb: 0.5,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {product.name}
                      </Typography>

                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={2}
                        alignItems="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: "text.secondary",
                          }}
                        >
                          <QrCodeOutlinedIcon sx={{ fontSize: 16 }} />
                          <Typography
                            variant="caption"
                            fontFamily="monospace"
                            fontSize="0.75rem"
                          >
                            {product.sku || "N/A"}
                          </Typography>
                        </Box>

                        <Tooltip title={t("pos:topSellingDialog.quantitySoldTooltip")}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              color: "text.secondary",
                            }}
                          >
                            <SellOutlinedIcon
                              sx={{
                                fontSize: 16,
                                color: theme.palette.success.main,
                              }}
                            />
                            <Typography variant="caption" fontWeight="bold">
                              {formatNumber(product.total_quantity_sold)}
                            </Typography>
                          </Box>
                        </Tooltip>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Inventory2OutlinedIcon
                            sx={{
                              fontSize: 16,
                              color: isOutOfStock
                                ? theme.palette.error.main
                                : theme.palette.info.main,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color={
                              isOutOfStock ? "error.main" : "text.secondary"
                            }
                            fontWeight={isOutOfStock ? "bold" : "regular"}
                          >
                            {t("pos:topSellingDialog.stockLabel", {
                              value: isOutOfStock ? t("pos:topSellingDialog.outOfStockValue") : product.current_stock,
                            })}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    {/* ACTION BUTTON */}
                    <Button
                      variant={isOutOfStock ? "outlined" : "contained"}
                      color={isOutOfStock ? "error" : "primary"}
                      startIcon={
                        addingId === product.id ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <AddShoppingCartIcon />
                        )
                      }
                      onClick={() => handleAdd(product)}
                      disabled={addingId === product.id || isOutOfStock}
                      disableElevation
                      sx={{
                        borderRadius: "10px",
                        px: 3,
                        py: 1,
                        fontWeight: "bold",
                        textTransform: "none",
                        minWidth: 120,
                      }}
                    >
                      {isOutOfStock ? t("pos:topSellingDialog.outOfStockButton") : t("pos:topSellingDialog.addButton")}
                    </Button>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: "8px", px: 3, fontWeight: "bold" }}
        >
          {t("pos:topSellingDialog.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
