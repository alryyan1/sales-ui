// src/components/pos/ExpiryProductsDialog.tsx
import React from "react";
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
import { X, Plus } from "lucide-react";
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
}

const ExpiryProductsDialog: React.FC<ExpiryProductsDialogProps> = ({
  open,
  onClose,
  type,
  items,
  loading,
  onAddToCart,
}) => {
  const title =
    type === "near_expiring"
      ? "منتجات قريبة من الانتهاء"
      : "منتجات منتهية الصلاحية";

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

    if (diffDays < 0) return `منتهي منذ ${Math.abs(diffDays)} يوم`;
    if (diffDays === 0) return "ينتهي اليوم";
    if (diffDays === 1) return "ينتهي غداً";
    return `${diffDays} يوم متبقي`;
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
            <Typography color="text.secondary">لا توجد منتجات</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>المنتج</strong>
                  </TableCell>
                  <TableCell>
                    <strong>الباركود</strong>
                  </TableCell>
                  <TableCell>
                    <strong>الدفعة</strong>
                  </TableCell>
                  <TableCell>
                    <strong>تاريخ الانتهاء</strong>
                  </TableCell>
                  <TableCell>
                    <strong>الحالة</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>إضافة</strong>
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
                        getDaysRemaining(item.expiry_date).includes("منتهي") ? (
                          <Tooltip title="لا يمكن بيع منتج منتهي الصلاحية">
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
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpiryProductsDialog;
