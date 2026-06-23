import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PackageCheck,
  User,
  Calendar,
  Building2,
  FileText,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { useQueryClient } from "@tanstack/react-query";
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
  partially_issued: "bg-teal-100 text-teal-800",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface StockInfo {
  [productId: number]: number;
}

const IssueStockRequisitionPage: React.FC = () => {
  const navigate = useNavigate();
  const { requisitionId } = useParams<{ requisitionId: string }>();
  const queryClient = useQueryClient();

  const [requisition, setRequisition] = useState<StockRequisition | null>(null);
  const [stockInfo, setStockInfo] = useState<StockInfo>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-item issued quantities (item.id → qty)
  const [issuedQty, setIssuedQty] = useState<Record<number, number>>({});

  // Issue dialog
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueNotes, setIssueNotes] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);

  // Reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchRequisition = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockRequisitionService.getRequisition(id);
      setRequisition(data);

      if (data.items && data.items.length > 0) {
        setLoadingStock(true);
        const stockMap: StockInfo = {};
        await Promise.all(
          data.items.map(async (item) => {
            try {
              const res = await apiClient.get<{ product: { stock_quantity: number } }>(
                `/products/${item.product_id}`
              );
              stockMap[item.product_id] = res.data?.product?.stock_quantity ?? 0;
            } catch {
              stockMap[item.product_id] = 0;
            }
          })
        );
        setStockInfo(stockMap);

        // Initialize issued quantities to min(requested, available)
        const initQty: Record<number, number> = {};
        data.items.forEach((item) => {
          const available = stockMap[item.product_id] ?? 0;
          initQty[item.id] = Math.min(item.requested_quantity, available);
        });
        setIssuedQty(initQty);

        setLoadingStock(false);
      }
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

  const isPartialIssue = requisition?.items?.some(
    (item) => (issuedQty[item.id] ?? 0) < item.requested_quantity
  ) ?? false;

  const hasAnyQty = requisition?.items?.some(
    (item) => (issuedQty[item.id] ?? 0) > 0
  ) ?? false;

  const handleIssue = async () => {
    if (!requisitionId || !requisition?.items) return;
    setIsIssuing(true);
    try {
      await apiClient.post(`/stock-requisitions/${requisitionId}/issue`, {
        notes: issueNotes || null,
        items: requisition.items.map((item) => ({
          item_id: item.id,
          issued_quantity: issuedQty[item.id] ?? 0,
        })),
      });
      toast.success(
        isPartialIssue ? "تم الصرف الجزئي بنجاح" : "تم صرف الطلب بنجاح",
        { description: "تم خصم الكميات من المخزون وتسجيل عملية الصرف." }
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowIssueDialog(false);
      navigate("/admin/inventory/requisitions");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل صرف الطلب";
      toast.error("خطأ", { description: msg });
    } finally {
      setIsIssuing(false);
    }
  };

  const handleReject = async () => {
    if (!requisitionId) return;
    setIsRejecting(true);
    try {
      await apiClient.post(`/stock-requisitions/${requisitionId}/reject`, {
        notes: rejectNotes || null,
      });
      toast.success("تم رفض الطلب");
      setShowRejectDialog(false);
      navigate("/admin/inventory/requisitions");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل رفض الطلب";
      toast.error("خطأ", { description: msg });
    } finally {
      setIsRejecting(false);
    }
  };

  const canProcess =
    requisition &&
    (requisition.status === "pending_approval" ||
      requisition.status === "approved" ||
      requisition.status === "partially_issued");

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
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
      </div>
    );
  }

  if (!requisition) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/admin/inventory/requisitions")}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            طلب صرف – SR-{String(requisition.id).padStart(4, "0")}
          </h1>
          <p className="text-sm text-muted-foreground">مراجعة ومعالجة الطلب</p>
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

      {/* Request Summary Card */}
      <Card className="dark:bg-gray-900 mb-6">
        <CardHeader>
          <CardTitle>تفاصيل الطلب</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            {requisition.approver_name && (
              <div className="flex items-start gap-2">
                <PackageCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {requisition.status === "rejected" ? "رُفض بواسطة" : "صُرف بواسطة"}
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
          {canProcess && (
            <p className="text-sm text-muted-foreground mt-1">
              حدد الكمية المراد صرفها لكل صنف. يمكن تقليلها للصرف الجزئي.
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-center">الكمية المطلوبة</TableHead>
                <TableHead className="text-center">المتوفر في المخزون</TableHead>
                {canProcess ? (
                  <TableHead className="text-center">الكمية للصرف</TableHead>
                ) : (
                  <TableHead className="text-center">الكمية المصروفة</TableHead>
                )}
                <TableHead className="text-center">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisition.items?.map((item) => {
                const available = stockInfo[item.product_id] ?? 0;
                const qty = issuedQty[item.id] ?? 0;
                const isSufficient = loadingStock || available >= item.requested_quantity;
                const isPartialForItem = canProcess && qty < item.requested_quantity && qty >= 0;

                return (
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
                    <TableCell className="text-center">
                      {loadingStock ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                      ) : (
                        <span
                          className={cn(
                            "font-semibold text-lg",
                            isSufficient
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {available}
                        </span>
                      )}
                    </TableCell>
                    {canProcess ? (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={item.requested_quantity}
                            value={qty}
                            disabled={loadingStock}
                            onChange={(e) => {
                              const val = Math.max(
                                0,
                                Math.min(item.requested_quantity, Number(e.target.value))
                              );
                              setIssuedQty((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            className={cn(
                              "w-20 text-center",
                              isPartialForItem && qty > 0
                                ? "border-amber-400 focus-visible:ring-amber-400"
                                : qty === 0
                                ? "border-red-300 focus-visible:ring-red-300"
                                : ""
                            )}
                          />
                          {isPartialForItem && qty > 0 && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              جزئي
                            </span>
                          )}
                          {qty === 0 && (
                            <span className="text-xs text-red-500 whitespace-nowrap">
                              لن يُصرف
                            </span>
                          )}
                        </div>
                      </TableCell>
                    ) : (
                      <TableCell className="text-center font-semibold">
                        {item.issued_quantity > 0 ? (
                          <span
                            className={cn(
                              item.issued_quantity >= item.requested_quantity
                                ? "text-green-600 dark:text-green-400"
                                : "text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {item.issued_quantity}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {canProcess ? (
                        loadingStock ? (
                          <span className="text-muted-foreground text-xs">جاري التحقق...</span>
                        ) : isSufficient ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            متوفر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
                            <XCircle className="h-3.5 w-3.5" />
                            غير كافٍ
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {item.status === "issued"
                            ? "تم الصرف"
                            : item.status === "partial"
                            ? "جزئي"
                            : item.status === "rejected_item"
                            ? "مرفوض"
                            : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Partial issue info */}
      {canProcess && isPartialIssue && hasAnyQty && !loadingStock && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700">
          <PackageOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-700 dark:text-amber-300">صرف جزئي</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-400">
            بعض الأصناف ستُصرف بكمية أقل من المطلوبة. سيتم تسجيل الطلب كـ "صرف جزئي".
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      {canProcess && (
        <div className="flex justify-end gap-3">
          <Button
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
          >
            <XCircle className="h-4 w-4 ml-2" />
            رفض الطلب
          </Button>
          <Button
            disabled={!hasAnyQty || loadingStock}
            onClick={() => setShowIssueDialog(true)}
            className={cn(
              "text-white",
              isPartialIssue
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            {isPartialIssue ? (
              <>
                <PackageOpen className="h-4 w-4 ml-2" />
                موافقة وصرف جزئي
              </>
            ) : (
              <>
                <PackageCheck className="h-4 w-4 ml-2" />
                موافقة وصرف الكامل
              </>
            )}
          </Button>
        </div>
      )}

      {/* Issue Confirmation Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {isPartialIssue ? "تأكيد الصرف الجزئي" : "تأكيد صرف الطلب"}
            </DialogTitle>
            <DialogDescription>
              {isPartialIssue
                ? "سيتم صرف الكميات المحددة فقط وسيُسجَّل الطلب كصرف جزئي."
                : "سيتم خصم الكميات الكاملة من المخزون وتسجيل عملية الصرف."}
              {" "}هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>

          {/* Summary of quantities */}
          <div className="rounded-md border p-3 bg-muted/50 text-sm space-y-1 max-h-40 overflow-y-auto">
            {requisition.items?.map((item) => {
              const qty = issuedQty[item.id] ?? 0;
              return (
                <div key={item.id} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {item.product?.name ?? `منتج #${item.product_id}`}
                  </span>
                  <span className="font-medium">
                    {qty} / {item.requested_quantity}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-notes">ملاحظات أمين المخزن (اختياري)</Label>
            <Textarea
              id="issue-notes"
              placeholder="أي ملاحظات على عملية الصرف..."
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowIssueDialog(false)}
              disabled={isIssuing}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleIssue}
              disabled={isIssuing}
              className={cn(
                "text-white",
                isPartialIssue
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              )}
            >
              {isIssuing && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              {isPartialIssue ? (
                <>
                  <PackageOpen className="h-4 w-4 ml-2" />
                  تأكيد الصرف الجزئي
                </>
              ) : (
                <>
                  <PackageCheck className="h-4 w-4 ml-2" />
                  تأكيد الصرف
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رفض هذا الطلب؟ يمكنك إضافة سبب الرفض.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-notes">سبب الرفض (اختياري)</Label>
            <Textarea
              id="reject-notes"
              placeholder="اذكر سبب الرفض..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isRejecting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              <XCircle className="h-4 w-4 ml-2" />
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssueStockRequisitionPage;
