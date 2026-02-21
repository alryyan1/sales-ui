import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Purchase, PurchasePayment } from "@/services/purchaseService";
import purchaseService from "@/services/purchaseService";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/constants";
import { CalendarIcon, FileText, Loader2, Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PurchaseLedgerDialogProps {
  open: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  onUpdate: () => void; // Callback to refresh the parent list
}

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "يجب أن يكون المبلغ أكبر من 0"),
  method: z.string().min(1, "طريقة الدفع مطلوبة"),
  payment_date: z.date({
    required_error: "تاريخ الدفع مطلوب",
  }),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const PAYMENT_METHODS = [
  { id: "cash", name: "كاش" },
  { id: "bankak", name: "بنكك" },
  { id: "fawry", name: "فوري" },
  { id: "ocash", name: "أوكاش" },
  { id: "other", name: "أخرى" },
];

export function PurchaseLedgerDialog({
  open,
  onClose,
  purchase,
  onUpdate,
}: PurchaseLedgerDialogProps) {
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Use values provided by the resource if available, or calculate locally
  const totalAmount = parseFloat(purchase?.total_amount || "0");
  const fallbackTotalPaid = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0,
  );

  // Try to use the total_paid from resource but fall back to local calculation
  const totalPaid =
    purchase?.total_paid !== undefined
      ? parseFloat(purchase.total_paid.toString())
      : fallbackTotalPaid;

  const balance = totalAmount - totalPaid;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      method: "cash",
      payment_date: new Date(),
      reference_number: "",
      notes: "",
    },
  });

  const paymentDate = watch("payment_date");

  const fetchPayments = async (purchaseId: number) => {
    setIsLoading(true);
    try {
      const data = await purchaseService.getPayments(purchaseId);
      setPayments(data);
    } catch (error) {
      toast.error("فشل في جلب الدفعات السابقة");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && purchase) {
      fetchPayments(purchase.id);
      // Set default payment amount to the remaining balance
      setValue(
        "amount",
        totalAmount -
          (purchase.total_paid !== undefined
            ? parseFloat(purchase.total_paid.toString())
            : 0),
      );
    } else {
      setPayments([]);
      setShowAddForm(false);
      reset();
    }
  }, [open, purchase, totalAmount, setValue, reset]);

  const onSubmit = async (values: PaymentFormValues) => {
    if (!purchase) return;
    setIsSubmitting(true);
    try {
      await purchaseService.addPayment(purchase.id, {
        amount: values.amount,
        method: values.method,
        payment_date: format(values.payment_date, "yyyy-MM-dd"),
        reference_number: values.reference_number || null,
        notes: values.notes || null,
      });

      toast.success("تم إضافة الدفعة بنجاح");
      setShowAddForm(false);
      reset();
      fetchPayments(purchase.id); // Refresh local list
      onUpdate(); // Refresh parent list
    } catch (error: any) {
      toast.error(error.message || "فشل في إضافة الدفعة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const translateMethod = (method: string) => {
    const translation = PAYMENT_METHODS.find((m) => m.id === method)?.name;
    return translation || method;
  };

  if (!purchase) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl gap-2 text-primary">
            <Wallet className="w-5 h-5" />
            دفتر الأستاذ - فاتورة مشتريات #
            {purchase.reference_number || purchase.id}
          </DialogTitle>
          <DialogDescription>
            سجل المدفوعات والمتبقي للمورد:{" "}
            {purchase.supplier_name || "غير محدد"}
          </DialogDescription>
        </DialogHeader>

        {/* Ledger Summary */}
        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="bg-slate-50 p-4 rounded-xl border flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 mb-1">إجمالي الفاتورة</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border flex flex-col items-center justify-center">
            <p className="text-sm text-green-700 mb-1">المدفوع</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border flex flex-col items-center justify-center">
            <p className="text-sm text-red-700 mb-1">المتبقي (الرصيد)</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* Payments Table */}
        <div className="border rounded-md mt-4">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الطريقة</TableHead>
                <TableHead>رقم المرجع</TableHead>
                <TableHead>بواسطة</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">
                      جاري التحميل...
                    </p>
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    لا توجد مدفوعات مسجلة لهذه الفاتورة
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), "dd MMM yyyy", {
                        locale: ar,
                      })}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(parseFloat(payment.amount))}
                    </TableCell>
                    <TableCell>{translateMethod(payment.method)}</TableCell>
                    <TableCell>{payment.reference_number || "-"}</TableCell>
                    <TableCell>{payment.user?.name || "-"}</TableCell>
                    <TableCell
                      className="max-w-[200px] truncate"
                      title={payment.notes || ""}
                    >
                      {payment.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action / Add Payment Form */}
        <div className="mt-6 border-t pt-4">
          {!showAddForm ? (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                يمكنك إضافة مدفوعات جزئية أو كاملة للفاتورة.
              </p>
              <Button
                onClick={() => {
                  setValue("amount", balance > 0 ? balance : 0);
                  setShowAddForm(true);
                }}
                disabled={balance <= 0}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة دفعة جديدة
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 bg-slate-50 p-4 rounded-lg border"
            >
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                تفاصيل الدفعة الجديدة
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    المبلغ <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("amount")}
                    className={errors.amount ? "border-red-500" : ""}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    تاريخ الدفع <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !paymentDate && "text-muted-foreground",
                          errors.payment_date && "border-red-500",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 ml-2" />
                        {paymentDate ? (
                          format(paymentDate, "dd MMMM yyyy", { locale: ar })
                        ) : (
                          <span>اختر التاريخ</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={(date) =>
                          date && setValue("payment_date", date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.payment_date && (
                    <p className="text-sm text-red-500">
                      {errors.payment_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    طريقة الدفع <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={watch("method")}
                    onValueChange={(value) => setValue("method", value)}
                  >
                    <SelectTrigger
                      className={errors.method ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="اختر طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.method && (
                    <p className="text-sm text-red-500">
                      {errors.method.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>رقم المرجع (اختياري)</Label>
                  <Input
                    {...register("reference_number")}
                    placeholder="رقم الشيك أو الحوالة"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    {...register("notes")}
                    placeholder="أي ملاحظات إضافية بخصوص الدفعة..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    "حفظ الدفعة"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
