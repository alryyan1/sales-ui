import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Expense } from "@/services/expenseService";
import { formatNumber } from "@/constants";

interface DayExpensesDialogProps {
  open: boolean;
  onClose: () => void;
  date: string | null;
  expenses: Expense[];
}

const DayExpensesDialog: React.FC<DayExpensesDialogProps> = ({
  open,
  onClose,
  date,
  expenses,
}) => {
  const { t } = useTranslation("reports");
  const formattedDate = date || "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">
          {t("expensesForDayLabel", { date: formattedDate })}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {expenses.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {t("noExpensesThisDay")}
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: "bold" }}>{t("titleColumn")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("categoryColumn")}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  {t("amountColumn")}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  {t("paymentMethodColumn")}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{t("referenceColumn")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>{expense.title}</TableCell>
                  <TableCell>
                    {expense.expense_category_name || "—"}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "medium" }}>
                    {formatNumber(Number(expense.amount))}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={expense.payment_method === "cash" ? t("paymentMethodCash") : expense.payment_method === "bank" ? t("bankShortLabel") : "—"}
                      size="small"
                      color={
                        expense.payment_method === "cash"
                          ? "success"
                          : expense.payment_method === "bank"
                          ? "primary"
                          : "default"
                      }
                    />
                  </TableCell>
                  <TableCell>{expense.reference || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DayExpensesDialog;

