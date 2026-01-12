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
  return (
    <Table>
      <TableBody>
        <TableRow className="bg-muted/30 font-bold">
          <TableCell className="py-4 font-bold">الإجمالي</TableCell>
          <TableCell className="py-4 text-right font-bold">
            {formatNumber(totalDebit)}
          </TableCell>
          <TableCell className="py-4 text-right font-bold">
            {formatNumber(totalCredit)}
          </TableCell>
          <TableCell className="py-4 text-right">
            <Badge
              variant={totalBalance > 0 ? "destructive" : "default"}
              className={cn(
                "font-bold",
                totalBalance < 0 && "bg-green-600 hover:bg-green-700"
              )}
            >
              {formatNumber(totalBalance)}
            </Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default SuppliersSummaryTotals;

