import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Building2,
  FileText,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import stockRequisitionService, {
  StockRequisition,
} from "@/services/stockRequisitionService";
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

const StockRequisitionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { requisitionId } = useParams<{ requisitionId: string }>();

  const [requisition, setRequisition] = useState<StockRequisition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchRequisition = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockRequisitionService.getRequisition(id);
      setRequisition(data);
    } catch (err) {
      const msg = stockRequisitionService.getErrorMessage(err);
      setError(msg);
      toast.error("خطأ في تحميل الطلب", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (requisitionId) {
      fetchRequisition(Number(requisitionId));
    }
  }, [requisitionId, fetchRequisition]);

  const handleCancel = async () => {
    if (!requisitionId) return;
    setIsCancelling(true);
    try {
      await apiClient.post(`/stock-requisitions/${requisitionId}/cancel`);
      toast.success("تم إلغاء الطلب بنجاح");
      setShowCancelDialog(false);
      navigate("/inventory/requisitions");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل إلغاء الطلب";
      toast.error("خطأ", { description: msg });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !requisition) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/inventory/requisitions")}>
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
      </div>
    );
  }

  if (!requisition) return null;

  const canCancel = requisition.status === "pending_approval";

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/inventory/requisitions")}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            طلب صرف – SR-{String(requisition.id).padStart(4, "0")}
          </h1>
          <p className="text-sm text-muted-foreground">تفاصيل الطلب</p>
        </div>
        <span
          className={cn(
            "mr-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
            STATUS_COLOR[requisition.status] ?? "bg-gray-100 text-gray-800"
          )}
        >
          {STATUS_LABELS[requisition.status] ?? requisition.status}
        </span>
      </div>

      {/* Summary Card */}
      <Card className="dark:bg-gray-900 mb-6">
        <CardHeader>
          <CardTitle>معلومات الطلب</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">مقدم الطلب</p>
                <p className="font-medium text-sm">{requisition.requester_name ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">تاريخ الطلب</p>
                <p className="font-medium text-sm">{formatDate(requisition.request_date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">القسم / السبب</p>
                <p className="font-medium text-sm">{requisition.department_or_reason ?? "—"}</p>
              </div>
            </div>
            {requisition.issue_date && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ الصرف</p>
                  <p className="font-medium text-sm">{formatDate(requisition.issue_date)}</p>
                </div>
              </div>
            )}
            {requisition.approver_name && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {requisition.status === "rejected" ? "رُفض بواسطة" : "معالجة بواسطة"}
                  </p>
                  <p className="font-medium text-sm">{requisition.approver_name}</p>
                </div>
              </div>
            )}
          </div>
          {requisition.notes && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                  <p className="text-sm whitespace-pre-wrap">{requisition.notes}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="dark:bg-gray-900 mb-6">
        <CardHeader>
          <CardTitle>الأصناف المطلوبة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-center">الكمية المطلوبة</TableHead>
                <TableHead className="text-center">الكمية المصروفة</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!requisition.items || requisition.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-20">
                    لا توجد أصناف
                  </TableCell>
                </TableRow>
              ) : (
                requisition.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product?.name ?? `منتج #${item.product_id}`}
                      {item.product?.sku && (
                        <span className="block text-xs text-muted-foreground font-mono">
                          {item.product.sku}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-lg">
                      {item.requested_quantity}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {item.issued_quantity > 0 ? (
                        <span
                          className={cn(
                            "text-lg",
                            item.issued_quantity >= item.requested_quantity
                              ? "text-green-600 dark:text-green-400"
                              : "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {item.issued_quantity}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {requisition.status === "cancelled"
                        ? "ملغي"
                        : requisition.status === "rejected"
                        ? "مرفوض"
                        : item.status === "issued"
                        ? "تم الصرف"
                        : item.status === "partial"
                        ? "جزئي"
                        : item.status === "rejected_item"
                        ? "مرفوض"
                        : "قيد الانتظار"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Action */}
      {canCancel && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
          >
            <XCircle className="h-4 w-4 ml-2" />
            إلغاء الطلب
          </Button>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إلغاء الطلب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-notes">سبب الإلغاء (اختياري)</Label>
            <Textarea
              id="cancel-notes"
              placeholder="اذكر سبب الإلغاء..."
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
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

export default StockRequisitionDetailPage;
