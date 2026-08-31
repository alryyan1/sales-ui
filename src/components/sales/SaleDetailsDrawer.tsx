// src/components/sales/SaleDetailsDrawer.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PdfViewerDialog } from "@/components/common/PdfViewerDialog";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useLanguage } from "@/context/LanguageContext";
import apiClient from "@/lib/axios";
import { getSaleStatus, translatePaymentMethod, translateSaleStatus } from "@/lib/saleStatus";

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
  const { direction } = useLanguage();
  const { t } = useTranslation("sales");
  const { t: tCommon } = useTranslation("common");
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

  const handlePrint = async (kind: "thermal" | "a4", currency: "local" | "usd" = "local") => {
    if (!sale) return;
    setPrintingKind(kind);
    try {
      const path =
        kind === "thermal" ? `/sales/${sale.id}/thermal-invoice-pdf` : `/sales/${sale.id}/a4-invoice-pdf/view`;
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (kind === "a4" && currency === "usd") params.set("currency", "usd");
      const response = await apiClient.get(`${path}?${params.toString()}`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      setPdfUrl(window.URL.createObjectURL(blob));
      setPdfDialogOpen(true);
    } catch {
      toast.error(t("failedToLoadSale"));
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
      toast.success(t("saleDeletedSuccessfully"));
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      onChanged?.();
    } catch (err) {
      toast.error(t("failedToDeleteSale"), { description: saleService.getErrorMessage(err) });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportToFinance = async () => {
    if (!sale) return;
    setIsExporting(true);
    try {
      await saleService.exportToFinance(sale.id);
      toast.success(t("journalEntrySent"));
      queryClient.invalidateQueries({ queryKey: ["sale-detail", sale.id] });
    } catch (err) {
      toast.error(t("journalExportFailed"), { description: saleService.getErrorMessage(err) });
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir={direction}
          className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogHeader className="border-b px-5 py-4">
            {sale ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base">{t("invoiceHash", { id: sale.number ?? sale.id })}</DialogTitle>
                  {status && <Badge variant={status.variant}>{translateSaleStatus(t, status.kind)}</Badge>}
                </div>
                <DialogDescription>
                  {format(new Date(sale.created_at), "dd MMM yyyy, HH:mm")}
                </DialogDescription>
              </>
            ) : (
              <DialogTitle className="text-base">{t("invoiceDetailsTitle")}</DialogTitle>
            )}
          </DialogHeader>

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
                  <span>{t("loadSaleDataError")}</span>
                  <Button size="sm" variant="outline" onClick={() => saleQuery.refetch()}>
                    {tCommon("retry")}
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
                      {t("client")}
                    </p>
                    {sale.client_id ? (
                      <a
                        href={`#/clients/${sale.client_id}/ledger`}
                        className="font-medium text-primary hover:underline"
                      >
                        {sale.client_name ?? t("clientHash", { id: sale.client_id })}
                      </a>
                    ) : (
                      <p className="font-medium text-foreground">{t("cashClient")}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3.5" />
                      {t("cashierColumn")}
                    </p>
                    <p className="font-medium text-foreground">{sale.user_name ?? "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="size-3.5" />
                      {t("warehouseLabel")}
                    </p>
                    <p className="font-medium text-foreground">{sale.warehouse?.name ?? "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      {t("saleDate")}
                    </p>
                    <p className="font-medium text-foreground">{sale.sale_date}</p>
                  </div>
                  {sale.shift_id != null && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t("shiftLabel")}</p>
                      <p className="font-medium text-foreground">#{sale.shift_id}</p>
                    </div>
                  )}
                  {sale.notes && (
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-muted-foreground">{t("notes")}</p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{sale.notes}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {t("itemsCountHeading", { count: sale.items?.length ?? 0 })}
                  </h3>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-start">{t("product")}</TableHead>
                          <TableHead className="text-center">{t("quantity")}</TableHead>
                          <TableHead className="text-end">{t("priceColumn")}</TableHead>
                          <TableHead className="text-end">{t("costColumn")}</TableHead>
                          <TableHead className="text-end">{t("totalColumn")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(sale.items ?? []).map((item) => (
                          <TableRow key={item.id ?? `${item.product_id}-${item.quantity}`}>
                            <TableCell>
                              <p className="font-medium text-foreground">
                                {item.product_name ?? t("productHash", { id: item.product_id })}
                              </p>
                              {item.product_sku && (
                                <p className="font-mono text-xs text-muted-foreground">{item.product_sku}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                            <TableCell className="text-end tabular-nums">
                              {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-end tabular-nums text-muted-foreground">
                              {formatCurrency(item.resolved_cost_price ?? item.cost_price_at_sale)}
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
                            <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                              {t("noItems")}
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
                    <span className="text-muted-foreground">{t("subtotalLabel")}</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("discount")}</span>
                      <span className="tabular-nums text-destructive">- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <Separator className="my-1.5" />
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>{t("totalColumn")}</span>
                    <span className="tabular-nums text-primary">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("paidColumn")}</span>
                    <span className="tabular-nums text-green-600 dark:text-green-400">
                      {formatCurrency(paid)}
                    </span>
                  </div>
                  {due > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("dueColumn")}</span>
                      <span className="font-medium tabular-nums text-destructive">{formatCurrency(due)}</span>
                    </div>
                  )}
                </div>

                {/* Payments */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{t("paymentsMadeTitle")}</h3>
                  {(sale.payments ?? []).length === 0 ? (
                    <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                      {t("noPaymentsRecorded")}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {(sale.payments ?? []).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{translatePaymentMethod(t, payment.method)}</Badge>
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
                {t("thermalReceiptTitle")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!!printingKind}
                    className="gap-1.5"
                  >
                    {printingKind === "a4" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Printer className="size-3.5" />
                    )}
                    {t("a4InvoiceButton")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handlePrint("a4", "local")}>
                    {t("a4InvoiceLocalOption")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePrint("a4", "usd")}>
                    {t("a4InvoiceUsdOption")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={handleExportToFinance}
                className="gap-1.5"
              >
                {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Landmark className="size-3.5" />}
                {sale.finance_exported_at ? t("reExportFinance") : t("exportFinance")}
              </Button>

              <div className="ms-auto flex items-center gap-2">
                {canReturn && !sale.is_returned && paid > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRefund} className="gap-1.5">
                    <RotateCcw className="size-3.5" />
                    {t("refund")}
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
                    {tCommon("delete")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={(o) => !isDeleting && setConfirmDeleteOpen(o)}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSaleConfirmTitle", { id: sale?.number ?? sale?.id })}</AlertDialogTitle>
            <AlertDialogDescription>{t("actionCannotBeUndoneFull")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setConfirmDeleteOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete} className="gap-2">
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              {t("deletePermanently")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pdfUrl && (
        <PdfViewerDialog isOpen={pdfDialogOpen} onClose={handleClosePdfDialog} pdfUrl={pdfUrl} title={t("saleInvoiceTitle")} />
      )}
    </>
  );
}
