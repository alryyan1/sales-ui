// src/components/admin/WhatsAppConfig.tsx
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
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
  whatsapp_api_token: z.string().min(1, { message: "validation:required" }).optional(),
  whatsapp_instance_id: z.string().min(1, { message: "validation:required" }).optional(),
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
  const { t } = useTranslation(["settings", "common", "validation"]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
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
      toast.success(t("settings:whatsappSettingsUpdated"));
    } catch (error) {
      console.error("Failed to update WhatsApp settings:", error);
      toast.error(t("common:updateFailed"));
    }
  };

  const handleTestConnection = async () => {
    if (!testPhoneNumber) {
      toast.error(t("settings:pleaseEnterPhoneNumber"));
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await whatsappService.testConnection(testPhoneNumber);
      setTestResult({
        success: result.success,
        message: result.message,
      });
      
      if (result.success) {
        toast.success(t("settings:whatsappTestMessageSent"));
      } else {
        toast.error(result.error || t("settings:testFailed"));
      }
    } catch (error) {
      console.error("WhatsApp test error:", error);
      setTestResult({
        success: false,
        message: t("settings:failedToSendTestMessage"),
      });
      toast.error(t("settings:testFailedCheckConfig"));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <CardTitle>{t("settings:whatsappIntegration")}</CardTitle>
        </div>
        <CardDescription>
          {t("settings:whatsappIntegrationDesc")}
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
                    <FormLabel className="text-base">
                      {t("settings:enableWhatsApp")}
                    </FormLabel>
                    <FormDescription>
                      {t("settings:enableWhatsAppDesc")}
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
                    <FormLabel>{t("settings:whatsappApiUrl")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://waapi.app/api/v1" />
                    </FormControl>
                    <FormDescription>
                      {t("settings:whatsappApiUrlDesc")}
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
                    <FormLabel>{t("settings:whatsappApiToken")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        placeholder="Your WaAPI token"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("settings:whatsappApiTokenDesc")}
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
                    <FormLabel>{t("settings:whatsappInstanceId")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your instance ID" />
                    </FormControl>
                    <FormDescription>
                      {t("settings:whatsappInstanceIdDesc")}
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
                    <FormLabel>{t("settings:whatsappDefaultPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+1234567890"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("settings:whatsappDefaultPhoneDesc")}
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
                  {t("settings:testWhatsAppConnection")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("settings:testWhatsAppConnection")}</DialogTitle>
                  <DialogDescription>
                    {t("settings:testWhatsAppConnectionDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      {t("settings:phoneNumberToTest")}
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
                        {testResult.success ? t("settings:success") : t("settings:error")}
                      </AlertTitle>
                      <AlertDescription>{testResult.message}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsTestDialogOpen(false)}
                    >
                      {t("settings:cancel")}
                    </Button>
                    <Button
                      onClick={handleTestConnection}
                      disabled={isTesting || !testPhoneNumber}
                    >
                      {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isTesting ? t("settings:testing") : t("settings:sendTestMessage")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("common:saveChanges")}
              </Button>
            </div>
          </form>
        </Form>

        {/* Help Information */}
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("settings:setupInstructions")}</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>{t("settings:setupInstructionsStep1")} <a href="https://waapi.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">waapi.app</a></li>
              <li>{t("settings:setupInstructionsStep2")}</li>
              <li>{t("settings:setupInstructionsStep3")}</li>
              <li>{t("settings:setupInstructionsStep4")}</li>
              <li>{t("settings:setupInstructionsStep5")}</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WhatsAppConfig; 