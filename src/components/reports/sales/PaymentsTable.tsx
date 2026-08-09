import React from "react";
import { CreditCard, ExternalLink, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { formatNumber } from "@/constants";
import { ReportFilterValues } from "./ReportFilters";
import { usePayments } from "@/hooks/usePayments";
import { useSettings } from "@/context/SettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaymentsTableProps {
  filterValues: ReportFilterValues;
  currentPage: number;
  onPageChange: (page: number) => void;
  onViewSale: (saleId: number) => void;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  filterValues,
  currentPage,
  onPageChange,
  onViewSale,
}) => {
  const { t } = useTranslation(["reports"]);
  const METHOD_LABELS: Record<string, { label: string; color: string }> = {
    cash:          { label: t("reports:salesReportPage.methodLabels.cash"),         color: "bg-green-100 text-green-800 border-green-200" },
    bank_transfer: { label: t("reports:salesReportPage.methodLabels.bank_transfer"), color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    visa:          { label: t("reports:salesReportPage.methodLabels.visa"),         color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  };
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  const { data, isLoading, error } = usePayments(
    {
      shift_id: filterValues.shiftId ? Number(filterValues.shiftId) : null,
      start_date: !filterValues.shiftId ? filterValues.startDate : null,
      end_date: !filterValues.shiftId ? filterValues.endDate : null,
      user_id: filterValues.userId ? Number(filterValues.userId) : null,
      per_page: 50,
      page: currentPage,
    },
    !!(filterValues.shiftId || filterValues.startDate)
  );

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-24 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-2/5 rounded" />
                </div>
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-7 w-24 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-semibold">{t("reports:salesReportPage.errorTitle")}</AlertTitle>
        <AlertDescription>
          {(error as Error)?.message || t("reports:salesReportPage.errorLoadingData")}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <Card className="mb-6 overflow-hidden shadow-sm">
      {data.data.length === 0 ? (
        <div className="text-center py-14 px-4">
          <div className="inline-flex p-4 bg-muted rounded-xl mb-4">
            <CreditCard size={32} className="opacity-40" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{t("reports:salesReportPage.noPaymentsTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("reports:salesReportPage.tryAdjustingFilters")}</p>
        </div>
      ) : (
        <>
          {/* Table header with count */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
            <span className="text-sm font-medium text-muted-foreground">
              {t("reports:salesReportPage.paymentsCount", { count: data.total })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-16 hidden sm:table-cell">{t("reports:salesReportPage.colNumber")}</TableHead>
                  <TableHead className="text-center">{t("reports:salesReportPage.colDate")}</TableHead>
                  <TableHead className="text-center">{t("reports:salesReportPage.colPaymentMethod")}</TableHead>
                  <TableHead className="text-center">{t("reports:salesReportPage.colAmount")}</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">{t("reports:salesReportPage.colReference")}</TableHead>
                  <TableHead className="text-center">{t("reports:salesReportPage.colClient")}</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">{t("reports:salesReportPage.colUser")}</TableHead>
                  <TableHead className="text-center">{t("reports:salesReportPage.colSaleBalance")}</TableHead>
                  <TableHead className="text-center">{t("reports:salesReportPage.colInvoice")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((payment) => {
                  const methodInfo = METHOD_LABELS[payment.method] ?? {
                    label: payment.method,
                    color: "bg-gray-100 text-gray-700 border-gray-200",
                  };

                  return (
                    <TableRow key={payment.id} className="text-center hover:bg-muted/40 transition-colors">
                      <TableCell className="text-center text-xs text-muted-foreground font-mono hidden sm:table-cell">
                        {payment.id}
                      </TableCell>

                      <TableCell className="text-center text-sm">
                        {payment.payment_date
                          ? format(parseISO(payment.payment_date), "yyyy-MM-dd")
                          : "—"}
                      </TableCell>

                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${methodInfo.color}`}
                        >
                          {methodInfo.label}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-bold text-base tabular-nums">
                        {formatNumber(payment.amount, 3)}
                      </TableCell>

                      <TableCell className="text-center text-xs text-muted-foreground font-mono hidden sm:table-cell">
                        {payment.reference_number || "—"}
                      </TableCell>

                      <TableCell className="text-center">
                        {payment.client_name && payment.client_id ? (
                          <button
                            onClick={() =>
                              navigate(`/clients/${payment.client_id}/ledger`)
                            }
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {payment.client_name}
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t("reports:salesReportPage.cashClient")}</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center text-sm hidden sm:table-cell">
                        {payment.user_name || "—"}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs text-muted-foreground">
                            {t("reports:salesReportPage.totalLabel")} <span className="font-semibold text-foreground">{formatNumber(payment.sale_total, 3)}</span>
                          </span>
                          {payment.sale_due > 0 && (
                            <span className="text-xs text-red-600 font-semibold">
                              {t("reports:salesReportPage.remainingLabel")} {formatNumber(payment.sale_due, 3)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 gap-1 text-xs"
                          onClick={() => onViewSale(payment.sale_id)}
                        >
                          <ExternalLink size={12} />
                          #{payment.sale_id}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {data.last_page > 1 && (
            <div className="flex justify-center py-5 border-t">
              <Pagination>
                <PaginationContent>
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); onPageChange(currentPage - 1); }}
                      />
                    </PaginationItem>
                  )}
                  {Array.from({ length: data.last_page }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === data.last_page || Math.abs(p - currentPage) <= 1)
                    .map((page, index, arr) => {
                      const prev = arr[index - 1];
                      return (
                        <React.Fragment key={page}>
                          {prev && page - prev > 1 && (
                            <PaginationItem><PaginationEllipsis /></PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              isActive={page === currentPage}
                              onClick={(e) => { e.preventDefault(); onPageChange(page); }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      );
                    })}
                  {currentPage < data.last_page && (
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); onPageChange(currentPage + 1); }}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
