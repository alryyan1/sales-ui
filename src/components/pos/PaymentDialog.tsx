// src/components/pos/PaymentDialog.tsx
import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
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
import { parseActivePaymentMethods, resolveDefaultActiveMethod } from "@/lib/paymentMethods";

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
  /** Whether the ticket/sale has a client attached. In "create" mode this gates a fully-unpaid ("pay later") sale, since an untracked walk-in can't owe a balance. */
  hasClient?: boolean;
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
  hasClient = false,
}: PaymentDialogProps) {
  const formatCurrency = useFormatCurrency();
  const { direction } = useLanguage();
  const { getSetting } = useSettings();
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const { t: tPayment } = useTranslation("paymentDialog");
  const due = Math.max(0, total);

  const METHOD_LABELS: Record<Payment["method"], string> = {
    cash: tPayment("methodCash"),
    bankak: tPayment("methodBankak"),
    fawry: tPayment("methodFawry"),
    ocash: tPayment("methodOcash"),
    bank_transfer: tPayment("methodBankTransfer"),
    card: tPayment("methodCard"),
  };
  const activeMethods = parseActivePaymentMethods(getSetting("pos_active_payment_methods"));
  const METHODS = activeMethods.map((value) => ({ value, label: METHOD_LABELS[value] }));
  const defaultMethod = resolveDefaultActiveMethod(activeMethods, DEFAULT_PAYMENT_METHOD);

  const [lines, setLines] = useState<DraftLine[]>([]);

  useEffect(() => {
    if (!open) return;
    setLines([{ id: crypto.randomUUID(), method: defaultMethod, amount: due > 0 ? String(due) : "0" }]);
  }, [open, due, defaultMethod]);

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
    const nextMethod = METHODS.find((m) => !usedMethods.has(m.value))?.value ?? defaultMethod;
    setLines((prev) => [...prev, { id: crypto.randomUUID(), method: nextMethod, amount: "0" }]);
  };

  // A fully-unpaid sale ("pay later") is only allowed when creating a sale for a known client,
  // so the resulting balance is trackable as a receivable rather than an orphaned debt.
  const payLaterAllowed = mode === "create" && hasClient;
  const canSubmit = totalApplied > 0 || (payLaterAllowed && totalApplied === 0);

  const handleConfirm = () => {
    if (!canSubmit) return;
    const newLines = rows.filter((r) => r.applied > 0).map((r) => ({ method: r.method, amount: r.applied }));
    onConfirm(newLines);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent dir={direction} className="sm:max-w-md">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
      >
        <DialogHeader>
          <DialogTitle>{ticketLabel ? tPayment("titleWithTicket", { label: ticketLabel }) : t("payment")}</DialogTitle>
          <DialogDescription>
            {mode === "addPayment"
              ? tPayment("addPaymentDescription")
              : tPayment("createSaleDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted/40 px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">{tPayment("totalDue")}</p>
          <p className="text-3xl font-bold tabular-nums text-foreground">{formatCurrency(due)}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mode === "create" && !hasClient && totalApplied <= 0 && (
          <Alert>
            <AlertDescription>{tPayment("selectClientForCreditHint")}</AlertDescription>
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
                  placeholder={row.method === "cash" ? tPayment("cashAmountPlaceholder") : t("amount")}
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
                  {tPayment("changeForPayment", { amount: formatCurrency(row.change) })}
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
            {tPayment("addAnotherPaymentMethod")}
          </Button>
        </div>

        <Separator />

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{tPayment("paidNow")}</span>
            <span className="font-medium tabular-nums">{formatCurrency(totalApplied)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{tPayment("remaining")}</span>
            <span
              className={cn(
                "font-medium tabular-nums",
                remaining > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
              )}
            >
              {remaining > 0 ? formatCurrency(remaining) : tPayment("fullyPaid")}
            </span>
          </div>
          {totalChange > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-green-500/10 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
                <Banknote className="size-4" />
                {tPayment("changeForCustomer")}
              </span>
              <span className="text-lg font-bold tabular-nums text-green-700 dark:text-green-400">
                {formatCurrency(totalChange)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className="min-w-32 gap-2"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {mode === "addPayment"
              ? remaining > 0
                ? tPayment("recordPartialPayment")
                : tPayment("recordPayment")
              : totalApplied <= 0
                ? tPayment("createOnCredit")
                : remaining > 0
                  ? tPayment("createWithPartialPayment")
                  : tPayment("createSale")}
          </Button>
        </DialogFooter>
      </form>
      </DialogContent>
    </Dialog>
  );
}
