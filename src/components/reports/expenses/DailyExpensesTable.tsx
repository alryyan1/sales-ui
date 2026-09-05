import React from "react";
import { Table, Typography } from "antd";
import type { TableProps } from "antd";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/constants";
import { Expense } from "@/services/expenseService";

const { Text } = Typography;

interface DailyExpenseEntry {
  date: string;
  total: number;
  cash_total: number;
  bank_total: number;
  expenses: Expense[];
}

interface DailyExpensesTableProps {
  dailyBreakdown: DailyExpenseEntry[];
  loading?: boolean;
  onDayClick: (date: string, expenses: Expense[]) => void;
}

const DailyExpensesTable: React.FC<DailyExpensesTableProps> = ({
  dailyBreakdown,
  loading,
  onDayClick,
}) => {
  const { t } = useTranslation("reports");

  const columns: TableProps<DailyExpenseEntry>["columns"] = [
    {
      title: t("dateColumn"),
      dataIndex: "date",
      key: "date",
    },
    {
      title: t("totalExpensesColumn"),
      dataIndex: "total",
      key: "total",
      align: "center",
      render: (value: number) => <Text strong>{formatNumber(value)}</Text>,
    },
    {
      title: t("paymentMethodCash"),
      dataIndex: "cash_total",
      key: "cash_total",
      align: "center",
      render: (value: number) => <Text style={{ color: "#16a34a" }}>{formatNumber(value)}</Text>,
    },
    {
      title: t("bankShortLabel"),
      dataIndex: "bank_total",
      key: "bank_total",
      align: "center",
      render: (value: number) => <Text style={{ color: "#2563eb" }}>{formatNumber(value)}</Text>,
    },
  ];

  return (
    <Table<DailyExpenseEntry>
      rowKey="date"
      size="small"
      columns={columns}
      dataSource={dailyBreakdown}
      loading={loading}
      locale={{ emptyText: t("noExpensesThisMonth") }}
      pagination={false}
      onRow={(row) => ({
        onClick: () => onDayClick(row.date, row.expenses),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default DailyExpensesTable;
