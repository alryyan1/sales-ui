import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import inventoryCountService, {
  InventoryCount,
  InventoryCountFormData,
} from "@/services/inventoryCountService";
import { warehouseService } from "@/services/warehouseService";

interface InventoryCountDialogProps {
  open: boolean;
  onClose: () => void;
  count: InventoryCount | null;
  onSuccess: () => void;
}

type FormValues = {
  warehouse_id: string;
  count_date: string;
  notes: string;
};

const getToday = () => new Date().toISOString().split("T")[0];

const InventoryCountDialog: React.FC<InventoryCountDialogProps> = ({
  open,
  onClose,
  count,
  onSuccess,
}) => {
  const isEdit = !!count;

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<FormValues>({
    defaultValues: { warehouse_id: "", count_date: getToday(), notes: "" },
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => warehouseService.getAll(),
  });

  const mutation = useMutation({
    mutationFn: (data: InventoryCountFormData) =>
      isEdit
        ? inventoryCountService.updateInventoryCount(count.id, data)
        : inventoryCountService.createInventoryCount(data),
    onSuccess: () => {
      toast.success(isEdit ? "تم تحديث الجرد بنجاح" : "تم إنشاء الجرد بنجاح");
      onSuccess();
    },
    onError: (error) => {
      toast.error("تعذر الحفظ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  useEffect(() => {
    if (!open) return;
    if (count) {
      reset({
        warehouse_id: String(count.warehouse_id),
        count_date: count.count_date,
        notes: count.notes || "",
      });
    } else {
      reset({ warehouse_id: "", count_date: getToday(), notes: "" });
    }
  }, [open, count, reset]);

  const onSubmit = (data: FormValues) => {
    mutation.mutate({
      warehouse_id: Number(data.warehouse_id),
      count_date: data.count_date,
      notes: data.notes || null,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !mutation.isPending) onClose();
      }}
    >
      <DialogContent dir="rtl" className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "تعديل الجرد" : "جرد جديد"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "حدّث تاريخ الجرد أو ملاحظاته. المستودع غير قابل للتغيير بعد الإنشاء."
                : "حدد المستودع وتاريخ بدء الجرد لإنشاء عملية جرد جديدة."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="count-warehouse">المستودع</Label>
              {isEdit ? (
                <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                  <Lock className="size-3.5 shrink-0" />
                  {count?.warehouse?.name ?? `مستودع #${count?.warehouse_id}`}
                </div>
              ) : (
                <Controller
                  control={control}
                  name="warehouse_id"
                  rules={{ required: "المستودع مطلوب" }}
                  render={({ field, fieldState }) => (
                    <>
                      <Select value={field.value} onValueChange={field.onChange} disabled={mutation.isPending}>
                        <SelectTrigger id="count-warehouse" className="w-full" aria-invalid={!!fieldState.error}>
                          <SelectValue placeholder="اختر المستودع..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(warehouses ?? []).map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p className="text-xs text-destructive">{fieldState.error.message}</p>
                      )}
                    </>
                  )}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="count-date">تاريخ الجرد</Label>
              <Controller
                control={control}
                name="count_date"
                rules={{ required: "التاريخ مطلوب" }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="count-date"
                      type="date"
                      aria-invalid={!!fieldState.error}
                      disabled={mutation.isPending}
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="count-notes">ملاحظات (اختياري)</Label>
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <Textarea
                    id="count-notes"
                    rows={3}
                    placeholder="أي تفاصيل إضافية حول هذا الجرد..."
                    disabled={mutation.isPending}
                    {...field}
                  />
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="min-w-24 gap-2">
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "حفظ التغييرات" : "إنشاء الجرد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryCountDialog;
