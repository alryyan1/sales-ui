// src/pages/reports/SupplierPurchasesPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCw, ArrowLeft, FileText } from "lucide-react";
import purchaseService, { type Purchase } from "@/services/purchaseService";
import { formatNumber } from "@/constants";
import { getErrorMessage } from "@/lib/axios";
import dayjs from "dayjs";

const SupplierPurchasesPage: React.FC = () => {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState<string>("");
  const currentPage = Number(searchParams.get("page") || "1");
  const [meta, setMeta] = useState<{
    total: number;
    last_page: number;
  } | null>(null);

  const statusLabels: Record<string, string> = {
    received: "تم الاستلام",
    pending: "معلق",
    ordered: "تم الطلب",
  };

  const getStatusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "received") return "default";
    if (status === "pending") return "secondary";
    return "outline";
  };

  const fetchPurchases = useCallback(async () => {
    if (!supplierId) return;

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("per_page", "15");
      params.append("supplier_id", supplierId);

      const data = await purchaseService.getPurchases(
        currentPage,
        params.toString()
      );
      setPurchases(data.data || []);
      setMeta(data.meta || null);

      // Extract supplier name from first purchase if available
      if (data.data && data.data.length > 0 && data.data[0].supplier_name) {
        setSupplierName(data.data[0].supplier_name);
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err) || "حدث خطأ أثناء جلب المشتريات";
      setError(errorMsg);
      toast.error("خطأ", { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }, [supplierId, currentPage]);

  useEffect(() => {
    if (supplierId) {
      fetchPurchases();
    }
  }, [supplierId, fetchPurchases]);

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    navigate({ search: newParams.toString() });
  };

  const handleRetry = () => {
    fetchPurchases();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            مشتريات {supplierName || "المورد"}
          </h1>
          <p className="text-slate-500 mt-1">
            عرض جميع المشتريات من هذا المورد
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/reports/suppliers-summary")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى ملخص الموردين
        </Button>
      </div>

      <div className="mx-auto max-w-[1400px]">
        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mr-auto border-red-200 hover:bg-red-100 text-red-700"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              إعادة المحاولة
            </Button>
          </div>
        )}

        {/* Main Content Card */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              قائمة المشتريات
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Data Table */}
            {!isLoading && !error && (
              <div className="border rounded-lg overflow-hidden">
                {purchases.length === 0 ? (
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <div className="bg-slate-100 p-4 rounded-full mb-4">
                              <FileText className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">
                              لا توجد مشتريات
                            </h3>
                            <p>لا توجد مشتريات مسجلة لهذا المورد</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <>
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
                          <TableHead className="text-center font-semibold">
                            الحالة
                          </TableHead>
                          <TableHead className="text-right font-semibold">
                            المبلغ الإجمالي
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchases.map((purchase) => (
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
                                <span className="text-slate-400 text-sm italic">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <Badge variant={getStatusVariant(purchase.status)}>
                                {statusLabels[purchase.status] || purchase.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 text-right font-medium">
                              {formatNumber(purchase.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {meta && meta.last_page > 1 && (
                      <div className="flex justify-center mt-6">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                              handlePageChange(Math.min(meta.last_page, currentPage + 1))
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierPurchasesPage;

