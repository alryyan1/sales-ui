import React from "react";
import { FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useSalesReport } from "@/hooks/useSalesReport";
import { useSettings } from "@/context/SettingsContext";
import { formatNumber } from "@/constants";
import { ReportFilterValues } from "./ReportFilters";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

interface SalesTableProps {
  filterValues: ReportFilterValues;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRowClick: (saleId: number) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  filterValues,
  currentPage,
  onPageChange,
  onRowClick,
}) => {
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  const handleClientClick = (e: React.MouseEvent, clientId: number | null) => {
    e.stopPropagation(); // Prevent row click
    if (clientId) {
      navigate(`/clients/${clientId}/ledger`);
    }
  };

  const {
    data: reportData,
    isLoading,
    error,
  } = useSalesReport({
    page: currentPage,
    startDate: filterValues.startDate,
    endDate: filterValues.endDate,
    clientId: filterValues.clientId ? Number(filterValues.clientId) : null,
    userId: filterValues.userId ? Number(filterValues.userId) : null,
    shiftId: filterValues.shiftId ? Number(filterValues.shiftId) : null,
    productId: filterValues.productId ? Number(filterValues.productId) : null, // Added productId support
    limit: 25,
    posMode,
  });

  // --- Loading State ---
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-24 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-3/5 rounded" />
                </div>
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-semibold">خطأ</AlertTitle>
        <AlertDescription>
          {(error as Error)?.message || "حدث خطأ أثناء تحميل البيانات"}
        </AlertDescription>
      </Alert>
    );
  }

  // --- No Data ---
  if (!reportData) return null;

  return (
    <Card className="mb-6 overflow-hidden shadow-sm">
   
      {/* <CardContent className="p-0"> */}
        {reportData.data.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="inline-flex p-4 bg-muted rounded-xl mb-4">
              <FileText size={32} className="opacity-40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">لا توجد مبيعات</h3>
            <p className="text-sm text-muted-foreground">
              جرب تعديل الفلاتر
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-center  ">
                    <TableHead className="text-center">
                      رقم العمليه
                    </TableHead>
                    <TableHead className="text-center">
                      التاريخ
                    </TableHead>
                    <TableHead className="text-center">
                      العميل
                    </TableHead>
                    <TableHead className="text-center">
                      المستخدم
                    </TableHead>
                    <TableHead className="text-center">
                      المدفوعات
                    </TableHead>
                    <TableHead className=" text-center">
                      الخصم
                    </TableHead>
                    <TableHead className=" text-center">
                      المبلغ الإجمالي
                    </TableHead>
                    <TableHead className=" text-center">
                      المدفوع
                    </TableHead>
                    <TableHead className=" text-center">
                      المستحق
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.data.map((sale) => (
                    <TableRow
                      key={sale.id}
                      onClick={() => onRowClick(sale.id)}
                      className="cursor-pointer text-center transition-all hover:bg-muted/50 "
                    >
                      <TableCell className="text-center">
                        #{sale.id}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-center text-sm font-medium">
                          {format(parseISO(sale.sale_date), "yyyy-MM-dd")}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.client_name && sale.client_id ? (
                          <button
                            onClick={(e) => handleClientClick(e, sale.client_id)}
                            className="text-center text-sm font-medium text-primary hover:underline cursor-pointer transition-colors"
                          >
                            {sale.client_name}
                          </button>
                        ) : (
                          <span className="text-center text-sm text-muted-foreground">
                            عميل غير محدد
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.user_name ? (
                          <span className="text-center text-sm font-medium">
                            {sale.user_name}
                          </span>
                        ) : (
                          <span className="text-center text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.payments && sale.payments.length > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-primary text-primary font-semibold"
                          >
                            {`${sale.payments.length} ${
                              sale.payments.length === 1 ? "دفعة" : "دفعات"
                            }`}
                          </Badge>
                        ) : (
                          <span className="text-center text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.discount_amount &&
                        Number(sale.discount_amount) > 0 ? (
                          <div>
                            <span className="text-center text-sm font-semibold text-yellow-600 dark:text-yellow-500">
                              {formatNumber(sale.discount_amount)}
                            </span>
                            <span className="block text-center text-xs text-muted-foreground mt-1">
                              {(sale as any).discount_type === "percentage"
                                ? "%"
                                : "ثابت"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-center text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-base">
                        {formatNumber(sale.total_amount)}
                      </TableCell>
                      <TableCell className="text-center font-medium text-green-600 dark:text-green-500">
                        {formatNumber(sale.paid_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`text-sm font-semibold ${
                            Number(sale.due_amount || 0) > 0
                              ? "text-red-600 dark:text-red-500"
                              : "text-green-600 dark:text-green-500"
                          }`}
                        >
                          {formatNumber(sale.due_amount || 0)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {reportData.last_page > 1 && (
              <div className="flex justify-center py-6 border-t">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(currentPage - 1);
                          }}
                          className={isLoading ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    )}
                    {Array.from({ length: reportData.last_page }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first page, last page, current page, and pages around current
                        if (page === 1 || page === reportData.last_page) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, index, array) => {
                        // Add ellipsis
                        const prevPage = array[index - 1];
                        const showEllipsisBefore = prevPage && page - prevPage > 1;
                        
                        return (
                          <React.Fragment key={page}>
                            {showEllipsisBefore && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (!isLoading) onPageChange(page);
                                }}
                                isActive={page === currentPage}
                                className={isLoading ? "pointer-events-none opacity-50" : ""}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      })}
                    {currentPage < reportData.last_page && (
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onPageChange(currentPage + 1);
                          }}
                          className={isLoading ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      {/* </CardContent> */}
    </Card>
  );
};
