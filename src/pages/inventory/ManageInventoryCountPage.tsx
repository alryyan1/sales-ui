import React, { useState, useEffect, useRef } from "react";
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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from "@mui/material";
import {
  ArrowBack,
  Add,
  Delete,
  CheckCircle,
  Cancel,
  Save,
} from "@mui/icons-material";
import inventoryCountService, {
  InventoryCount,
  InventoryCountItem,
} from "@/services/inventoryCountService";
import productService from "@/services/productService";
import dayjs from "dayjs";

const ManageInventoryCountPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productInputValue, setProductInputValue] = useState("");
  const [actualQuantity, setActualQuantity] = useState<string>("");
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
      setAddDialogOpen(false);
      setSelectedProduct(null);
      setProductInputValue("");
      setActualQuantity("");
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
  const handleAddItem = () => {
    if (!selectedProduct) return;
    addItemMutation.mutate({
      product_id: selectedProduct.id,
      actual_quantity: actualQuantity ? Number(actualQuantity) : undefined,
    });
  };

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
  const isReadOnly =
    count?.status === "approved" || count?.status === "rejected";
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

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography>جاري التحميل...</Typography>
      </Box>
    );
  }

  if (!count) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography>الجرد غير موجود</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/inventory/counts")}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" fontWeight="bold">
              جرد المخزون #{count.id}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {canEdit && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => {
                    setAddDialogOpen(true);
                    setProductInputValue("");
                    setSelectedProduct(null);
                  }}
                >
                  إضافة منتج
                </Button>
                {count.status === "draft" && (
                  <Button
                    variant="contained"
                    color="info"
                    onClick={() => updateStatusMutation.mutate("in_progress")}
                  >
                    بدء الجرد
                  </Button>
                )}
                {canComplete && (
                  <Button
                    variant="contained"
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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              المستودع
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {count.warehouse?.name}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              التاريخ
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {dayjs(count.count_date).format("YYYY-MM-DD")}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              الحالة
            </Typography>
            <Box sx={{ mt: 0.5 }}>
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
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              المستخدم
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {count.user?.name}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Summary */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            textAlign: "center",
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {summary.totalItems}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              إجمالي الأصناف
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="h4"
              fontWeight="bold"
              color={getDifferenceColor(summary.totalDifference)}
            >
              {summary.totalDifference > 0 && "+"}
              {summary.totalDifference}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              إجمالي الفرق
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {summary.itemsWithDifference}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              أصناف بها فروقات
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Items Table */}
      <TableContainer dir="ltr" component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell>#</TableCell>
              <TableCell>المنتج</TableCell>
              <TableCell align="center">الكمية المسجلة</TableCell>
              <TableCell align="center">الكمية الفعلية</TableCell>
              <TableCell align="center">الفرق</TableCell>
              {canEdit && <TableCell align="center">إجراءات</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {count.items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  لا توجد منتجات في الجرد
                </TableCell>
              </TableRow>
            ) : (
              count.items?.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.product?.name}</TableCell>
                  <TableCell align="center">{item.expected_quantity}</TableCell>
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
                      />
                    ) : (
                      (item.actual_quantity ?? "—")
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
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

      {/* Add Item Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setProductInputValue("");
          setSelectedProduct(null);
        }}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>إضافة منتج للجرد</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={availableProducts}
            getOptionLabel={(option: any) =>
              option.sku
                ? `${option.name} (${option.sku})`
                : option.name ?? ""
            }
            inputValue={
              selectedProduct
                ? selectedProduct.sku
                  ? `${selectedProduct.name} (${selectedProduct.sku})`
                  : selectedProduct.name ?? ""
                : productInputValue
            }
            onInputChange={(_, value) => setProductInputValue(value)}
            filterOptions={(options, { inputValue }) => {
              const q = (inputValue || "").trim().toLowerCase();
              if (!q) return options;
              return options.filter(
                (option: any) =>
                  (option.name && option.name.toLowerCase().includes(q)) ||
                  (option.sku && option.sku.toLowerCase().includes(q)) ||
                  (option.barcode && String(option.barcode).toLowerCase().includes(q))
              );
            }}
            value={selectedProduct}
            onChange={(_, newValue) => {
              setSelectedProduct(newValue);
              setProductInputValue("");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const q = productInputValue.trim().toLowerCase();
              if (!q) return;
              const match = availableProducts.find(
                (option: any) =>
                  (option.name && option.name.toLowerCase().includes(q)) ||
                  (option.sku && option.sku.toLowerCase().includes(q)) ||
                  (option.barcode && String(option.barcode).toLowerCase().includes(q))
              );
              if (match) {
                e.preventDefault();
                setSelectedProduct(match);
                setProductInputValue("");
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="المنتج (الاسم أو الباركود)"
                margin="normal"
              />
            )}
          />
          <TextField
            type="number"
            label="الكمية الفعلية (اختياري)"
            fullWidth
            margin="normal"
            value={actualQuantity}
            onChange={(e) => setActualQuantity(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!selectedProduct || addItemMutation.isPending}
          >
            {addItemMutation.isPending ? "جاري الإضافة..." : "إضافة"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageInventoryCountPage;
