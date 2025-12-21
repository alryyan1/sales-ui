// src/components/admin/WhatsAppConfig.tsx
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { toast } from "sonner";

// shadcn/ui Components
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Icons
import {
  MessageCircle,
  Settings,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Services
import whatsappService from "@/services/whatsappService";
import { AppSettings } from "@/services/settingService";

// Zod Schema for WhatsApp Settings
const whatsappSettingsSchema = z.object({
  whatsapp_enabled: z.boolean(),
  whatsapp_api_url: z.string().url({ message: "validation:url" }).optional(),
  whatsapp_api_token: z
    .string()
    .min(1, { message: "validation:required" })
    .optional(),
  whatsapp_instance_id: z
    .string()
    .min(1, { message: "validation:required" })
    .optional(),
  whatsapp_default_phone: z.string().optional(),
});

type WhatsAppSettingsFormValues = z.infer<typeof whatsappSettingsSchema>;

interface WhatsAppConfigProps {
  settings: AppSettings;
  onSettingsUpdate: (data: Partial<AppSettings>) => Promise<void>;
}

const WhatsAppConfig: React.FC<WhatsAppConfigProps> = ({
  settings,
  onSettingsUpdate,
}) => {
  // Removed useTranslation
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  const form = useForm<WhatsAppSettingsFormValues>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues: {
      whatsapp_enabled: settings.whatsapp_enabled || false,
      whatsapp_api_url: settings.whatsapp_api_url || "https://waapi.app/api/v1",
      whatsapp_api_token: settings.whatsapp_api_token || "",
      whatsapp_instance_id: settings.whatsapp_instance_id || "",
      whatsapp_default_phone: settings.whatsapp_default_phone || "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, errors },
  } = form;

  const onSubmit = async (data: WhatsAppSettingsFormValues) => {
    try {
      await onSettingsUpdate(data);
      toast.success("تم تحديث إعدادات واتساب");
    } catch (error) {
      console.error("Failed to update WhatsApp settings:", error);
      toast.error("فشل التحديث");
    }
  };

  const handleTestConnection = async () => {
    if (!testPhoneNumber) {
      toast.error("يرجى إدخال رقم هاتف");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await whatsappService.testConnection(testPhoneNumber);
      setTestResult({
        success: result.success,
        message: result.message,
        details: result.details,
      });

      if (result.success) {
        toast.success("تم إرسال رسالة الاختبار");
      } else {
        // Display detailed error information in toast
        let errorMessage = result.error || result.message;

        // If there are additional details, include them in the toast
        if (result.details) {
          if (result.details.explanation) {
            errorMessage = `${result.message}: ${result.details.explanation}`;
          }
          if (result.details.chatId) {
            errorMessage += ` (ChatId: ${result.details.chatId})`;
          }
        }

        toast.error(errorMessage, {
          description: result.details?.explanation || result.error,
          duration: 6000, // Show for 6 seconds to allow reading longer error messages
        });
      }
    } catch (error) {
      console.error("WhatsApp test error:", error);
      setTestResult({
        success: false,
        message: "فشل إرسال رسالة الاختبار",
      });
      toast.error("فشل اختبار واتساب - تحقق من الإعدادات", {
        description: "يرجى التحقق من مفتاح API ومعرف المثيل ورقم الهاتف.",
        duration: 5000,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <CardTitle>إعدادات واتساب</CardTitle>
        </div>
        <CardDescription>
          تكوين الربط مع خدمة واتساب لإرسال التقارير والإشعارات
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Enable/Disable WhatsApp */}
            <FormField
              control={control}
              name="whatsapp_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">تفعيل واتساب</FormLabel>
                    <FormDescription>
                      تفعيل إرسال التقارير التلقائية عبر واتساب
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* WhatsApp Configuration Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="whatsapp_api_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط API</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://waapi.app/api/v1"
                      />
                    </FormControl>
                    <FormDescription>
                      رابط خدمة WaAPI (اتركه افتراضيًا إذا لم تكن متأكدًا)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="whatsapp_api_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مفتاح API Token</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        placeholder="مفتاح WaAPI الخاص بك"
                      />
                    </FormControl>
                    <FormDescription>
                      مفتاح المصادقة الخاص بحسابك
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="whatsapp_instance_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>معرف المثيل (Instance ID)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="معرف المثيل الخاص بك" />
                    </FormControl>
                    <FormDescription>
                      المعرف الخاص بمثيل واتساب في الخدمة
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="whatsapp_default_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف الافتراضي</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1234567890" />
                    </FormControl>
                    <FormDescription>
                      رقم الهاتف الذي ستصل الرسائل منه (اختياري)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Test Connection Dialog */}
            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!form.watch("whatsapp_enabled")}
                  className="w-full md:w-auto"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  اختبار الاتصال
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>اختبار اتصال واتساب</DialogTitle>
                  <DialogDescription>
                    أدخل رقم هاتف لاختبار إعدادات الاتصال. سيتم إرسال رسالة
                    تجريبية.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      رقم هاتف للاختبار
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1234567890"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {testResult && (
                    <Alert
                      variant={testResult.success ? "default" : "destructive"}
                    >
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {testResult.success ? "نجاح" : "خطأ"}
                      </AlertTitle>
                      <AlertDescription>
                        <div className="space-y-1">
                          <p>{testResult.message}</p>
                          {testResult.details && !testResult.success && (
                            <div className="text-sm space-y-1">
                              {testResult.details.explanation && (
                                <p className="font-medium">
                                  Explanation: {testResult.details.explanation}
                                </p>
                              )}
                              {testResult.details.chatId && (
                                <p className="text-xs opacity-75">
                                  ChatId: {testResult.details.chatId}
                                </p>
                              )}
                              {testResult.details.instanceId && (
                                <p className="text-xs opacity-75">
                                  InstanceId: {testResult.details.instanceId}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsTestDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      onClick={handleTestConnection}
                      disabled={isTesting || !testPhoneNumber}
                    >
                      {isTesting && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {isTesting ? "جاري الاختبار..." : "إرسال رسالة اختبار"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </Form>

        {/* Help Information */}
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>إرشادات الإعداد</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>
                أنشئ حسابًا في{" "}
                <a
                  href="https://waapi.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  waapi.app
                </a>
              </li>
              <li>قم بربط جهاز واتساب الخاص بك من خلال لوحة التحكم</li>
              <li>انسخ مفتاح API ومعرف المثيل من لوحة تحكم WaAPI</li>
              <li>ألصق البيانات في الحقول أعلاه</li>
              <li>اضغط على حفظ، ثم جرب إرسال رسالة اختبار</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WhatsAppConfig;
