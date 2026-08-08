// src/components/pos/ShiftSalesColumn.tsx
import { Loader2, RotateCcw, Tag, Users, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Sale } from "@/services/saleService";

interface ShiftSalesColumnProps {
  sales: Sale[];
  isLoading: boolean;
  activeSaleId?: number | null;
  onSelectSale: (sale: Sale) => void;
  canDeleteSale?: boolean;
  onDeleteSale?: (sale: Sale) => void;
  deletingSaleId?: number | null;
}

export function ShiftSalesColumn({
  sales,
  isLoading,
  activeSaleId = null,
  onSelectSale,
  canDeleteSale = false,
  onDeleteSale,
  deletingSaleId = null,
}: ShiftSalesColumnProps) {
  return (
    <div className="flex w-24 shrink-0 flex-col gap-2 overflow-y-auto border-e bg-muted/10 p-2">
      <span className="px-0.5 text-center text-[11px] font-medium text-muted-foreground">مبيعات الوردية</span>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : sales.length === 0 ? (
        <p className="px-1 text-center text-[11px] text-muted-foreground">لا توجد مبيعات</p>
      ) : (
        sales.map((sale) => {
          const isActive = activeSaleId === sale.id;
          const itemsCount = sale.items?.length ?? 0;
          const hasClient = (sale.client_id ?? 0) > 0;
          const isUnpaid = (sale.payments?.length ?? 0) === 0;
          const isReturned = sale.is_returned === true;
          const isQuote = sale.is_quote === true;
          const isDeleting = deletingSaleId === sale.id;
          return (
            <div key={sale.id} className="group relative self-center">
              <button
                type="button"
                onClick={() => onSelectSale(sale)}
                className={cn(
                  "relative flex size-16 cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-xl border-2 text-xs font-semibold transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isQuote
                      ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200"
                      : isReturned
                        ? "border-destructive/50 text-foreground hover:bg-accent"
                        : "border-border text-foreground hover:bg-accent"
                )}
              >
                {hasClient && (
                  <Users
                    className={cn(
                      "absolute start-1 top-1 size-3",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  />
                )}
                {isQuote && (
                  <Tag
                    className={cn(
                      "absolute bottom-1 start-1 size-3",
                      isActive ? "text-primary-foreground/80" : "text-amber-600"
                    )}
                  />
                )}
                {isReturned && (
                  <RotateCcw
                    className={cn(
                      "absolute bottom-1 end-1 size-3",
                      isActive ? "text-primary-foreground/80" : "text-destructive"
                    )}
                  />
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
                  aria-label="حذف الفاتورة"
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
