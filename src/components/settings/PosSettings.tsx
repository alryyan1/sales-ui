import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SettingsSection } from "./shared/SettingsSection";
import { SettingsGroup } from "./shared/SettingsGroup";
import { SwitchField } from "./shared/SwitchField";
import { AppSettings } from "@/services/settingService";

interface PosSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const PosSettings = ({ control }: PosSettingsProps) => {
  return (
    <SettingsSection
      title="إعدادات نقاط البيع (POS)"
      description="تحكم في سلوك شاشة نقطة البيع وإشعاراتها."
    >
      <SettingsGroup title="ظهور المنتجات (Product Visibility)">
        <Controller
          name="pos_show_expired_products"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="عرض المنتجات المنتهية الصلاحية"
              description="عند التفعيل، ستظهر المنتجات منتهية الصلاحية في نتائج بحث نقطة البيع."
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
              label="عرض المنتجات التي نفد مخزونها"
              description="عند التفعيل، ستظهر المنتجات التي رصيدها صفراً أو أقل في نتائج بحث نقطة البيع."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="إشعارات الواتساب (WhatsApp Notifications)">
        <Controller
          name="whatsapp_shift_closure_numbers"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="whatsapp_shift_closure_numbers">
                أرقام استلام تقرير إغلاق الوردية
              </Label>
              <Input
                id="whatsapp_shift_closure_numbers"
                {...field}
                value={field.value || ""}
                placeholder="مثال: 249991961111,249123456789"
                dir="ltr"
                className="text-left"
              />
              <p className="text-xs text-muted-foreground">
                أدخل أرقام الهواتف (مفصولة بفاصلة) التي يجب أن تتلقى رسالة الواتساب عند
                إغلاق أي وردية. يجب أن تتضمن الرمز الدولي بدون +
              </p>
            </div>
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="إعدادات Firebase (Firebase Settings)">
        <Controller
          name="firebase_collection_name"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="firebase_collection_name">
                اسم مجموعة Firebase (Collection Name)
              </Label>
              <Input
                id="firebase_collection_name"
                {...field}
                value={field.value || "none"}
                placeholder="مثال: none"
                dir="ltr"
                className="text-left"
              />
              <p className="text-xs text-muted-foreground">
                اسم المجموعة (Collection) في Firestore حيث يتم تخزين المنتجات والورديات.
              </p>
            </div>
          )}
        />
      </SettingsGroup>
    </SettingsSection>
  );
};
