// src/components/pos/ShiftSalesColumn.tsx
import { Landmark, Loader2, RotateCcw, Tag, Users, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { Sale } from "@/services/saleService";

interface ShiftSalesColumnProps {
  sales: Sale[];
  isLoading: boolean;
  isFetching?: boolean;
  activeSaleId?: number | null;
  onSelectSale: (sale: Sale) => void;
  canDeleteSale?: boolean;
  onDeleteSale?: (sale: Sale) => void;
  deletingSaleId?: number | null;
  loadingSaleId?: number | null;
}

export function ShiftSalesColumn({
  sales,
  isLoading,
  isFetching = false,
  activeSaleId = null,
  onSelectSale,
  canDeleteSale = false,
  onDeleteSale,
  deletingSaleId = null,
  loadingSaleId = null,
}: ShiftSalesColumnProps) {
  const { t } = useTranslation("shiftSalesColumn");

  return (
    <div className="flex w-24 shrink-0 flex-col gap-2 overflow-y-auto border-e bg-muted/10 p-2">
      <span className="flex items-center justify-center gap-1 px-0.5 text-center text-[11px] font-medium text-muted-foreground">
        {t("shiftSales")}
        {isFetching && !isLoading && <Loader2 className="size-3 animate-spin" />}
      </span>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : sales.length === 0 ? (
        <p className="px-1 text-center text-[11px] text-muted-foreground">{t("noSales")}</p>
      ) : (
        sales.map((sale) => {
          const isActive = activeSaleId === sale.id;
          const itemsCount = sale.items?.length ?? 0;
          const hasClient = (sale.client_id ?? 0) > 0;
          const isUnpaid = (sale.payments?.length ?? 0) === 0;
          const isReturned = sale.is_returned === true;
          const isQuote = sale.is_quote === true;
          const isExportedToFinance = !!sale.finance_exported_at;
          const isDeleting = deletingSaleId === sale.id;
          const isSaleLoading = loadingSaleId === sale.id;
          return (
            <div key={sale.id} className="group relative self-center">
              <button
                type="button"
                onClick={() => onSelectSale(sale)}
                disabled={isSaleLoading}
                className={cn(
                  "relative  flex size-16 cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-xl border-2 text-2xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                  isActive
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/25"
                    : isQuote
                      ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200"
                      : isReturned
                        ? "border-destructive/50 text-foreground hover:bg-accent"
                        : "border-border text-foreground hover:bg-accent"
                )}
              >
                {isSaleLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-background/60">
                    <Loader2
                      className={cn("size-5 animate-spin", isActive ? "text-primary-foreground" : "text-foreground")}
                    />
                  </div>
                )}
                {hasClient && <Users className="absolute start-1 top-1 size-3 text-muted-foreground" />}
                {isQuote && <Tag className="absolute bottom-1 start-1 size-3 text-amber-600" />}
                {isReturned && <RotateCcw className="absolute bottom-1 end-1 size-3 text-destructive" />}
                {isExportedToFinance && (
                  <Landmark className="absolute  top-1 size-3 text-emerald-600 dark:text-emerald-400">
                    <title>{t("exportedToFinanceTooltip")}</title>
                  </Landmark>
                )}
                <span className="tabular-nums">{sale.number}</span>
                {itemsCount > 0 && (
                  <span
                    className={cn(
                      "absolute -end-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold",
                      isUnpaid
                        ? "bg-destructive text-white"
                        : isActive
                          ? "bg-background text-primary"
                          : "bg-primary text-primary-foreground"
                    )}
                  >
                    {itemsCount}
                  </span>
                )}
              </button>
              {canDeleteSale && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSale?.(sale);
                  }}
                  className="absolute -start-1.5 top-1/2 hidden size-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-destructive text-white group-hover:flex disabled:pointer-events-none disabled:opacity-50"
                  aria-label={t("deleteSaleAriaLabel")}
                >
                  {isDeleting ? <Loader2 className="size-2.5 animate-spin" /> : <X className="size-2.5" />}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
