// src/components/reports/sales/SaleReturnsPaymentsBreakdownTab.tsx
import React from "react";
import { Box, Stack, Typography, Card, CardContent } from "@mui/material";
import type { SaleReturn } from "@/services/saleReturnService";
import { formatNumber } from "@/constants";

interface SaleReturnsPaymentsBreakdownTabProps {
  returns: SaleReturn[];
}

const SaleReturnsPaymentsBreakdownTab: React.FC<
  SaleReturnsPaymentsBreakdownTabProps
> = ({ returns }) => {
  let totalCash = 0;
  let totalBankTransfer = 0;
  let totalVisa = 0;
  let totalOther = 0;

  for (const r of returns) {
    const itemsTotal =
      r.items?.reduce(
        (acc, item) => acc + Number(item.price) * Number(item.quantity),
        0,
      ) ?? 0;

    const method = (r.returned_payment_method || "").toLowerCase();
    if (method === "cash") {
      totalCash += itemsTotal;
    } else if (method === "bank_transfer") {
      totalBankTransfer += itemsTotal;
    } else if (method === "visa") {
      totalVisa += itemsTotal;
    } else {
      totalOther += itemsTotal;
    }
  }

  const totalAll =
    totalCash + totalBankTransfer + totalVisa + totalOther;

  if (!returns.length) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          لا توجد مردودات في الفترة المحددة
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        إجمالي قيمة المردودات في الفترة المحددة:{" "}
        <strong>{formatNumber(totalAll)}</strong>
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              إجمالي مردود نقدي
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatNumber(totalCash)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              إجمالي مردود تحويل بنكي
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatNumber(totalBankTransfer)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              إجمالي مردود فيزا
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatNumber(totalVisa)}
            </Typography>
          </CardContent>
        </Card>

        {totalOther > 0 && (
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                إجمالي مردود بطرق أخرى
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {formatNumber(totalOther)}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Stack>
  );
};

export default SaleReturnsPaymentsBreakdownTab;

