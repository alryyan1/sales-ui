// src/components/pos/SaleCompleteDialog.tsx
import { CheckCircle2, Landmark, Loader2, Plus, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/context/LanguageContext";
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
  onExportToFinance?: () => void;
  isExportingToFinance?: boolean;
}

export function SaleCompleteDialog({
  open,
  sale,
  onNewSale,
  onPrint,
  printingKind,
  onExportToFinance,
  isExportingToFinance = false,
}: SaleCompleteDialogProps) {
  const formatCurrency = useFormatCurrency();
  const { direction } = useLanguage();
  const { t } = useTranslation("pos");
  const { t: tSaleComplete } = useTranslation("saleCompleteDialog");
  if (!sale) return null;

  const due = Math.max(
    0,
    sale.due_amount != null
      ? Number(sale.due_amount)
      : Number(sale.total_amount ?? 0) - Number(sale.paid_amount ?? 0)
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onNewSale()}>
      <DialogContent
        dir={direction}
        className="sm:max-w-sm text-center"
        showCloseButton={false}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onNewSale();
          }
        }}
      >
        <DialogHeader className="items-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-8" />
          </div>
          <DialogTitle className="text-lg">{tSaleComplete("saleCompletedTitle")}</DialogTitle>
          <DialogDescription>
            {sale.invoice_number
              ? tSaleComplete("invoiceNumberLabel", { number: sale.invoice_number })
              : tSaleComplete("orderNumberLabel", { number: sale.number })}
            {" · "}
            {tSaleComplete("idLabel", { id: sale.id })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">{tSaleComplete("totalLabel")}</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(sale.total_amount)}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">{tSaleComplete("paidLabel")}</p>
            <p className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">
              {formatCurrency(sale.paid_amount)}
            </p>
          </div>
        </div>

        {due > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
            {tSaleComplete("customerOwes", { amount: formatCurrency(due) })}
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
            {tSaleComplete("thermalReceipt")}
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
            {tSaleComplete("invoiceA4")}
          </Button>
        </div>

        {onExportToFinance && (
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={isExportingToFinance}
            onClick={onExportToFinance}
          >
            {isExportingToFinance ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Landmark className="size-4" />
            )}
            {sale.finance_exported_at ? tSaleComplete("reExportToFinance") : tSaleComplete("exportToFinance")}
          </Button>
        )}

        <Button type="button" size="lg" className="gap-2 text-base font-semibold" onClick={onNewSale}>
          <Plus className="size-5" />
          {t("newSale")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
