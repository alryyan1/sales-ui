import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from "@mui/material";
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
    formState: { errors },
  } = useForm<InventoryCountFormData>({
    defaultValues: {
      warehouse_id: 1,
      count_date: new Date().toISOString().split("T")[0],
      notes: "",
    },
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
      reset();
    },
    onError: (error) => {
      toast.error("خطأ", {
        description: inventoryCountService.getErrorMessage(error),
      });
    },
  });

  useEffect(() => {
    if (count) {
      reset({
        warehouse_id: count.warehouse_id,
        count_date: count.count_date,
        notes: count.notes || "",
      });
    } else {
      reset({
        warehouse_id: 1,
        count_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [count, reset]);

  const onSubmit = (data: InventoryCountFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>{isEdit ? "تعديل الجرد" : "جرد جديد"}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Controller
            name="warehouse_id"
            control={control}
            rules={{ required: "المستودع مطلوب" }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="المستودع"
                fullWidth
                margin="normal"
                error={!!errors.warehouse_id}
                helperText={errors.warehouse_id?.message}
                disabled={isEdit}
              >
                {warehouses?.map((w: any) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="count_date"
            control={control}
            rules={{ required: "التاريخ مطلوب" }}
            render={({ field }) => (
              <TextField
                {...field}
                type="date"
                label="تاريخ الجرد"
                fullWidth
                margin="normal"
                error={!!errors.count_date}
                helperText={errors.count_date?.message}
                InputLabelProps={{ shrink: true }}
              />
            )}
          />

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="ملاحظات"
                fullWidth
                margin="normal"
                multiline
                rows={3}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "جاري الحفظ..." : isEdit ? "تحديث" : "إنشاء"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InventoryCountDialog;
