// src/pages/sales/SalesReturnsListPage.tsx
import React, { useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, RefreshCw, FileText } from "lucide-react";
import saleReturnService, { SaleReturn } from "@/services/saleReturnService";
import { useShifts } from "@/hooks/useShifts";
import { formatNumber } from "@/constants";

const SalesReturnsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = searchParams.get("startDate") || today;
  const endDate = searchParams.get("endDate") || today;
  const shiftIdParam = searchParams.get("shiftId");
  const pageParam = Number(searchParams.get("page") || "1");

  const { data: shifts = [] } = useShifts();

  const selectedShiftId = useMemo(
    () => (shiftIdParam ? Number(shiftIdParam) : undefined),
    [shiftIdParam],
  );

  const {
    data: returnsResult,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["sales-returns-list", startDate, endDate, selectedShiftId, pageParam],
    queryFn: () =>
      saleReturnService.getSaleReturns({
        start_date: startDate,
        end_date: endDate,
        shift_id: selectedShiftId ?? null,
        page: pageParam,
        per_page: 20,
      }),
    keepPreviousData: true,
  });

  const returns: SaleReturn[] = returnsResult?.data ?? [];
  const meta = returnsResult?.meta ?? {
    current_page: pageParam,
    last_page: 1,
    total: returns.length,
  };

  const totalAmount = useMemo(
    () =>
      returns.reduce((sum, r) => {
        const itemsTotal =
          r.items?.reduce(
            (acc, item) => acc + Number(item.price) * Number(item.quantity),
            0,
          ) ?? 0;
        return sum + itemsTotal;
      }, 0),
    [returns],
  );

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newStart = String(formData.get("startDate") || "");
    const newEnd = String(formData.get("endDate") || "");
    const newShiftId = String(formData.get("shiftId") || "");

    const params = new URLSearchParams();
    if (newStart) params.set("startDate", newStart);
    if (newEnd) params.set("endDate", newEnd);
    if (newShiftId) params.set("shiftId", newShiftId);
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (delta: number) => {
    const next = Math.min(
      Math.max(1, meta.current_page + delta),
      meta.last_page ?? meta.current_page,
    );
    if (next === meta.current_page) return;
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    setSearchParams(params);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: 3,
      }}
    >
      <Box
        sx={{
          maxWidth: "1200px",
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
        }}
      >
        <Stack spacing={3}>
          {/* Header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                onClick={() => navigate("/sales/pos-blank")}
                size="small"
                variant="outlined"
                startIcon={<ArrowLeft size={16} />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                رجوع
              </Button>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  سجل مردودات المبيعات
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  عرض وإدارة مردودات المبيعات حسب التاريخ والوردية
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="contained"
              onClick={() => navigate("/sales/returns/new")}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              مردود جديد
            </Button>
          </Stack>

          {/* Filters */}
          <Card>
            <CardContent>
              <Box
                component="form"
                onSubmit={handleFilterSubmit}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, 1fr)",
                    md: "repeat(4, 1fr)",
                  },
                  gap: 2,
                  alignItems: "flex-end",
                }}
              >
                <TextField
                  name="startDate"
                  type="date"
                  size="small"
                  label="من تاريخ"
                  InputLabelProps={{ shrink: true }}
                  defaultValue={startDate}
                />
                <TextField
                  name="endDate"
                  type="date"
                  size="small"
                  label="إلى تاريخ"
                  InputLabelProps={{ shrink: true }}
                  defaultValue={endDate}
                />
                <TextField
                  name="shiftId"
                  size="small"
                  label="رقم الوردية (اختياري)"
                  defaultValue={shiftIdParam || ""}
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  تطبيق الفلاتر
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Stats */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Card sx={{ flex: 1, minWidth: 220 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      عدد المردودات
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {formatNumber(meta.total ?? returns.length)}
                    </Typography>
                  </Box>
                  <FileText className="h-8 w-8 text-blue-500" />
                </Stack>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 220 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  إجمالي القيمة
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatNumber(totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {/* Table */}
          <Card>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  قائمة المردودات
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => refetch()}
                  startIcon={<RefreshCw size={16} />}
                  disabled={isLoading}
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  تحديث
                </Button>
              </Stack>

              {isLoading ? (
                <Typography variant="body2">جاري التحميل...</Typography>
              ) : returns.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    لا توجد مردودات مطابقة للفلاتر الحالية
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>المستخدم</TableCell>
                        <TableCell>الوردية</TableCell>
                        <TableCell>السبب</TableCell>
                        <TableCell>طريقة المردود</TableCell>
                        <TableCell align="right">عدد الأصناف</TableCell>
                        <TableCell align="right">إجمالي القيمة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {returns.map((r) => {
                        const createdAt = r.created_at
                          ? new Date(r.created_at).toLocaleString("ar-EG", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "";
                        const itemsTotal =
                          r.items?.reduce(
                            (acc, item) =>
                              acc +
                              Number(item.price) * Number(item.quantity),
                            0,
                          ) ?? 0;
                        const paymentLabel =
                          r.returned_payment_method === "cash"
                            ? "نقدي"
                            : r.returned_payment_method === "bankak"
                            ? "بنكك"
                            : r.returned_payment_method === "fawry"
                            ? "فوري"
                            : r.returned_payment_method === "ocash"
                            ? "أوكاش"
                            : r.returned_payment_method;

                        return (
                          <TableRow key={r.id}>
                            <TableCell>{r.id}</TableCell>
                            <TableCell>{createdAt}</TableCell>
                            <TableCell>{r.user?.name ?? "-"}</TableCell>
                            <TableCell>
                              {r.shift_id ? `#${r.shift_id}` : "-"}
                            </TableCell>
                            <TableCell>{r.reason ?? "-"}</TableCell>
                            <TableCell>{paymentLabel}</TableCell>
                            <TableCell align="right">
                              {r.items?.length ?? 0}
                            </TableCell>
                            <TableCell align="right">
                              {formatNumber(itemsTotal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {/* Simple previous/next pagination */}
              {meta.last_page > 1 && (
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  spacing={2}
                  mt={3}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handlePageChange(-1)}
                    disabled={meta.current_page <= 1}
                  >
                    السابق
                  </Button>
                  <Typography variant="body2">
                    صفحة {meta.current_page} من {meta.last_page}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handlePageChange(1)}
                    disabled={meta.current_page >= meta.last_page}
                  >
                    التالي
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
};

export default SalesReturnsListPage;

