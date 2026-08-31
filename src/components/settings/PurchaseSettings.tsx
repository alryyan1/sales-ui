import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection } from "./shared/SettingsSection";
import { SettingsGroup } from "./shared/SettingsGroup";
import { SwitchField } from "./shared/SwitchField";
import { AppSettings } from "@/services/settingService";

interface PurchaseSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const PurchaseSettings = ({ control }: PurchaseSettingsProps) => {
  const { t } = useTranslation("adminSettings");
  return (
    <SettingsSection
      title={t("purchases.title")}
      description={t("purchases.description")}
    >
      <SettingsGroup title={t("purchases.defaultCurrencyGroupTitle")}>
        <Controller
          name="default_purchase_currency"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="default_purchase_currency">{t("purchases.defaultCurrencyLabel")}</Label>
              <Select value={field.value ?? "SDG"} onValueChange={field.onChange}>
                <SelectTrigger id="default_purchase_currency" className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDG">{t("purchases.currencySdg")}</SelectItem>
                  <SelectItem value="USD">{t("purchases.currencyUsd")}</SelectItem>
                  <SelectItem value="OMR">{t("purchases.currencyOmr")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("purchases.defaultCurrencyHelp")}
              </p>
            </div>
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("purchases.itemFieldsGroupTitle")}>
        <Controller
          name="purchase_use_batch_number"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("purchases.useBatchNumberLabel")}
              description={t("purchases.useBatchNumberDescription")}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          name="purchase_use_expiry_date"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("purchases.useExpiryDateLabel")}
              description={t("purchases.useExpiryDateDescription")}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("purchases.pricingGroupTitle")}>
        <Controller
          name="purchase_sync_product_sale_price"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("purchases.syncProductSalePriceLabel")}
              description={t("purchases.syncProductSalePriceDescription")}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>
    </SettingsSection>
  );
};
