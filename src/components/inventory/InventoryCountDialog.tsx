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
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation(["inventory", "common"]);
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
      toast.success(isEdit ? t("inventory:countDialog.updateSuccess") : t("inventory:countDialog.createSuccess"));
      onSuccess();
      reset();
    },
    onError: (error) => {
      toast.error(t("common:error"), {
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir={i18n.dir()}>
      <DialogTitle>{isEdit ? t("inventory:countDialog.editTitle") : t("inventory:countDialog.newTitle")}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Controller
            name="warehouse_id"
            control={control}
            rules={{ required: t("inventory:countDialog.warehouseRequired") }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label={t("inventory:countDialog.warehouseLabel")}
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
            rules={{ required: t("inventory:countDialog.dateRequired") }}
            render={({ field }) => (
              <TextField
                {...field}
                type="date"
                label={t("inventory:countDialog.countDateLabel")}
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
                label={t("inventory:countDialog.notesLabel")}
                fullWidth
                margin="normal"
                multiline
                rows={3}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("common:cancel")}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t("inventory:countDialog.savingEllipsis") : isEdit ? t("inventory:countDialog.updateButton") : t("inventory:countDialog.createButton")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InventoryCountDialog;
