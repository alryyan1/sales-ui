import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, AlertCircle } from "lucide-react";
import purchaseService, { type Purchase } from "@/services/purchaseService";
import { formatNumber } from "@/constants";
import { getErrorMessage } from "@/lib/axios";
import dayjs from "dayjs";

interface SupplierPurchasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: number;
  supplierName: string;
}

const SupplierPurchasesDialog: React.FC<SupplierPurchasesDialogProps> = ({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
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
      params.append("supplier_id", supplierId.toString());

      const data = await purchaseService.getPurchases(
        currentPage,
        params.toString()
      );
      setPurchases(data.data || []);
      setMeta(data.meta || null);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err) || "حدث خطأ أثناء جلب المشتريات";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [supplierId, currentPage]);

  useEffect(() => {
    if (open && supplierId) {
      fetchPurchases();
    } else {
      // Reset state when dialog closes
      setPurchases([]);
      setError(null);
      setCurrentPage(1);
      setMeta(null);
    }
  }, [open, supplierId, fetchPurchases]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>مشتريات {supplierName}</DialogTitle>
          <DialogDescription>
            عرض جميع المشتريات من هذا المورد
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1 rounded" />
                  <Skeleton className="h-12 w-24 rounded" />
                  <Skeleton className="h-12 w-32 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : purchases.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 inline-flex rounded-lg bg-muted p-4">
                <FileText size={32} className="opacity-40" />
              </div>
              <h3 className="mb-1 text-base font-semibold">
                لا توجد مشتريات
              </h3>
              <p className="text-sm text-muted-foreground">
                لا توجد مشتريات مسجلة لهذا المورد
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-10 font-semibold text-muted-foreground">
                        التاريخ
                      </TableHead>
                      <TableHead className="h-10 font-semibold text-muted-foreground">
                        رقم الشراء
                      </TableHead>
                      <TableHead className="h-10 font-semibold text-muted-foreground">
                        المرجع
                      </TableHead>
                      <TableHead className="h-10 text-center font-semibold text-muted-foreground">
                        الحالة
                      </TableHead>
                      <TableHead className="h-10 text-right font-semibold text-muted-foreground">
                        المبلغ الإجمالي
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow
                        key={purchase.id}
                        className="transition-colors hover:bg-muted/50"
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
              </div>

              {meta && meta.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    صفحة {currentPage} من {meta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(meta.last_page, p + 1)
                        )
                      }
                      disabled={currentPage === meta.last_page}
                      className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierPurchasesDialog;

