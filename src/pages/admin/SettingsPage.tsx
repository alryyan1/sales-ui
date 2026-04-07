// src/pages/admin/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSettings } from "@/context/SettingsContext";
import { AppSettings } from "@/services/settingService";
import { toast } from "sonner";

// Settings Subcomponents
import { CompanyInfoSettings } from "@/components/settings/CompanyInfoSettings";
import { BusinessRulesSettings } from "@/components/settings/BusinessRulesSettings";
import { PosSettings } from "@/components/settings/PosSettings";
import { PurchaseSettings } from "@/components/settings/PurchaseSettings";
import { PdfReportBrandingSettings } from "@/components/settings/PdfReportBrandingSettings";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Settings, Save } from "lucide-react";

// Form values type
type SettingsFormValues = Partial<AppSettings>;

// --- Component ---
const SettingsPage: React.FC = () => {
  const { settings, isLoadingSettings, updateSettings, fetchSettings } =
    useSettings();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    defaultValues: {
      company_name: "",
      company_address: "",
      company_phone: "",
      company_email: "",
      currency_symbol: "$",
      date_format: "YYYY-MM-DD",
      timezone: "Africa/Khartoum",
      global_low_stock_threshold: 10,
      invoice_prefix: "INV-",
      purchase_order_prefix: "PO-",
      default_profit_rate: 20.0,
      tax_number: "",
      pos_mode: "shift",
      pos_filter_sales_by_user: false,
      whatsapp_shift_closure_numbers: "",
      firebase_collection_name: "none",
      purchase_use_batch_number: true,
      purchase_use_expiry_date: true,
    },
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = form;

  // Fetch on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync form from settings
  useEffect(() => {
    if (settings) {
      reset({
        ...settings,
        global_low_stock_threshold: settings.global_low_stock_threshold ?? 10,
        default_profit_rate: settings.default_profit_rate ?? 20.0,
        tax_number: settings.tax_number || "",
        pos_mode: settings.pos_mode || "shift",
        pos_filter_sales_by_user: settings.pos_filter_sales_by_user || false,
        whatsapp_shift_closure_numbers:
          settings.whatsapp_shift_closure_numbers || "",
        firebase_collection_name:
          settings.firebase_collection_name || "none",
        product_row_color_highlight:
          settings.product_row_color_highlight ?? true,
        product_scientific_name_visible:
          settings.product_scientific_name_visible ?? true,
        product_scientific_name_required:
          settings.product_scientific_name_required ?? false,
        pos_show_expired_products:
          settings.pos_show_expired_products ?? false,
        pos_show_out_of_stock_products:
          settings.pos_show_out_of_stock_products ?? false,
        purchase_use_batch_number:
          settings.purchase_use_batch_number ?? true,
        purchase_use_expiry_date:
          settings.purchase_use_expiry_date ?? true,
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: SettingsFormValues) => {
    setServerError(null);
    const dataToSubmit: Partial<AppSettings> = {
      ...data,
      global_low_stock_threshold: data.global_low_stock_threshold
        ? Number(data.global_low_stock_threshold)
        : undefined,
      company_email: data.company_email || undefined,
      tax_number: data.tax_number || undefined,
      pos_mode: data.pos_mode || "shift",
      pos_filter_sales_by_user: Boolean(data.pos_filter_sales_by_user),
      pos_show_expired_products: Boolean(data.pos_show_expired_products),
      pos_show_out_of_stock_products: Boolean(data.pos_show_out_of_stock_products),
      purchase_use_batch_number: Boolean(data.purchase_use_batch_number),
      purchase_use_expiry_date: Boolean(data.purchase_use_expiry_date),
    };

    try {
      await updateSettings(dataToSubmit);
      toast.success("تم تحديث الإعدادات بنجاح");
    } catch (err) {
      console.error("Failed to update settings:", err);
      setServerError("حدث خطأ أثناء تحديث الإعدادات");
    }
  };

  if (isLoadingSettings && !settings) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
              <Settings className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                إعدادات النظام
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                تحكم في جميع خصائص وإعدادات التطبيق من مكان واحد
              </p>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6 pb-10">
            <CompanyInfoSettings control={control} />
            <BusinessRulesSettings control={control} />
            <PosSettings control={control} />
            <PurchaseSettings control={control} />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || isLoadingSettings}
              className="font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              حفظ التغييرات
            </Button>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-muted/20 bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">إعدادات تقارير PDF والهيدر</p>
                <p className="text-sm text-muted-foreground">
                  التحكم بالشعار وهيدر التقارير من خلال هذا القسم.
                </p>
              </div>
            </div>
          </div>
          <PdfReportBrandingSettings />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
