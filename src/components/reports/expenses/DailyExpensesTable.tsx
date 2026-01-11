import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from "@mui/material";
import { formatNumber } from "@/constants";

interface DailyExpenseEntry {
  date: string;
  total: number;
  cash_total: number;
  bank_total: number;
  expenses: any[];
}

interface DailyExpensesTableProps {
  dailyBreakdown: DailyExpenseEntry[];
  onDayClick: (date: string, expenses: any[]) => void;
}

const DailyExpensesTable: React.FC<DailyExpensesTableProps> = ({
  dailyBreakdown,
  onDayClick,
}) => {
  if (dailyBreakdown.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          لا توجد مصروفات في هذا الشهر
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "grey.100" }}>
            <TableCell sx={{ fontWeight: "bold" }}>التاريخ</TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="center">
              إجمالي المصروفات
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="center">
              نقدي
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }} align="center">
              بنكي
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dailyBreakdown.map((day) => {
            const formattedDate = day.date;
            return (
              <TableRow
                key={day.date}
                hover
                onClick={() => onDayClick(day.date, day.expenses)}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <TableCell>{formattedDate}</TableCell>
                <TableCell align="center" sx={{ fontWeight: "medium" }}>
                  {formatNumber(day.total)}
                </TableCell>
                <TableCell align="center" sx={{ color: "success.main" }}>
                  {formatNumber(day.cash_total)}
                </TableCell>
                <TableCell align="center" sx={{ color: "primary.main" }}>
                  {formatNumber(day.bank_total)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DailyExpensesTable;

