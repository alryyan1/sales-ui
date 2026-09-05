import React from "react";
import { Modal, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { useTranslation } from "react-i18next";
import { Expense } from "@/services/expenseService";
import { formatNumber } from "@/constants";

const { Text } = Typography;

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

  const columns: TableProps<Expense>["columns"] = [
    {
      title: t("titleColumn"),
      dataIndex: "title",
      key: "title",
    },
    {
      title: t("categoryColumn"),
      dataIndex: "expense_category_name",
      key: "category",
      render: (name: string | null) => name || "—",
    },
    {
      title: t("amountColumn"),
      dataIndex: "amount",
      key: "amount",
      align: "center",
      render: (amount: number | string) => <Text strong>{formatNumber(Number(amount))}</Text>,
    },
    {
      title: t("paymentMethodColumn"),
      dataIndex: "payment_method",
      key: "payment_method",
      align: "center",
      render: (method: string | null) => (
        <Tag color={method === "cash" ? "green" : method === "bank" ? "blue" : "default"}>
          {method === "cash" ? t("paymentMethodCash") : method === "bank" ? t("bankShortLabel") : "—"}
        </Tag>
      ),
    },
    {
      title: t("referenceColumn"),
      dataIndex: "reference",
      key: "reference",
      render: (reference: string | null) => reference || "—",
    },
  ];

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={800} title={t("expensesForDayLabel", { date: date || "" })}>
      <Table<Expense>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={expenses}
        pagination={false}
        locale={{ emptyText: t("noExpensesThisDay") }}
      />
    </Modal>
  );
};

export default DayExpensesDialog;
