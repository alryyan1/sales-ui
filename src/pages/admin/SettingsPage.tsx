// src/pages/admin/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
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
import {
  Loader2,
  Settings as SettingsIcon,
  AlertCircle,
  Save,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import WhatsAppSchedulerComponent from "@/components/admin/WhatsAppScheduler";

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
    .min(1, { message: "validation:required" })
    .max(5, { message: "validation:maxLengthShort" }), // Example: make currency symbol required
  date_format: z.string().optional(), // Could use z.enum if you have predefined formats
  global_low_stock_threshold: z.coerce.number().int().min(0).optional(),
  invoice_prefix: z.string().optional(),
  purchase_order_prefix: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

// --- Component ---
const SettingsPage: React.FC = () => {
  const { t } = useTranslation(["settings", "common", "validation"]);
  const { settings, isLoadingSettings, updateSettings, fetchSettings } =
    useSettings(); // Get from context

  const [serverError, setServerError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false); // If using a modal, else remove this

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
      global_low_stock_threshold: 10,
      invoice_prefix: "INV-",
      purchase_order_prefix: "PO-",
    },
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, errors },
    setError: setFormError,
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
        global_low_stock_threshold: settings.global_low_stock_threshold ?? 10,
        invoice_prefix: settings.invoice_prefix || "INV-",
        purchase_order_prefix: settings.purchase_order_prefix || "PO-",
      });
    }
  }, [settings, reset, isOpen]); // Depend on isOpen if this were a modal, or just settings

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
      setServerError('server error ');
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
          {t("settings:pageTitle")}
        </h1>
      </div>
<Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle>{t("settings:appSettingsTitle")}</CardTitle>
          <CardDescription>{t("settings:appSettingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("common:error")}</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>{t("settings:companyName")}</FormLabel>
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
                      
                      <FormLabel>{t("settings:companyEmail")}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ''} />
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
                      
                      <FormLabel>{t("settings:companyPhone")}</FormLabel>
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
                      
                      <FormLabel>{t("settings:companyAddress")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-[80px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="company_logo_url"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      
                      <FormLabel>{t("settings:companyLogoUrl")}</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          {...field}
                          value={field.value || ""}
                          placeholder="https://example.com/logo.png"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="currency_symbol"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>
                        {t("settings:currencySymbol")}
                        <span className="text-red-500">*</span>
                      </FormLabel>
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
                      
                      <FormLabel>{t("settings:dateFormat")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="YYYY-MM-DD" />
                      </FormControl>
                      <FormDescription>
                        {t("settings:dateFormatDesc")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="global_low_stock_threshold"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>
                        {t("settings:lowStockThreshold")}
                      </FormLabel>
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
                      
                      <FormLabel>{t("settings:invoicePrefix")}</FormLabel>
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
                      
                      <FormLabel>{t("settings:poPrefix")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                  {t("common:saveChanges")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* WhatsApp Scheduler Section */}
      <div className="mt-8">
        <WhatsAppSchedulerComponent />
      </div>
      
    </div>
  );
};

export default SettingsPage;
