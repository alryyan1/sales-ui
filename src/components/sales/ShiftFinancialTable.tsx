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
import { formatNumber, CURRENCY_DECIMALS } from "@/constants";
import { useSettings } from "@/context/SettingsContext";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import { parseActivePaymentMethods } from "@/lib/paymentMethods";

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
  const { getSetting } = useSettings();
  const currencyDecimals =
    CURRENCY_DECIMALS[getSetting("currency_code", "SDG") as string] ?? 0;
  const activePaymentMethods = parseActivePaymentMethods(
    getSetting("pos_active_payment_methods"),
  );
  // The backend folds bank_transfer/card payments into the "bankak" bucket,
  // so that column stays visible when any of those methods is active.
  const showMethodColumn = (method: "cash" | "bankak" | "fawry" | "ocash") =>
    method === "bankak"
      ? activePaymentMethods.some((m) =>
          ["bankak", "bank_transfer", "card"].includes(m),
        )
      : activePaymentMethods.includes(method);
  const paymentColumns = (
    [
      { key: "cash", label: tPos("paymentMethodCash") },
      { key: "bankak", label: tPos("paymentMethodBankElectronic") },
      { key: "fawry", label: tPos("paymentMethodFawry") },
      { key: "ocash", label: tPos("paymentMethodOcash") },
    ] as const
  ).filter((col) => showMethodColumn(col.key));
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
            {paymentColumns.map((col) => (
              <TableCell key={col.key} align="center" sx={{ fontWeight: 600 }}>
                {col.label}
              </TableCell>
            ))}
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
            {paymentColumns.map((col) => (
              <TableCell key={col.key} align="center">
                {formatNumber(stats?.sales?.[col.key] ?? 0, currencyDecimals)}
              </TableCell>
            ))}
            <TableCell align="center" sx={{ fontWeight: 600 }}>
              {formatNumber(stats?.sales?.total ?? 0, currencyDecimals)}
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
            {paymentColumns.map((col) => (
              <TableCell key={col.key} align="center">
                {formatNumber(stats?.expenses?.[col.key] ?? 0, currencyDecimals)}
              </TableCell>
            ))}
            <TableCell
              align="center"
              sx={{ fontWeight: 600, color: "error.main" }}
            >
              {formatNumber(stats?.expenses?.total ?? 0, currencyDecimals)}
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
            {paymentColumns.map((col) => (
              <TableCell key={col.key} align="center">
                {formatNumber(stats?.returns?.[col.key] ?? 0, currencyDecimals)}
              </TableCell>
            ))}
            <TableCell
              align="center"
              sx={{ fontWeight: 600, color: "warning.main" }}
            >
              {formatNumber(stats?.returns?.total ?? 0, currencyDecimals)}
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
            {paymentColumns.map((col) => (
              <TableCell
                key={col.key}
                align="center"
                sx={{ fontWeight: 600, color: "primary.main" }}
              >
                {formatNumber(stats?.net?.[col.key] ?? 0, currencyDecimals)}
              </TableCell>
            ))}
            <TableCell
              align="center"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {formatNumber(stats?.net?.total ?? 0, currencyDecimals)}
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
