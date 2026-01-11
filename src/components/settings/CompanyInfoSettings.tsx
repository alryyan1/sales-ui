import { Controller, Control } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppSettings } from "@/services/settingService";

interface CompanyInfoSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const CompanyInfoSettings = ({ control }: CompanyInfoSettingsProps) => {
  return (
    <Card className="mx-auto max-w-4xl border shadow-sm">
      <CardHeader>
        <CardTitle>معلومات الشركة الأساسية</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-6">
          {/* Company Name */}
          <div className="w-full space-y-2 sm:w-[calc(50%-12px)]">
            <Controller
              name="company_name"
              control={control}
              render={({ field }) => (
                <>
                  <Label htmlFor="company_name">اسم الشركة</Label>
                  <div dir="ltr" className="[&_input]:!text-left [&_input]:![direction:ltr]">
                    <Input
                      id="company_name"
                      {...field}
                      placeholder="أدخل اسم الشركة"
                      className="!text-left ![direction:ltr]"
                      dir="ltr"
                      style={{ direction: "ltr", textAlign: "left" }}
                    />
                  </div>
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
                  <div
                    dir="ltr"
                    className="[&_input]:!text-left [&_input]:![direction:ltr]"
                    style={{ direction: "ltr" }}
                  >
                    <Input
                      id="company_phone"
                      {...field}
                      placeholder="+249 1230 56130"
                      className="!text-left ![direction:ltr]"
                      dir="ltr"
                      style={{ direction: "ltr", textAlign: "left" }}
                    />
                  </div>
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
                  <div
                    dir="ltr"
                    className="[&_input]:!text-left [&_input]:![direction:ltr]"
                    style={{ direction: "ltr" }}
                  >
                    <Input
                      id="company_phone_2"
                      {...field}
                      value={field.value || ""}
                      placeholder="+249 1247 81028"
                      className="!text-left ![direction:ltr]"
                      dir="ltr"
                      style={{ direction: "ltr", textAlign: "left" }}
                    />
                  </div>
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
                  <div dir="ltr" className="[&_input]:!text-left [&_input]:![direction:ltr]">
                    <Input
                      id="company_email"
                      {...field}
                      type="email"
                      value={field.value || ""}
                      className="!text-left ![direction:ltr]"
                      dir="ltr"
                      style={{ direction: "ltr", textAlign: "left" }}
                    />
                  </div>
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
                  <div dir="ltr" className="[&_input]:!text-left [&_input]:![direction:ltr]">
                    <Input
                      id="tax_number"
                      {...field}
                      value={field.value || ""}
                      className="!text-left ![direction:ltr]"
                      dir="ltr"
                      style={{ direction: "ltr", textAlign: "left" }}
                    />
                  </div>
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
                  <div dir="ltr" className="[&_textarea]:!text-left [&_textarea]:![direction:ltr]">
                    <Textarea
                      id="company_address"
                      {...field}
                      rows={3}
                      placeholder="تفاصيل العنوان للظهور في الفواتير"
                      className="!text-left ![direction:ltr]"
                      dir="ltr"
                      style={{ direction: "ltr", textAlign: "left" }}
                    />
                  </div>
                </>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
