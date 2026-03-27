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
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  Plus,
  PackageX,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import saleReturnService, { SaleReturn } from "@/services/saleReturnService";
import { formatNumber } from "@/constants";

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  bankak: "بنكك",
  fawry: "فوري",
  ocash: "أوكاش",
};

const METHOD_COLORS: Record<string, "default" | "success" | "info" | "warning"> = {
  cash: "success",
  bankak: "info",
  fawry: "warning",
  ocash: "default",
};

const SalesReturnsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = searchParams.get("startDate") || today;
  const endDate = searchParams.get("endDate") || today;
  const shiftIdParam = searchParams.get("shiftId");
  const pageParam = Number(searchParams.get("page") || "1");

  const selectedShiftId = useMemo(
    () => (shiftIdParam ? Number(shiftIdParam) : undefined),
    [shiftIdParam],
  );

  const {
    data: returnsResult,
    isLoading,
    refetch,
    isFetching,
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
    <Box sx={{ p: { xs: 1.5, md: 2 }, display: "flex", flexDirection: "column", gap: 1.5 }}>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton onClick={() => navigate("/sales/pos-blank")} size="small">
          <ArrowLeft size={18} />
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} noWrap>
            مردودات المبيعات
          </Typography>
          <Typography variant="caption" color="text.secondary">
            عرض وإدارة مردودات المبيعات حسب التاريخ والوردية
          </Typography>
        </Box>

   
      </Box>

      {/* Summary Strip */}
      <Box sx={{ display: "grid", gridTemplateColumns: "200px 200px", gap: 1.5 }}>
        {[
          {
            label: "عدد المردودات",
            value: formatNumber(meta.total ?? returns.length),
            icon: <PackageX size={18} />,
            color: "warning" as const,
          },
          {
            label: "إجمالي القيمة",
            value: formatNumber(totalAmount),
            icon: <DollarSign size={18} />,
            color: "error" as const,
          },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: "12px !important" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: `${color}.50`,
                    color: `${color}.main`,
                    display: "flex",
                  }}
                >
                  {icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {label}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} color={`${color}.main`} lineHeight={1.2}>
                    {value}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filters */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: "12px !important" }}>
          <Box
            component="form"
            onSubmit={handleFilterSubmit}
            sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}
          >
            <TextField
              name="startDate"
              type="date"
              size="small"
              label="من تاريخ"
              InputLabelProps={{ shrink: true }}
              defaultValue={startDate}
              sx={{ width: 160 }}
            />
            <TextField
              name="endDate"
              type="date"
              size="small"
              label="إلى تاريخ"
              InputLabelProps={{ shrink: true }}
              defaultValue={endDate}
              sx={{ width: 160 }}
            />
            <TextField
              name="shiftId"
              size="small"
              label="رقم الوردية"
              defaultValue={shiftIdParam || ""}
              sx={{ width: 140 }}
            />
            <Button
              type="submit"
              variant="contained"
              size="small"
              sx={{ textTransform: "none", height: 36 }}
            >
              تطبيق
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          maxHeight: "calc(100vh - 300px)",
        }}
      >
        <CardContent
          sx={{
            p: "12px !important",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Table header row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <RotateCcw size={15} style={{ color: "var(--mui-palette-text-secondary)" }} />
            <Typography variant="subtitle2" fontWeight={700}>
              قائمة المردودات
            </Typography>
            <Chip
              label={meta.total ?? returns.length}
              size="small"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
            <Box sx={{ flex: 1 }} />
            <Tooltip title="تحديث">
              <span>
                <IconButton size="small" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Divider sx={{ mb: 1 }} />

          <Box sx={{ flex: 1, overflow: "auto" }}>
            {isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8, gap: 1.5 }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary" variant="body2">جاري التحميل...</Typography>
              </Box>
            ) : returns.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                <PackageX size={40} style={{ opacity: 0.25, marginBottom: 8 }} />
                <Typography variant="body2">لا توجد مردودات مطابقة للفلاتر الحالية</Typography>
              </Box>
            ) : (
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 40 }}>م</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>#فاتورة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الهاتف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المستخدم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الوردية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>السبب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">طريقة المردود</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">الأصناف</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {returns.map((r, index) => {
                    const itemsTotal =
                      r.items?.reduce(
                        (acc, item) => acc + Number(item.price) * Number(item.quantity),
                        0,
                      ) ?? 0;
                    const method = r.returned_payment_method ?? "";
                    const methodLabel = METHOD_LABELS[method] ?? method;
                    const methodColor = METHOD_COLORS[method] ?? "default";

                    return (
                      <TableRow key={r.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                        <TableCell sx={{ fontSize: "0.75rem", color: "text.disabled", textAlign: "center" }}>
                          {(pageParam - 1) * 20 + index + 1}
                        </TableCell>

                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Typography variant="body2" fontSize="0.8rem">
                            {r.created_at
                              ? format(new Date(r.created_at), "yyyy-MM-dd")
                              : "—"}
                          </Typography>
                          {r.created_at && (
                            <Typography variant="caption" color="text.disabled" display="block" fontSize="0.7rem">
                              {format(new Date(r.created_at), "HH:mm")}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                          {r.sale_id != null ? (
                            <Chip
                              label={`#${r.sale_id}`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 18, fontSize: "0.7rem" }}
                            />
                          ) : "—"}
                        </TableCell>

                        <TableCell sx={{ fontSize: "0.8rem" }} dir="ltr">
                          {r.phone_number ?? "—"}
                        </TableCell>

                        <TableCell sx={{ fontSize: "0.8rem" }}>
                          {r.user?.name ?? "—"}
                        </TableCell>

                        <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                          {r.shift_id ? `#${r.shift_id}` : "—"}
                        </TableCell>

                        <TableCell sx={{ fontSize: "0.8rem", maxWidth: 160 }}>
                          <Typography
                            variant="body2"
                            fontSize="0.8rem"
                            noWrap
                            title={r.reason ?? ""}
                          >
                            {r.reason ?? "—"}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            label={methodLabel}
                            size="small"
                            color={methodColor}
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            label={r.items?.length ?? 0}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: "0.7rem" }}
                          />
                        </TableCell>

                        <TableCell align="right" dir="ltr" sx={{ fontWeight: 700, fontSize: "0.82rem", color: "error.main" }}>
                          {formatNumber(itemsTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <>
              <Divider sx={{ mt: 1 }} />
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} pt={1}>
                <IconButton
                  size="small"
                  onClick={() => handlePageChange(-1)}
                  disabled={meta.current_page <= 1}
                >
                  <ChevronRight size={16} />
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  صفحة {meta.current_page} من {meta.last_page}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handlePageChange(1)}
                  disabled={meta.current_page >= meta.last_page}
                >
                  <ChevronLeft size={16} />
                </IconButton>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SalesReturnsListPage;
