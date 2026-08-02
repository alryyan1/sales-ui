// src/components/products/ProductContextMenu.tsx
import React, { useState } from "react";
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Pagination,
  Chip,
  IconButton,
} from "@mui/material";
import {
  Edit,
  Trash2,
  Copy,
  History,
  TrendingUp,
  Barcode,
  FileText,
  Star,
  ArrowRight,
} from "lucide-react";
import { Product } from "../../services/productService";
import productService from "../../services/productService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/constants";
import dayjs from "dayjs";

interface ProductContextMenuProps {
  anchorPosition: { left: number; top: number } | undefined;
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onBarcodeLabel: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onExport: (product: Product) => void;
  onDelete: (product: Product) => void;
  onCopyInfo: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  isFavorite?: boolean;
}

type HistoryDialog = "purchase" | "sales" | null;

export const ProductContextMenu: React.FC<ProductContextMenuProps> = ({
  anchorPosition,
  open,
  onClose,
  product,
  onEdit,
  onBarcodeLabel,
  onDuplicate,
  onExport,
  onDelete,
  onCopyInfo,
  onToggleFavorite,
  isFavorite = false,
}) => {
  const navigate = useNavigate();
  const [historyDialog, setHistoryDialog] = useState<HistoryDialog>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  if (!product) return null;

  const openPurchaseDetails = (purchaseId: number) => {
    navigate(`/purchases/${purchaseId}/manage-items`);
    onClose();
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const openHistory = async (type: HistoryDialog, page = 1) => {
    if (!product) return;
    setHistoryDialog(type);
    setHistoryPage(page);
    setHistoryLoading(true);
    setHistoryData(null);
    onClose();
    try {
      const data =
        type === "purchase"
          ? await productService.getProductPurchaseHistory(product.id, page)
          : await productService.getProductSalesHistory(product.id, page);
      setHistoryData(data);
    } catch {
      toast.error("فشل في تحميل السجل");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryPageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    openHistory(historyDialog, page);
  };

  const closeHistory = () => {
    setHistoryDialog(null);
    setHistoryData(null);
    setHistoryPage(1);
  };

  return (
    <>
      <Menu
        open={open}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition}
        PaperProps={{
          sx: {
            minWidth: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            borderRadius: 2,
          },
        }}
      >
        {/* Primary Actions */}
        <MenuItem onClick={() => handleAction(() => onEdit(product))}>
          <ListItemIcon><Edit size={18} /></ListItemIcon>
          <ListItemText primary="تعديل المنتج" />
        </MenuItem>

        <MenuItem onClick={() => handleAction(() => onDuplicate(product))}>
          <ListItemIcon><Copy size={18} /></ListItemIcon>
          <ListItemText primary="نسخ المنتج" />
        </MenuItem>

        <Divider />

        {/* History */}
        <MenuItem onClick={() => openHistory("purchase")}>
          <ListItemIcon><History size={18} /></ListItemIcon>
          <ListItemText primary="سجل المشتريات" />
        </MenuItem>

        <MenuItem onClick={() => openHistory("sales")}>
          <ListItemIcon><TrendingUp size={18} /></ListItemIcon>
          <ListItemText primary="سجل المبيعات" />
        </MenuItem>

        <Divider />

        {/* Quick Actions */}
        <MenuItem onClick={() => handleAction(() => onBarcodeLabel(product))}>
          <ListItemIcon><Barcode size={18} /></ListItemIcon>
          <ListItemText primary="طباعة الباركود" />
        </MenuItem>

        <Divider />

        {/* Data Actions */}
        <MenuItem onClick={() => handleAction(() => onCopyInfo(product))}>
          <ListItemIcon><FileText size={18} /></ListItemIcon>
          <ListItemText primary="نسخ معلومات المنتج" />
        </MenuItem>

        <MenuItem onClick={() => handleAction(() => onExport(product))}>
          <ListItemIcon><FileText size={18} /></ListItemIcon>
          <ListItemText primary="تصدير بيانات المنتج" />
        </MenuItem>

        <MenuItem onClick={() => handleAction(() => onToggleFavorite(product))}>
          <ListItemIcon>
            <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
          </ListItemIcon>
          <ListItemText primary={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"} />
        </MenuItem>

        <Divider />

        {/* Destructive */}
        <MenuItem
          onClick={() => handleAction(() => onDelete(product))}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "error.main" }}><Trash2 size={18} /></ListItemIcon>
          <ListItemText primary="حذف المنتج" />
        </MenuItem>
      </Menu>

      {/* Purchase History Dialog */}
      <Dialog open={historyDialog === "purchase"} onClose={closeHistory} maxWidth="lg" fullWidth>
        <DialogTitle>
          سجل المشتريات — {product.name}
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyData?.data?.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              لا توجد عمليات شراء لهذا المنتج
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>رقم صنف الشراء</TableCell>
                      <TableCell>التاريخ</TableCell>
                      <TableCell>المورد</TableCell>
                      <TableCell align="right">الكمية</TableCell>
                      <TableCell align="right">تكلفة الوحدة</TableCell>
                      <TableCell align="right">سعر البيع</TableCell>
                      <TableCell>رقم الدفعة</TableCell>
                      <TableCell align="center">عرض الشراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyData?.data?.map((item: any) => (
                      <TableRow key={item.id} hover>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          {item.purchase_date
                            ? dayjs(item.purchase_date).format("YYYY-MM-DD")
                            : "—"}
                        </TableCell>
                        <TableCell>{item.supplier_name || "—"}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {item.cost_per_sellable_unit
                            ? formatCurrency(Number(item.cost_per_sellable_unit))
                            : formatCurrency(Number(item.unit_cost))}
                        </TableCell>
                        <TableCell align="right">
                          {item.sale_price ? formatCurrency(Number(item.sale_price)) : "—"}
                        </TableCell>
                        <TableCell>
                          {item.batch_number ? (
                            <Chip label={item.batch_number} size="small" />
                          ) : "—"}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => openPurchaseDetails(item.purchase_id)}
                            aria-label="عرض المشتريات"
                          >
                            <ArrowRight size={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {historyData?.meta?.last_page > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Pagination
                    count={historyData.meta.last_page}
                    page={historyPage}
                    onChange={handleHistoryPageChange}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                الإجمالي: {historyData?.meta?.total ?? 0} عملية شراء
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHistory}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Sales History Dialog */}
      <Dialog open={historyDialog === "sales"} onClose={closeHistory} maxWidth="md" fullWidth>
        <DialogTitle>
          سجل المبيعات — {product.name}
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyData?.data?.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              لا توجد عمليات بيع لهذا المنتج
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>تاريخ البيع</TableCell>
                      <TableCell>رقم الفاتورة</TableCell>
                      <TableCell>العميل</TableCell>
                      <TableCell>المستخدم</TableCell>
                      <TableCell align="right">الكمية</TableCell>
                      <TableCell align="right">سعر الوحدة</TableCell>
                      <TableCell align="right">الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyData?.data?.map((item: any) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          {item.sale?.sale_date
                            ? new Date(item.sale.sale_date).toLocaleDateString("en-US")
                            : "—"}
                        </TableCell>
                        <TableCell>{item.sale?.invoice_number || `#${item.sale_id}`}</TableCell>
                        <TableCell>{item.sale?.client?.name || item.sale?.client_name || "—"}</TableCell>
                        <TableCell>{item.sale?.user?.name || item.sale?.user_name || "—"}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(Number(item.unit_price))}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(Number(item.total_price))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {historyData?.meta?.last_page > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Pagination
                    count={historyData.meta.last_page}
                    page={historyPage}
                    onChange={handleHistoryPageChange}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                الإجمالي: {historyData?.meta?.total ?? 0} عملية بيع
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHistory}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
