import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  Pagination,
  Typography,
  Stack,
} from "@mui/material";

import {
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Cancel,
  Assessment,
  FileUpload,
} from "@mui/icons-material";
import inventoryCountService, {
  InventoryCount,
  InventoryCountFilters,
} from "@/services/inventoryCountService";
import { warehouseService } from "@/services/warehouseService";
import InventoryCountDialog from "../../components/inventory/InventoryCountDialog";
import dayjs from "dayjs";

const InventoryCountPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<InventoryCountFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCount, setEditingCount] = useState<InventoryCount | null>(null);
  const perPage = 15; // Define perPage as a constant

  // Queries
  const { data: countsData, isLoading } = useQuery({
    queryKey: ["inventory-counts", page, perPage, filters],
    queryFn: () =>
      inventoryCountService.getInventoryCounts({
        ...filters,
        page,
        per_page: perPage,
      }),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => warehouseService.getAll(),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryCountService.deleteInventoryCount(id),
    onSuccess: () => {
      toast.success("تم حذف الجرد بنجاح");
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => inventoryCountService.approveCount(id),
    onSuccess: () => {
      toast.success("تم اعتماد الجرد وتعديل المخزون");
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => inventoryCountService.rejectCount(id),
    onSuccess: () => {
      toast.success("تم رفض الجرد");
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  const importAllProductsMutation = useMutation({
    mutationFn: (id: number) => inventoryCountService.importAllProducts(id),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  // Handlers
  const handleDelete = (count: InventoryCount) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الجرد؟")) {
      deleteMutation.mutate(count.id);
    }
  };

  const handleApprove = (count: InventoryCount) => {
    if (
      window.confirm(
        "هل أنت متأكد من اعتماد هذا الجرد؟ سيتم تعديل المخزون تلقائياً.",
      )
    ) {
      approveMutation.mutate(count.id);
    }
  };

  const handleReject = (count: InventoryCount) => {
    if (window.confirm("هل أنت متأكد من رفض هذا الجرد؟")) {
      rejectMutation.mutate(count.id);
    }
  };

  const handleImportAllProducts = (count: InventoryCount) => {
    if (
      window.confirm(
        "هل تريد استيراد جميع المنتجات من المستودع؟ سيتم إضافة المنتجات التي لم تتم إضافتها مسبقاً.",
      )
    ) {
      importAllProductsMutation.mutate(count.id);
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      draft: { label: "مسودة", color: "default" as const },
      in_progress: { label: "قيد التنفيذ", color: "info" as const },
      completed: { label: "مكتمل", color: "warning" as const },
      approved: { label: "معتمد", color: "success" as const },
      rejected: { label: "مرفوض", color: "error" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Assessment sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography variant="h4" fontWeight="bold">
            جرد المخزون
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingCount(null);
            setDialogOpen(true);
          }}
        >
          جرد جديد
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 2,
          }}
        >
          <TextField
            select
            label="المستودع"
            value={filters.warehouse_id || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                warehouse_id: Number(e.target.value) || undefined,
              })
            }
            size="small"
          >
            <MenuItem value="">الكل</MenuItem>
            {warehouses?.map((w: any) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="الحالة"
            value={filters.status || ""}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value || undefined })
            }
            size="small"
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="draft">مسودة</MenuItem>
            <MenuItem value="in_progress">قيد التنفيذ</MenuItem>
            <MenuItem value="completed">مكتمل</MenuItem>
            <MenuItem value="approved">معتمد</MenuItem>
            <MenuItem value="rejected">مرفوض</MenuItem>
          </TextField>

          <TextField
            type="date"
            label="من تاريخ"
            value={filters.start_date || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                start_date: e.target.value || undefined,
              })
            }
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            type="date"
            label="إلى تاريخ"
            value={filters.end_date || ""}
            onChange={(e) =>
              setFilters({ ...filters, end_date: e.target.value || undefined })
            }
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell>#</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>المستودع</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المستخدم</TableCell>
              <TableCell align="center">عدد المنتجات</TableCell>
              <TableCell>الملاحظات</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : countsData?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  لا توجد عمليات جرد
                </TableCell>
              </TableRow>
            ) : (
              countsData?.data?.map((count: InventoryCount) => (
                <TableRow key={count.id} hover>
                  <TableCell>{count.id}</TableCell>
                  <TableCell>
                    {dayjs(count.count_date).format("YYYY-MM-DD")}
                  </TableCell>
                  <TableCell>{count.warehouse?.name}</TableCell>
                  <TableCell>{getStatusChip(count.status)}</TableCell>
                  <TableCell>{count.user?.name}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={count.items_count || 0}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{count.notes || "—"}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility fontSize="small" />}
                        onClick={() => navigate(`/inventory/counts/${count.id}`)}
                        sx={{ fontSize: 11 }}
                      >
                        عرض
                      </Button>

                      {(count.status === "draft" || count.status === "in_progress") && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<FileUpload fontSize="small" />}
                          onClick={() => handleImportAllProducts(count)}
                          disabled={importAllProductsMutation.isPending}
                          sx={{ fontSize: 11 }}
                        >
                          استيراد الكل
                        </Button>
                      )}

                      {count.status === "draft" && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Edit fontSize="small" />}
                            onClick={() => { setEditingCount(count); setDialogOpen(true); }}
                            sx={{ fontSize: 11 }}
                          >
                            تعديل
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Delete fontSize="small" />}
                            onClick={() => handleDelete(count)}
                            sx={{ fontSize: 11 }}
                          >
                            حذف
                          </Button>
                        </>
                      )}

                      {count.status === "completed" && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle fontSize="small" />}
                            onClick={() => handleApprove(count)}
                            sx={{ fontSize: 11 }}
                          >
                            اعتماد
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel fontSize="small" />}
                            onClick={() => handleReject(count)}
                            sx={{ fontSize: 11 }}
                          >
                            رفض
                          </Button>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {countsData?.last_page > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={countsData.last_page}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Dialog */}
      <InventoryCountDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingCount(null);
        }}
        count={editingCount}
        onSuccess={() => {
          setDialogOpen(false);
          setEditingCount(null);
          queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
        }}
      />
    </Box>
  );
};

export default InventoryCountPage;
