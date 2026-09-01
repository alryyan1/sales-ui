import { useMemo, useState } from "react";
import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SettingsSection } from "./shared/SettingsSection";
import { SettingsGroup } from "./shared/SettingsGroup";
import { SwitchField } from "./shared/SwitchField";
import { AppSettings } from "@/services/settingService";
import { PAYMENT_METHODS, PaymentMethod, parseActivePaymentMethods } from "@/lib/paymentMethods";

const PAYMENT_METHOD_LABEL_KEYS: Record<PaymentMethod, string> = {
  cash: "methodCash",
  bankak: "methodBankak",
  fawry: "methodFawry",
  ocash: "methodOcash",
  bank_transfer: "methodBankTransfer",
  card: "methodCard",
};

interface PosSettingsProps {
  control: Control<Partial<AppSettings>>;
}

function parseNumbers(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

function WhatsappNumbersField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation("adminSettings");
  const numbers = useMemo(() => parseNumbers(value), [value]);
  const [draft, setDraft] = useState("");

  const addNumber = () => {
    const trimmed = draft.trim();
    if (!trimmed || numbers.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...numbers, trimmed].join(","));
    setDraft("");
  };

  const removeNumber = (number: string) => {
    onChange(numbers.filter((n) => n !== number).join(","));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="whatsapp_shift_closure_numbers">{t("pos.whatsappNumbersLabel")}</Label>

      {numbers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {numbers.map((number) => (
            <span
              key={number}
              dir="ltr"
              className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium"
            >
              {number}
              <button
                type="button"
                onClick={() => removeNumber(number)}
                className="text-muted-foreground transition-colors hover:text-destructive"
                aria-label={t("pos.whatsappNumberRemove", { number })}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          id="whatsapp_shift_closure_numbers"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addNumber();
            }
          }}
          placeholder={t("pos.whatsappNumberPlaceholder")}
          dir="ltr"
          className="text-left"
        />
        <Button type="button" variant="outline" onClick={addNumber} disabled={!draft.trim()} className="gap-1.5 shrink-0">
          <Plus className="size-4" />
          {t("pos.whatsappNumberAdd")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("pos.whatsappNumbersHelp")}
      </p>
    </div>
  );
}

function ActivePaymentMethodsField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation("adminSettings");
  const { t: tPayment } = useTranslation("paymentDialog");
  const activeMethods = parseActivePaymentMethods(value);

  const toggleMethod = (method: PaymentMethod, checked: boolean) => {
    const next = checked
      ? [...activeMethods, method]
      : activeMethods.filter((m) => m !== method);
    if (next.length === 0) return; // at least one method must stay active
    onChange(PAYMENT_METHODS.filter((m) => next.includes(m)).join(","));
  };

  return (
    <div className="space-y-1">
      {PAYMENT_METHODS.map((method) => (
        <SwitchField
          key={method}
          label={tPayment(PAYMENT_METHOD_LABEL_KEYS[method])}
          checked={activeMethods.includes(method)}
          onCheckedChange={(checked) => toggleMethod(method, checked)}
        />
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        {t("pos.paymentMethodsHelp")}
      </p>
    </div>
  );
}

export const PosSettings = ({ control }: PosSettingsProps) => {
  const { t } = useTranslation("adminSettings");
  return (
    <SettingsSection
      title={t("pos.title")}
      description={t("pos.description")}
    >
      <SettingsGroup title={t("pos.pageVisibilityGroupTitle")}>
        <Controller
          name="show_pos_page"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("pos.showPosPageLabel")}
              description={t("pos.showPosPageDescription")}
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("pos.visibilityGroupTitle")}>
        <Controller
          name="pos_show_expired_products"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("pos.showExpiredLabel")}
              description={t("pos.showExpiredDescription")}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          name="pos_show_out_of_stock_products"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("pos.showOutOfStockLabel")}
              description={t("pos.showOutOfStockDescription")}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          name="pos_show_expiry_date_column"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("pos.showExpiryDateColumnLabel")}
              description={t("pos.showExpiryDateColumnDescription")}
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("pos.paymentMethodsGroupTitle")}>
        <Controller
          name="pos_active_payment_methods"
          control={control}
          render={({ field }) => (
            <ActivePaymentMethodsField value={field.value} onChange={field.onChange} />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("pos.usdGroupTitle")}>
        <Controller
          name="usd_conversion_enabled"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("pos.usdEnabledLabel")}
              description={t("pos.usdEnabledDescription")}
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("pos.whatsappGroupTitle")}>
        <Controller
          name="whatsapp_shift_closure_numbers"
          control={control}
          render={({ field }) => (
            <WhatsappNumbersField value={field.value} onChange={field.onChange} />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("pos.firebaseGroupTitle")}>
        <Controller
          name="firebase_collection_name"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="firebase_collection_name">
                {t("pos.firebaseCollectionLabel")}
              </Label>
              <Input
                id="firebase_collection_name"
                {...field}
                value={field.value || "none"}
                placeholder={t("pos.firebaseCollectionPlaceholder")}
                dir="ltr"
                className="text-left"
              />
              <p className="text-xs text-muted-foreground">
                {t("pos.firebaseCollectionHelp")}
              </p>
            </div>
          )}
        />
      </SettingsGroup>
    </SettingsSection>
  );
};
