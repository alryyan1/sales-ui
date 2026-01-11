// src/pages/admin/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useSettings } from "@/context/SettingsContext";
import { AppSettings } from "@/services/settingService";
import { toast } from "sonner";
import settingService from "@/services/settingService";
import { PDF_FONTS } from "@/utils/pdfFontRegistry";

// Settings Subcomponents
import { CompanyInfoSettings } from "@/components/settings/CompanyInfoSettings";
import { BusinessRulesSettings } from "@/components/settings/BusinessRulesSettings";
import { PosSettings } from "@/components/settings/PosSettings";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, Settings, Building2, Package, Store, Image, FileText, Upload, Save } from "lucide-react";
import { cn } from "@/lib/utils";

// Form values type
type SettingsFormValues = Partial<AppSettings>;

// --- Component ---
const SettingsPage: React.FC = () => {
  const { settings, isLoadingSettings, updateSettings, fetchSettings } = useSettings();
  const [serverError, setServerError] = useState<string | null>(null);

  // Tab/Section State
  const [activeSection, setActiveSection] = useState("0");

  // Previews
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    defaultValues: {
      company_name: "",
      company_address: "",
      company_phone: "",
      company_email: "",
      company_logo_url: "",
      company_header_url: "",
      currency_symbol: "$",
      date_format: "YYYY-MM-DD",
      timezone: "Africa/Khartoum",
      global_low_stock_threshold: 10,
      invoice_prefix: "INV-",
      purchase_order_prefix: "PO-",
      default_profit_rate: 20.0,
      invoice_branding_type: "logo",
      logo_position: "right",
      logo_height: 60,
      logo_width: 60,
      tax_number: "",
      pdf_font: "Amiri",
      pos_mode: "shift",
      pos_filter_sales_by_user: false,
    },
  });

  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = form;

  const watchedLogoUrl = watch("company_logo_url");
  const watchedHeaderUrl = watch("company_header_url");
  const watchedBrandingType = watch("invoice_branding_type");

  // --- Effects ---
  // Fetch settings when component mounts to ensure fresh data
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      reset({
        ...settings,
        global_low_stock_threshold: settings.global_low_stock_threshold ?? 10,
        default_profit_rate: settings.default_profit_rate ?? 20.0,
        invoice_branding_type: settings.invoice_branding_type || "logo",
        logo_position: settings.logo_position || "right",
        logo_height: settings.logo_height || 60,
        logo_width: settings.logo_width || 60,
        tax_number: settings.tax_number || "",
        pdf_font: settings.pdf_font || "Amiri",
        pos_mode: settings.pos_mode || "shift",
        pos_filter_sales_by_user: settings.pos_filter_sales_by_user || false,
      });

      if (settings.company_logo_url) setLogoPreview(settings.company_logo_url);
      if (settings.company_header_url)
        setHeaderPreview(settings.company_header_url);
    }
  }, [settings, reset]);

  useEffect(() => {
    if (watchedLogoUrl) setLogoPreview(watchedLogoUrl);
  }, [watchedLogoUrl]);

  useEffect(() => {
    if (watchedHeaderUrl) setHeaderPreview(watchedHeaderUrl);
  }, [watchedHeaderUrl]);

  // --- Handlers ---
  const onSubmit = async (data: SettingsFormValues) => {
    setServerError(null);
    const dataToSubmit: Partial<AppSettings> = {
      ...data,
      global_low_stock_threshold: data.global_low_stock_threshold
        ? Number(data.global_low_stock_threshold)
        : undefined,
      company_email: data.company_email || undefined,
      company_logo_url: data.company_logo_url || null,
      company_header_url: data.company_header_url || null,
      logo_height: data.logo_height ? Number(data.logo_height) : 60,
      logo_width: data.logo_width ? Number(data.logo_width) : 60,
      tax_number: data.tax_number || undefined,
      pdf_font: data.pdf_font || "Amiri",
      pos_mode: data.pos_mode || "shift",
      pos_filter_sales_by_user: Boolean(data.pos_filter_sales_by_user),
    };

    try {
      await updateSettings(dataToSubmit);
      toast.success("تم تحديث الإعدادات بنجاح");
    } catch (err) {
      console.error("Failed to update settings:", err);
      setServerError("حدث خطأ أثناء تحديث الإعدادات");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await settingService.uploadLogo(file);
      setValue("company_logo_url", updated.company_logo_url || "");
      toast.success("تم رفع الشعار بنجاح");
    } catch (err) {
      toast.error("فشل رفع الشعار");
    }
  };

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await settingService.uploadHeader(file);
      setValue("company_header_url", updated.company_header_url || "");
      toast.success("تم رفع الهيدر بنجاح");
    } catch (err) {
      toast.error("فشل رفع الهيدر");
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

          {/* Tabs Navigation */}
          <Tabs
            value={activeSection}
            onValueChange={setActiveSection}
            className="mb-6"
          >
            <TabsList className="h-auto w-full justify-start border-b bg-transparent p-0">
              <TabsTrigger
                value="0"
                className="h-18 rounded-none border-b-2 border-transparent px-4 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
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
              <TabsTrigger
                value="1"
                className="h-18 rounded-none border-b-2 border-transparent px-4 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
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
              <TabsTrigger
                value="2"
                className="h-18 rounded-none border-b-2 border-transparent px-4 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
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
              <TabsTrigger
                value="3"
                className="h-18 rounded-none border-b-2 border-transparent px-4 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2 text-right">
                  <Image className="h-5 w-5" />
                  <div>
                    <div className="font-medium">تخصيص الفواتير</div>
                    <div className="text-xs text-muted-foreground">
                      الشعار، الهيدر، والمظهر
                    </div>
                  </div>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="4"
                className="h-18 rounded-none border-b-2 border-transparent px-4 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <div className="flex items-center gap-2 text-right">
                  <FileText className="h-5 w-5" />
                  <div>
                    <div className="font-medium">إعدادات PDF</div>
                    <div className="text-xs text-muted-foreground">
                      الخطوط وتنسيق الطباعة
                    </div>
                  </div>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Content Area */}
            <div className="space-y-6 pb-24">
              {/* SECTION 0: Company Info */}
              <TabsContent value="0">
                <CompanyInfoSettings control={control} />
              </TabsContent>

              {/* SECTION 1: Business Rules */}
              <TabsContent value="1">
                <BusinessRulesSettings control={control} />
              </TabsContent>

              {/* SECTION 2: POS Settings */}
              <TabsContent value="2">
                <PosSettings control={control} />
              </TabsContent>

              {/* SECTION 3: Branding */}
              <TabsContent value="3">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle>هوية الفواتير (Branding)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-muted-foreground">
                        نمط الترويسة
                      </Label>
                      <Controller
                        name="invoice_branding_type"
                        control={control}
                        render={({ field }) => (
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-8"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="logo" id="logo" />
                              <Label htmlFor="logo" className="cursor-pointer">
                                شعار و نص (Logo & Text)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <RadioGroupItem value="header" id="header" />
                              <Label htmlFor="header" className="cursor-pointer">
                                صورة هيدر كاملة (Full Header Image)
                              </Label>
                            </div>
                          </RadioGroup>
                        )}
                      />
                    </div>

                    <Separator />

                    {watchedBrandingType === "logo" && (
                      <div className="space-y-4">
                        <div>
                          <Label className="mb-2 block text-sm font-medium">
                            رفع الشعار
                          </Label>
                          <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 text-center transition-colors hover:border-primary hover:bg-muted">
                            {logoPreview ? (
                              <div className="mb-4 flex h-24 items-center justify-center">
                                <img
                                  src={logoPreview}
                                  alt="Logo"
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <Image className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              asChild
                              className="mt-2"
                            >
                              <label className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                رفع ملف جديد
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleLogoUpload}
                                />
                              </label>
                            </Button>
                          </div>
                        </div>

                        <Controller
                          name="logo_position"
                          control={control}
                          render={({ field }) => (
                            <div className="space-y-2">
                              <Label>محاذاة الشعار</Label>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-full" dir="ltr">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="right">يمين (Right)</SelectItem>
                                  <SelectItem value="left">يسار (Left)</SelectItem>
                                  <SelectItem value="center">وسط (Center)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <Controller
                            name="logo_width"
                            control={control}
                            render={({ field }) => (
                              <div className="space-y-2">
                                <Label>العرض (px)</Label>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  className="text-left"
                                  dir="ltr"
                                />
                              </div>
                            )}
                          />
                          <Controller
                            name="logo_height"
                            control={control}
                            render={({ field }) => (
                              <div className="space-y-2">
                                <Label>الارتفاع (px)</Label>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  className="text-left"
                                  dir="ltr"
                                />
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {watchedBrandingType === "header" && (
                      <div>
                        <Label className="mb-1 block text-sm font-medium">
                          صورة الهيدر الكاملة
                        </Label>
                        <p className="mb-4 text-sm text-muted-foreground">
                          ستظهر هذه الصورة بعرض الصفحة الكامل في أعلى الفاتورة.
                          سيتم إخفاء بيانات الشركة النصية.
                        </p>
                        <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 text-center transition-colors hover:border-primary hover:bg-muted">
                          {headerPreview ? (
                            <div className="mb-4 h-32 overflow-hidden rounded">
                              <img
                                src={headerPreview}
                                alt="Header"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="mb-4 h-20 rounded bg-muted" />
                          )}
                          <Button type="button" variant="default" asChild>
                            <label className="cursor-pointer">
                              <Upload className="mr-2 h-4 w-4" />
                              رفع صورة الهيدر
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleHeaderUpload}
                              />
                            </label>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SECTION 4: PDF & Printing */}
              <TabsContent value="4">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle>إعدادات الطباعة و PDF</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Controller
                      name="pdf_font"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>نوع الخط العربي (Arabic Font)</Label>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full" dir="ltr">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={PDF_FONTS.AMIRI}>
                                Amiri (خط نسخ كلاسيكي - Serif)
                              </SelectItem>
                              <SelectItem value={PDF_FONTS.TAJAWAL}>
                                Tajawal (خط حديث - Sans Serif)
                              </SelectItem>
                              <SelectItem value={PDF_FONTS.IBM_PLEX}>
                                IBM Plex Sans Arabic (خط عصري - Modern)
                              </SelectItem>
                              <SelectItem value={PDF_FONTS.ARIAL}>
                                Arial (قياسي - Standard)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground">
                            يؤثر على طريقة ظهور النصوص العربية في الفواتير المصدرة PDF
                          </p>
                        </div>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* Floating Save Bar */}
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
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
