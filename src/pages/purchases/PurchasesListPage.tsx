// src/pages/PurchasesListPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Autocomplete,
  Alert,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import TableViewIcon from "@mui/icons-material/TableView";
import DescriptionIcon from "@mui/icons-material/Description";
import InventoryIcon from "@mui/icons-material/Inventory";
import HistoryIcon from "@mui/icons-material/History";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import RefreshIcon from "@mui/icons-material/Refresh";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import CloseIcon from "@mui/icons-material/Close";

import purchaseService from "../../services/purchaseService";
import supplierService, { Supplier } from "../../services/supplierService";
import productService, { Product } from "../../services/productService";
import exportService from "../../services/exportService";
import dayjs from "dayjs";
import { PurchaseItemDetailsDialog } from "@/components/purchases/PurchaseItemDetailsDialog";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { toast } from "sonner";
import { EditPurchaseDialog } from "@/components/purchases/EditPurchaseDialog";
import { PurchaseLedgerDialog } from "@/components/purchases/PurchaseLedgerDialog";

interface PurchaseFilters {
  supplier_id?: number;
  reference_number?: string;
  purchase_date?: string;
  created_at?: string;
  status?: string;
  product_id?: number;
}

const STATUS_CONFIG = {
  pending:  { label: "قيد الانتظار", color: "warning"  as const, Icon: AccessTimeIcon },
  ordered:  { label: "تم الطلب",     color: "info"     as const, Icon: LocalShippingIcon },
  received: { label: "تم الاستلام",  color: "success"  as const, Icon: CheckCircleIcon },
};

const PurchasesListPage: React.FC = () => {
  const navigate = useNavigate();

  const [purchasesResponse, setPurchasesResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<PurchaseFilters>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPurchases, setProductPurchases] = useState<any[]>([]);
  const [loadingProductPurchases, setLoadingProductPurchases] = useState(false);
  const [productHistoryDialogOpen, setProductHistoryDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<any | null>(null);

  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [purchaseForLedger, setPurchaseForLedger] = useState<any | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenuPurchase, setActiveMenuPurchase] = useState<any | null>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, purchase: any) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setActiveMenuPurchase(purchase);
  };

  const handleMenuClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAnchorEl(null);
    setActiveMenuPurchase(null);
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const res = await supplierService.getSuppliers(1, "");
      setSuppliers(res.data || []);
    } catch { /* ignore */ } finally { setLoadingSuppliers(false); }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productService.getProducts(1, "", "name", "asc", 1000);
      setProducts(res.data || []);
    } catch { /* ignore */ } finally { setLoadingProducts(false); }
  }, []);

  const fetchPurchases = useCallback(async (page: number, f: PurchaseFilters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("per_page", "1000000");
      if (f.supplier_id)      params.append("supplier_id",      f.supplier_id.toString());
      if (f.reference_number) params.append("reference_number", f.reference_number);
      if (f.purchase_date)    params.append("purchase_date",    f.purchase_date);
      if (f.created_at)       params.append("created_at",       f.created_at);
      if (f.status)           params.append("status",           f.status);
      if (f.product_id)       params.append("product_id",       f.product_id.toString());
      const data = await purchaseService.getPurchases(page, params.toString());
      setPurchasesResponse(data);
    } catch (err) {
      setError(purchaseService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPurchases(currentPage, filters); }, [fetchPurchases, currentPage, filters]);
  useEffect(() => { fetchSuppliers(); fetchProducts(); }, [fetchSuppliers, fetchProducts]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFilterChange = (key: keyof PurchaseFilters, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => { setFilters({}); setCurrentPage(1); };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== null && v !== "");
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleViewPdfReport = async (id: number) => {
    try { await exportService.exportPurchasePdf(id); } catch (e) { console.error(e); }
  };

  const handleViewProductHistory = async (product: Product) => {
    setSelectedProduct(product);
    setProductHistoryDialogOpen(true);
    setLoadingProductPurchases(true);
    try {
      setProductPurchases(await purchaseService.getPurchasesForProduct(product.id));
    } catch { setProductPurchases([]); } finally { setLoadingProductPurchases(false); }
  };

  const handleExportExcel = async () => {
    try { await exportService.exportPurchasesExcel(filters); } catch (e) { console.error(e); }
  };

  const handleConfirmDelete = async () => {
    if (!purchaseToDelete) return;
    setIsDeleting(true);
    try {
      await purchaseService.deletePurchase(purchaseToDelete);
      toast.success("تم حذف الشراء بنجاح");
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
      fetchPurchases(currentPage, filters);
    } catch (err) {
      toast.error("فشل حذف الشراء", { description: purchaseService.getErrorMessage(err) });
    } finally { setIsDeleting(false); }
  };

  // ── Derived totals ─────────────────────────────────────────────────────────

  const rows: any[] = purchasesResponse?.data ?? [];
  const totalItems = rows.reduce((s: number, p: any) => s + Number(p.items_count ?? p.items?.length ?? 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box dir="rtl" sx={{ minHeight: "100vh", bgcolor: "grey.50", p: { xs: 2, md: 3 } }}>

      {/* ── Page header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, bgcolor: "primary.main", borderRadius: 1.5, display: "flex" }}>
            <ShoppingCartIcon sx={{ color: "white", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>المشتريات</Typography>
            <Typography variant="caption" color="text.secondary">إدارة عمليات الشراء والمخزون</Typography>
          </Box>
        </Stack>

        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={showFilters ? <ExpandLessIcon /> : <FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            endIcon={activeFilterCount > 0 ? <Chip label={activeFilterCount} size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem" }} /> : undefined}
          >
            الفلاتر
          </Button>
          <Button variant="outlined" size="small" startIcon={<TableViewIcon />} onClick={handleExportExcel}>
            تصدير
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} component={RouterLink} to="/purchases/add">
            فاتوره شراء
          </Button>
        </Stack>
      </Stack>

      {/* ── Filters ── */}
      <Collapse in={showFilters}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="subtitle2" fontWeight={700}>بحث وفلترة</Typography>
            {hasActiveFilters && (
              <Button size="small" color="error" startIcon={<ClearAllIcon />} onClick={clearFilters}>
                مسح الكل
              </Button>
            )}
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {/* Supplier */}
            <Autocomplete
              options={suppliers}
              getOptionLabel={(o) => o.name}
              value={suppliers.find((s) => s.id === filters.supplier_id) || null}
              onChange={(_, v) => handleFilterChange("supplier_id", v?.id)}
              loading={loadingSuppliers}
              size="small"
              sx={{ minWidth: 180 }}
              renderInput={(params) => <TextField {...params} label="المورد" />}
            />

            {/* Product */}
            <Autocomplete
              options={products}
              getOptionLabel={(o) => `${o.name}${o.sku ? ` (${o.sku})` : ""}`}
              value={products.find((p) => p.id === filters.product_id) || null}
              onChange={(_, v) => handleFilterChange("product_id", v?.id)}
              loading={loadingProducts}
              size="small"
              sx={{ minWidth: 200 }}
              renderInput={(params) => <TextField {...params} label="المنتج" />}
            />

            {/* Status */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filters.status || ""}
                label="الحالة"
                onChange={(e) => handleFilterChange("status", e.target.value || undefined)}
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="pending">قيد الانتظار</MenuItem>
                <MenuItem value="ordered">تم الطلب</MenuItem>
                <MenuItem value="received">تم الاستلام</MenuItem>
              </Select>
            </FormControl>

            {/* Purchase date */}
            <TextField
              size="small"
              label="تاريخ الشراء"
              type="date"
              value={filters.purchase_date || ""}
              onChange={(e) => handleFilterChange("purchase_date", e.target.value)}
              inputProps={{ max: dayjs().format("YYYY-MM-DD") }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />

            {/* Created at */}
            <TextField
              size="small"
              label="تاريخ الإنشاء"
              type="date"
              value={filters.created_at || ""}
              onChange={(e) => handleFilterChange("created_at", e.target.value)}
              inputProps={{ max: dayjs().format("YYYY-MM-DD") }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
          </Stack>
        </Paper>
      </Collapse>

      {/* ── Loading ── */}
      {isLoading && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Stack key={i} direction="row" alignItems="center" gap={2} mb={2}>
              <Skeleton variant="rounded" width={44} height={44} />
              <Box flex={1}>
                <Skeleton width="35%" height={16} />
                <Skeleton width="20%" height={12} sx={{ mt: 0.5 }} />
              </Box>
              <Skeleton variant="rounded" width={80} height={28} />
            </Stack>
          ))}
        </Paper>
      )}

      {/* ── Error ── */}
      {!isLoading && error && (
        <Alert
          severity="error"
          action={
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => fetchPurchases(currentPage, filters)}>
              إعادة المحاولة
            </Button>
          }
          sx={{ borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* ── Table ── */}
      {!isLoading && !error && purchasesResponse && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  {["#", "التاريخ", "المورد", "الحالة", "عدد الأصناف", ""].map((h, i) => (
                    <TableCell key={i} align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.25 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Stack alignItems="center" gap={1}>
                        <ShoppingCartIcon sx={{ fontSize: 48, color: "grey.300" }} />
                        <Typography variant="body2" color="text.secondary">لا توجد عمليات شراء</Typography>
                        <Button variant="contained" size="small" startIcon={<AddIcon />} component={RouterLink} to="/purchases/add">
                          إضافة شراء
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((purchase: any) => {
                    const cfg = STATUS_CONFIG[purchase.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                    const itemsCount = purchase.items_count ?? purchase.items?.length ?? 0;

                    return (
                      <TableRow
                        key={purchase.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(`/purchases/${purchase.id}/manage-items`)}
                      >
                        <TableCell align="center">
                          <Chip label={purchase.id} size="small" variant="outlined" sx={{ fontFamily: "monospace", height: 22 }} />
                        </TableCell>

                        <TableCell align="center">
                          <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5}>
                            <CalendarMonthIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="body2">{dayjs(purchase.purchase_date).format("YYYY-MM-DD")}</Typography>
                          </Stack>
                        </TableCell>

                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>{purchase.supplier_name || "—"}</Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            icon={<cfg.Icon sx={{ fontSize: "14px !important" }} />}
                            label={cfg.label}
                            size="small"
                            color={cfg.color}
                            variant="outlined"
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Chip label={itemsCount} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700, height: 22 }} />
                        </TableCell>

                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="الإجراءات">
                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, purchase)}>
                              <MoreHorizIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl) && activeMenuPurchase?.id === purchase.id}
                            onClose={() => handleMenuClose()}
                            onClick={(e) => e.stopPropagation()}
                            PaperProps={{ elevation: 2, sx: { minWidth: 200 } }}
                          >
                            <MenuItem disabled sx={{ opacity: "1 !important" }}>
                              <ListItemText primaryTypographyProps={{ fontWeight: 700, fontSize: "0.8rem" }} primary="الإجراءات" />
                            </MenuItem>
                            <Divider />

                            <MenuItem onClick={(e) => { handleMenuClose(e); setPurchaseForLedger(purchase); setLedgerDialogOpen(true); }}>
                              <ListItemIcon><AccountBalanceWalletIcon fontSize="small" /></ListItemIcon>
                              <ListItemText primary="دفتر الأستاذ" />
                            </MenuItem>

                            <MenuItem onClick={(e) => { handleMenuClose(e); navigate(`/purchases/${purchase.id}/manage-items`); }}>
                              <ListItemIcon><InventoryIcon fontSize="small" /></ListItemIcon>
                              <ListItemText primary="إدارة البنود" />
                            </MenuItem>

                            <MenuItem onClick={(e) => { handleMenuClose(e); handleViewPdfReport(purchase.id); }}>
                              <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                              <ListItemText primary="عرض PDF" />
                            </MenuItem>

                            {filters.product_id && (
                              <MenuItem onClick={(e) => {
                                handleMenuClose(e);
                                const p = products.find((p) => p.id === filters.product_id);
                                if (p) handleViewProductHistory(p);
                              }}>
                                <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="سجل المنتج" />
                              </MenuItem>
                            )}

                            <Divider />

                            <MenuItem
                              onClick={(e) => { handleMenuClose(e); setPurchaseToDelete(purchase.id); setDeleteDialogOpen(true); }}
                              disabled={purchase.status === "received"}
                              sx={{ color: "error.main" }}
                            >
                              <ListItemIcon sx={{ color: "inherit" }}><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
                              <ListItemText
                                primary="حذف"
                                secondary={purchase.status === "received" ? "لا يمكن حذف مشتريات تم استلامها" : undefined}
                              />
                            </MenuItem>
                          </Menu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>

              {rows.length > 0 && (
                <TableFooter>
                  <TableRow sx={{ bgcolor: "grey.100" }}>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" fontWeight={700}>الإجمالي</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={totalItems} size="small" color="primary" sx={{ fontWeight: 700, height: 22 }} />
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Dialogs ── */}
      <PurchaseItemDetailsDialog
        open={productHistoryDialogOpen}
        onClose={() => { setProductHistoryDialogOpen(false); setSelectedProduct(null); setProductPurchases([]); }}
        product={selectedProduct}
        purchases={productPurchases}
        isLoading={loadingProductPurchases}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => { if (!isDeleting) { setDeleteDialogOpen(false); setPurchaseToDelete(null); } }}
        onConfirm={handleConfirmDelete}
        title="⚠️ تأكيد حذف الشراء"
        message="هل أنت متأكد من حذف هذا الشراء؟ سيتم حذف جميع بنوده بشكل نهائي ولا يمكن التراجع عن هذه العملية."
        confirmText="نعم، احذف"
        cancelText="إلغاء"
        confirmVariant="destructive"
        isLoading={isDeleting}
      />

      <EditPurchaseDialog
        open={editDialogOpen}
        onClose={() => { setEditDialogOpen(false); setPurchaseToEdit(null); }}
        purchase={purchaseToEdit}
        suppliers={suppliers}
        onUpdate={() => fetchPurchases(currentPage, filters)}
      />

      <PurchaseLedgerDialog
        open={ledgerDialogOpen}
        onClose={() => { setLedgerDialogOpen(false); setPurchaseForLedger(null); }}
        purchase={purchaseForLedger}
        onUpdate={() => fetchPurchases(currentPage, filters)}
      />
    </Box>
  );
};

export default PurchasesListPage;
