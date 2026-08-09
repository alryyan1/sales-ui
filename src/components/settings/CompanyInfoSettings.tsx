import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "./shared/SettingsSection";
import { AppSettings } from "@/services/settingService";

interface CompanyInfoSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const CompanyInfoSettings = ({ control }: CompanyInfoSettingsProps) => {
  return (
    <SettingsSection
      title="معلومات الشركة الأساسية"
      description="تظهر هذه البيانات في الفواتير والتقارير الرسمية."
    >
      <div className="flex flex-wrap gap-6">
        {/* Company Name */}
        <div className="w-full space-y-2 sm:w-[calc(50%-12px)]">
          <Controller
            name="company_name"
            control={control}
            render={({ field }) => (
              <>
                <Label htmlFor="company_name">اسم الشركة</Label>
                <Input
                  id="company_name"
                  {...field}
                  placeholder="أدخل اسم الشركة"
                  dir="ltr"
                  className="text-left"
                />
              </>
            )}
          />
        </div>

        {/* Phone 1 */}
        <div className="w-full space-y-2 sm:w-[calc(50%-12px)]">
          <Controller
            name="company_phone"
            control={control}
            render={({ field }) => (
              <>
                <Label htmlFor="company_phone">رقم الهاتف 1</Label>
                <Input
                  id="company_phone"
                  {...field}
                  placeholder="+249 1230 56130"
                  dir="ltr"
                  className="text-left"
                />
              </>
            )}
          />
        </div>

        {/* Phone 2 */}
        <div className="w-full space-y-2 sm:w-[calc(50%-12px)]">
          <Controller
            name="company_phone_2"
            control={control}
            render={({ field }) => (
              <>
                <Label htmlFor="company_phone_2">رقم الهاتف 2</Label>
                <Input
                  id="company_phone_2"
                  {...field}
                  value={field.value || ""}
                  placeholder="+249 1247 81028"
                  dir="ltr"
                  className="text-left"
                />
              </>
            )}
          />
        </div>

        {/* Email */}
        <div className="w-full space-y-2 sm:w-[calc(50%-12px)]">
          <Controller
            name="company_email"
            control={control}
            render={({ field }) => (
              <>
                <Label htmlFor="company_email">البريد الإلكتروني</Label>
                <Input
                  id="company_email"
                  {...field}
                  type="email"
                  value={field.value || ""}
                  dir="ltr"
                  className="text-left"
                />
              </>
            )}
          />
        </div>

        {/* Tax Number */}
        <div className="w-full space-y-2 sm:w-[calc(50%-12px)]">
          <Controller
            name="tax_number"
            control={control}
            render={({ field }) => (
              <>
                <Label htmlFor="tax_number">الرقم الضريبي</Label>
                <Input
                  id="tax_number"
                  {...field}
                  value={field.value || ""}
                  dir="ltr"
                  className="text-left"
                />
              </>
            )}
          />
        </div>

        {/* Address */}
        <div className="w-full space-y-2">
          <Controller
            name="company_address"
            control={control}
            render={({ field }) => (
              <>
                <Label htmlFor="company_address">العنوان</Label>
                <Textarea
                  id="company_address"
                  {...field}
                  rows={3}
                  placeholder="تفاصيل العنوان للظهور في الفواتير"
                  dir="ltr"
                  className="text-left"
                />
              </>
            )}
          />
        </div>
      </div>
    </SettingsSection>
  );
};
