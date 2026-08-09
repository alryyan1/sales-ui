import { Controller, Control } from "react-hook-form";
import { SettingsSection } from "./shared/SettingsSection";
import { SwitchField } from "./shared/SwitchField";
import { AppSettings } from "@/services/settingService";

interface BusinessRulesSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const BusinessRulesSettings = ({ control }: BusinessRulesSettingsProps) => {
  return (
    <SettingsSection
      title="الإعدادات المحلية وقواعد العمل"
      description="قواعد تحكم في سلوك جدول المنتجات ونموذج إضافته."
    >
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
