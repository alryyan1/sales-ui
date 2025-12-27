import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import saleService from "../../services/saleService";
import { formatNumber } from "@/constants";

const SalesReturnsListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  // const [search, setSearch] = useState(""); // Search not fully implemented in backend yet for this endpoint specifically beyond ID

  // Fetch Data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sale-returns", page, status],
    queryFn: () => {
      let query = "";
      if (status !== "all") query += `&status=${status}`;
      return saleService.getSaleReturns(page, query);
    },
  });

  const returns = data?.data || [];
  const meta = data?.meta || {};

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          direction: "ltr",
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            color="primary"
            sx={{ display: "flex", alignItems: "center", gap: 2 }}
          >
            <RefreshCw /> سجل مردودات المبيعات
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            عرض وإدارة عمليات إرجاع المبيعات
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Plus />}
          onClick={() => navigate("/sales/returns/new")}
        >
          إرجاع جديد
        </Button>
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          direction: "ltr",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>تصفية حسب الحالة</InputLabel>
            <Select
              value={status}
              label="تصفية حسب الحالة"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="completed">مكتمل</MenuItem>
              <MenuItem value="pending">معلق</MenuItem>
              <MenuItem value="cancelled">ملغى</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", direction: "ltr" }}
      >
        <Table>
          <TableHead sx={{ bgcolor: "grey.50" }}>
            <TableRow>
              <TableCell align="center"># المعرف</TableCell>
              <TableCell>الفاتورة الأصلية</TableCell>
              <TableCell>العميل</TableCell>
              <TableCell align="center">تاريخ الإرجاع</TableCell>
              <TableCell align="center">طريقة الإرجاع</TableCell>
              <TableCell align="center">المبلغ المسترد</TableCell>
              <TableCell align="center">الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  تحميل البيانات...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ py: 5, color: "error.main" }}
                >
                  فشل تحميل البيانات
                </TableCell>
              </TableRow>
            ) : returns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  لا توجد عمليات إرجاع
                </TableCell>
              </TableRow>
            ) : (
              returns.map((ret) => (
                <TableRow key={ret.id} hover>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    #{ret.id}
                  </TableCell>
                  <TableCell>
                    {ret.original_sale?.invoice_number ||
                      `#${ret.original_sale_id}`}
                  </TableCell>
                  <TableCell>{ret.client?.name || "-"}</TableCell>
                  <TableCell align="center">
                    {new Date(ret.return_date).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell align="center">
                    {ret.credit_action === "refund"
                      ? "إسترداد نقدي"
                      : "رصيد دائن"}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", color: "error.main" }}
                  >
                    {formatNumber(ret.total_returned_amount)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={ret.status === "completed" ? "مكتمل" : ret.status}
                      color={getStatusColor(ret.status) as any}
                      size="small"
                      variant="filled"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Pagination
            count={meta.last_page}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default SalesReturnsListPage;
