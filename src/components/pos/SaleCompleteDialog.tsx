// src/components/pos/SaleCompleteDialog.tsx
import { CheckCircle2, Loader2, Plus, Printer } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

import { Sale } from "@/services/saleService";

interface SaleCompleteDialogProps {
  open: boolean;
  sale: Sale | null;
  onNewSale: () => void;
  onPrint: (kind: "thermal" | "a4") => void;
  printingKind?: "thermal" | "a4" | null;
}

export function SaleCompleteDialog({
  open,
  sale,
  onNewSale,
  onPrint,
  printingKind,
}: SaleCompleteDialogProps) {
  const formatCurrency = useFormatCurrency();
  if (!sale) return null;

  const due = Math.max(
    0,
    sale.due_amount != null
      ? Number(sale.due_amount)
      : Number(sale.total_amount ?? 0) - Number(sale.paid_amount ?? 0)
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onNewSale()}>
      <DialogContent dir="rtl" className="sm:max-w-sm text-center" showCloseButton={false}>
        <DialogHeader className="items-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-8" />
          </div>
          <DialogTitle className="text-lg">تم إتمام البيع بنجاح</DialogTitle>
          <DialogDescription>
            {sale.invoice_number ? `فاتورة رقم ${sale.invoice_number}` : `طلب رقم #${sale.number}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">الإجمالي</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(sale.total_amount)}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">المدفوع</p>
            <p className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">
              {formatCurrency(sale.paid_amount)}
            </p>
          </div>
        </div>

        {due > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
            متبقٍ على العميل: {formatCurrency(due)}
          </div>
        )}

        <Separator />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            disabled={!!printingKind}
            onClick={() => onPrint("thermal")}
          >
            {printingKind === "thermal" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            إيصال حراري
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            disabled={!!printingKind}
            onClick={() => onPrint("a4")}
          >
            {printingKind === "a4" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            فاتورة A4
          </Button>
        </div>

        <Button type="button" size="lg" className="gap-2 text-base font-semibold" onClick={onNewSale}>
          <Plus className="size-5" />
          بيع جديد
        </Button>
      </DialogContent>
    </Dialog>
  );
}
