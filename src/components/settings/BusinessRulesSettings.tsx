import { Controller, Control } from "react-hook-form";
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
  return (
    <SettingsSection
      title="الإعدادات المحلية وقواعد العمل"
      description="قواعد تحكم في سلوك جدول المنتجات ونموذج إضافته."
    >
      <SettingsGroup title="العملة">
        <Controller
          name="currency_code"
          control={control}
          render={({ field }) => {
            const decimals = CURRENCY_DECIMALS[field.value ?? "SDG"] ?? 0;
            return (
              <div className="space-y-2">
                <Label htmlFor="currency_code">عملة النظام</Label>
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
                  تحدد هذه العملة عدد الخانات العشرية المعروضة لكل المبالغ المالية في النظام —{" "}
                  {decimals === 0 ? "بدون خانات عشرية" : `${decimals} خانة عشرية`}.
                </p>
              </div>
            );
          }}
        />
      </SettingsGroup>

      <Separator />

      <div>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          عرض جدول المنتجات
        </h3>
        <div className="mt-3 space-y-1">
          <Controller
            name="product_row_color_highlight"
            control={control}
            render={({ field }) => (
              <SwitchField
                label="تلوين صفوف المنتجات المنتهية أو الناقصة"
                description="عند التفعيل، تُلوَّن صفوف المنتجات المنتهية الصلاحية (أحمر) والنافدة من المخزون (برتقالي)"
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
                label='إظهار حقل الاسم العلمي في نموذج المنتج'
                description='عند التعطيل، يُخفى حقل "الاسم العلمي" كلياً من نموذج الإضافة والتعديل'
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
                label="جعل الاسم العلمي إلزامياً"
                description="عند التفعيل، لا يمكن حفظ المنتج بدون إدخال الاسم العلمي"
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
