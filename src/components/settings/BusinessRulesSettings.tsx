import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SettingsSection } from "./shared/SettingsSection";
import { SettingsGroup } from "./shared/SettingsGroup";
import { SwitchField } from "./shared/SwitchField";
import { AppSettings } from "@/services/settingService";
import { CURRENCY_DECIMALS, CURRENCY_LABELS } from "@/constants";

interface BusinessRulesSettingsProps {
  control: Control<Partial<AppSettings>>;
}

const CURRENCY_OPTIONS = (Object.keys(CURRENCY_LABELS) as Array<keyof typeof CURRENCY_LABELS>).map(
  (value) => ({ value, label: CURRENCY_LABELS[value] })
);

export const BusinessRulesSettings = ({ control }: BusinessRulesSettingsProps) => {
  const { t } = useTranslation("adminSettings");
  return (
    <SettingsSection
      title={t("businessRules.title")}
      description={t("businessRules.description")}
    >
      <SettingsGroup title={t("businessRules.currencyGroupTitle")}>
        <Controller
          name="currency_code"
          control={control}
          render={({ field }) => {
            const decimals = CURRENCY_DECIMALS[field.value ?? "SDG"] ?? 0;
            return (
              <div className="space-y-2">
                <Label htmlFor="currency_code">{t("businessRules.currencyLabel")}</Label>
                <Select value={field.value ?? "SDG"} onValueChange={field.onChange}>
                  <SelectTrigger id="currency_code" className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {decimals === 0
                    ? t("businessRules.currencyHelpNoDecimals")
                    : t("businessRules.currencyHelpWithDecimals", { count: decimals })}
                </p>
              </div>
            );
          }}
        />
      </SettingsGroup>

      <Separator />

      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("businessRules.productDisplayGroupTitle")}
        </h3>
        <div className="mt-3 space-y-4">
          <Controller
            name="business_type"
            control={control}
            render={({ field }) => (
              <div className="max-w-sm space-y-2">
                <Label htmlFor="business_type">{t("businessRules.businessTypeLabel")}</Label>
                <Select value={field.value ?? "equipment"} onValueChange={field.onChange}>
                  <SelectTrigger id="business_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">{t("businessRules.businessTypeEquipment")}</SelectItem>
                    <SelectItem value="pharmacy">{t("businessRules.businessTypePharmacy")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("businessRules.businessTypeDescription")}
                </p>
              </div>
            )}
          />

          <Controller
            name="product_row_color_highlight"
            control={control}
            render={({ field }) => (
              <SwitchField
                label={t("businessRules.rowColorHighlightLabel")}
                description={t("businessRules.rowColorHighlightDescription")}
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />

          <Controller
            name="product_scientific_name_visible"
            control={control}
            render={({ field }) => (
              <SwitchField
                label={t("businessRules.scientificNameVisibleLabel")}
                description={t("businessRules.scientificNameVisibleDescription")}
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />

          <Controller
            name="product_scientific_name_required"
            control={control}
            render={({ field }) => (
              <SwitchField
                label={t("businessRules.scientificNameRequiredLabel")}
                description={t("businessRules.scientificNameRequiredDescription")}
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />

          <Controller
            name="hide_expiry_date"
            control={control}
            render={({ field }) => (
              <SwitchField
                label={t("businessRules.hideExpiryDateLabel")}
                description={t("businessRules.hideExpiryDateDescription")}
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      </div>
    </SettingsSection>
  );
};
