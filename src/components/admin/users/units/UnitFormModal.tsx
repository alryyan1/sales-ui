// src/components/admin/units/UnitFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

// MUI components
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  AlertTitle,
  Typography,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Loader2, AlertCircle } from "lucide-react";
import unitService, { Unit, UnitFormData } from "@/services/UnitService";

// --- Form Types ---
type UnitFormValues = {
  name: string;
  name_en?: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
};

// --- Component Props ---
interface UnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitToEdit: Unit | null;
  onSaveSuccess: (unit: Unit) => void;
}

const UnitFormModal: React.FC<UnitFormModalProps> = ({
  isOpen,
  onClose,
  unitToEdit,
  onSaveSuccess,
}) => {
  const isEditMode = Boolean(unitToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<UnitFormValues>({
    defaultValues: {
      name: "",
      name_en: "",
      description: "",
      is_active: true,
      is_default: false
    },
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
    setError,
  } = form;

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (isEditMode && unitToEdit) {
        reset({
          name: unitToEdit.name || "",
          name_en: unitToEdit.name_en || "",
          description: unitToEdit.description || "",
          is_active: unitToEdit.is_active,
          is_default: unitToEdit.is_default,
        });
      } else {
        reset({
          name: "",
          name_en: "",
          description: "",
          is_active: true,
          is_default: false,
        });
      }
    }
  }, [isOpen, isEditMode, unitToEdit, reset]);

  const onSubmit = async (data: UnitFormValues) => {
    setServerError(null);
    console.log("Submitting unit data:", data);

    // Basic validation
    if (!data.name || data.name.trim() === "") {
      setError("name", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    const dataToSend: UnitFormData = {
      name: data.name.trim(),
      name_en: data.name_en?.trim() || undefined,
      description: data.description?.trim() || undefined,
      is_active: data.is_active,
      is_default: data.is_default,
    };

    try {
      let savedUnit: Unit;
      if (isEditMode && unitToEdit) {
        savedUnit = await unitService.updateUnit(unitToEdit.id, dataToSend);
      } else {
        savedUnit = await unitService.createUnit(dataToSend);
      }
      console.log("Save successful:", savedUnit);

      toast.success("نجح", {
        description: isEditMode ? "تم تحديث الوحدة بنجاح" : "تم إنشاء الوحدة بنجاح",
        duration: 3000,
      });

      onSaveSuccess(savedUnit);
      onClose();
    } catch (err) {
      console.error("Failed to save unit:", err);
      const generalError = unitService.getErrorMessage(err);
      const apiErrors = unitService.getValidationErrors(err);

      toast.error("خطأ", {
        description: generalError,
        duration: 5000,
      });
      setServerError(generalError);

      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          setError(field as keyof UnitFormValues, {
            type: "server",
            message: messages[0],
          });
        });
        setServerError("يرجى التحقق من الحقول");
      }
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle
        sx={{
          pb: 2,
          pt: 3,
          px: 3,
        }}
      >
        <Typography variant="h6" component="div" fontWeight={600}>
          {isEditMode ? "تعديل وحدة" : "إضافة وحدة جديدة"}
        </Typography>
      </DialogTitle>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <DialogContent
          sx={{
            pt: 1,
            px: 3,
            pb: 2,
          }}
        >
          {/* General Server Error Alert */}
          {serverError && !isSubmitting && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ</AlertTitle>
              </Box>
              {serverError}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Name Field */}
            <Controller
              control={control}
              name="name"
              rules={{
                required: "اسم الوحدة مطلوب",
              }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="اسم الوحدة"
                  placeholder="مثال: حبة، كرتونة، باكت..."
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message || ""}
                  autoFocus
                />
              )}
            />

            {/* English Name Field */}
            <Controller
              control={control}
              name="name_en"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="الاسم بالإنجليزية (English Name)"
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  value={field.value ?? ""}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message || ""}
                />
              )}
            />

            {/* Default Status Field */}
            <Controller
              control={control}
              name="is_default"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={isSubmitting}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={500}>
                      تعيين كافتراضي
                    </Typography>
                  }
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{display:'flex',gap:1}}
        
        >
          <Button
            type="button"
            onClick={handleClose}
            color="inherit"
            variant="outlined"
            disabled={isSubmitting}
            sx={{ minWidth: 90 }}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ minWidth: 90 }}
            startIcon={
              isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : undefined
            }
          >
            {isEditMode ? "تحديث" : "حفظ"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default UnitFormModal;
