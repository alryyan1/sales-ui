// src/components/sales/SaleDetailsDrawer.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  Calendar,
  Landmark,
  Loader2,
  Printer,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
import { format } from "date-fns";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PdfViewerDialog } from "@/components/common/PdfViewerDialog";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useAuthorization } from "@/hooks/useAuthorization";
import apiClient from "@/lib/axios";
import { getSaleStatus, paymentMethodLabel } from "@/lib/saleStatus";

import saleService from "@/services/saleService";

interface SaleDetailsDrawerProps {
  saleId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function SaleDetailsDrawer({ saleId, open, onOpenChange, onChanged }: SaleDetailsDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const { hasPermission } = useAuthorization();
  const canDelete = hasPermission("حذف فاتورة");
  const canReturn = hasPermission("view-sales-returns");

  const [printingKind, setPrintingKind] = useState<"thermal" | "a4" | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const saleQuery = useQuery({
    queryKey: ["sale-detail", saleId],
    queryFn: () => saleService.getSale(saleId as number),
    enabled: open && saleId != null,
  });

  const sale = saleQuery.data;
  const status = sale ? getSaleStatus(sale) : null;

  const subtotal = sale
    ? (sale.items ?? []).reduce(
        (sum, item) => sum + Number(item.total_price ?? Number(item.unit_price) * item.quantity),
        0
      )
    : 0;
  const discount = Number(sale?.discount_amount ?? 0);
  const total = Number(sale?.total_amount ?? subtotal);
  const paid = Number(sale?.paid_amount ?? 0);
  const due = Number(sale?.due_amount ?? Math.max(0, total - paid));

  const handlePrint = async (kind: "thermal" | "a4") => {
    if (!sale) return;
    setPrintingKind(kind);
    try {
      const path =
        kind === "thermal" ? `/sales/${sale.id}/thermal-invoice-pdf` : `/sales/${sale.id}/a4-invoice-pdf/view`;
      const response = await apiClient.get(`${path}?t=${Date.now()}`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      setPdfUrl(window.URL.createObjectURL(blob));
      setPdfDialogOpen(true);
    } catch {
      toast.error("فشل تحميل الفاتورة");
    } finally {
      setPrintingKind(null);
    }
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleDelete = async () => {
    if (!sale) return;
    setIsDeleting(true);
    try {
      await saleService.deleteSale(sale.id);
      toast.success("تم حذف الفاتورة بنجاح");
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      onChanged?.();
    } catch (err) {
      toast.error("تعذر حذف الفاتورة", { description: saleService.getErrorMessage(err) });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportToFinance = async () => {
    if (!sale) return;
    setIsExporting(true);
    try {
      await saleService.exportToFinance(sale.id);
      toast.success("تم إرسال القيد إلى النظام المالي");
      queryClient.invalidateQueries({ queryKey: ["sale-detail", sale.id] });
    } catch (err) {
      toast.error("فشل التصدير إلى النظام المالي", { description: saleService.getErrorMessage(err) });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefund = () => {
    if (!sale) return;
    onOpenChange(false);
    navigate(`/sales/returns/new?saleId=${sale.id}`);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" dir="rtl" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-5 py-4">
            {sale ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="text-base">فاتورة #{sale.number ?? sale.id}</SheetTitle>
                  {status && <Badge variant={status.variant}>{status.label}</Badge>}
                </div>
                <SheetDescription>
                  {format(new Date(sale.created_at), "dd MMM yyyy, HH:mm")}
                </SheetDescription>
              </>
            ) : (
              <SheetTitle className="text-base">تفاصيل الفاتورة</SheetTitle>
            )}
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {saleQuery.isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {saleQuery.isError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span>تعذر تحميل بيانات الفاتورة</span>
                  <Button size="sm" variant="outline" onClick={() => saleQuery.refetch()}>
                    إعادة المحاولة
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {sale && (
              <>
                {/* Sale info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3.5" />
                      العميل
                    </p>
                    {sale.client_id ? (
                      <a
                        href={`#/clients/${sale.client_id}/ledger`}
                        className="font-medium text-primary hover:underline"
                      >
                        {sale.client_name ?? `عميل #${sale.client_id}`}
                      </a>
                    ) : (
                      <p className="font-medium text-foreground">عميل نقدي</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3.5" />
                      الكاشير
                    </p>
                    <p className="font-medium text-foreground">{sale.user_name ?? "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="size-3.5" />
                      المستودع
                    </p>
                    <p className="font-medium text-foreground">{sale.warehouse?.name ?? "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      تاريخ البيع
                    </p>
                    <p className="font-medium text-foreground">{sale.sale_date}</p>
                  </div>
                  {sale.shift_id != null && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">الوردية</p>
                      <p className="font-medium text-foreground">#{sale.shift_id}</p>
                    </div>
                  )}
                  {sale.notes && (
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-muted-foreground">ملاحظات</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{sale.notes}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    الأصناف ({sale.items?.length ?? 0})
                  </h3>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-start">المنتج</TableHead>
                          <TableHead className="text-center">الكمية</TableHead>
                          <TableHead className="text-end">السعر</TableHead>
                          <TableHead className="text-end">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(sale.items ?? []).map((item) => (
                          <TableRow key={item.id ?? `${item.product_id}-${item.quantity}`}>
                            <TableCell>
                              <p className="font-medium text-foreground">
                                {item.product_name ?? `منتج #${item.product_id}`}
                              </p>
                              {item.product_sku && (
                                <p className="font-mono text-xs text-muted-foreground">{item.product_sku}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                            <TableCell className="text-end tabular-nums">
                              {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-end font-medium tabular-nums">
                              {formatCurrency(
                                Number(item.total_price ?? Number(item.unit_price) * item.quantity)
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(sale.items ?? []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                              لا توجد أصناف
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1.5 rounded-lg bg-muted/30 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الخصم</span>
                      <span className="tabular-nums text-destructive">- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <Separator className="my-1.5" />
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>الإجمالي</span>
                    <span className="tabular-nums text-primary">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المدفوع</span>
                    <span className="tabular-nums text-green-600 dark:text-green-400">
                      {formatCurrency(paid)}
                    </span>
                  </div>
                  {due > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">المتبقي</span>
                      <span className="font-medium tabular-nums text-destructive">{formatCurrency(due)}</span>
                    </div>
                  )}
                </div>

                {/* Payments */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">المدفوعات</h3>
                  {(sale.payments ?? []).length === 0 ? (
                    <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                      لا توجد مدفوعات مسجلة
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {(sale.payments ?? []).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{paymentMethodLabel(payment.method)}</Badge>
                            <span className="text-xs text-muted-foreground">{payment.payment_date}</span>
                            {payment.reference_number && (
                              <span className="font-mono text-xs text-muted-foreground">
                                #{payment.reference_number}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold tabular-nums">{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {sale && (
            <div className="flex flex-wrap items-center gap-2 border-t bg-background px-5 py-3.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!printingKind}
                onClick={() => handlePrint("thermal")}
                className="gap-1.5"
              >
                {printingKind === "thermal" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Printer className="size-3.5" />
                )}
                إيصال حراري
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!printingKind}
                onClick={() => handlePrint("a4")}
                className="gap-1.5"
              >
                {printingKind === "a4" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Printer className="size-3.5" />
                )}
                فاتورة A4
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={handleExportToFinance}
                className="gap-1.5"
              >
                {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Landmark className="size-3.5" />}
                {sale.finance_exported_at ? "إعادة التصدير" : "تصدير مالي"}
              </Button>

              <div className="ms-auto flex items-center gap-2">
                {canReturn && !sale.is_returned && paid > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRefund} className="gap-1.5">
                    <RotateCcw className="size-3.5" />
                    مرتجع
                  </Button>
                )}
                {canDelete && (sale.payments?.length ?? 0) === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    حذف
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={(o) => !isDeleting && setConfirmDeleteOpen(o)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الفاتورة "#{sale?.number ?? sale?.id}"؟</AlertDialogTitle>
            <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setConfirmDeleteOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete} className="gap-2">
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              حذف نهائي
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pdfUrl && (
        <PdfViewerDialog isOpen={pdfDialogOpen} onClose={handleClosePdfDialog} pdfUrl={pdfUrl} title="فاتورة البيع" />
      )}
    </>
  );
}
