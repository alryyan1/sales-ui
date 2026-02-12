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
  if (!returns.length) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          لا توجد مردودات في الفترة المحددة
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
    let totalBankak = 0;
    let totalFawry = 0;
    let totalOcash = 0;

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
      } else if (method === "bankak") {
        totalBankak += itemsTotal;
      } else if (method === "fawry") {
        totalFawry += itemsTotal;
      } else if (method === "ocash") {
        totalOcash += itemsTotal;
      }
    }

    return {
      date: format(day, "yyyy-MM-dd"),
      count,
      totalAmount,
      totalCash,
      totalBankak,
      totalFawry,
      totalOcash,
    };
  });

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>التاريخ</TableCell>
            <TableCell align="right">عدد المردودات</TableCell>
            <TableCell align="right">إجمالي القيمة</TableCell>
            <TableCell align="right">إجمالي مردود نقدي</TableCell>
            <TableCell align="right">إجمالي مردود بنكك</TableCell>
            <TableCell align="right">إجمالي مردود فوري</TableCell>
            <TableCell align="right">إجمالي مردود أوكاش</TableCell>
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
                {formatNumber(row.totalAmount)}
              </TableCell>
              <TableCell align="right">
                {formatNumber(row.totalCash)}
              </TableCell>
              <TableCell align="right">
                {formatNumber(row.totalBankak)}
              </TableCell>
              <TableCell align="right">
                {formatNumber(row.totalFawry)}
              </TableCell>
              <TableCell align="right">
                {formatNumber(row.totalOcash)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default SaleReturnsMonthlyTab;

