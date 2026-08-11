import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "./shared/SettingsSection";
import { AppSettings } from "@/services/settingService";

interface CompanyInfoSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const CompanyInfoSettings = ({ control }: CompanyInfoSettingsProps) => {
  const { t } = useTranslation("adminSettings");
  return (
    <SettingsSection
      title={t("companyInfo.title")}
      description={t("companyInfo.description")}
    >
      <div className="flex flex-wrap gap-6">
        {/* Company Name */}
        <div className="w-full space-y-2 sm:w-[calc(50%-12px)]">
          <Controller
            name="company_name"
            control={control}
            render={({ field }) => (
              <>
                <Label htmlFor="company_name">{t("companyInfo.companyName")}</Label>
                <Input
                  id="company_name"
                  {...field}
                  placeholder={t("companyInfo.companyNamePlaceholder")}
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
                <Label htmlFor="company_phone">{t("companyInfo.phone1")}</Label>
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
                <Label htmlFor="company_phone_2">{t("companyInfo.phone2")}</Label>
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
                <Label htmlFor="company_email">{t("companyInfo.email")}</Label>
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
                <Label htmlFor="tax_number">{t("companyInfo.taxNumber")}</Label>
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
                <Label htmlFor="company_address">{t("companyInfo.address")}</Label>
                <Textarea
                  id="company_address"
                  {...field}
                  rows={3}
                  placeholder={t("companyInfo.addressPlaceholder")}
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
