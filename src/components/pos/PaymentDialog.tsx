// src/components/pos/PaymentDialog.tsx
import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

import type { Payment } from "@/services/saleService";
import { DEFAULT_PAYMENT_METHOD } from "@/lib/pos";

const METHODS: { value: Payment["method"]; label: string }[] = [
  { value: "cash", label: "نقدي" },
  { value: "bankak", label: "بنكك" },
  { value: "fawry", label: "فوري" },
  { value: "ocash", label: "أوكاش" },
];

type DraftLine = { id: string; method: Payment["method"]; amount: string };

function computePayments(lines: DraftLine[], due: number) {
  let remaining = due;
  const rows = lines.map((l) => {
    const entered = Number(l.amount) || 0;
    let applied: number;
    let change = 0;
    if (l.method === "cash") {
      applied = Math.min(entered, Math.max(0, remaining));
      change = Math.max(0, entered - applied);
    } else {
      applied = Math.max(0, entered);
    }
    remaining -= applied;
    return { ...l, entered, applied, change };
  });
  const totalApplied = rows.reduce((s, r) => s + r.applied, 0);
  const totalChange = rows.reduce((s, r) => s + r.change, 0);
  return { rows, totalApplied, totalChange, remaining: Math.max(0, due - totalApplied) };
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  ticketLabel?: number;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: (paymentLines: Array<{ method: Payment["method"]; amount: number }>) => void;
  /** "create" (default) creates a new sale from the ticket; "addPayment" records a payment against a sale that already exists. */
  mode?: "create" | "addPayment";
}

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  ticketLabel,
  isSubmitting,
  error,
  onConfirm,
  mode = "create",
}: PaymentDialogProps) {
  const formatCurrency = useFormatCurrency();
  const due = Math.max(0, total);

  const [lines, setLines] = useState<DraftLine[]>([]);

  useEffect(() => {
    if (!open) return;
    setLines([{ id: crypto.randomUUID(), method: DEFAULT_PAYMENT_METHOD, amount: due > 0 ? String(due) : "0" }]);
  }, [open, due]);

  const { rows, totalApplied, totalChange, remaining } = useMemo(
    () => computePayments(lines, due),
    [lines, due]
  );

  const updateLine = (id: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };
  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };
  const addLine = () => {
    const usedMethods = new Set(lines.map((l) => l.method));
    const nextMethod = METHODS.find((m) => !usedMethods.has(m.value))?.value ?? DEFAULT_PAYMENT_METHOD;
    setLines((prev) => [...prev, { id: crypto.randomUUID(), method: nextMethod, amount: "0" }]);
  };

  const handleConfirm = () => {
    if (totalApplied <= 0) return;
    const newLines = rows.filter((r) => r.applied > 0).map((r) => ({ method: r.method, amount: r.applied }));
    onConfirm(newLines);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>الدفع{ticketLabel ? ` — تذكرة #${ticketLabel}` : ""}</DialogTitle>
          <DialogDescription>
            {mode === "addPayment"
              ? "سجّل دفعة واحدة أو أكثر لهذه الفاتورة"
              : "سجّل دفعة واحدة أو أكثر لإنشاء عملية البيع"}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted/40 px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">الإجمالي المستحق</p>
          <p className="text-3xl font-bold tabular-nums text-foreground">{formatCurrency(due)}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={row.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Select
                  value={row.method}
                  onValueChange={(v) => updateLine(row.id, { method: v as Payment["method"] })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  value={row.amount}
                  autoFocus={idx === 0}
                  disabled={isSubmitting}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateLine(row.id, { amount: e.target.value })}
                  className="flex-1 text-end tabular-nums"
                  placeholder={row.method === "cash" ? "المبلغ المستلم" : "المبلغ"}
                />
                {lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isSubmitting}
                    onClick={() => removeLine(row.id)}
                    className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              {row.method === "cash" && row.change > 0 && (
                <p className="ps-1 text-xs text-green-600 dark:text-green-400">
                  الباقي لهذه الدفعة: {formatCurrency(row.change)}
                </p>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting || lines.length >= METHODS.length}
            onClick={addLine}
            className="gap-1.5 text-muted-foreground"
          >
            <Plus className="size-3.5" />
            إضافة طريقة دفع أخرى
          </Button>
        </div>

        <Separator />

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المدفوع الآن</span>
            <span className="font-medium tabular-nums">{formatCurrency(totalApplied)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المتبقي</span>
            <span
              className={cn(
                "font-medium tabular-nums",
                remaining > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
              )}
            >
              {remaining > 0 ? formatCurrency(remaining) : "مسدد بالكامل"}
            </span>
          </div>
          {totalChange > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-green-500/10 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
                <Banknote className="size-4" />
                الباقي للعميل
              </span>
              <span className="text-lg font-bold tabular-nums text-green-700 dark:text-green-400">
                {formatCurrency(totalChange)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || totalApplied <= 0}
            onClick={handleConfirm}
            className="min-w-32 gap-2"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {mode === "addPayment"
              ? remaining > 0
                ? "تسجيل دفعة جزئية"
                : "تسجيل الدفعة"
              : remaining > 0
                ? "إنشاء بدفعة جزئية"
                : "إنشاء عملية البيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
