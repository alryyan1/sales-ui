import React from "react";
import { useNavigate } from "react-router-dom";
import { Eye, FileText } from "lucide-react";
import type { Purchase } from "../../../services/purchaseService";
import { formatNumber } from "@/constants";
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
  const navigate = useNavigate();

  const statusLabels: Record<string, string> = {
    received: "تم الاستلام",
    pending: "معلق",
    ordered: "تم الطلب",
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
            النتائج
          </CardTitle>
          {meta && (
            <Badge variant="outline" className="font-medium">
              {`${(currentPage - 1) * 15 + 1}-${Math.min(
                currentPage * 15,
                meta.total
              )} من ${meta.total}`}
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
                        لا توجد مشتريات
                      </h3>
                      <p>جرب تعديل الفلاتر</p>
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
                    <TableHead className="text-right font-semibold">
                      التاريخ
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      رقم الشراء
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      المرجع
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      المورد
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      المخزن
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      الحالة
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      العملة
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      المبلغ الإجمالي
                    </TableHead>
                    <TableHead className="text-center font-semibold w-[100px]">
                      الإجراءات
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
                      <TableCell className="py-4 text-right">
                        {purchase.currency || "SDG"}
                      </TableCell>
                      <TableCell className="py-4 text-right font-medium">
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
                      <TableCell colSpan={7} className="py-4 text-right">
                        <span className="text-sm font-semibold text-muted-foreground">
                          إجمالي الصفحة
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right font-bold">
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
                    &rarr;
                  </Button>
                  <div className="px-3 py-1 text-sm font-medium text-slate-600">
                    صفحة {currentPage} من {meta.last_page}
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
                    &larr;
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
