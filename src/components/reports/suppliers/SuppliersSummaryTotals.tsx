import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/constants";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SuppliersSummaryTotalsProps {
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
}

const SuppliersSummaryTotals: React.FC<SuppliersSummaryTotalsProps> = ({
  totalDebit,
  totalCredit,
  totalBalance,
}) => {
  const { t } = useTranslation(["reports"]);
  return (
    <Table>
      <TableBody>
        <TableRow className="bg-muted/30 font-bold">
          <TableCell className="py-4 font-bold">{t("reports:suppliersSummary.total")}</TableCell>
          <TableCell className="py-4 text-right font-bold">
            {formatNumber(totalDebit, 3)}
          </TableCell>
          <TableCell className="py-4 text-right font-bold">
            {formatNumber(totalCredit, 3)}
          </TableCell>
          <TableCell className="py-4 text-right">
            <Badge
              variant={totalBalance > 0 ? "destructive" : "default"}
              className={cn(
                "font-bold",
                totalBalance < 0 && "bg-green-600 hover:bg-green-700"
              )}
            >
              {formatNumber(totalBalance, 3)}
            </Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default SuppliersSummaryTotals;

