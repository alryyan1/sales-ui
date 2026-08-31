// src/components/pos/SaleActionsBar.tsx
import { useEffect, useState } from "react";
import { Bell, CalendarDays, FileText, Landmark, Loader2, MessageCircle, Printer, Tag, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { Sale } from "@/services/saleService";

function ReminderButton({
  reminderDate,
  reminderLoading,
  onSetReminder,
  onRemoveReminder,
}: {
  reminderDate: string | null;
  reminderLoading: boolean;
  onSetReminder: (days: number) => void;
  onRemoveReminder: () => void;
}) {
  const { t: tCommon } = useTranslation("common");
  const { t: tSaleActionsBar } = useTranslation("saleActionsBar");
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("3");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-1.5", reminderDate && "border-amber-400 text-amber-600 dark:text-amber-400")}
        >
          <Bell className="size-3.5" fill={reminderDate ? "currentColor" : "none"} />
          {tSaleActionsBar("reminder")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-2.5">
        <p className="text-sm font-medium text-foreground">
          {reminderDate ? tSaleActionsBar("reminderSetForDate", { date: reminderDate }) : tSaleActionsBar("setPaymentReminder")}
        </p>
        <Input
          type="number"
          min={1}
          max={365}
          value={days}
          disabled={reminderLoading}
          onChange={(e) => setDays(e.target.value)}
          placeholder={tSaleActionsBar("numberOfDaysPlaceholder")}
        />
        <div className="flex gap-2">
          {reminderDate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={reminderLoading}
              onClick={() => {
                onRemoveReminder();
                setOpen(false);
              }}
            >
              {tCommon("cancel")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="flex-1"
            disabled={reminderLoading || !days.trim() || Number(days) < 1}
            onClick={() => {
              onSetReminder(Number(days));
              setOpen(false);
            }}
          >
            {reminderLoading ? <Loader2 className="size-3.5 animate-spin" /> : tCommon("save")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SaleDateEditor({
  saleDate,
  isSaving,
  onChange,
}: {
  saleDate: string;
  isSaving: boolean;
  onChange: (date: string) => void;
}) {
  const [draft, setDraft] = useState(saleDate);

  useEffect(() => {
    setDraft(saleDate);
  }, [saleDate]);

  return (
    <label className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm text-foreground has-disabled:opacity-60">
      <CalendarDays className="size-3.5 text-muted-foreground" />
      <input
        type="date"
        value={draft}
        disabled={isSaving}
        onChange={(e) => {
          const value = e.target.value;
          setDraft(value);
          if (value && value !== saleDate) onChange(value);
        }}
        className="bg-transparent tabular-nums outline-none [color-scheme:light] dark:[color-scheme:dark]"
      />
      {isSaving && <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />}
    </label>
  );
}

interface SaleActionsBarProps {
  sale: Sale | null;
  onPrintThermal: () => void;
  onPrintA4: (currency: "local" | "usd") => void;
  printingKind: "thermal" | "a4" | null;
  onSendWhatsApp: () => void;
  whatsAppLoading: boolean;
  onExportToFinance: () => void;
  isExportingToFinance: boolean;
  onToggleQuote: () => void;
  isTogglingQuote: boolean;
  canDeleteSale: boolean;
  onRequestDelete: () => void;
  isDeletingSale: boolean;
  reminderDate: string | null;
  reminderLoading: boolean;
  onSetReminder: (days: number) => void;
  onRemoveReminder: () => void;
  onChangeSaleDate: (date: string) => void;
  isChangingSaleDate: boolean;
}

export function SaleActionsBar({
  sale,
  onPrintThermal,
  onPrintA4,
  printingKind,
  onSendWhatsApp,
  whatsAppLoading,
  onExportToFinance,
  isExportingToFinance,
  onToggleQuote,
  isTogglingQuote,
  canDeleteSale,
  onRequestDelete,
  isDeletingSale,
  reminderDate,
  reminderLoading,
  onSetReminder,
  onRemoveReminder,
  onChangeSaleDate,
  isChangingSaleDate,
}: SaleActionsBarProps) {
  const { t: tSaleActionsBar } = useTranslation("saleActionsBar");
  if (!sale) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-2">
      <span className="shrink-0 text-sm font-medium text-muted-foreground">
        {tSaleActionsBar("saleActionsHash", { id: sale.id })}
      </span>

      <SaleDateEditor saleDate={sale.sale_date} isSaving={isChangingSaleDate} onChange={onChangeSaleDate} />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={printingKind !== null}
        onClick={onPrintThermal}
        className="gap-1.5"
      >
        {printingKind === "thermal" ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
        {tSaleActionsBar("printThermalButton")}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={printingKind !== null || !sale.client_id}
            className="gap-1.5"
          >
            {printingKind === "a4" ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
            A4 PDF
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onPrintA4("local")}>
            {tSaleActionsBar("a4InvoiceLocalOption")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPrintA4("usd")}>
            {tSaleActionsBar("a4InvoiceUsdOption")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={whatsAppLoading || !sale.client_id}
        onClick={onSendWhatsApp}
        className="gap-1.5 text-green-700 dark:text-green-400"
      >
        {whatsAppLoading ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
        {tSaleActionsBar("whatsapp")}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isExportingToFinance}
        onClick={onExportToFinance}
        className="gap-1.5"
      >
        {isExportingToFinance ? <Loader2 className="size-3.5 animate-spin" /> : <Landmark className="size-3.5" />}
        {sale.finance_exported_at ? tSaleActionsBar("reExport") : tSaleActionsBar("exportToFinanceSystem")}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isTogglingQuote}
        onClick={onToggleQuote}
        className="gap-1.5"
      >
        {isTogglingQuote ? <Loader2 className="size-3.5 animate-spin" /> : <Tag className="size-3.5" />}
        {sale.is_quote ? tSaleActionsBar("convertToInvoice") : tSaleActionsBar("convertToQuote")}
      </Button>

      <ReminderButton
        reminderDate={reminderDate}
        reminderLoading={reminderLoading}
        onSetReminder={onSetReminder}
        onRemoveReminder={onRemoveReminder}
      />

      {canDeleteSale && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDeletingSale}
          onClick={onRequestDelete}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          {isDeletingSale ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          {tSaleActionsBar("deleteInvoiceButton")}
        </Button>
      )}
    </div>
  );
}
