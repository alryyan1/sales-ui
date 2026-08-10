import React from "react";
import { useNavigate } from "react-router-dom";
import { Eye, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Purchase } from "../../../services/purchaseService";
import { formatNumber } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SummaryStats {
  totalPurchases: number;
  totalAmount: number;
  pendingCount: number;
  averagePurchase: number;
}

interface PurchaseReportTableProps {
  data: Purchase[];
  meta?: {
    total: number;
    last_page: number;
  };
  currentPage: number;
  isLoading: boolean;
  summaryStats: SummaryStats | null;
  onPageChange: (page: number) => void;
}

const PurchaseReportTable: React.FC<PurchaseReportTableProps> = ({
  data,
  meta,
  currentPage,
  isLoading,
  summaryStats,
  onPageChange,
}) => {
  const { t } = useTranslation("reports");
  const { direction } = useLanguage();
  const navigate = useNavigate();

  const statusLabels: Record<string, string> = {
    received: t("statusReceived"),
    pending: t("statusPending"),
    ordered: t("statusOrdered"),
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "received") return "default";
    if (status === "pending") return "secondary";
    return "outline";
  };


  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            {t("results")}
          </CardTitle>
          {meta && (
            <Badge variant="outline" className="font-medium">
              {t("rangeOfTotalBadge", {
                from: (currentPage - 1) * 15 + 1,
                to: Math.min(currentPage * 15, meta.total),
                total: meta.total,
              })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="bg-slate-100 p-4 rounded-full mb-4">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-1">
                        {t("noPurchasesFound")}
                      </h3>
                      <p>{t("tryAdjustingFiltersShort")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-start font-semibold">
                      {t("dateColumn")}
                    </TableHead>
                    <TableHead className="text-start font-semibold">
                      {t("purchaseNumberColumn")}
                    </TableHead>
                    <TableHead className="text-start font-semibold">
                      {t("referenceColumn")}
                    </TableHead>
                    <TableHead className="text-start font-semibold">
                      {t("supplierLabel")}
                    </TableHead>
                    <TableHead className="text-start font-semibold">
                      {t("warehouseColumn")}
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      {t("statusLabel")}
                    </TableHead>
                    <TableHead className="text-start font-semibold">
                      {t("currencyColumn")}
                    </TableHead>
                    <TableHead className="text-start font-semibold">
                      {t("totalAmountColumn")}
                    </TableHead>
                    <TableHead className="text-center font-semibold w-[100px]">
                      {t("actionsColumn")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((purchase: Purchase) => (
                    <TableRow
                      key={purchase.id}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      <TableCell className="py-4">
                        {dayjs(purchase.purchase_date).format("YYYY-MM-DD")}
                      </TableCell>
                      <TableCell className="py-4">{purchase.id}</TableCell>
                      <TableCell className="py-4">
                        {purchase.reference_number || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {purchase.supplier_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {purchase.warehouse_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge variant={getStatusVariant(purchase.status)}>
                          {statusLabels[purchase.status] || purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-start">
                        {purchase.currency || "SDG"}
                      </TableCell>
                      <TableCell className="py-4 text-start font-medium">
                        {formatNumber(purchase.total_amount)}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(`/purchases/${purchase.id}/edit`)}
                          className="h-8 w-8 rounded-md border"
                        >
                          <Eye size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Page total row */}
                  {summaryStats && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={7} className="py-4 text-start">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {t("pageTotalLabel")}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-start font-bold">
                        {formatNumber(summaryStats.totalAmount)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="h-8 w-8 p-0"
                  >
                    {direction === "rtl" ? <>&rarr;</> : <>&larr;</>}
                  </Button>
                  <div className="px-3 py-1 text-sm font-medium text-slate-600">
                    {t("pageOfTotalLabel", { current: currentPage, total: meta.last_page })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onPageChange(Math.min(meta.last_page, currentPage + 1))
                    }
                    disabled={currentPage === meta.last_page || isLoading}
                    className="h-8 w-8 p-0"
                  >
                    {direction === "rtl" ? <>&larr;</> : <>&rarr;</>}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PurchaseReportTable;
