// src/components/products/ProductsTable.tsx
import React, { useState } from "react";
import {
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Box,
} from "@mui/material";
import { Edit, AlertTriangle, Copy, Check, Info, History } from "lucide-react";

// Types
import productService, {
  Product as ProductType,
} from "@/services/productService";
import { formatNumber, formatCurrency } from "@/constants";
import { useSettings } from "@/context/SettingsContext";

// Interface for Product with potentially loaded batches
interface ProductWithOptionalBatches
  extends Omit<
    ProductType,
    | "latest_cost_per_sellable_unit"
    | "suggested_sale_price_per_sellable_unit"
    | "scientific_name"
  > {
  available_batches?: {
    batch_id: number;
    quantity: number;
    expiry_date?: string;
  }[];
  category_name?: string | null;
  latest_cost_per_sellable_unit?: string | number | null;
  suggested_sale_price_per_sellable_unit?: string | number | null;
  sellable_unit_name?: string | null;
  stocking_unit_name?: string | null;
  units_per_stocking_unit?: number | null;
  scientific_name?: string | null;
}

interface ProductsTableProps {
  products: ProductWithOptionalBatches[];
  isLoading?: boolean;
  onEdit: (product: ProductWithOptionalBatches) => void;
  // Server-side pagination props
  rowCount: number;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  isLoading = false,
  onEdit,
  rowCount,
  paginationModel,
  onPaginationModelChange,
}) => {
  const { getSetting } = useSettings();
  const showImagesInList = getSetting("product_images_show_in_list", true);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [stockDialogProduct, setStockDialogProduct] =
    useState<ProductWithOptionalBatches | null>(null);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);

  const handleOpenStockDialog = (product: ProductWithOptionalBatches) => {
    setStockDialogProduct(product);
    setIsStockDialogOpen(true);
  };

  const handleCloseStockDialog = () => {
    setIsStockDialogOpen(false);
    setStockDialogProduct(null);
  };

  // History Dialog State
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDialogProduct, setHistoryDialogProduct] =
    useState<ProductWithOptionalBatches | null>(null);
  const [historyTab, setHistoryTab] = useState(0);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const fetchHistory = async (
    productId: number,
    type: "purchases" | "sales",
    page: number
  ) => {
    setHistoryLoading(true);
    try {
      const res =
        type === "purchases"
          ? await productService.getPurchaseHistory(productId, page)
          : await productService.getSalesHistory(productId, page);
      setHistoryData(res.data);
      setHistoryTotalPages(res.last_page);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryDialog = (product: ProductWithOptionalBatches) => {
    setHistoryDialogProduct(product);
    setHistoryDialogOpen(true);
    setHistoryTab(0);
    setHistoryPage(1);
    fetchHistory(product.id, "purchases", 1);
  };

  const handleHistoryTabChange = (
    event: React.SyntheticEvent,
    newValue: number
  ) => {
    setHistoryTab(newValue);
    setHistoryPage(1);
    if (historyDialogProduct) {
      fetchHistory(
        historyDialogProduct.id,
        newValue === 0 ? "purchases" : "sales",
        1
      );
    }
  };

  const handleHistoryPageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setHistoryPage(value);
    if (historyDialogProduct) {
      fetchHistory(
        historyDialogProduct.id,
        historyTab === 0 ? "purchases" : "sales",
        value
      );
    }
  };

  const copyToClipboard = async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku);
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000);
    } catch (err) {
      console.error("Failed to copy SKU:", err);
    }
  };

  if (products.length === 0 && !isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          لا توجد منتجات لعرضها
        </Typography>
      </Paper>
    );
  }

  const totalPages = Math.ceil(rowCount / paginationModel.pageSize);

  return (
    <>
      <Paper
        sx={{ width: "100%", borderRadius: 2, overflow: "hidden", mb: 2 }}
        elevation={0}
        dir="ltr"
      >
        <TableContainer sx={{ maxHeight: "calc(100vh - 250px)" }}>
          <Table stickyHeader size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center">#</TableCell>
                <TableCell align="center">الرمز (SKU)</TableCell>
                <TableCell align="right">اسم المنتج</TableCell>
                <TableCell align="center">الاسم العلمي</TableCell>
                <TableCell align="center">الفئة</TableCell>
                <TableCell align="center">وحدة البيع</TableCell>
                <TableCell align="center">وحدة التخزين</TableCell>
                <TableCell align="center">نسبة التحويل</TableCell>
                <TableCell align="center">تم إنشاؤه في</TableCell>
                <TableCell align="center">تنبيه المخزون</TableCell>
                <TableCell align="center">إجمالي المخزون</TableCell>
                <TableCell align="center">المخازن</TableCell>
                <TableCell align="center">أحدث تكلفة</TableCell>
                <TableCell align="center">آخر سعر بيع</TableCell>
                <TableCell align="center">السعر المقترح</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => {
                const stockQty = Number(
                  product.current_stock_quantity ?? product.stock_quantity ?? 0
                );
                const isLow =
                  product.stock_alert_level !== null &&
                  stockQty <= (product.stock_alert_level as number);
                const isOutOfStock = stockQty <= 0;

                return (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => onEdit(product)}
                  >
                    <TableCell align="center">{product.id}</TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Typography variant="body2" component="span">
                          {product.sku || "---"}
                        </Typography>
                        {product.sku && (
                          <Tooltip
                            title={
                              copiedSku === product.sku ? "تم النسخ" : "نسخ SKU"
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(product.sku!);
                              }}
                              disabled={isLoading}
                              sx={{ width: 24, height: 24, p: 0 }}
                            >
                              {copiedSku === product.sku ? (
                                <Check
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: "var(--mui-palette-success-main)",
                                  }}
                                />
                              ) : (
                                <Copy style={{ width: 14, height: 14 }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {product.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {product.scientific_name || "---"}
                    </TableCell>
                    <TableCell align="center">
                      {product.category_name ? (
                        <Chip
                          label={product.category_name}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.75rem", height: 24 }}
                        />
                      ) : (
                        "---"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {product.sellable_unit_name || "---"}
                    </TableCell>
                    <TableCell align="center">
                      {product.stocking_unit_name || "---"}
                    </TableCell>
                    <TableCell align="center">
                      {product.units_per_stocking_unit || "---"}
                    </TableCell>
                    <TableCell align="center">
                      {product.created_at
                        ? new Date(product.created_at).toLocaleDateString(
                            "en-GB"
                          )
                        : "---"}
                    </TableCell>
                    <TableCell align="center">
                      {product.stock_alert_level !== null
                        ? formatNumber(product.stock_alert_level)
                        : "---"}
                    </TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Typography variant="body1" fontWeight={600}>
                          {formatNumber(stockQty)}
                        </Typography>
                        {(isLow || isOutOfStock) && (
                          <Tooltip
                            title={
                              isOutOfStock
                                ? "نفاد المخزون"
                                : "تنبيه: المخزون منخفض"
                            }
                          >
                            <AlertTriangle
                              style={{
                                width: 16,
                                height: 16,
                                color: isOutOfStock
                                  ? "var(--mui-palette-error-main)"
                                  : "var(--mui-palette-warning-main)",
                              }}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      {product.warehouses?.length ? (
                        <Tooltip title="تفاصيل المخزون">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenStockDialog(product);
                            }}
                            sx={{ p: 0.5 }}
                          >
                            <Info
                              style={{
                                width: 18,
                                height: 18,
                                color: "var(--mui-palette-info-main)",
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                    <TableCell align="center">
                      {product.latest_cost_per_sellable_unit
                        ? formatCurrency(
                            Number(product.latest_cost_per_sellable_unit)
                          )
                        : "---"}
                    </TableCell>
                    <TableCell align="center">
                      {product.last_sale_price_per_sellable_unit
                        ? formatCurrency(
                            Number(product.last_sale_price_per_sellable_unit)
                          )
                        : "---"}
                    </TableCell>
                    <TableCell align="center">
                      {product.suggested_sale_price_per_sellable_unit
                        ? formatCurrency(
                            Number(
                              product.suggested_sale_price_per_sellable_unit
                            )
                          )
                        : "---"}
                    </TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        <Tooltip title="السجل">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenHistoryDialog(product);
                            }}
                            disabled={isLoading}
                            sx={{
                              color: "text.secondary",
                              "&:hover": {
                                bgcolor: "action.hover",
                                color: "text.primary",
                              },
                            }}
                          >
                            <History style={{ width: 18, height: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(product);
                            }}
                            disabled={isLoading}
                            sx={{
                              color: "primary.main",
                              "&:hover": {
                                bgcolor: "primary.light",
                                color: "primary.contrastText",
                              },
                            }}
                          >
                            <Edit style={{ width: 18, height: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Control */}
        <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
          <Pagination
            count={totalPages}
            page={paginationModel.page + 1} // Convert 0-index to 1-index
            onChange={(e, val) =>
              onPaginationModelChange({ ...paginationModel, page: val - 1 })
            } // Convert 1-index back to 0-index
            color="primary"
            shape="rounded"
            showFirstButton
            showLastButton
          />
        </Box>
      </Paper>
      {/* Warehouse Stock Breakdown Dialog */}
      <Dialog
        open={isStockDialogOpen}
        onClose={handleCloseStockDialog}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()} // Prevent row click from firing underneath
        dir="ltr"
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }} dir="ltr">
          تفاصيل المخزون: {stockDialogProduct?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }} dir="ltr">
          <List disablePadding>
            {stockDialogProduct?.warehouses?.map((w) => (
              <ListItem key={w.id} divider>
                <ListItemText
                  primary={w.name}
                  primaryTypographyProps={{ variant: "subtitle2" }}
                />
                <Typography variant="body1" fontWeight={600}>
                  {formatNumber(w.pivot.quantity)}
                </Typography>
              </ListItem>
            ))}
            {!stockDialogProduct?.warehouses?.length && (
              <ListItem>
                <ListItemText primary="No warehouse data available." />
              </ListItem>
            )}
          </List>
        </DialogContent>
      </Dialog>
      {/* Product History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
        onClick={(e) => e.stopPropagation()}
        dir="ltr"
      >
        <DialogTitle sx={{ fontWeight: 600 }} dir="ltr">
          سجل المنتج: {historyDialogProduct?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }} dir="ltr">
          <Tabs
            value={historyTab}
            onChange={handleHistoryTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="المشتروات" />
            <Tab label="المبيعات" />
          </Tabs>

          <Paper elevation={0} sx={{ p: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      {historyTab === 0 ? "التاريخ" : "التاريخ"}
                    </TableCell>
                    <TableCell>
                      {historyTab === 0 ? "المورد" : "العميل"}
                    </TableCell>
                    <TableCell>
                      {historyTab === 0
                        ? "الكمية (وحدة تخزين)"
                        : "الكمية (وحدة بيع)"}
                    </TableCell>
                    <TableCell>
                      {historyTab === 0 ? "التكلفة" : "السعر"}
                    </TableCell>
                    <TableCell>الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : historyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        لا توجد سجلات
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyData.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString(
                                "en-GB"
                              )
                            : "---"}
                        </TableCell>
                        <TableCell>
                          {historyTab === 0
                            ? item.purchase?.supplier?.name || "N/A"
                            : item.sale?.client?.name || "N/A"}
                        </TableCell>
                        <TableCell>{formatNumber(item.quantity)}</TableCell>
                        <TableCell>
                          {formatCurrency(
                            historyTab === 0 ? item.unit_cost : item.unit_price
                          )}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            historyTab === 0
                              ? item.total_cost
                              : item.total_price
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {historyTotalPages > 1 && (
              <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                <Pagination
                  count={historyTotalPages}
                  page={historyPage}
                  onChange={handleHistoryPageChange}
                  color="primary"
                />
              </Stack>
            )}
          </Paper>
        </DialogContent>
      </Dialog>
    </>
  );
};
