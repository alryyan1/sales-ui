import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Pagination,
  Stack,
  Skeleton,
  Alert,
  AlertTitle,
} from "@mui/material";
import { FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useSalesReport } from "@/hooks/useSalesReport";
import { useSettings } from "@/context/SettingsContext";
import { formatNumber } from "@/constants";
import { ReportFilterValues } from "./ReportFilters";

interface SalesTableProps {
  filterValues: ReportFilterValues;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRowClick: (saleId: number) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  filterValues,
  currentPage,
  onPageChange,
  onRowClick,
}) => {
  const { getSetting } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  const {
    data: reportData,
    isLoading,
    error,
  } = useSalesReport({
    page: currentPage,
    startDate: filterValues.startDate,
    endDate: filterValues.endDate,
    clientId: filterValues.clientId ? Number(filterValues.clientId) : null,
    userId: filterValues.userId ? Number(filterValues.userId) : null,
    shiftId: filterValues.shiftId ? Number(filterValues.shiftId) : null,
    productId: filterValues.productId ? Number(filterValues.productId) : null, // Added productId support
    limit: 25,
    posMode,
  });

  // --- Loading State ---
  if (isLoading) {
    return (
      <Card
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            {[...Array(5)].map((_, i) => (
              <Stack key={i} direction="row" spacing={2} alignItems="center">
                <Skeleton variant="rounded" width={80} height={20} />
                <Skeleton variant="rounded" width={100} height={20} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={20} />
                </Box>
                <Skeleton variant="rounded" width={80} height={24} />
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <Alert
        severity="error"
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>خطأ</AlertTitle>
        {(error as Error)?.message || "حدث خطأ أثناء تحميل البيانات"}
      </Alert>
    );
  }

  // --- No Data ---
  if (!reportData) return null;

  return (
    <Card
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        overflow: "hidden",
      }}
    >
      <CardHeader
        sx={{
          borderBottom: "2px solid",
          borderColor: "primary.main",
          py: 2.5,
          px: 3,
          bgcolor: "grey.50",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Typography
            variant="h6"
            component="h2"
            sx={{ fontWeight: 700, color: "primary.main" }}
          >
            النتائج
          </Typography>
          <Chip
            label={`${(currentPage - 1) * 25 + 1}-${Math.min(
              currentPage * 25,
              reportData.total
            )} من ${reportData.total}`}
            size="small"
            variant="filled"
            color="primary"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </CardHeader>
      <CardContent sx={{ p: 0 }}>
        {reportData.data.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              px: 2,
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                p: 2,
                bgcolor: "action.hover",
                borderRadius: 3,
                mb: 2,
              }}
            >
              <FileText size={32} style={{ opacity: 0.4 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 600 }}>
              لا توجد مبيعات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              جرب تعديل الفلاتر
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="medium" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: "primary.main",
                      "& .MuiTableCell-root": {
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        py: 2,
                        color: "white",
                        borderBottom: "2px solid",
                        borderColor: "primary.dark",
                      },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                      رقم العمليه
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                      التاريخ
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                      العميل
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                      المستخدم
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 700, fontSize: "0.875rem" }}
                      align="center"
                    >
                      المدفوعات
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: "0.875rem" }}
                    >
                      الخصم
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: "0.875rem" }}
                    >
                      المبلغ الإجمالي
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: "0.875rem" }}
                    >
                      المدفوع
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: "0.875rem" }}
                    >
                      المستحق
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.data.map((sale) => (
                    <TableRow
                      key={sale.id}
                      hover
                      onClick={() => onRowClick(sale.id)}
                      sx={{
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: "action.hover",
                          transform: "translateX(-2px)",
                        },
                        "&:last-child td": { border: 0 },
                        "& .MuiTableCell-root": {
                          py: 2,
                          fontSize: "0.875rem",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        },
                      }}
                    >
                      <TableCell
                        sx={{ fontWeight: 600, color: "primary.main" }}
                      >
                        #{sale.id}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {format(parseISO(sale.sale_date), "yyyy-MM-dd")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {sale.client_name ? (
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {sale.client_name}
                          </Typography>
                        ) : (
                          <Typography
                            component="span"
                            color="text.secondary"
                            variant="body2"
                          >
                            عميل غير محدد
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {sale.user_name ? (
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {sale.user_name}
                          </Typography>
                        ) : (
                          <Typography
                            component="span"
                            color="text.secondary"
                            variant="body2"
                          >
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {sale.payments && sale.payments.length > 0 ? (
                          <Chip
                            label={`${sale.payments.length} ${
                              sale.payments.length === 1 ? "دفعة" : "دفعات"
                            }`}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: "primary.main",
                              color: "primary.main",
                              fontWeight: 600,
                            }}
                          />
                        ) : (
                          <Typography
                            component="span"
                            color="text.secondary"
                            variant="body2"
                          >
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {sale.discount_amount &&
                        Number(sale.discount_amount) > 0 ? (
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: "warning.main",
                              }}
                            >
                              {formatNumber(sale.discount_amount)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", mt: 0.25 }}
                            >
                              {(sale as any).discount_type === "percentage"
                                ? "%"
                                : "ثابت"}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography
                            component="span"
                            color="text.secondary"
                            variant="body2"
                          >
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 600, fontSize: "0.9375rem" }}
                      >
                        {formatNumber(sale.total_amount)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 500, color: "success.main" }}
                      >
                        {formatNumber(sale.paid_amount)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color:
                              Number(sale.due_amount || 0) > 0
                                ? "error.main"
                                : "success.main",
                          }}
                        >
                          {formatNumber(sale.due_amount || 0)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* Pagination */}
            {reportData.last_page > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  py: 2.5,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Pagination
                  count={reportData.last_page}
                  page={currentPage}
                  onChange={(_, page) => onPageChange(page)}
                  color="primary"
                  disabled={isLoading}
                  size="small"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      borderRadius: 1.5,
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
