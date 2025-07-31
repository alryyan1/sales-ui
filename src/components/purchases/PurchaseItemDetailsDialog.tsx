// src/components/purchases/PurchaseItemDetailsDialog.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

// Types
import { Product } from "../../services/productService";
import { formatNumber, formatCurrency } from "@/constants";
import dayjs from "dayjs";

interface PurchaseItem {
  id: number;
  product_id: number;
  product: Product;
  batch_number?: string;
  quantity: number;
  unit_cost: number;
  sale_price?: number;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

interface Purchase {
  id: number;
  purchase_date: string;
  reference_number?: string;
  supplier_name?: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: PurchaseItem[];
}

interface PurchaseItemDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  purchases: Purchase[];
  isLoading?: boolean;
}

export const PurchaseItemDetailsDialog: React.FC<PurchaseItemDetailsDialogProps> = ({
  open,
  onClose,
  product,
  purchases,
  isLoading = false,
}) => {
  const { t } = useTranslation(["purchases", "common"]);

  if (!product) return null;

  // Filter purchase items for this specific product
  const productPurchaseItems = purchases.flatMap(purchase =>
    purchase.items
      .filter(item => item.product_id === product.id)
      .map(item => ({
        ...item,
        purchase,
      }))
  );

  const totalQuantity = productPurchaseItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = productPurchaseItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  const averageUnitCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: "60vh",
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" component="span">
            {t("purchases:productPurchaseHistory")}
          </Typography>
          <Chip
            label={product.sku || t("common:n/a")}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
          {product.name}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <Typography>{t("common:loading")}</Typography>
          </Box>
        ) : productPurchaseItems.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              {t("purchases:noPurchaseHistoryForProduct")}
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Summary Cards */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2, mb: 3 }}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6" color="primary">
                  {formatNumber(totalQuantity)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("purchases:totalQuantityPurchased")}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6" color="primary">
                  {formatCurrency(totalCost)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("purchases:totalCost")}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6" color="primary">
                  {formatCurrency(averageUnitCost)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("purchases:averageUnitCost")}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6" color="primary">
                  {productPurchaseItems.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("purchases:totalPurchaseItems")}
                </Typography>
              </Paper>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Purchase Items Table */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t("purchases:purchaseItemDetails")}
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("purchases:purchaseId")}</TableCell>
                    <TableCell>{t("purchases:purchaseDate")}</TableCell>
                    <TableCell>{t("purchases:supplier")}</TableCell>
                    <TableCell>{t("purchases:batchNumber")}</TableCell>
                    <TableCell>{t("purchases:quantity")}</TableCell>
                    <TableCell>{t("purchases:unitCost")}</TableCell>
                    <TableCell>{t("purchases:itemTotal")}</TableCell>
                    <TableCell>{t("purchases:expiryDate")}</TableCell>
                    <TableCell>{t("purchases:status")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productPurchaseItems.map((item) => (
                    <TableRow key={`${item.purchase.id}-${item.id}`}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          #{item.purchase.id}
                        </Typography>
                        {item.purchase.reference_number && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.purchase.reference_number}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {dayjs(item.purchase.purchase_date).format("YYYY-MM-DD")}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.purchase.supplier_name || t("common:n/a")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.batch_number || t("common:n/a")}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatNumber(item.quantity)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product.stocking_unit_name || t("common:unit")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.unit_cost)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatCurrency(item.quantity * item.unit_cost)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.expiry_date ? dayjs(item.expiry_date).format("YYYY-MM-DD") : t("common:n/a")}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t(`purchases:status_${item.purchase.status}`)}
                          size="small"
                          color={
                            item.purchase.status === "received"
                              ? "success"
                              : item.purchase.status === "pending"
                              ? "warning"
                              : "default"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t("common:close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 