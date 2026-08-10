import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  CircularProgress,
  InputAdornment,
  Stack,
  Divider,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Delete,
  CheckCircle,
  Cancel,
  Save,
  Search,
  Inventory,
  Assessment,
  Warning,
  ListAlt,
  PlayArrow,
  AccessTime,
  DoneAll,
} from "@mui/icons-material";
import inventoryCountService, {
  InventoryCountItem,
} from "@/services/inventoryCountService";
import productService from "@/services/productService";
import dayjs from "dayjs";
import InlineCreateInventoryCountItem from "@/components/inventory/InlineCreateInventoryCountItem";
import { ProductImage } from "@/components/products/ProductImage";

const STATUS_COLOR: Record<string, "default" | "info" | "warning" | "success" | "error"> = {
  draft: "default",
  in_progress: "info",
  completed: "warning",
  approved: "success",
  rejected: "error",
};

const ManageInventoryCountPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { direction } = useLanguage();
  const { t } = useTranslation("inventory");
  const { t: tManage } = useTranslation("inventoryCountManage");
  const { t: tCommon } = useTranslation("common");

  const STATUS_LABEL: Record<string, string> = {
    draft: tManage("statusDraft"),
    in_progress: tManage("statusInProgress"),
    completed: tManage("statusCompleted"),
    approved: tManage("statusApproved"),
    rejected: tManage("statusRejected"),
  };

  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localQuantities, setLocalQuantities] = useState<Record<number, string>>({});
  const [savingItems, setSavingItems] = useState<Record<number, boolean>>({});
  const debounceTimers = useRef<Record<number, NodeJS.Timeout>>({});

  const { data: count, isLoading } = useQuery({
    queryKey: ["inventory-count", id],
    queryFn: () => inventoryCountService.getInventoryCount(Number(id)),
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getProducts(1, "", "name", "asc", 1000),
  });

  const addItemMutation = useMutation({
    mutationFn: (data: { product_id: number; actual_quantity?: number }) =>
      inventoryCountService.addCountItem(Number(id), data),
    onSuccess: () => {
      toast.success(tManage("productAddedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => toast.error(inventoryCountService.getErrorMessage(error)),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, actual_quantity }: { itemId: number; actual_quantity: number }) =>
      inventoryCountService.updateCountItem(Number(id), itemId, { actual_quantity }),
    onSuccess: (_, { itemId }) => {
      setSavingItems((prev) => ({ ...prev, [itemId]: false }));
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error, { itemId }) => {
      setSavingItems((prev) => ({ ...prev, [itemId]: false }));
      toast.error(inventoryCountService.getErrorMessage(error));
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) =>
      inventoryCountService.deleteCountItem(Number(id), itemId),
    onSuccess: () => {
      toast.success(tManage("productDeletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => toast.error(inventoryCountService.getErrorMessage(error)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      inventoryCountService.updateInventoryCount(Number(id), { status } as any),
    onSuccess: () => {
      toast.success(tManage("statusUpdatedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => toast.error(inventoryCountService.getErrorMessage(error)),
  });

  const approveMutation = useMutation({
    mutationFn: () => inventoryCountService.approveCount(Number(id)),
    onSuccess: () => {
      toast.success(tManage("countApprovedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => toast.error(inventoryCountService.getErrorMessage(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => inventoryCountService.rejectCount(Number(id)),
    onSuccess: () => {
      toast.success(tManage("countRejectedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => toast.error(inventoryCountService.getErrorMessage(error)),
  });

  const handleQuantityChange = (item: InventoryCountItem, value: string) => {
    setLocalQuantities((prev) => ({ ...prev, [item.id]: value }));
    if (debounceTimers.current[item.id]) clearTimeout(debounceTimers.current[item.id]);
    debounceTimers.current[item.id] = setTimeout(() => {
      const qty = Number(value);
      if (!isNaN(qty) && qty >= 0) {
        setSavingItems((prev) => ({ ...prev, [item.id]: true }));
        updateItemMutation.mutate({ itemId: item.id, actual_quantity: qty });
      }
    }, 500);
  };

  useEffect(() => {
    return () => { Object.values(debounceTimers.current).forEach(clearTimeout); };
  }, []);

  const getDiffColor = (diff: number) =>
    diff > 0 ? "success.main" : diff < 0 ? "error.main" : "text.disabled";

  const summary = useMemo(() => {
    const items = count?.items || [];
    return {
      total: items.length,
      diff: items.reduce((s, i) => s + i.difference, 0),
      withDiff: items.filter((i) => i.difference !== 0).length,
    };
  }, [count?.items]);

  const canEdit     = count?.status === "draft" || count?.status === "in_progress";
  const canComplete = count?.status === "in_progress" && (count?.items?.length ?? 0) > 0;
  const canApprove  = count?.status === "completed";

  const availableProducts = products?.data?.filter(
    (p: any) => !count?.items?.some((i) => i.product_id === p.id)
  ) || [];

  const filteredItems = useMemo(() => {
    if (!count?.items) return [];
    if (!searchQuery) return count.items;
    const q = searchQuery.toLowerCase();
    return count.items.filter((i) =>
      i.product?.name.toLowerCase().includes(q) ||
      i.product?.sku?.toLowerCase().includes(q) ||
      i.product?.sku?.toLowerCase().includes(q)
    );
  }, [count?.items, searchQuery]);

  if (isLoading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
      <CircularProgress />
    </Box>
  );

  if (!count) return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h6" color="text.secondary">{tManage("countNotFound")}</Typography>
      <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate("/inventory/counts")}>{tManage("backToList")}</Button>
    </Box>
  );

  return (
    <Box sx={{ p: 2 }} dir={direction}>

      {/* ── Compact Header ─────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">

          <IconButton size="small" onClick={() => navigate("/inventory/counts")} sx={{ flexShrink: 0 }}>
            <ArrowBack fontSize="small" />
          </IconButton>

          <Stack direction="row" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>{tManage("countHash", { id: count.id })}</Typography>
            <Chip
              label={STATUS_LABEL[count.status] ?? count.status}
              color={STATUS_COLOR[count.status] ?? "default"}
              size="small"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
            <Typography variant="caption" color="text.secondary">{count.warehouse?.name}</Typography>
          </Stack>

          <Divider orientation="vertical" flexItem />

          {/* Timestamps */}
          <Stack direction="row" gap={2} flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <AccessTime sx={{ fontSize: 13, color: "text.disabled" }} />
              <Typography variant="caption" color="text.secondary">
                {tManage("createdColon", { date: dayjs(count.created_at).format("YYYY-MM-DD HH:mm") })}
              </Typography>
            </Stack>
            {count.started_at && (
              <Stack direction="row" alignItems="center" gap={0.5}>
                <PlayArrow sx={{ fontSize: 13, color: "info.main" }} />
                <Typography variant="caption" color="info.main">
                  {tManage("startedColon", { date: dayjs(count.started_at).format("YYYY-MM-DD HH:mm") })}
                </Typography>
              </Stack>
            )}
            {count.completed_at && (
              <Stack direction="row" alignItems="center" gap={0.5}>
                <DoneAll sx={{ fontSize: 13, color: "warning.main" }} />
                <Typography variant="caption" color="warning.main">
                  {tManage("completedColon", { date: dayjs(count.completed_at).format("YYYY-MM-DD HH:mm") })}
                </Typography>
              </Stack>
            )}
            {count.approved_at && (
              <Stack direction="row" alignItems="center" gap={0.5}>
                <CheckCircle sx={{ fontSize: 13, color: "success.main" }} />
                <Typography variant="caption" color="success.main">
                  {tManage("approvedColon", { date: dayjs(count.approved_at).format("YYYY-MM-DD HH:mm") })}
                </Typography>
              </Stack>
            )}
          </Stack>

          <Divider orientation="vertical" flexItem />

          {/* Stat pills */}
          <Stack direction="row" gap={0.75} sx={{ flexShrink: 0 }}>
            {[
              { icon: <Inventory sx={{ fontSize: 12 }} />, value: summary.total, label: tManage("itemUnitLabel"), color: "primary.main", bg: "grey.50", border: "divider" },
              { icon: <Assessment sx={{ fontSize: 12 }} />, value: (summary.diff > 0 ? "+" : "") + summary.diff, label: tManage("diffLabel"), color: getDiffColor(summary.diff), bg: summary.diff !== 0 ? "#fef2f2" : "grey.50", border: summary.diff !== 0 ? "error.light" : "divider" },
              { icon: <Warning sx={{ fontSize: 12 }} />, value: summary.withDiff, label: tManage("withDiffLabel"), color: summary.withDiff > 0 ? "warning.main" : "text.disabled", bg: summary.withDiff > 0 ? "#fffbeb" : "grey.50", border: summary.withDiff > 0 ? "warning.light" : "divider" },
            ].map(({ icon, value, label, color, bg, border }, i) => (
              <Box key={i} sx={{ px: 1.25, py: 0.5, bgcolor: bg, borderRadius: 1.5, border: "1px solid", borderColor: border }}>
                <Stack direction="row" alignItems="center" gap={0.4}>
                  <Box sx={{ color }}>{icon}</Box>
                  <Typography variant="caption" fontWeight={700} color={color}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary" fontSize={10}>{label}</Typography>
                </Stack>
              </Box>
            ))}
          </Stack>

          <Divider orientation="vertical" flexItem />

          {/* Actions */}
          <Stack direction="row" gap={0.75} sx={{ flexShrink: 0 }}>
            {canEdit && (
              <>
                <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setShowInlineAdd(true)} disableElevation sx={{ fontSize: 12 }}>
                  {tCommon("add")}
                </Button>
                {count.status === "draft" && (
                  <Button size="small" variant="outlined" color="info" startIcon={<PlayArrow />}
                    onClick={() => updateStatusMutation.mutate("in_progress")}
                    disabled={updateStatusMutation.isPending} sx={{ fontSize: 12 }}>
                    {tManage("startCount")}
                  </Button>
                )}
                {canComplete && (
                  <Button size="small" variant="outlined" color="warning" startIcon={<Save />}
                    onClick={() => updateStatusMutation.mutate("completed")}
                    disabled={updateStatusMutation.isPending} sx={{ fontSize: 12 }}>
                    {tManage("complete")}
                  </Button>
                )}
              </>
            )}
            {canApprove && (
              <>
                <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
                  onClick={() => { if (window.confirm(tManage("confirmApprove"))) approveMutation.mutate(); }}
                  disabled={approveMutation.isPending} disableElevation sx={{ fontSize: 12 }}>
                  {tManage("approve")}
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
                  onClick={() => { if (window.confirm(tManage("confirmReject"))) rejectMutation.mutate(); }}
                  disabled={rejectMutation.isPending} sx={{ fontSize: 12 }}>
                  {tManage("reject")}
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* ── Inline Add ─────────────────────────────────────────────────────── */}
      {showInlineAdd && (
        <Paper variant="outlined" sx={{ mb: 2, borderStyle: "dashed" }}>
          <InlineCreateInventoryCountItem
            onSave={(data) => { addItemMutation.mutate(data); setShowInlineAdd(false); }}
            onCancel={() => setShowInlineAdd(false)}
            isLoading={addItemMutation.isPending}
            availableProducts={availableProducts}
          />
        </Paper>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1.25}
          borderBottom="1px solid" sx={{ borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <ListAlt sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" fontWeight={700}>{tManage("productsListTitle")}</Typography>
            <Chip label={filteredItems.length} size="small" sx={{ height: 18, fontSize: 11, fontWeight: 700 }} />
          </Stack>
          <TextField
            size="small"
            placeholder={tManage("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" color="action" /></InputAdornment> }}
            sx={{ width: 220 }}
          />
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, width: 40 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, width: 48, p: 0.5 }} />
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t("productColumn")}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, width: 110 }}>{tManage("expectedQuantityColumn")}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, width: 150 }}>{tManage("actualQuantityColumn")}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, width: 90 }}>{tManage("differenceColumn")}</TableCell>
                {canEdit && <TableCell sx={{ width: 50 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8, color: "text.disabled" }}>
                    <ListAlt sx={{ fontSize: 40, mb: 1, display: "block", mx: "auto", opacity: 0.3 }} />
                    {tManage("noMatchingProducts")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, index) => (
                  <TableRow key={item.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{index + 1}</TableCell>
                    <TableCell sx={{ p: 0.5, width: 48 }}>
                      <ProductImage
                        imageUrl={item.product?.image_url}
                        productName={item.product?.name}
                        size={32}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} fontSize={12}>{item.product?.name}</Typography>
                      {(item.product?.sku) && (
                        <Typography variant="caption" color="text.secondary" fontSize={10}>
                          {item.product?.sku}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={item.expected_quantity} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                    </TableCell>
                    <TableCell align="center">
                      {canEdit ? (
                        <Stack direction="row" alignItems="center" justifyContent="center" gap={0.75}>
                          <TextField
                            id={`qty-${index}`}
                            type="number"
                            size="small"
                            value={localQuantities[item.id] !== undefined ? localQuantities[item.id] : (item.actual_quantity ?? "")}
                            onChange={(e) => handleQuantityChange(item, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                document.getElementById(`qty-${index + 1}`)?.focus();
                              }
                            }}
                            sx={{ width: 90 }}
                            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                            placeholder="0"
                          />
                          {savingItems[item.id] && <CircularProgress size={14} />}
                        </Stack>
                      ) : (
                        <Typography variant="body2" fontSize={12}>{item.actual_quantity ?? "—"}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={700} fontSize={12} color={getDiffColor(item.difference)}>
                        {item.difference > 0 ? "+" : ""}{item.difference}
                      </Typography>
                    </TableCell>
                    {canEdit && (
                      <TableCell align="center">
                        <IconButton size="small" color="error"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          disabled={deleteItemMutation.isPending}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ManageInventoryCountPage;
