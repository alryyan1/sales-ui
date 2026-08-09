// src/components/reports/sales/SaleReturnsProductsPieTab.tsx
import React from "react";
import { Box, Typography } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SaleReturn } from "@/services/saleReturnService";
import { useTranslation } from "react-i18next";

interface SaleReturnsProductsPieTabProps {
  returns: SaleReturn[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];

const SaleReturnsProductsPieTab: React.FC<SaleReturnsProductsPieTabProps> = ({
  returns,
}) => {
  const { t } = useTranslation(["reports"]);
  const productMap = new Map<string, number>();

  for (const r of returns) {
    if (!r.items) continue;
    for (const item of r.items) {
      const name =
        item.product?.name ||
        (item.product_id ? t("reports:saleReturnsReportPage.productHash", { id: item.product_id }) : t("reports:saleReturnsReportPage.unknownProduct"));
      const quantity = Number(item.quantity) || 0;
      productMap.set(name, (productMap.get(name) ?? 0) + quantity);
    }
  }

  const data = Array.from(productMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          {t("reports:saleReturnsReportPage.noReturnedProductsData")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.name}-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <RechartsTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SaleReturnsProductsPieTab;

