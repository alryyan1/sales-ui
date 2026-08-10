// src/components/pos/ExpiryProductsDialog.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { X, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/constants";

interface PurchaseItem {
  id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  batch_number?: string;
  expiry_date: string;
  sale_price?: number;
  unit_cost?: number;
  product?: {
    id: number;
    name: string;
    sku?: string;
    sellable_unit_name?: string;
  };
}

interface ExpiryProductsDialogProps {
  open: boolean;
  onClose: () => void;
  type: "near_expiring" | "expired" | null;
  items: PurchaseItem[];
  loading: boolean;
  onAddToCart: (productId: number, productName: string) => void;
  onMoveProduct?: (purchaseItemId: number) => void;
}

const ExpiryProductsDialog: React.FC<ExpiryProductsDialogProps> = ({
  open,
  onClose,
  type,
  items,
  loading,
  onAddToCart,
  onMoveProduct,
}) => {
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const { t: tExpiry } = useTranslation("expiryProductsDialog");

  const title =
    type === "near_expiring"
      ? tExpiry("nearExpiringTitle")
      : tExpiry("expiredTitle");

  const getExpiryColor = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return "error"; // Expired
    if (diffDays <= 7) return "error"; // Very close
    if (diffDays <= 30) return "warning"; // Near expiring
    return "success";
  };

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return tExpiry("expiredSinceDays", { days: Math.abs(diffDays) });
    if (diffDays === 0) return tExpiry("expiresToday");
    if (diffDays === 1) return tExpiry("expiresTomorrow");
    return tExpiry("daysRemaining", { days: diffDays });
  };

  const isExpired = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays < 0;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">{tExpiry("noProducts")}</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>{t("product")}</strong>
                  </TableCell>
                  <TableCell>
                    <strong>{tExpiry("barcodeHeader")}</strong>
                  </TableCell>
                  <TableCell>
                    <strong>{t("batch")}</strong>
                  </TableCell>
                  <TableCell>
                    <strong>{t("expiryDate")}</strong>
                  </TableCell>
                  <TableCell>
                    <strong>{tExpiry("statusHeader")}</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>{tExpiry("actionHeader")}</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const productName =
                    item.product_name || item.product?.name || "—";
                  const productSku =
                    item.product_sku || item.product?.sku || "—";
                  const productId = item.product_id || item.product?.id;

                  return (
                    <TableRow
                      key={item.id}
                      sx={{
                        bgcolor:
                          getExpiryColor(item.expiry_date) === "error"
                            ? "error.lighter"
                            : getExpiryColor(item.expiry_date) === "warning"
                              ? "warning.lighter"
                              : "inherit",
                      }}
                    >
                      <TableCell>{productName}</TableCell>
                      <TableCell>{productSku}</TableCell>
                      <TableCell>{item.batch_number || "—"}</TableCell>
                      <TableCell>{formatDate(item.expiry_date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={getDaysRemaining(item.expiry_date)}
                          color={getExpiryColor(item.expiry_date)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {getExpiryColor(item.expiry_date) === "error" &&
                        isExpired(item.expiry_date) ? (
                          onMoveProduct ? (
                            <Tooltip title={tExpiry("moveProductTooltip")}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => onMoveProduct(item.id)}
                              >
                                <Trash2 size={18} />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title={tExpiry("cannotSellExpiredTooltip")}>
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  disabled
                                  sx={{ cursor: "not-allowed" }}
                                >
                                  <Plus size={18} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )
                        ) : (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => onAddToCart(productId!, productName)}
                            disabled={!productId}
                          >
                            <Plus size={18} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {tCommon("close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpiryProductsDialog;
