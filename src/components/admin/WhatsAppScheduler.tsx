// src/components/admin/WhatsAppScheduler.tsx
import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Smartphone,
  FileText,
  Play,
  Pause,
  TestTube,
  Loader2,
} from "lucide-react";

// Services
import whatsappService, {
  WhatsAppScheduler,
  WhatsAppSchedulerFormData,
  REPORT_TYPES,
  SCHEDULE_TYPES,
  DAYS_OF_WEEK,
} from "../../services/whatsappService";

// Form validation schema
const schedulerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  report_type: z.enum(["daily_sales", "inventory", "profit_loss", "monthly_revenue"]),
  phone_numbers: z.string().min(1, "Phone numbers are required"),
  schedule_type: z.enum(["daily", "weekly", "monthly", "custom"]),
  schedule_time: z.string().min(1, "Schedule time is required"),
  schedule_days: z.array(z.string()).optional(),
  is_active: z.boolean(),
});

type SchedulerFormValues = z.infer<typeof schedulerFormSchema>;

interface WhatsAppSchedulerProps {
  className?: string;
}

const WhatsAppSchedulerComponent: React.FC<WhatsAppSchedulerProps> = ({ className }) => {
  const { t } = useTranslation(["settings", "common"]);
  const [schedulers, setSchedulers] = useState<WhatsAppScheduler[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScheduler, setEditingScheduler] = useState<WhatsAppScheduler | null>(null);
  const [testingScheduler, setTestingScheduler] = useState<number | null>(null);

  const form = useForm<SchedulerFormValues>({
    resolver: zodResolver(schedulerFormSchema),
    defaultValues: {
      name: "",
      report_type: "daily_sales",
      phone_numbers: "",
      schedule_type: "daily",
      schedule_time: "09:00",
      schedule_days: [],
      is_active: true,
    },
  });

  // Load schedulers on component mount
  useEffect(() => {
    loadSchedulers();
  }, []);

  const loadSchedulers = async () => {
    setLoading(true);
    try {
      const data = await whatsappService.getSchedulers();
      setSchedulers(data);
    } catch (error) {
      toast.error("Failed to load schedulers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit: SubmitHandler<SchedulerFormValues> = async (data) => {
    try {
      const schedulerData: WhatsAppSchedulerFormData = {
        ...data,
        phone_numbers: data.phone_numbers.split(',').map(num => num.trim()),
        schedule_days: data.schedule_days || [],
      };

      if (editingScheduler) {
        await whatsappService.updateScheduler(editingScheduler.id!, schedulerData);
        toast.success("Scheduler updated successfully");
      } else {
        await whatsappService.createScheduler(schedulerData);
        toast.success("Scheduler created successfully");
      }

      setIsDialogOpen(false);
      setEditingScheduler(null);
      form.reset();
      loadSchedulers();
    } catch (error) {
      toast.error("Failed to save scheduler");
      console.error(error);
    }
  };

  const handleEdit = (scheduler: WhatsAppScheduler) => {
    setEditingScheduler(scheduler);
    form.reset({
      name: scheduler.name,
      report_type: scheduler.report_type,
      phone_numbers: scheduler.phone_numbers.join(', '),
      schedule_type: scheduler.schedule_type,
      schedule_time: scheduler.schedule_time,
      schedule_days: scheduler.schedule_days || [],
      is_active: scheduler.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this scheduler?")) {
      try {
        await whatsappService.deleteScheduler(id);
        toast.success("Scheduler deleted successfully");
        loadSchedulers();
      } catch (error) {
        toast.error("Failed to delete scheduler");
        console.error(error);
      }
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await whatsappService.toggleScheduler(id, !isActive);
      toast.success(`Scheduler ${!isActive ? 'activated' : 'deactivated'} successfully`);
      loadSchedulers();
    } catch (error) {
      toast.error("Failed to toggle scheduler");
      console.error(error);
    }
  };

  const handleTest = async (scheduler: WhatsAppScheduler) => {
    setTestingScheduler(scheduler.id!);
    try {
      await whatsappService.testSendReport(scheduler.phone_numbers[0], scheduler.report_type);
      toast.success("Test report sent successfully");
    } catch (error) {
      toast.error("Failed to send test report");
      console.error(error);
    } finally {
      setTestingScheduler(null);
    }
  };

  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find(rt => rt.value === type)?.label || type;
  };

  const getScheduleTypeLabel = (type: string) => {
    return SCHEDULE_TYPES.find(st => st.value === type)?.label || type;
  };

  const formatScheduleInfo = (scheduler: WhatsAppScheduler) => {
    const time = scheduler.schedule_time;
    const type = getScheduleTypeLabel(scheduler.schedule_type);
    
    if (scheduler.schedule_type === 'daily') {
      return `Daily at ${time}`;
    } else if (scheduler.schedule_type === 'weekly' && scheduler.schedule_days?.length) {
      const days = scheduler.schedule_days.map(day => 
        DAYS_OF_WEEK.find(d => d.value === day)?.label || day
      ).join(', ');
      return `Weekly on ${days} at ${time}`;
    } else if (scheduler.schedule_type === 'monthly') {
      return `Monthly at ${time}`;
    }
    
    return `${type} at ${time}`;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                             <CardTitle className="flex items-center gap-2">
                 <Smartphone className="h-5 w-5" />
                 {t('settings:whatsappScheduler')}
               </CardTitle>
               <CardDescription>
                 {t('settings:whatsappSchedulerDesc')}
               </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingScheduler(null);
                  form.reset();
                }}>
                                     <Plus className="h-4 w-4 mr-2" />
                   {t('settings:addScheduler')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                                   <DialogTitle>
                   {editingScheduler ? t('settings:editScheduler') : t('settings:addNewScheduler')}
                 </DialogTitle>
                 <DialogDescription>
                   {t('settings:configureAutomaticDelivery')}
                 </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                                                       <FormLabel>{t('settings:schedulerName')}</FormLabel>
                           <FormControl>
                             <Input placeholder={t('settings:dailySalesReport')} {...field} />
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
                            <FormLabel>{t('settings:reportType')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select report type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {REPORT_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone_numbers"
                      render={({ field }) => (
                        <FormItem>
                                                     <FormLabel>{t('settings:phoneNumbers')}</FormLabel>
                           <FormControl>
                             <Textarea
                               placeholder="+1234567890, +0987654321"
                               className="min-h-[80px]"
                               {...field}
                             />
                           </FormControl>
                           <FormDescription>
                             {t('settings:phoneNumbersDesc')}
                           </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="schedule_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schedule Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select schedule type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SCHEDULE_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="schedule_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schedule Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("schedule_type") === "weekly" && (
                      <FormField
                        control={form.control}
                        name="schedule_days"
                        render={() => (
                          <FormItem>
                            <FormLabel>Select Days</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <FormField
                                  key={day.value}
                                  control={form.control}
                                  name="schedule_days"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={day.value}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(day.value)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value || [], day.value])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== day.value
                                                    )
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {day.label}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>
                              Enable or disable this scheduler
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

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editingScheduler ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : schedulers.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No schedulers configured. Create your first scheduler to start sending automatic reports.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Phone Numbers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulers.map((scheduler) => (
                  <TableRow key={scheduler.id}>
                    <TableCell className="font-medium">{scheduler.name}</TableCell>
                    <TableCell>{getReportTypeLabel(scheduler.report_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{formatScheduleInfo(scheduler)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {scheduler.phone_numbers.length} number(s)
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={scheduler.is_active ? "default" : "secondary"}>
                        {scheduler.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggle(scheduler.id!, scheduler.is_active)}
                        >
                          {scheduler.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTest(scheduler)}
                          disabled={testingScheduler === scheduler.id}
                        >
                          {testingScheduler === scheduler.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(scheduler)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(scheduler.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSchedulerComponent; 