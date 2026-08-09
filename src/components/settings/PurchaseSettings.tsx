import { Controller, Control } from "react-hook-form";
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
  return (
    <SettingsSection
      title="إعدادات المشتريات"
      description="تحكم في العملة الافتراضية وحقول أصناف فواتير الشراء."
    >
      <SettingsGroup title="العملة الافتراضية للمشتريات">
        <Controller
          name="default_purchase_currency"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="default_purchase_currency">العملة الافتراضية</Label>
              <Select value={field.value ?? "SDG"} onValueChange={field.onChange}>
                <SelectTrigger id="default_purchase_currency" className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDG">SDG — جنيه سوداني</SelectItem>
                  <SelectItem value="USD">USD — دولار أمريكي</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                سيتم استخدام هذه العملة كقيمة افتراضية عند إنشاء فاتورة شراء جديدة.
              </p>
            </div>
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="حقول أصناف المشتريات">
        <Controller
          name="purchase_use_batch_number"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="استخدام رقم الباتش (Batch Number)"
              description="عند التفعيل، يظهر عمود رقم الباتش في جدول أصناف المشتريات ويمكن إدخاله لكل صنف."
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
              label="استخدام تاريخ الانتهاء (Expiry Date)"
              description="عند التفعيل، يظهر عمود تاريخ الانتهاء في جدول أصناف المشتريات ويمكن تحديده لكل صنف."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>
    </SettingsSection>
  );
};
