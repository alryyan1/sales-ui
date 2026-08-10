import React, { useState, useEffect, useCallback } from "react";
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
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  FileWarning as FileWarningIcon,
  Printer as PrintIcon,
} from "lucide-react";
import reportService from "@/services/reportService";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/constants";

function MovedExpiredProductsPage() {
  const { t } = useTranslation("reports");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportService.getMovedExpiredProducts({
        page: page + 1,
        per_page: rowsPerPage,
        search: searchQuery,
      });
      setItems(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          t("failedToFetchDamagedProducts"),
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportPdf = () => {
    reportService.exportMovedExpiredProductsPdf({
      search: searchQuery,
    });
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: "error.lighter",
              color: "error.main",
              display: "flex",
            }}
          >
            <FileWarningIcon size={24} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {t("damagedExpiredProductsTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("damagedExpiredProductsSubtitle")}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PrintIcon size={20} />}
          onClick={handleExportPdf}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: "bold",
          }}
        >
          {t("printReport")}
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <TextField
            placeholder={t("searchByNameBarcodeBatchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("productLabel")}</TableCell>
                <TableCell>{t("barcodeColumn")}</TableCell>
                <TableCell>{t("batchColumn")}</TableCell>
                <TableCell>{t("expiryDateColumn")}</TableCell>
                <TableCell align="center">{t("withdrawnQuantityColumn")}</TableCell>
                <TableCell>{t("withdrawalDateColumn")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">
                      {t("noWithdrawnProductsFound")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ fontWeight: "medium" }}>
                      {item.product_name || t("unknownProductLabel")}
                    </TableCell>
                    <TableCell>{item.product_sku || "-"}</TableCell>
                    <TableCell>{item.batch_number || "-"}</TableCell>
                    <TableCell>
                      {item.expiry_date ? formatDate(item.expiry_date) : "-"}
                    </TableCell>
                    <TableCell align="center">
                      <Typography color="error.main" fontWeight="bold">
                        {item.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.updated_at ? formatDate(item.updated_at) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={t("itemsPerPageLabel")}
          labelDisplayedRows={({ from, to, count }) =>
            t("rangeOfCountLabel", {
              from,
              to,
              count: count !== -1 ? count : t("moreThanLabel", { to }),
            })
          }
        />
      </Paper>
    </Box>
  );
}

export default MovedExpiredProductsPage;
