// src/components/pos/SaleActionsBar.tsx
import { useState } from "react";
import { Bell, FileText, Landmark, Loader2, MessageCircle, Printer, Tag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
          تذكير
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-2.5">
        <p className="text-xs font-medium text-foreground">
          {reminderDate ? `تذكير بتاريخ ${reminderDate}` : "تعيين تذكير دفع"}
        </p>
        <Input
          type="number"
          min={1}
          max={365}
          value={days}
          disabled={reminderLoading}
          onChange={(e) => setDays(e.target.value)}
          placeholder="عدد الأيام"
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
              إلغاء
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
            {reminderLoading ? <Loader2 className="size-3.5 animate-spin" /> : "حفظ"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SaleActionsBarProps {
  sale: Sale | null;
  onPrintThermal: () => void;
  onPrintA4: () => void;
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
}: SaleActionsBarProps) {
  if (!sale) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">إجراءات الفاتورة #{sale.id}</span>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={printingKind !== null}
        onClick={onPrintThermal}
        className="gap-1.5"
      >
        {printingKind === "thermal" ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
        طباعة حراري
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={printingKind !== null || !sale.client_id}
        onClick={onPrintA4}
        className="gap-1.5"
      >
        {printingKind === "a4" ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
        A4 PDF
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={whatsAppLoading || !sale.client_id}
        onClick={onSendWhatsApp}
        className="gap-1.5 text-green-700 dark:text-green-400"
      >
        {whatsAppLoading ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
        واتساب
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
        {sale.finance_exported_at ? "إعادة التصدير" : "تصدير لنظام الماليه"}
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
        {sale.is_quote ? "تحويل لفاتورة" : "تحويل لتسعيرة"}
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
          حذف الفاتورة
        </Button>
      )}
    </div>
  );
}
