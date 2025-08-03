import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// shadcn/ui Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Services
import whatsappSchedulerService, {
  WhatsAppScheduler,
  WhatsAppSchedulerFormData,
  SchedulerOptions,
} from "@/services/whatsappSchedulerService";

// Icons
import { Clock, MessageCircle, Phone, FileText, Calendar } from "lucide-react";

interface WhatsAppSchedulerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduler?: WhatsAppScheduler | null;
  onSuccess: () => void;
}

const schedulerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  report_type: z.enum(["daily_sales", "inventory", "profit_loss"]),
  schedule_time: z.string().min(1, "Schedule time is required"),
  is_active: z.boolean(),
  days_of_week: z.array(z.number()).min(1, "At least one day must be selected"),
  notes: z.string().optional(),
});

type SchedulerFormData = z.infer<typeof schedulerSchema>;

const WhatsAppSchedulerFormModal: React.FC<WhatsAppSchedulerFormModalProps> = ({
  isOpen,
  onClose,
  scheduler,
  onSuccess,
}) => {
  const { t } = useTranslation(["settings", "common"]);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<SchedulerOptions | null>(null);

  const form = useForm<SchedulerFormData>({
    resolver: zodResolver(schedulerSchema),
    defaultValues: {
      name: "",
      phone_number: "",
      report_type: "daily_sales",
      schedule_time: "09:00",
      is_active: true,
      days_of_week: [],
      notes: "",
    },
  });

  // Load options on component mount
  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  // Load scheduler data when editing
  useEffect(() => {
    if (scheduler && isOpen) {
      form.reset({
        name: scheduler.name,
        phone_number: scheduler.phone_number,
        report_type: scheduler.report_type,
        schedule_time: scheduler.schedule_time,
        is_active: scheduler.is_active,
        days_of_week: scheduler.days_of_week,
        notes: scheduler.notes || "",
      });
    } else if (!scheduler && isOpen) {
      form.reset({
        name: "",
        phone_number: "",
        report_type: "daily_sales",
        schedule_time: "09:00",
        is_active: true,
        days_of_week: [],
        notes: "",
      });
    }
  }, [scheduler, isOpen, form]);

  const loadOptions = async () => {
    try {
      const schedulerOptions = await whatsappSchedulerService.getOptions();
      setOptions(schedulerOptions);
    } catch (error) {
      console.error("Error loading scheduler options:", error);
      toast.error(t("common:errorLoadingData"));
    }
  };

  const onSubmit = async (data: SchedulerFormData) => {
    setIsLoading(true);
    try {
      if (scheduler) {
        await whatsappSchedulerService.updateScheduler(scheduler.id, data);
        toast.success(t("settings:whatsappSchedulerUpdated"));
      } else {
        await whatsappSchedulerService.createScheduler(data);
        toast.success(t("settings:whatsappSchedulerCreated"));
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving scheduler:", error);
      toast.error(
        error.response?.data?.message || t("common:errorSavingData")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const daysOfWeek = [
    { value: 0, label: t("common:sunday") },
    { value: 1, label: t("common:monday") },
    { value: 2, label: t("common:tuesday") },
    { value: 3, label: t("common:wednesday") },
    { value: 4, label: t("common:thursday") },
    { value: 5, label: t("common:friday") },
    { value: 6, label: t("common:saturday") },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            {scheduler
              ? t("settings:editWhatsAppScheduler")
              : t("settings:createWhatsAppScheduler")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("settings:basicInformation")}
              </h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:schedulerName")} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("settings:enterSchedulerName")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:phoneNumber")} *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="249991961111"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="report_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:reportType")} *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("settings:selectReportType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options?.report_types &&
                          Object.entries(options.report_types).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Schedule Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("settings:scheduleSettings")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="schedule_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("settings:scheduleTime")} *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t("settings:activeStatus")}
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {t("settings:activeStatusDescription")}
                        </div>
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
              </div>

              <FormField
                control={form.control}
                name="days_of_week"
                render={() => (
                  <FormItem>
                    <FormLabel>{t("settings:daysOfWeek")} *</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {daysOfWeek.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Controller
                            name="days_of_week"
                            control={form.control}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value?.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  const currentDays = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentDays, day.value]);
                                  } else {
                                    field.onChange(
                                      currentDays.filter((d) => d !== day.value)
                                    );
                                  }
                                }}
                              />
                            )}
                          />
                          <Label className="text-sm">{day.label}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t("settings:additionalNotes")}
              </h3>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:notes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("settings:enterNotes")}
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t("common:saving")
                  : scheduler
                  ? t("common:update")
                  : t("common:create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppSchedulerFormModal; 