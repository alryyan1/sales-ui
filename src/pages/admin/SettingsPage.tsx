// src/pages/admin/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useSettings } from "@/context/SettingsContext"; // Import settings context
import { AppSettings } from "@/services/settingService"; // Import settings type
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // If you have multiline settings
import { Loader2, Settings as SettingsIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import WhatsAppConfig from "@/components/admin/WhatsAppConfig";
import settingService from "@/services/settingService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Zod Schema for Settings Form (Matches AppSettings keys) ---
// Make all fields optional for partial updates, but RHF will use defaultValues
// Backend validation will ensure required fields if any (e.g., currency_symbol)
const settingsFormSchema = z.object({
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z
    .string()
    .email({ message: "validation:email" })
    .or(z.literal(""))
    .nullable()
    .optional(),
  company_logo_url: z
    .string()
    .url({ message: "validation:url" })
    .or(z.literal(""))
    .nullable()
    .optional(),
  currency_symbol: z
    .string()
    .max(5, { message: "validation:maxLengthShort" })
    .optional(), // Make currency symbol optional
  date_format: z.string().optional(), // Could use z.enum if you have predefined formats
  timezone: z.string().optional(),
  global_low_stock_threshold: z.coerce.number().int().min(0).optional(),
  invoice_prefix: z.string().optional(),
  purchase_order_prefix: z.string().optional(),
  default_profit_rate: z.coerce.number().min(0).max(1000).optional(),

  // WhatsApp Settings
  whatsapp_enabled: z.boolean().optional(),
  whatsapp_api_url: z.string().url({ message: "validation:url" }).optional(),
  whatsapp_api_token: z.string().optional(),
  whatsapp_instance_id: z.string().optional(),
  whatsapp_default_phone: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

// --- Component ---
const SettingsPage: React.FC = () => {
  // Removed useTranslation
  const { settings, isLoadingSettings, updateSettings } = useSettings(); // Get from context

  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      // Initialize with empty or default that match Zod schema
      company_name: "",
      company_address: "",
      company_phone: "",
      company_email: "",
      company_logo_url: "",
      currency_symbol: "$",
      date_format: "YYYY-MM-DD",
      timezone: "Africa/Khartoum",
      global_low_stock_threshold: 10,
      invoice_prefix: "INV-",
      purchase_order_prefix: "PO-",
      default_profit_rate: 20.0,

      // WhatsApp defaults
      whatsapp_enabled: false,
      whatsapp_api_url: "https://waapi.app/api/v1",
      whatsapp_api_token: "",
      whatsapp_instance_id: "",
      whatsapp_default_phone: "",
    },
  });
  const {
    handleSubmit,
    control,
    reset,
    getValues,
    watch,
    formState: { isSubmitting },
  } = form;

  // --- Effect to Populate Form with Loaded Settings ---
  useEffect(() => {
    if (settings) {
      console.log("Populating settings form:", settings);
      reset({
        // Reset RHF form with values from context
        company_name: settings.company_name || "",
        company_address: settings.company_address || "",
        company_phone: settings.company_phone || "",
        company_email: settings.company_email || "",
        company_logo_url: settings.company_logo_url || "",
        currency_symbol: settings.currency_symbol || "$",
        date_format: settings.date_format || "YYYY-MM-DD",
        timezone: (settings as any).timezone || "Africa/Khartoum",
        global_low_stock_threshold: settings.global_low_stock_threshold ?? 10,
        invoice_prefix: settings.invoice_prefix || "INV-",
        purchase_order_prefix: settings.purchase_order_prefix || "PO-",
        default_profit_rate: settings.default_profit_rate ?? 20.0,

        // WhatsApp settings
        whatsapp_enabled: settings.whatsapp_enabled || false,
        whatsapp_api_url:
          settings.whatsapp_api_url || "https://waapi.app/api/v1",
        whatsapp_api_token: settings.whatsapp_api_token || "",
        whatsapp_instance_id: settings.whatsapp_instance_id || "",
        whatsapp_default_phone: settings.whatsapp_default_phone || "",
      });
    }
  }, [settings, reset]); // Depend on isOpen if this were a modal, or just settings

  // --- Form Submission ---
  const onSubmit: SubmitHandler<SettingsFormValues> = async (data) => {
    setServerError(null);
    console.log("Submitting settings:", data);

    // Prepare data (ensure numbers are numbers, nulls are null)
    const dataToSubmit: Partial<AppSettings> = {
      ...data,
      global_low_stock_threshold: Number(data.global_low_stock_threshold),
      company_email: data.company_email || undefined,
      company_logo_url: data.company_logo_url || null,
    };

    try {
      await updateSettings(dataToSubmit); // Call context update function
      // Success toast is handled by the context's updateSettings
    } catch (err) {
      console.error("Failed to update settings:", err);
      // Error toast is handled by context, but set local serverError for form display
      // const generalError = getErrorMessage(err); // Use generic getErrorMessage
      setServerError("server error ");
      // Optionally map specific API validation errors back to fields if backend provides them
      // const apiErrors = getValidationErrors(err);
      // if (apiErrors) { /* ... map with setFormError ... */ }
    }
  };

  // --- Render Logic ---
  if (isLoadingSettings && !settings) {
    // Show skeletons only on initial settings load

    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-semibold">
          <Skeleton className="h-8 w-48" />
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-1/3" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-2/3" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            <div className="flex justify-end">
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto dark:bg-gray-950 pb-10">
      <div className="flex items-center mb-6 gap-2">
        {/* <Button variant="outline" size="icon" onClick={() => navigate('/admin')}><ArrowLeft className="h-4 w-4" /></Button> */}
        <SettingsIcon className="h-7 w-7 text-primary me-2" />
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          الإعدادات العامة
        </h1>
      </div>

      {/* General Settings */}
      <Card className="dark:bg-gray-900 mb-8">
        <CardHeader>
          <CardTitle>إعدادات التطبيق</CardTitle>
          <CardDescription>تكوين الإعدادات العامة للتطبيق</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>خطأ</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الشركة</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="company_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني للشركة</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="company_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هاتف الشركة</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="company_address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>عنوان الشركة</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-[80px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <FormLabel>شعار الشركة</FormLabel>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const updated = await settingService.uploadLogo(file);
                          reset({
                            ...getValues(),
                            company_logo_url: updated.company_logo_url || "",
                          });
                          toast.success("تم بنجاح", {
                            description: "تم تحديث الشعار بنجاح",
                          });
                        } catch (err) {
                          toast.error("حدث خطأ");
                        }
                      }}
                    />
                    {(watch("company_logo_url") ||
                      settings?.company_logo_url) && (
                      <img
                        src={
                          watch("company_logo_url") ||
                          settings?.company_logo_url ||
                          ""
                        }
                        alt="Logo"
                        className="h-20 w-auto rounded border"
                      />
                    )}
                  </div>
                </div>

                <FormField
                  control={control}
                  name="currency_symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رمز العملة</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="date_format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>صيغة التاريخ</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="YYYY-MM-DD" />
                      </FormControl>
                      <FormDescription>
                        استخدم YYYY للسنة، MM للشهر، DD لليوم
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المنطقة الزمنية</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="اختر المنطقة الزمنية" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Africa/Khartoum">
                              Africa/Khartoum
                            </SelectItem>
                            <SelectItem value="Asia/Muscat">
                              Asia/Muscat
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="global_low_stock_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>حد تنبيه انخفاض المخزون</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="invoice_prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>بادئة الفاتورة</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="purchase_order_prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>بادئة طلب الشراء</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="default_profit_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هامش الربح الافتراضي (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          step="0.1"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        النسبة المئوية الافتراضية للربح عند إضافة منتجات جديدة
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoadingSettings}
                >
                  {isSubmitting && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  حفظ التغييرات
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration */}
      {settings && (
        <div className="mb-8">
          <WhatsAppConfig
            settings={settings}
            onSettingsUpdate={async (data) => {
              await updateSettings(data);
            }}
          />
        </div>
      )}

      {/* WhatsApp Scheduler Section removed as requested */}
    </div>
  );
};

export default SettingsPage;
