import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Pagination,
  TextField,
} from "@mui/material";
import { X, CheckCircle } from "lucide-react";
import saleService, { Sale } from "@/services/saleService";
import { formatNumber } from "@/constants";
import { toast } from "sonner";

interface PastSalesSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectSale: (saleId: number) => void;
}

export const PastSalesSearchDialog: React.FC<PastSalesSearchDialogProps> = ({
  open,
  onClose,
  onSelectSale,
}) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterDate, setFilterDate] = useState<string>("");

  const fetchPastSales = useCallback(
    async (pageToFetch: number) => {
      setLoading(true);
      try {
        // Fetch only completed sales or non-draft sales
        const queryParams = "";
        // You can limit to sales with due_amount == 0 if required, but getSales doesn't support that directly. We'll fetch normally.

        const res = await saleService.getSales(
          pageToFetch,
          queryParams,
          "", // status
          filterDate, // start date
          filterDate, // end date (same as start date for single day filtering)
          10, // limit
        );
        setSales(res.data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta = (res as any).meta;
        if (meta) {
          setTotalPages(meta.last_page || 1);
        }
      } catch (err) {
        console.error(err);
        toast.error("فشل إحضار العمليات السابقة");
      } finally {
        setLoading(false);
      }
    },
    [filterDate],
  );

  useEffect(() => {
    if (open) {
      fetchPastSales(1);
      setPage(1);
    } else {
      setSales([]);
    }
  }, [open, fetchPastSales]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
    fetchPastSales(value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <DialogTitle sx={{ p: 0, fontWeight: "bold" }}>
            العمليات السابقة
          </DialogTitle>
          <TextField
            type="date"
            size="small"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setPage(1); // Reset page on filter change
            }}
            InputLabelProps={{ shrink: true }}
            label="تاريخ الفاتورة"
            sx={{ width: 150 }}
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : sales.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              لا توجد عمليات سابقة لعرضها.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>رقم الفاتورة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>العميل</TableCell>
                  <TableCell>الأصناف</TableCell>
                  <TableCell>الإجمالي</TableCell>
                  <TableCell>المتبقي</TableCell>
                  <TableCell align="center">اختيار</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => {
                  const due = Number(sale.due_amount ?? 0);
                  const canReturn = due <= 0.01;
                  return (
                    <TableRow
                      key={sale.id}
                      sx={{ opacity: canReturn ? 1 : 0.6 }}
                    >
                      <TableCell>#{sale.id}</TableCell>
                      <TableCell>{sale.sale_date}</TableCell>
                      <TableCell>
                        {sale.client_name ?? sale.client?.name ?? "عميل نقدي"}
                      </TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 200,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={
                          sale.items
                            ?.map(
                              (i) =>
                                i.product?.name ??
                                i.product_name ??
                                "صنف غير معروف",
                            )
                            .join("، ") || ""
                        }
                      >
                        {sale.items
                          ?.map(
                            (i) =>
                              i.product?.name ??
                              i.product_name ??
                              "صنف غير معروف",
                          )
                          .join("، ") || "—"}
                      </TableCell>
                      <TableCell>{formatNumber(sale.total_amount)}</TableCell>
                      <TableCell>
                        <Typography
                          color={due > 0 ? "error.main" : "success.main"}
                          variant="body2"
                        >
                          {formatNumber(due)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant={canReturn ? "contained" : "outlined"}
                          disabled={!canReturn}
                          onClick={() => {
                            onSelectSale(sale.id);
                            onClose();
                          }}
                          startIcon={<CheckCircle size={16} />}
                          sx={{ textTransform: "none" }}
                          title={
                            !canReturn
                              ? "لا يمكن إرجاع فاتورة غير مسددة بالكامل"
                              : ""
                          }
                        >
                          اختيار
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  p: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PastSalesSearchDialog;
