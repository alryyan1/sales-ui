// src/pages/admin/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/context/SettingsContext";
import { useLanguage } from "@/context/LanguageContext";
import { AppSettings } from "@/services/settingService";
import { toast } from "sonner";

// Settings Subcomponents
import { CompanyInfoSettings } from "@/components/settings/CompanyInfoSettings";
import { BusinessRulesSettings } from "@/components/settings/BusinessRulesSettings";
import { PosSettings } from "@/components/settings/PosSettings";
import { PurchaseSettings } from "@/components/settings/PurchaseSettings";
import { PdfReportBrandingSettings } from "@/components/settings/PdfReportBrandingSettings";
import { SalesBehaviorSettings } from "@/components/settings/SalesBehaviorSettings";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  FileImage,
  Loader2,
  Receipt,
  Save,
  ShieldCheck,
  ShoppingCart,
  Tag,
} from "lucide-react";

// Form values type
type SettingsFormValues = Partial<AppSettings>;

const TABS = [
  { value: "company", labelKey: "tabs.company", icon: Building2 },
  { value: "business", labelKey: "tabs.business", icon: ShieldCheck },
  { value: "sales", labelKey: "tabs.sales", icon: Tag },
  { value: "pos", labelKey: "tabs.pos", icon: ShoppingCart },
  { value: "purchases", labelKey: "tabs.purchases", icon: Receipt },
  { value: "pdf", labelKey: "tabs.pdf", icon: FileImage },
] as const;

// --- Component ---
const SettingsPage: React.FC = () => {
  const { settings, isLoadingSettings, updateSettings, fetchSettings } =
    useSettings();
  const { direction } = useLanguage();
  const { t } = useTranslation("adminSettings");
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    defaultValues: {
      company_name: "",
      company_address: "",
      company_phone: "",
      company_email: "",
      currency_symbol: "$",
      currency_code: "SDG",
      timezone: "Africa/Khartoum",
      global_low_stock_threshold: 10,
      default_profit_rate: 20.0,
      tax_number: "",
      products_nav_label: "",
      hide_expiry_date: false,
      pos_mode: "shift",
      pos_filter_sales_by_user: false,
      pos_active_payment_methods: "cash,bankak,fawry,ocash,bank_transfer,card",
      whatsapp_shift_closure_numbers: "",
      firebase_collection_name: "none",
      purchase_use_batch_number: true,
      purchase_use_expiry_date: true,
      usd_conversion_enabled: true,
      sales_allow_zero_stock: true,
      sales_allow_negative_stock: false,
      sales_require_customer: false,
      sales_default_customer_id: null,
      sales_allow_price_edit: true,
      sales_allow_invoice_date_edit: true,
    },
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, isDirty },
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
        products_nav_label: settings.products_nav_label || "",
        hide_expiry_date: settings.hide_expiry_date ?? false,
        pos_mode: settings.pos_mode || "shift",
        pos_filter_sales_by_user: settings.pos_filter_sales_by_user || false,
        pos_active_payment_methods:
          settings.pos_active_payment_methods || "cash,bankak,fawry,ocash,bank_transfer,card",
        whatsapp_shift_closure_numbers:
          settings.whatsapp_shift_closure_numbers || "",
        firebase_collection_name:
          settings.firebase_collection_name || "none",
        product_row_color_highlight:
          settings.product_row_color_highlight ?? false,
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
        currency_code: settings.currency_code || "SDG",
        usd_conversion_enabled: settings.usd_conversion_enabled ?? true,
        sales_allow_zero_stock: settings.sales_allow_zero_stock ?? true,
        sales_allow_negative_stock:
          settings.sales_allow_negative_stock ?? false,
        sales_require_customer: settings.sales_require_customer ?? false,
        sales_default_customer_id: settings.sales_default_customer_id ?? null,
        sales_allow_price_edit: settings.sales_allow_price_edit ?? true,
        sales_allow_invoice_date_edit:
          settings.sales_allow_invoice_date_edit ?? true,
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
      usd_conversion_enabled: Boolean(data.usd_conversion_enabled),
      sales_allow_zero_stock: Boolean(data.sales_allow_zero_stock),
      sales_allow_negative_stock: Boolean(data.sales_allow_negative_stock),
      sales_require_customer: Boolean(data.sales_require_customer),
      sales_default_customer_id: data.sales_default_customer_id || null,
      sales_allow_price_edit: Boolean(data.sales_allow_price_edit),
      sales_allow_invoice_date_edit: Boolean(data.sales_allow_invoice_date_edit),
      hide_expiry_date: Boolean(data.hide_expiry_date),
    };

    try {
      await updateSettings(dataToSubmit);
      toast.success(t("saveSuccess"));
    } catch (err) {
      console.error("Failed to update settings:", err);
      setServerError(t("saveError"));
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
    <div className="min-h-screen bg-background" dir={direction}>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Page Header */}
        <div className="mb-8 border-b pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t("pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>

        {serverError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs
            defaultValue="company"
            orientation="vertical"
            className="flex-col gap-8 lg:flex-row lg:items-start"
          >
            {/* Vertical section nav */}
            <TabsList className="h-auto w-full flex-none flex-row flex-wrap justify-start gap-1 bg-transparent p-0 lg:w-56 lg:flex-col lg:items-stretch lg:border-e lg:pe-6">
              {TABS.map(({ value, labelKey, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="w-full flex-none justify-start gap-2.5 rounded-lg border-none px-3 py-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-accent dark:data-[state=active]:border-none"
                >
                  <Icon className="size-4" />
                  {t(labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-6">
              <TabsContent value="company" className="mt-0">
                <CompanyInfoSettings control={control} />
              </TabsContent>
              <TabsContent value="business" className="mt-0">
                <BusinessRulesSettings control={control} />
              </TabsContent>
              <TabsContent value="sales" className="mt-0">
                <SalesBehaviorSettings control={control} />
              </TabsContent>
              <TabsContent value="pos" className="mt-0">
                <PosSettings control={control} />
              </TabsContent>
              <TabsContent value="purchases" className="mt-0">
                <PurchaseSettings control={control} />
              </TabsContent>
              <TabsContent value="pdf" className="mt-0">
                <PdfReportBrandingSettings />
              </TabsContent>

              {/* Persistent save bar — applies to all form tabs except PDF branding,
                  which saves itself independently. */}
              <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
                {isDirty && (
                  <span className="text-xs text-muted-foreground">
                    {t("unsavedChanges")}
                  </span>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || isLoadingSettings}
                  className="min-w-[160px] font-semibold"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {t("saveChanges")}
                </Button>
              </div>
            </div>
          </Tabs>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
