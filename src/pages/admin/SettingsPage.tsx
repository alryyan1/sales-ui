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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  Settings,
  Building2,
  Package,
  Store,
  FileText,
  Save,
  ShoppingCart,
} from "lucide-react";

// Form values type
type SettingsFormValues = Partial<AppSettings>;

// --- Component ---
const SettingsPage: React.FC = () => {
  const { settings, isLoadingSettings, updateSettings, fetchSettings } =
    useSettings();
  const [serverError, setServerError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("0");

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
      price_priority_source: "product",
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
        price_priority_source: settings.price_priority_source || "product",
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
      price_priority_source: data.price_priority_source || "product",
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

  const tabTriggerCls =
    "h-18 rounded-none border-b-2 border-transparent px-4 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 border-b pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 bg-primary shadow-md">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Settings className="h-7 w-7" />
              </AvatarFallback>
            </Avatar>
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

          <Tabs
            value={activeSection}
            onValueChange={setActiveSection}
            className="mb-6"
          >
            <TabsList className="h-auto w-full justify-start border-b bg-transparent p-0">
              <TabsTrigger value="0" className={tabTriggerCls}>
                <div className="flex items-center gap-2 text-right">
                  <Building2 className="h-5 w-5" />
                  <div>
                    <div className="font-medium">بيانات الشركة</div>
                    <div className="text-xs text-muted-foreground">
                      الاسم، العنوان، وأرقام التواصل
                    </div>
                  </div>
                </div>
              </TabsTrigger>

              <TabsTrigger value="1" className={tabTriggerCls}>
                <div className="flex items-center gap-2 text-right">
                  <Package className="h-5 w-5" />
                  <div>
                    <div className="font-medium">قواعد العمل والمخزون</div>
                    <div className="text-xs text-muted-foreground">
                      العملة، التنبيهات، والضرائب
                    </div>
                  </div>
                </div>
              </TabsTrigger>

              <TabsTrigger value="2" className={tabTriggerCls}>
                <div className="flex items-center gap-2 text-right">
                  <Store className="h-5 w-5" />
                  <div>
                    <div className="font-medium">نقاط البيع (POS)</div>
                    <div className="text-xs text-muted-foreground">
                      إعدادات الورديات وطرق البيع
                    </div>
                  </div>
                </div>
              </TabsTrigger>

              <TabsTrigger value="5" className={tabTriggerCls}>
                <div className="flex items-center gap-2 text-right">
                  <ShoppingCart className="h-5 w-5" />
                  <div>
                    <div className="font-medium">المشتريات</div>
                    <div className="text-xs text-muted-foreground">
                      الباتش وتاريخ الانتهاء
                    </div>
                  </div>
                </div>
              </TabsTrigger>

              <TabsTrigger value="6" className={tabTriggerCls}>
                <div className="flex items-center gap-2 text-right">
                  <FileText className="h-5 w-5" />
                  <div>
                    <div className="font-medium">تقارير PDF والهيدر</div>
                    <div className="text-xs text-muted-foreground">
                      الشعار، الهيدر، وتخصيص كل تقرير
                    </div>
                  </div>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Content Area */}
            <div className="space-y-6 pb-24">
              <TabsContent value="0">
                <CompanyInfoSettings control={control} />
              </TabsContent>

              <TabsContent value="1">
                <BusinessRulesSettings control={control} />
              </TabsContent>

              <TabsContent value="2">
                <PosSettings control={control} />
              </TabsContent>

              <TabsContent value="5">
                <PurchaseSettings control={control} />
              </TabsContent>

              {/* PDF & Branding tab — self-contained MUI component */}
              <TabsContent value="6">
                <PdfReportBrandingSettings />
              </TabsContent>
            </div>
          </Tabs>

          {/* Floating Save Bar (only for tabs 0-2, 5) */}
          {activeSection !== "6" && (
            <div className="fixed bottom-6 left-1/2 z-50 flex min-w-[400px] max-w-[90%] -translate-x-1/2 items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-lg">
              <p className="hidden text-sm font-medium text-muted-foreground sm:block">
                هل قمت بإجراء تعديلات؟
              </p>
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
          )}
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
