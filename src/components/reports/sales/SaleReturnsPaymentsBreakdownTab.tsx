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
  let totalBankak = 0;
  let totalFawry = 0;
  let totalOcash = 0;
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
    } else if (method === "bankak") {
      totalBankak += itemsTotal;
    } else if (method === "fawry") {
      totalFawry += itemsTotal;
    } else if (method === "ocash") {
      totalOcash += itemsTotal;
    } else {
      totalOther += itemsTotal;
    }
  }

  const totalAll =
    totalCash + totalBankak + totalFawry + totalOcash + totalOther;

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
              إجمالي مردود بنكك
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatNumber(totalBankak)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              إجمالي مردود فوري
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatNumber(totalFawry)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              إجمالي مردود أوكاش
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatNumber(totalOcash)}
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

