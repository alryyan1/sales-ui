import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  Grid,
  CircularProgress,
  InputAdornment,
  Avatar,
  Card,
  CardContent,
  Container,
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
} from "@mui/icons-material";
import inventoryCountService, {
  InventoryCountItem,
} from "@/services/inventoryCountService";
import productService from "@/services/productService";
import dayjs from "dayjs";

import InlineCreateInventoryCountItem from "@/components/inventory/InlineCreateInventoryCountItem";

const ManageInventoryCountPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localQuantities, setLocalQuantities] = useState<
    Record<number, string>
  >({});
  const debounceTimers = useRef<Record<number, NodeJS.Timeout>>({});

  // Queries
  const { data: count, isLoading } = useQuery({
    queryKey: ["inventory-count", id],
    queryFn: () => inventoryCountService.getInventoryCount(Number(id)),
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getProducts(1, "", "name", "asc", 1000),
  });

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: (data: { product_id: number; actual_quantity?: number }) =>
      inventoryCountService.addCountItem(Number(id), data),
    onSuccess: () => {
      toast.success("تم إضافة المنتج بنجاح");
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      actual_quantity,
    }: {
      itemId: number;
      actual_quantity: number;
    }) =>
      inventoryCountService.updateCountItem(Number(id), itemId, {
        actual_quantity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) =>
      inventoryCountService.deleteCountItem(Number(id), itemId),
    onSuccess: () => {
      toast.success("تم حذف المنتج");
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      inventoryCountService.updateInventoryCount(Number(id), { status } as any),
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => inventoryCountService.approveCount(Number(id)),
    onSuccess: () => {
      toast.success("تم اعتماد الجرد وتعديل المخزون");
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => inventoryCountService.rejectCount(Number(id)),
    onSuccess: () => {
      toast.success("تم رفض الجرد");
      queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  // Handlers
  const handleQuantityChange = (item: InventoryCountItem, value: string) => {
    // Update local state immediately for responsive UI
    setLocalQuantities((prev) => ({ ...prev, [item.id]: value }));

    // Clear existing timer for this item
    if (debounceTimers.current[item.id]) {
      clearTimeout(debounceTimers.current[item.id]);
    }

    // Set new timer to update after 500ms of no typing
    debounceTimers.current[item.id] = setTimeout(() => {
      const qty = Number(value);
      if (!isNaN(qty) && qty >= 0) {
        updateItemMutation.mutate({ itemId: item.id, actual_quantity: qty });
      }
    }, 500);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach((timer) =>
        clearTimeout(timer),
      );
    };
  }, []);

  const handleApprove = () => {
    if (
      window.confirm(
        "هل أنت متأكد من اعتماد هذا الجرد؟ سيتم تعديل المخزون تلقائياً.",
      )
    ) {
      approveMutation.mutate();
    }
  };

  const handleReject = () => {
    if (window.confirm("هل أنت متأكد من رفض هذا الجرد؟")) {
      rejectMutation.mutate();
    }
  };

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return "success.main";
    if (diff < 0) return "error.main";
    return "text.secondary";
  };

  const calculateSummary = () => {
    const items = count?.items || [];
    const totalItems = items.length;
    const totalDifference = items.reduce(
      (sum, item) => sum + item.difference,
      0,
    );
    const itemsWithDifference = items.filter(
      (item) => item.difference !== 0,
    ).length;
    return { totalItems, totalDifference, itemsWithDifference };
  };

  const summary = calculateSummary();
  const canEdit = count?.status === "draft" || count?.status === "in_progress";
  const canComplete =
    count?.status === "in_progress" && count?.items && count.items.length > 0;
  const canApprove = count?.status === "completed";

  // Filter out products that are already in the count
  const availableProducts =
    products?.data?.filter(
      (product: any) =>
        !count?.items?.some((item) => item.product_id === product.id),
    ) || [];

  // Filter items in the table
  const filteredItems = useMemo(() => {
    if (!count?.items) return [];
    if (!searchQuery) return count.items;
    const q = searchQuery.toLowerCase();
    return count.items.filter(
      (item) =>
        item.product?.name.toLowerCase().includes(q) ||
        item.product?.sku?.toLowerCase().includes(q) ||
        item.product?.barcode?.toLowerCase().includes(q),
    );
  }, [count?.items, searchQuery]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!count) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          الجرد غير موجود
        </Typography>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => navigate("/inventory/counts")}
        >
          العودة للقائمة
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
          mb: 4,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={() => navigate("/inventory/counts")}
            sx={{ bgcolor: "background.paper", boxShadow: 1 }}
          >
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              جرد المخزون #{count.id}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {count.warehouse?.name}
              </Typography>
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  bgcolor: "text.disabled",
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {dayjs(count.count_date).format("YYYY-MM-DD")}
              </Typography>
              <Chip
                label={
                  count.status === "draft"
                    ? "مسودة"
                    : count.status === "in_progress"
                      ? "قيد التنفيذ"
                      : count.status === "completed"
                        ? "مكتمل"
                        : count.status === "approved"
                          ? "معتمد"
                          : "مرفوض"
                }
                color={
                  count.status === "approved"
                    ? "success"
                    : count.status === "rejected"
                      ? "error"
                      : count.status === "completed"
                        ? "warning"
                        : "default"
                }
                size="small"
                sx={{ fontWeight: "bold" }}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {canEdit && (
            <>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowInlineAdd(true)}
                sx={{ px: 3 }}
              >
                إضافة منتج
              </Button>
              {count.status === "draft" && (
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => updateStatusMutation.mutate("in_progress")}
                >
                  بدء الجرد
                </Button>
              )}
              {canComplete && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Save />}
                  onClick={() => updateStatusMutation.mutate("completed")}
                >
                  إكمال الجرد
                </Button>
              )}
            </>
          )}
          {canApprove && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={handleApprove}
              >
                اعتماد
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={handleReject}
              >
                رفض
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: "16px !important",
              }}
            >
              <Avatar
                variant="rounded"
                sx={{ bgcolor: "primary.soft", color: "primary.main" }}
              >
                <Inventory />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {summary.totalItems}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الأصناف
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: "16px !important",
              }}
            >
              <Avatar
                variant="rounded"
                sx={{ bgcolor: "info.soft", color: "info.main" }}
              >
                <Assessment />
              </Avatar>
              <Box>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  color={getDifferenceColor(summary.totalDifference)}
                >
                  {summary.totalDifference > 0 && "+"}
                  {summary.totalDifference}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الفرق
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: "16px !important",
              }}
            >
              <Avatar
                variant="rounded"
                sx={{ bgcolor: "warning.soft", color: "warning.main" }}
              >
                <Warning />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {summary.itemsWithDifference}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  أصناف بها فروقات
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inline Add Item Form */}
      {showInlineAdd && (
        <Paper
          elevation={0}
          sx={{ mb: 3, border: "1px dashed", borderColor: "divider" }}
        >
          <InlineCreateInventoryCountItem
            onSave={(data) => {
              addItemMutation.mutate(data);
            }}
            onCancel={() => setShowInlineAdd(false)}
            isLoading={addItemMutation.isPending}
            availableProducts={availableProducts}
          />
        </Paper>
      )}

      {/* Main Content */}
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        {/* Toolbar */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ListAlt color="action" />
            <Typography variant="h6" fontWeight="bold">
              قائمة المنتجات
            </Typography>
            <Chip
              label={`${filteredItems.length} منتج`}
              size="small"
              sx={{ bgcolor: "grey.100" }}
            />
          </Box>
          <TextField
            size="small"
            placeholder="بحث عن منتج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: "bold" }}>#</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>المنتج</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  الكمية المسجلة
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  الكمية الفعلية
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  الفرق
                </TableCell>
                {canEdit && (
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    إجراءات
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                        opacity: 0.5,
                      }}
                    >
                      <ListAlt sx={{ fontSize: 48 }} />
                      <Typography>لا توجد منتجات مطابقة</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, index) => (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {item.product?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product?.sku || item.product?.barcode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={item.expected_quantity}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {canEdit ? (
                        <TextField
                          id={`quantity-input-${index}`}
                          type="number"
                          size="small"
                          value={
                            localQuantities[item.id] !== undefined
                              ? localQuantities[item.id]
                              : (item.actual_quantity ?? "")
                          }
                          onChange={(e) =>
                            handleQuantityChange(item, e.target.value)
                          }
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const nextIndex = index + 1;
                              const nextInput = document.getElementById(
                                `quantity-input-${nextIndex}`,
                              );
                              if (nextInput) {
                                nextInput.focus();
                              }
                            }
                          }}
                          sx={{ width: 100 }}
                          inputProps={{ min: 0, step: 0.01 }}
                          placeholder="0"
                        />
                      ) : (
                        (item.actual_quantity ?? "—")
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={getDifferenceColor(item.difference)}
                      >
                        {item.difference > 0 && "+"}
                        {item.difference}
                      </Typography>
                    </TableCell>
                    {canEdit && (
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                        >
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
    </Container>
  );
};

export default ManageInventoryCountPage;
