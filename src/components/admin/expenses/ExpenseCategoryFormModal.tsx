// src/components/admin/expenses/ExpenseCategoryFormModal.tsx
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import { X } from "lucide-react";
import expenseCategoryService, {
  ExpenseCategory,
  ExpenseCategoryFormData,
} from "@/services/ExpenseCategoryService";

interface ExpenseCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (category: ExpenseCategory) => void;
}

type ExpenseCategoryFormFields = {
  name: string;
  description: string;
};

const ExpenseCategoryFormModal: React.FC<ExpenseCategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    handleSubmit,
    control,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<ExpenseCategoryFormFields>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      setServerError(null);
      reset({
        name: "",
        description: "",
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: ExpenseCategoryFormFields) => {
    setServerError(null);
    const payload: ExpenseCategoryFormData = {
      name: data.name,
      description: data.description || null,
    };

    try {
      const saved = await expenseCategoryService.createCategory(payload);
      onSaveSuccess(saved);
      onClose();
    } catch (err) {
      setServerError(expenseCategoryService.getErrorMessage(err));
      const apiErrors = expenseCategoryService.getValidationErrors(err);
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          setError(field as keyof ExpenseCategoryFormFields, {
            type: "server",
            message: (messages as string[])[0],
          });
        });
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            إضافة قسم مصروفات جديد
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <Controller
              name="name"
              control={control}
              rules={{ required: "اسم القسم مطلوب" }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="اسم القسم"
                  fullWidth
                  size="small"
                  autoFocus
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={isSubmitting}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="الوصف (اختياري)"
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={isSubmitting}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            حفظ
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseCategoryFormModal;
