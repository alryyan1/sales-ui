// src/components/reports/sales/SaleReturnsMonthlyTab.tsx
import React from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
} from "@mui/material";
import { eachDayOfInterval, parseISO, format } from "date-fns";
import type { SaleReturn } from "@/services/saleReturnService";
import { formatNumber } from "@/constants";
import { useTranslation } from "react-i18next";

interface SaleReturnsMonthlyTabProps {
  returns: SaleReturn[];
  startDate: string;
  endDate: string;
}

const SaleReturnsMonthlyTab: React.FC<SaleReturnsMonthlyTabProps> = ({
  returns,
  startDate,
  endDate,
}) => {
  const { t } = useTranslation(["reports"]);
  if (!returns.length) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          {t("reports:saleReturnsReportPage.noReturnsForPeriod")}
        </Typography>
      </Box>
    );
  }

  let start: Date;
  let end: Date;

  try {
    start = parseISO(startDate);
    end = parseISO(endDate);
  } catch {
    // Fallback to using today if parsing fails
    const today = new Date();
    start = today;
    end = today;
  }

  const days = eachDayOfInterval({ start, end });

  const rows = days.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const dayReturns = returns.filter(
      (r) => r.created_at?.slice(0, 10) === dayKey,
    );

    const count = dayReturns.length;

    let totalAmount = 0;
    let totalCash = 0;
    let totalBankTransfer = 0;
    let totalVisa = 0;

    for (const r of dayReturns) {
      const itemsTotal =
        r.items?.reduce(
          (acc, item) => acc + Number(item.price) * Number(item.quantity),
          0,
        ) ?? 0;

      totalAmount += itemsTotal;

      const method = (r.returned_payment_method || "").toLowerCase();
      if (method === "cash") {
        totalCash += itemsTotal;
      } else if (method === "bank_transfer") {
        totalBankTransfer += itemsTotal;
      } else if (method === "visa") {
        totalVisa += itemsTotal;
      }
    }

    return {
      date: format(day, "yyyy-MM-dd"),
      count,
      totalAmount,
      totalCash,
      totalBankTransfer,
      totalVisa,
    };
  });

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t("reports:saleReturnsReportPage.colDate")}</TableCell>
            <TableCell align="right">{t("reports:saleReturnsReportPage.colReturnsCount")}</TableCell>
            <TableCell align="right">{t("reports:saleReturnsReportPage.colTotalValue")}</TableCell>
            <TableCell align="right">{t("reports:saleReturnsReportPage.colTotalCashReturns")}</TableCell>
            <TableCell align="right">{t("reports:saleReturnsReportPage.colTotalBankTransferReturns")}</TableCell>
            <TableCell align="right">{t("reports:saleReturnsReportPage.colTotalVisaReturns")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.date}>
              <TableCell>{row.date}</TableCell>
              <TableCell align="right">
                {formatNumber(row.count)}
              </TableCell>
              <TableCell align="right">
                {formatNumber(row.totalAmount, 3)}
              </TableCell>
              <TableCell align="right">
                {formatNumber(row.totalCash, 3)}
              </TableCell>
              <TableCell align="right">
                {formatNumber(row.totalBankTransfer, 3)}
              </TableCell>
              <TableCell align="right">
                {formatNumber(row.totalVisa, 3)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default SaleReturnsMonthlyTab;

