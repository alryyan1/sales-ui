// src/pages/PurchasesListPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popover,
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
  alpha,
  useTheme,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import TableViewIcon from "@mui/icons-material/TableView";
import DescriptionIcon from "@mui/icons-material/Description";
import InventoryIcon from "@mui/icons-material/Inventory";
import HistoryIcon from "@mui/icons-material/History";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import RefreshIcon from "@mui/icons-material/Refresh";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

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

const getStatusConfig = (t: (key: string) => string) => ({
  pending:  { label: t("purchases:status_pending"),  color: "warning"  as const, Icon: AccessTimeIcon },
  ordered:  { label: t("purchases:status_ordered"),  color: "info"     as const, Icon: LocalShippingIcon },
  received: { label: t("purchases:status_received"), color: "success"  as const, Icon: CheckCircleIcon },
});

const PurchasesListPage: React.FC = () => {
  const { t, i18n } = useTranslation(["purchases", "common"]);
  const STATUS_CONFIG = getStatusConfig(t);
  const navigate = useNavigate();
  const theme = useTheme();

  const [purchasesResponse, setPurchasesResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<PurchaseFilters>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

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

  const handleFilterToggle = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setFilterAnchorEl((prev) => (prev ? null : e.currentTarget));
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
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
      toast.success(t("purchases:list.deletedSuccess"));
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
      fetchPurchases(currentPage, filters);
    } catch (err) {
      toast.error(t("purchases:list.deleteFailed"), { description: purchaseService.getErrorMessage(err) });
    } finally { setIsDeleting(false); }
  };

  // ── Derived totals ─────────────────────────────────────────────────────────

  const rows: any[] = purchasesResponse?.data ?? [];
  const totalItems = rows.reduce((s: number, p: any) => s + Number(p.items_count ?? p.items?.length ?? 0), 0);
  const totalAmount = rows.reduce((s: number, p: any) => s + Number(p.total_amount ?? 0), 0);

  const fmtAmount = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box dir={i18n.dir()} sx={{ minHeight: "100vh", bgcolor: "grey.50", p: { xs: 2, md: 3 } }}>

      {/* ── Page header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, bgcolor: "primary.main", borderRadius: 1.5, display: "flex" }}>
            <ShoppingCartIcon sx={{ color: "white", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{t("purchases:list.purchases")}</Typography>
            <Typography variant="caption" color="text.secondary">{t("purchases:list.managePurchasesAndStock")}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListIcon />}
            onClick={handleFilterToggle}
            endIcon={activeFilterCount > 0 ? <Chip label={activeFilterCount} size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem" }} /> : undefined}
          >
            {t("purchases:list.filters")}
          </Button>
          <Button variant="outlined" size="small" startIcon={<TableViewIcon />} onClick={handleExportExcel}>
            {t("purchases:list.export")}
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} component={RouterLink} to="/purchases/add">
            {t("purchases:list.purchaseInvoice")}
          </Button>
        </Stack>
      </Stack>

      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { width: 420, maxWidth: "90vw", p: 2, borderRadius: 2, boxShadow: 8 } }}
      >
        <Stack direction="column" gap={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>{t("purchases:list.searchAndFilter")}</Typography>
            <Button size="small" onClick={handleFilterClose}>{t("purchases:list.close")}</Button>
          </Stack>

          <Autocomplete
            options={suppliers}
            getOptionLabel={(o) => o.name}
            value={suppliers.find((s) => s.id === filters.supplier_id) || null}
            onChange={(_, v) => handleFilterChange("supplier_id", v?.id)}
            loading={loadingSuppliers}
            size="small"
            renderInput={(params) => <TextField {...params} label={t("purchases:supplier")} />}
          />

          <Autocomplete
            options={products}
            getOptionLabel={(o) => `${o.name}${o.sku ? ` (${o.sku})` : ""}`}
            value={products.find((p) => p.id === filters.product_id) || null}
            onChange={(_, v) => handleFilterChange("product_id", v?.id)}
            loading={loadingProducts}
            size="small"
            renderInput={(params) => <TextField {...params} label={t("purchases:product")} />}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>{t("purchases:status")}</InputLabel>
            <Select
              value={filters.status || ""}
              label={t("purchases:status")}
              onChange={(e) => handleFilterChange("status", e.target.value || undefined)}
            >
              <MenuItem value="">{t("purchases:list.allOption")}</MenuItem>
              <MenuItem value="pending">{t("purchases:status_pending")}</MenuItem>
              <MenuItem value="ordered">{t("purchases:status_ordered")}</MenuItem>
              <MenuItem value="received">{t("purchases:status_received")}</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label={t("purchases:list.purchaseDateLabel")}
            type="date"
            value={filters.purchase_date || ""}
            onChange={(e) => handleFilterChange("purchase_date", e.target.value)}
            inputProps={{ max: dayjs().format("YYYY-MM-DD") }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            size="small"
            label={t("purchases:list.createdAtLabel")}
            type="date"
            value={filters.created_at || ""}
            onChange={(e) => handleFilterChange("created_at", e.target.value)}
            inputProps={{ max: dayjs().format("YYYY-MM-DD") }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
            <Button size="small" variant="outlined" color="error" onClick={clearFilters} disabled={!hasActiveFilters}>
              {t("purchases:list.clearAll")}
            </Button>
            <Button size="small" variant="contained" onClick={handleFilterClose}>
              {t("purchases:list.apply")}
            </Button>
          </Stack>
        </Stack>
      </Popover>

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
              {t("purchases:list.retry")}
            </Button>
          }
          sx={{ borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* ── Table ── */}
      {!isLoading && !error && purchasesResponse && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <TableContainer>
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                  }}
                >
                  {[
                    { label: t("purchases:list.colId"),        width: 60  },
                    { label: t("purchases:list.colDate"),       width: 120 },
                    { label: t("purchases:list.colSupplier"),   width: "auto" },
                    { label: t("purchases:list.colReference"),  width: 130 },
                    { label: t("purchases:list.colStatus"),     width: 130 },
                    { label: t("purchases:list.colItems"),      width: 70  },
                    { label: t("purchases:list.colTotal"),      width: 120 },
                    { label: "",            width: 48  },
                  ].map(({ label, width }, i) => (
                    <TableCell
                      key={i}
                      align="center"
                      sx={{
                        width,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                        py: 1.5,
                        px: 1,
                        borderBottom: "none",
                      }}
                    >
                      {label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8, border: "none" }}>
                      <Stack alignItems="center" gap={1.5}>
                        <Box sx={{ p: 2, borderRadius: "50%", bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                          <ShoppingCartIcon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.3) }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">{t("purchases:list.noPurchasesShort")}</Typography>
                        <Button variant="contained" size="small" startIcon={<AddIcon />} component={RouterLink} to="/purchases/add">
                          {t("purchases:list.addPurchaseShort")}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((purchase: any, idx: number) => {
                    const cfg = STATUS_CONFIG[purchase.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                    const itemsCount = purchase.items_count ?? purchase.items?.length ?? 0;
                    const totalAmt = Number(purchase.total_amount ?? 0);

                    return (
                      <TableRow
                        key={purchase.id}
                        hover
                        sx={{
                          cursor: "pointer",
                         
                        }}
                        onClick={() => navigate(`/purchases/${purchase.id}/manage-items`)}
                      >
                        {/* ID */}
                        <TableCell align="center">
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "text.disabled",
                              letterSpacing: "-0.02em",
                            }}
                          >
                            #{purchase.id}
                          </Typography>
                        </TableCell>

                        {/* Date */}
                        <TableCell align="center">
                          <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5}>
                            <CalendarMonthIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                            <Typography variant="caption" fontWeight={500}>
                              {dayjs(purchase.purchase_date).format("YYYY-MM-DD")}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Supplier */}
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            noWrap
                            sx={{
                              maxWidth: 200,
                              textAlign: 'center',
                              cursor: 'pointer',
                              '&:hover': { color: 'primary.main' }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (purchase.supplier_id) {
                                navigate(`/suppliers/${purchase.supplier_id}/ledger`);
                              }
                            }}
                          >
                            {purchase.supplier_name || (
                              <Typography component="span" variant="caption" color="text.disabled">—</Typography>
                            )}
                          </Typography>
                        </TableCell>

                        {/* Reference */}
                        <TableCell align="center">
                          {purchase.reference_number ? (
                            <Chip
                              label={purchase.reference_number}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem", fontFamily: "monospace", maxWidth: 120 }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center">
                          <Chip
                            label={
                              <Stack direction="row" alignItems="center" gap={0.5}>
                                <cfg.Icon sx={{ fontSize: 13 }} />
                                <span>{cfg.label}</span>
                              </Stack>
                            }
                            size="small"
                            color={cfg.color}
                            sx={{ height: 24, fontSize: "0.72rem", fontWeight: 600 }}
                          />
                        </TableCell>

                        {/* Items count */}
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 28,
                              height: 22,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: "primary.main",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              px: 0.75,
                            }}
                          >
                            {itemsCount}
                          </Box>
                        </TableCell>

                        {/* Total amount */}
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              color: totalAmt > 0 ? "text.primary" : "text.disabled",
                              fontFamily: "monospace",
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {fmtAmount(totalAmt)}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title={t("purchases:list.actionsTooltip")} placement="left">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, purchase)}
                              sx={{
                                width: 28,
                                height: 28,
                                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                              }}
                            >
                              <MoreVertIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>

                          <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl) && activeMenuPurchase?.id === purchase.id}
                            onClose={() => handleMenuClose()}
                            onClick={(e) => e.stopPropagation()}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                            PaperProps={{
                              elevation: 3,
                              sx: { minWidth: 200, borderRadius: 2, border: `1px solid ${theme.palette.divider}` },
                            }}
                          >
                            <Box sx={{ px: 2, py: 1 }}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {t("purchases:list.invoiceHash", { id: purchase.id })}
                              </Typography>
                            </Box>
                            <Divider />

                            <MenuItem onClick={(e) => { handleMenuClose(e); setPurchaseForLedger(purchase); setLedgerDialogOpen(true); }}>
                              <ListItemIcon><AccountBalanceWalletIcon fontSize="small" /></ListItemIcon>
                              <ListItemText primary={t("purchases:list.ledgerMenuItem")} />
                            </MenuItem>

                            <MenuItem onClick={(e) => { handleMenuClose(e); setPurchaseToEdit(purchase); setEditDialogOpen(true); }}>
                              <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>
                              <ListItemText primary={t("purchases:list.editMenuItem")} />
                            </MenuItem>

                            <MenuItem onClick={(e) => { handleMenuClose(e); navigate(`/purchases/${purchase.id}/manage-items`); }}>
                              <ListItemIcon><InventoryIcon fontSize="small" /></ListItemIcon>
                              <ListItemText primary={t("purchases:list.manageItemsMenuItem")} />
                            </MenuItem>

                            <MenuItem onClick={(e) => { handleMenuClose(e); handleViewPdfReport(purchase.id); }}>
                              <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                              <ListItemText primary={t("purchases:list.viewPdfMenuItem")} />
                            </MenuItem>

                            {filters.product_id && (
                              <MenuItem onClick={(e) => {
                                handleMenuClose(e);
                                const p = products.find((p) => p.id === filters.product_id);
                                if (p) handleViewProductHistory(p);
                              }}>
                                <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary={t("purchases:list.productHistoryMenuItem")} />
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
                                primary={t("purchases:list.deleteMenuItem")}
                                secondary={purchase.status === "received" ? t("purchases:list.cannotDeleteReceivedShort") : undefined}
                                secondaryTypographyProps={{ fontSize: "0.68rem" }}
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
                  <TableRow
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                      "& td": { py: 1.25, px: 1 },
                    }}
                  >
                    <TableCell colSpan={5} align="right" sx={{ border: "none" }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {t("purchases:list.totalRow", { count: rows.length })}
                      </Typography>
                    </TableCell>

                    {/* Items total */}
                    <TableCell align="center" sx={{ border: "none" }}>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 28,
                          height: 22,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                          color: "primary.main",
                          fontWeight: 700,
                          fontSize: "0.72rem",
                          px: 0.75,
                        }}
                      >
                        {totalItems}
                      </Box>
                    </TableCell>

                    {/* Total amount */}
                    <TableCell align="center" sx={{ border: "none" }}>
                      <Typography variant="caption" fontWeight={700} sx={{ fontFamily: "monospace" }}>
                        {fmtAmount(totalAmount)} OMR
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ border: "none" }} />
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
        title={t("purchases:list.deleteConfirmTitle")}
        message={t("purchases:list.deleteConfirmMessage")}
        confirmText={t("purchases:list.confirmDeleteButton")}
        cancelText={t("common:cancel")}
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
