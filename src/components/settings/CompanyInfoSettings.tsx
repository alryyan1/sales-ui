import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppSettings } from "@/services/settingService";

interface CompanyInfoSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const CompanyInfoSettings = ({ control }: CompanyInfoSettingsProps) => {
  const { t } = useTranslation(["settings"]);
  return (
    <Card className="mx-auto max-w-4xl border shadow-sm">
      <CardHeader>
        <CardTitle>{t("settings:companyInfoSectionTitle")}</CardTitle>
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
                  <Label htmlFor="company_name">{t("settings:companyName")}</Label>
                  <div dir="ltr" className="[&_input]:!text-left [&_input]:![direction:ltr]">
                    <Input
                      id="company_name"
                      {...field}
                      placeholder={t("settings:companyNamePlaceholder")}
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
                  <Label htmlFor="company_phone">{t("settings:companyPhone1Label")}</Label>
                  <div
                    dir="ltr"
                    className="[&_input]:!text-left [&_input]:![direction:ltr]"
                    style={{ direction: "ltr" }}
                  >
                    <Input
                      id="company_phone"
                      {...field}
                      placeholder={t("settings:companyPhone1Placeholder")}
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
                  <Label htmlFor="company_phone_2">{t("settings:companyPhone2Label")}</Label>
                  <div
                    dir="ltr"
                    className="[&_input]:!text-left [&_input]:![direction:ltr]"
                    style={{ direction: "ltr" }}
                  >
                    <Input
                      id="company_phone_2"
                      {...field}
                      value={field.value || ""}
                      placeholder={t("settings:companyPhone2Placeholder")}
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
                  <Label htmlFor="company_email">{t("settings:companyEmail")}</Label>
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
                  <Label htmlFor="tax_number">{t("settings:taxNumberLabel")}</Label>
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
                  <Label htmlFor="company_address">{t("settings:addressLabel")}</Label>
                  <div dir="ltr" className="[&_textarea]:!text-left [&_textarea]:![direction:ltr]">
                    <Textarea
                      id="company_address"
                      {...field}
                      rows={3}
                      placeholder={t("settings:addressPlaceholder")}
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
