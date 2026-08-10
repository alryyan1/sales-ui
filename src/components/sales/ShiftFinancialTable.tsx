import React, { useEffect, useState } from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Box,
  Typography,
  Button,
  Stack,
} from "@mui/material";
import { Receipt, ArrowDownRight, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import { formatNumber } from "@/constants";
import apiClient from "@/lib/axios";
import { toast } from "sonner";

export interface ShiftStats {
  sales: {
    cash: number;
    bankak: number;
    fawry: number;
    ocash: number;
    total: number;
  };
  expenses: {
    cash: number;
    bankak: number;
    fawry: number;
    ocash: number;
    total: number;
  };
  returns: {
    cash: number;
    bankak: number;
    fawry: number;
    ocash: number;
    total: number;
  };
  net: {
    cash: number;
    bankak: number;
    fawry: number;
    ocash: number;
    total: number;
  };
}

interface ShiftFinancialTableProps {
  shiftId: number;
}

export const ShiftFinancialTable: React.FC<ShiftFinancialTableProps> = ({
  shiftId,
}) => {
  const { t } = useTranslation("reports");
  const { t: tPos } = useTranslation("pos");
  const { direction } = useLanguage();
  const startAlign = direction === "rtl" ? "right" : "left";
  const [stats, setStats] = useState<ShiftStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [downloadingCost, setDownloadingCost] = useState(false);
  const [downloadingReturns, setDownloadingReturns] = useState(false);
  const [downloadingItems, setDownloadingItems] = useState(false);
  const [downloadingInventoryEffects, setDownloadingInventoryEffects] =
    useState(false);

  const handleDownloadPdf = async (
    type: "cost" | "returns" | "items" | "inventory_effects",
  ) => {
    if (!shiftId) return;

    const setLoader =
      type === "cost"
        ? setDownloadingCost
        : type === "returns"
          ? setDownloadingReturns
          : type === "items"
            ? setDownloadingItems
            : setDownloadingInventoryEffects;

    const endpoint =
      type === "cost"
        ? "/reports/shift-cost-pdf"
        : type === "returns"
          ? "/reports/shift-returns-pdf"
          : type === "items"
            ? "/reports/shift-sold-items-pdf"
            : "/reports/shift-inventory-effects-pdf";

    const title =
      type === "cost"
        ? t("expensesLabel")
        : type === "returns"
          ? t("salesReturnsLabel")
          : type === "items"
            ? t("soldItemsLabel")
            : t("inventoryEffectLabel");

    try {
      setLoader(true);
      const res = await apiClient.get(`${endpoint}?shift_id=${shiftId}`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success(t("reportDownloadedSuccess", { title }));

      // We don't revoke URL here as the new tab needs it; the browser will garbage collect it generally when the tab is closed
    } catch (err) {
      console.error(`Failed to download ${title} PDF`, err);
      toast.error(t("reportDownloadFailed", { title }));
    } finally {
      setLoader(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!shiftId) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/shifts/${shiftId}`);
        if (isMounted && res.data?.data?.stats) {
          setStats(res.data.data.stats);
        }
      } catch {
        if (isMounted) setError(t("failedToFetchShiftStats"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [shiftId, t]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!stats) return null;

  return (
    <TableContainer sx={{ px: 2, py: 2 }}>
      <Table
        size="small"
        sx={{
          "& td, & th": { px: 1, py: 0.75, borderColor: "#eee" },
        }}
      >
        <TableHead>
          <TableRow sx={{ bgcolor: "action.hover" }}>
            <TableCell align={startAlign} sx={{ fontWeight: 600 }}>
              {t("statementLabel")}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
              {tPos("paymentMethodCash")}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
              {tPos("paymentMethodBankak")}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
              {tPos("paymentMethodFawry")}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
              {tPos("paymentMethodOcash")}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
              {t("totalRowLabel")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Revenue */}
          <TableRow>
            <TableCell
              component="th"
              scope="row"
              align={startAlign}
              sx={{ fontWeight: 500 }}
            >
              {t("revenueLabel")}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.sales?.cash ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.sales?.bankak ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.sales?.fawry ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.sales?.ocash ?? 0)}
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>
              {formatNumber(stats?.sales?.total ?? 0)}
            </TableCell>
          </TableRow>

          {/* Expenses */}
          <TableRow>
            <TableCell
              component="th"
              scope="row"
              align={startAlign}
              sx={{ fontWeight: 500 }}
            >
              {t("expensesLabel")}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.expenses?.cash ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.expenses?.bankak ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.expenses?.fawry ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.expenses?.ocash ?? 0)}
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: 600, color: "error.main" }}
            >
              {formatNumber(stats?.expenses?.total ?? 0)}
            </TableCell>
          </TableRow>

          {/* Returns */}
          <TableRow>
            <TableCell
              component="th"
              scope="row"
              align={startAlign}
              sx={{ fontWeight: 500 }}
            >
              {t("salesReturnsLabel")}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.returns?.cash ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.returns?.bankak ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.returns?.fawry ?? 0)}
            </TableCell>
            <TableCell align="center">
              {formatNumber(stats?.returns?.ocash ?? 0)}
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: 600, color: "warning.main" }}
            >
              {formatNumber(stats?.returns?.total ?? 0)}
            </TableCell>
          </TableRow>

          {/* Net */}
          <TableRow sx={{ bgcolor: "primary.lighter" }}>
            <TableCell
              component="th"
              scope="row"
              align={startAlign}
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {t("netLegend")}
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              {formatNumber(stats?.net?.cash ?? 0)}
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              {formatNumber(stats?.net?.bankak ?? 0)}
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              {formatNumber(stats?.net?.fawry ?? 0)}
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              {formatNumber(stats?.net?.ocash ?? 0)}
            </TableCell>
            <TableCell
              align="center"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {formatNumber(stats?.net?.total ?? 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Stack
        direction="row"
        justifyContent="center"
        sx={{ mt: 3, mb: 1 }}
        gap={1}
      >
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          disabled={downloadingCost}
          onClick={() => handleDownloadPdf("cost")}
          sx={{ fontWeight: 600 }}
        >
          {downloadingCost ? tPos("loadingEllipsis") : `${t("expensesLabel")} PDF`}
        </Button>

        <Button
          variant="outlined"
          color="warning"
          size="small"
          disabled={downloadingReturns}
          onClick={() => handleDownloadPdf("returns")}
          sx={{ fontWeight: 600 }}
        >
          {downloadingReturns ? tPos("loadingEllipsis") : `${t("salesReturnsLabel")} PDF`}
        </Button>

        <Button
          variant="outlined"
          color="success"
          size="small"
          disabled={downloadingItems}
          onClick={() => handleDownloadPdf("items")}
          sx={{ fontWeight: 600 }}
        >
          {downloadingItems ? tPos("loadingEllipsis") : `${t("soldItemsLabel")} PDF`}
        </Button>

        <Button
          variant="outlined"
          color="primary"
          size="small"
          disabled={downloadingInventoryEffects}
          onClick={() => handleDownloadPdf("inventory_effects")}
          sx={{ fontWeight: 600 }}
        >
          {downloadingInventoryEffects ? tPos("loadingEllipsis") : `${t("inventoryEffectLabel")} PDF`}
        </Button>
      </Stack>
    </TableContainer>
  );
};
