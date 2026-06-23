import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  AlertCircle,
  ClipboardList,
  Eye,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import stockRequisitionService, {
  StockRequisition,
} from "@/services/stockRequisitionService";
import { PaginatedResponse } from "@/services/clientService";
import apiClient from "@/lib/axios";
import { formatDate } from "@/constants";

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "قيد المراجعة",
  approved: "موافق عليه",
  issued: "تم الصرف",
  partially_issued: "صرف جزئي",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

const STATUS_COLOR: Record<string, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  issued: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partially_issued: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const StockRequisitionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [response, setResponse] = useState<PaginatedResponse<StockRequisition> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<StockRequisition | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchRequisitions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockRequisitionService.getRequisitions(page, 15, {
        status: statusFilter || undefined,
      });
      setResponse(data);
    } catch (err) {
      const msg = stockRequisitionService.getErrorMessage(err);
      setError(msg);
      toast.error("خطأ في تحميل الطلبات", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRequisitions();
  }, [fetchRequisitions]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await apiClient.post(`/stock-requisitions/${cancelTarget.id}/cancel`);
      toast.success("تم إلغاء الطلب بنجاح");
      setCancelTarget(null);
      fetchRequisitions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل إلغاء الطلب";
      toast.error("خطأ", { description: msg });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">طلبات الصرف</h1>
            <p className="text-sm text-muted-foreground">إدارة طلبات صرف المخزون</p>
          </div>
        </div>
        <Button onClick={() => navigate("/inventory/requisitions/create")}>
          <Plus className="h-4 w-4 ml-2" />
          طلب صرف جديد
        </Button>
      </div>

      {/* Filter */}
      <Card className="dark:bg-gray-900 mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium whitespace-nowrap">تصفية بالحالة:</label>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val === "all" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending_approval">قيد المراجعة</SelectItem>
                <SelectItem value="approved">موافق عليه</SelectItem>
                <SelectItem value="issued">تم الصرف</SelectItem>
                <SelectItem value="partially_issued">صرف جزئي</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && response && (
        <>
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>قائمة الطلبات</CardTitle>
              <CardDescription>{response.total} طلب إجمالاً</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">تاريخ الطلب</TableHead>
                    <TableHead className="text-right">القسم / السبب</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ الصرف</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {response.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        لا توجد طلبات
                      </TableCell>
                    </TableRow>
                  )}
                  {response.data.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-sm font-semibold">
                        SR-{String(req.id).padStart(4, "0")}
                      </TableCell>
                      <TableCell>{formatDate(req.request_date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {req.department_or_reason || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            STATUS_COLOR[req.status] ?? "bg-gray-100 text-gray-800"
                          )}
                        >
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {req.issue_date ? formatDate(req.issue_date) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(`/inventory/requisitions/${req.id}`)
                            }
                          >
                            <Eye className="h-3.5 w-3.5 ml-1" />
                            التفاصيل
                          </Button>
                          {req.status === "pending_approval" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={() => setCancelTarget(req)}
                            >
                              <XCircle className="h-3.5 w-3.5 ml-1" />
                              إلغاء
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {response.last_page > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {response.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === response.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إلغاء الطلب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء الطلب{" "}
              <span className="font-mono font-semibold">
                SR-{String(cancelTarget?.id ?? 0).padStart(4, "0")}
              </span>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={isCancelling}
            >
              تراجع
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              <XCircle className="h-4 w-4 ml-2" />
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockRequisitionsPage;
