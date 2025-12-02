// src/components/purchases/PurchaseItemDetailsDialog.tsx
import React from "react";

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
      <DialogTitle sx={{ direction: "rtl" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" component="span">
            سجل مشتريات المنتج
          </Typography>
          <Chip
            label={product.sku || "-"}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
          {product.name}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ direction: "rtl" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <Typography>جاري التحميل...</Typography>
          </Box>
        ) : productPurchaseItems.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              لا يوجد سجل مشتريات لهذا المنتج.
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
                  إجمالي الكمية المشتراة
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6" color="primary">
                  {formatCurrency(totalCost)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي تكلفة المشتريات
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6" color="primary">
                  {formatCurrency(averageUnitCost)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  متوسط تكلفة الوحدة
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h6" color="primary">
                  {productPurchaseItems.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  عدد بنود الشراء
                </Typography>
              </Paper>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Purchase Items Table */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              تفاصيل بنود الشراء
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الشراء</TableCell>
                    <TableCell>تاريخ الشراء</TableCell>
                    <TableCell>المورد</TableCell>
                    <TableCell>رقم الدفعة</TableCell>
                    <TableCell>الكمية</TableCell>
                    <TableCell>تكلفة الوحدة</TableCell>
                    <TableCell>إجمالي البند</TableCell>
                    <TableCell>تاريخ الانتهاء</TableCell>
                    <TableCell>الحالة</TableCell>
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
                          {item.purchase.supplier_name || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.batch_number || "-"}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatNumber(item.quantity)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product.stocking_unit_name || "وحدة"}
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
                        {item.expiry_date ? dayjs(item.expiry_date).format("YYYY-MM-DD") : "-"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            item.purchase.status === "received"
                              ? "تم الاستلام"
                              : item.purchase.status === "pending"
                              ? "قيد الانتظار"
                              : "تم الطلب"
                          }
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

      <DialogActions sx={{ direction: "rtl" }}>
        <Button onClick={onClose} variant="outlined">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 