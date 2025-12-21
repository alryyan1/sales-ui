import React, { useState, useEffect } from "react";

import { toast } from "sonner";

// shadcn/ui Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Components
import WhatsAppSchedulerFormModal from "@/components/admin/WhatsAppSchedulerFormModal";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";

// Services
import whatsappSchedulerService, {
  WhatsAppScheduler,
} from "@/services/whatsappSchedulerService";

// Icons
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageCircle,
  Clock,
  Phone,
  FileText,
  Calendar,
  AlertCircle,
} from "lucide-react";

const WhatsAppSchedulersPage: React.FC = () => {
  // Removed useTranslation
  const [schedulers, setSchedulers] = useState<WhatsAppScheduler[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedScheduler, setSelectedScheduler] =
    useState<WhatsAppScheduler | null>(null);
  const [isToggling, setIsToggling] = useState<number | null>(null);

  useEffect(() => {
    loadSchedulers();
  }, []);

  const loadSchedulers = async () => {
    setIsLoading(true);
    try {
      const data = await whatsappSchedulerService.getSchedulers();
      setSchedulers(data);
    } catch (error) {
      console.error("Error loading schedulers:", error);
      toast.error("خطأ في تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateScheduler = () => {
    setSelectedScheduler(null);
    setIsFormModalOpen(true);
  };

  const handleEditScheduler = (scheduler: WhatsAppScheduler) => {
    setSelectedScheduler(scheduler);
    setIsFormModalOpen(true);
  };

  const handleDeleteScheduler = (scheduler: WhatsAppScheduler) => {
    setSelectedScheduler(scheduler);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedScheduler) return;

    try {
      await whatsappSchedulerService.deleteScheduler(selectedScheduler.id);
      toast.success("تم حذف المجدول");
      loadSchedulers();
    } catch (error: any) {
      console.error("Error deleting scheduler:", error);
      toast.error(error.response?.data?.message || "خطأ في حذف البيانات");
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedScheduler(null);
    }
  };

  const handleToggleScheduler = async (scheduler: WhatsAppScheduler) => {
    setIsToggling(scheduler.id);
    try {
      await whatsappSchedulerService.toggleScheduler(scheduler.id);
      toast.success("تم تحديث حالة المجدول");
      loadSchedulers();
    } catch (error: any) {
      console.error("Error toggling scheduler:", error);
      toast.error(error.response?.data?.message || "خطأ في تحديث البيانات");
    } finally {
      setIsToggling(null);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily_sales: "تقرير المبيعات اليومي",
      inventory: "تقرير المخزون",
      profit_loss: "تقرير الأرباح والخسائر",
    };
    return labels[type] || type;
  };

  const getDaysOfWeekLabel = (days: number[]) => {
    if (!days || days.length === 0) return "لم يتم تعيينه";

    const dayLabels: Record<number, string> = {
      0: "الأحد",
      1: "الاثنين",
      2: "الثلاثاء",
      3: "الأربعاء",
      4: "الخميس",
      5: "الجمعة",
      6: "السبت",
    };

    return days.map((day) => dayLabels[day]).join(", ");
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return time;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-blue-600" />
            مجدول التقارير (WhatsApp)
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة جدولة التقارير التلقائية عبر واتساب
          </p>
        </div>
        <Button
          onClick={handleCreateScheduler}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          إنشاء مجدول
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            التقارير المجدولة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedulers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>لم يتم العثور على مجدولات</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>نوع التقرير</TableHead>
                  <TableHead>وقت الإرسال</TableHead>
                  <TableHead>أيام الأسبوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>آخر إرسال</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulers.map((scheduler) => (
                  <TableRow key={scheduler.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        {scheduler.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        {scheduler.phone_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getReportTypeLabel(scheduler.report_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        {formatTime(scheduler.schedule_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {getDaysOfWeekLabel(scheduler.days_of_week)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={scheduler.is_active}
                          onCheckedChange={() =>
                            handleToggleScheduler(scheduler)
                          }
                          disabled={isToggling === scheduler.id}
                        />
                        <Badge
                          variant={
                            scheduler.is_active ? "default" : "secondary"
                          }
                        >
                          {scheduler.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {scheduler.last_sent_at
                        ? formatDate(scheduler.last_sent_at)
                        : "لم يتم الإرسال بعد"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditScheduler(scheduler)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteScheduler(scheduler)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <WhatsAppSchedulerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        scheduler={selectedScheduler}
        onSuccess={loadSchedulers}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="حذف المجدول"
        message={`هل أنت متأكد من حذف هذا المجدول: ${selectedScheduler?.name}؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        variant="destructive"
      />
    </div>
  );
};

export default WhatsAppSchedulersPage;
