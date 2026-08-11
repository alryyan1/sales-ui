// src/components/pos/CartPanel.tsx
import { useEffect, useState } from "react";
import { Loader2, Minus, Percent, Plus, Receipt, Tag, Trash2, Users, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

import { DraftCartItem, DraftTicket, DiscountType, computeDraftTotals } from "@/lib/posCart";
import type { Payment } from "@/services/saleService";

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  cash: "paymentMethodCash",
  bankak: "paymentMethodBankak",
  fawry: "paymentMethodFawry",
  ocash: "paymentMethodOcash",
  bank_transfer: "paymentMethodBankTransfer",
  card: "paymentMethodCard",
};

interface CartPanelProps {
  ticket: DraftTicket | null;
  selectedLineId: string | null;
  onSelectLine: (id: string | null) => void;
  onQuantityChange: (item: DraftCartItem, quantity: number) => void;
  onRemoveItem: (item: DraftCartItem) => void;
  onClearCart: () => void;
  canDiscount: boolean;
  onApplyDiscount: (type: DiscountType, amount: number) => void;
  onRemoveDiscount: () => void;
  canPayment: boolean;
  onOpenPayment: () => void;
  onQuickCashPay: () => void;
  isCreatingSale: boolean;
  /** Remaining amount actually owed on the sale, when editing an existing one (may differ from the cart total if it was already partially paid). Null when creating a new sale. */
  dueAmount?: number | null;
  /** Payments already recorded on the sale being edited. Null/omitted when creating a new sale. */
  payments?: Payment[] | null;
  canCancelPayment?: boolean;
  deletingPaymentId?: number | null;
  onDeletePayment?: (paymentId: number) => void;
}

function DiscountPopover({
  ticket,
  disabled,
  onApply,
  onRemove,
}: {
  ticket: DraftTicket;
  disabled: boolean;
  onApply: (type: DiscountType, amount: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const { t: tCartPanel } = useTranslation("cartPanel");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DiscountType>(ticket.discountType);
  const [value, setValue] = useState(ticket.discountAmount ? String(ticket.discountAmount) : "");
  const hasDiscount = ticket.discountAmount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Tag className="size-3" />
          {hasDiscount ? tCartPanel("editDiscount") : tCartPanel("addDiscount")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setType("percentage")}
            className={cn(
              "flex-1 rounded-md py-1 text-xs font-medium",
              type === "percentage" ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >
            {tCartPanel("percentageOption")}
          </button>
          <button
            type="button"
            onClick={() => setType("fixed")}
            className={cn(
              "flex-1 rounded-md py-1 text-xs font-medium",
              type === "fixed" ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >
            {tCartPanel("fixedAmountOption")}
          </button>
        </div>
        <div className="relative">
          <Input
            type="number"
            min={0}
            max={type === "percentage" ? 100 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "percentage" ? tCartPanel("percentagePlaceholder") : tCartPanel("fixedAmountPlaceholder")}
            className="pe-8"
            autoFocus
          />
          {type === "percentage" && (
            <Percent className="pointer-events-none absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-2">
          {hasDiscount && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                onRemove();
                setValue("");
                setOpen(false);
              }}
            >
              {t("remove")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="flex-1 gap-1.5"
            disabled={disabled || value.trim() === ""}
            onClick={() => {
              onApply(type, Number(value));
              setOpen(false);
            }}
          >
            {tCommon("apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CartLine({
  item,
  selected,
  disabled,
  onSelect,
  onQuantityChange,
  onRemove,
}: {
  item: DraftCartItem;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { t: tCartPanel } = useTranslation("cartPanel");
  const formatCurrency = useFormatCurrency();
  const [qtyDraft, setQtyDraft] = useState(String(item.quantity));
  const lineTotal = item.unitPrice * item.quantity;

  useEffect(() => {
    setQtyDraft(String(item.quantity));
  }, [item.quantity]);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
        selected ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent/40"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.product.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.product.sku && <span className="font-mono">{item.product.sku}</span>}
          {item.product.sku && " · "}
          {formatCurrency(item.unitPrice)} {tCartPanel("perUnitSuffix")}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          disabled={disabled || item.quantity <= 1}
          onClick={() => onQuantityChange(item.quantity - 1)}
        >
          <Minus className="size-3" />
        </Button>
        <Input
          value={qtyDraft}
          disabled={disabled}
          onChange={(e) => setQtyDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={() => {
            const n = Number(qtyDraft);
            if (Number.isFinite(n) && n > 0 && n !== item.quantity) onQuantityChange(n);
            else setQtyDraft(String(item.quantity));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-7 w-12 px-1 text-center tabular-nums"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          disabled={disabled}
          onClick={() => onQuantityChange(item.quantity + 1)}
        >
          <Plus className="size-3" />
        </Button>
      </div>

      <span className="w-20 shrink-0 text-end text-sm font-semibold tabular-nums text-foreground">
        {formatCurrency(lineTotal)}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        aria-label={tCartPanel("removeLineItem")}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function CartPanel({
  ticket,
  selectedLineId,
  onSelectLine,
  onQuantityChange,
  onRemoveItem,
  onClearCart,
  canDiscount,
  onApplyDiscount,
  onRemoveDiscount,
  canPayment,
  onOpenPayment,
  onQuickCashPay,
  isCreatingSale,
  dueAmount = null,
  payments = null,
  canCancelPayment = false,
  deletingPaymentId = null,
  onDeletePayment,
}: CartPanelProps) {
  const { t } = useTranslation("pos");
  const { t: tCartPanel } = useTranslation("cartPanel");
  const formatCurrency = useFormatCurrency();
  const items = ticket?.items ?? [];
  const { subtotal, discountAmount, total } = ticket
    ? computeDraftTotals(ticket)
    : { subtotal: 0, discountAmount: 0, total: 0 };
  const payAmount = dueAmount ?? total;
  const hasPayments = (payments?.length ?? 0) > 0;
  const client = ticket?.client ?? null;

  return (
    <div className={cn("flex h-full flex-col", client && "bg-blue-50/60 dark:bg-blue-950/20")}>
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary-foreground">
          <Receipt className="size-4 text-primary-foreground/70" />
          {tCartPanel("cartTitle")}
          {items.length > 0 && (
            <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {items.length}
            </span>
          )}
        </h2>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isCreatingSale || hasPayments}
            onClick={onClearCart}
            title={hasPayments ? tCartPanel("mustCancelPaymentsBeforeClear") : undefined}
            className="gap-1.5 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Trash2 className="size-3.5" />
            {t("clearAll")}
          </Button>
        )}
      </div>

      {client && (
        <div className="flex items-center gap-2 border-b border-blue-200 bg-blue-100/80 px-4 py-2 text-sm dark:border-blue-900 dark:bg-blue-900/30">
          <Users className="size-4 shrink-0 text-blue-700 dark:text-blue-300" />
          <span className="text-blue-800 dark:text-blue-200">{t("client")}:</span>
          <span className="truncate font-medium text-blue-900 dark:text-blue-100">{client.name}</span>
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Receipt className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">{tCartPanel("cartEmpty")}</p>
            <p className="text-xs text-muted-foreground">
              {tCartPanel("emptyCartHint")}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <CartLine
              key={item.localId}
              item={item}
              selected={selectedLineId === item.localId}
              disabled={isCreatingSale}
              onSelect={() => onSelectLine(item.localId)}
              onQuantityChange={(q) => onQuantityChange(item, q)}
              onRemove={() => onRemoveItem(item)}
            />
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-2.5 border-t bg-muted/20 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            {canDiscount && ticket ? (
              <DiscountPopover
                ticket={ticket}
                disabled={isCreatingSale}
                onApply={onApplyDiscount}
                onRemove={onRemoveDiscount}
              />
            ) : (
              <span className="text-muted-foreground">{t("discount")}</span>
            )}
            {discountAmount > 0 && (
              <span className="tabular-nums text-destructive">- {formatCurrency(discountAmount)}</span>
            )}
          </div>

          <Separator />

          <div className="flex items-end justify-between">
            <span className="text-sm font-medium text-muted-foreground">{tCartPanel("grandTotal")}</span>
            <span className="text-3xl font-bold tabular-nums text-primary">{formatCurrency(total)}</span>
          </div>

          {dueAmount != null && dueAmount !== total && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{tCartPanel("alreadyPaid")}</span>
                <span className="tabular-nums">{formatCurrency(Math.max(0, total - dueAmount))}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-muted-foreground">{tCartPanel("remainingToPay")}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    dueAmount > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                  )}
                >
                  {dueAmount > 0 ? formatCurrency(dueAmount) : tCartPanel("fullyPaid")}
                </span>
              </div>
            </>
          )}

          {payments != null && payments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t("payments")}</p>
              {payments.map((p) => (
                <div
                  key={p.id ?? `${p.method}-${p.amount}-${p.payment_date}`}
                  className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground">
                    {PAYMENT_METHOD_LABEL_KEYS[p.method] ? tCartPanel(PAYMENT_METHOD_LABEL_KEYS[p.method]) : p.method}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(Number(p.amount))}</span>
                    {p.id != null && onDeletePayment && (
                      <button
                        type="button"
                        disabled={!canCancelPayment || deletingPaymentId === p.id}
                        onClick={() => onDeletePayment(p.id!)}
                        className="text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
                        aria-label={tCartPanel("deletePayment")}
                      >
                        {deletingPaymentId === p.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <Button
              type="button"
              size="lg"
              disabled={!canPayment || isCreatingSale || payAmount <= 0}
              onClick={onOpenPayment}
              className="w-full gap-2 text-base font-semibold"
            >
              {t("payment")}
              <kbd className="rounded bg-primary-foreground/15 px-1.5 py-0.5 font-mono text-[10px] font-normal">F8</kbd>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPayment || isCreatingSale || payAmount <= 0}
              onClick={onQuickCashPay}
              className="w-full gap-1.5 text-muted-foreground"
            >
              {isCreatingSale ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {tCartPanel("quickPayFullAmount")}
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">F10</kbd>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
