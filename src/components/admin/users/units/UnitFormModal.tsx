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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { Loader2, AlertCircle } from "lucide-react";
import unitService, { Unit, UnitFormData } from "@/services/UnitService";

// --- Form Types ---
type UnitFormValues = {
  name: string;
  type: 'stocking' | 'sellable';
  description?: string;
  is_active: boolean;
};

// --- Component Props ---
interface UnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitToEdit: Unit | null;
  onSaveSuccess: (unit: Unit) => void;
  defaultType?: 'stocking' | 'sellable'; // For pre-selecting type when creating from product form
}

const UnitFormModal: React.FC<UnitFormModalProps> = ({
  isOpen,
  onClose,
  unitToEdit,
  onSaveSuccess,
  defaultType,
}) => {
  const isEditMode = Boolean(unitToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<UnitFormValues>({
    defaultValues: { 
      name: "", 
      type: defaultType || 'stocking', 
      description: "", 
      is_active: true 
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
          type: unitToEdit.type,
          description: unitToEdit.description || "",
          is_active: unitToEdit.is_active,
        });
      } else {
        reset({
          name: "",
          type: defaultType || 'stocking',
          description: "",
          is_active: true,
        });
      }
    }
  }, [isOpen, isEditMode, unitToEdit, reset, defaultType]);

  const onSubmit = async (data: UnitFormValues) => {
    setServerError(null);
    console.log("Submitting unit data:", data);

    // Basic validation
    if (!data.name || data.name.trim() === "") {
      setError("name", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    if (!data.type) {
      setError("type", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }

    const dataToSend: UnitFormData = {
      name: data.name.trim(),
      type: data.type,
      description: data.description?.trim() || undefined,
      is_active: data.is_active,
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
      maxWidth="sm"
    >
      <DialogTitle
        sx={{
          pb: 1.5,
          pt: 3,
          px: 3,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" component="div" fontWeight={600}>
          {isEditMode ? "تعديل وحدة" : "إضافة وحدة"}
        </Typography>
      </DialogTitle>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <DialogContent
          sx={{
            pt: 3,
            px: 3,
            pb: 2,
            maxHeight: "70vh",
            overflowY: "auto",
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

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Name Field */}
            <Controller
              control={control}
              name="name"
              rules={{
                required: "هذا الحقل مطلوب",
              }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={
                    <>
                      اسم الوحدة
                      <span style={{ color: "red" }}> *</span>
                    </>
                  }
                  placeholder="أدخل اسم الوحدة"
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message || ""}
                />
              )}
            />

            {/* Type Field */}
            <Controller
              control={control}
              name="type"
              rules={{
                required: "هذا الحقل مطلوب",
              }}
              render={({ field, fieldState }) => (
                <FormControl
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                >
                  <InputLabel>
                    نوع الوحدة
                    <span style={{ color: "red" }}> *</span>
                  </InputLabel>
                  <Select
                    {...field}
                    label="نوع الوحدة *"
                    value={field.value}
                  >
                    <MenuItem value="stocking">
                      وحدة تخزين
                    </MenuItem>
                    <MenuItem value="sellable">
                      وحدة بيع
                    </MenuItem>
                  </Select>
                  {fieldState.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {fieldState.error.message || ""}
                    </Typography>
                  )}
                </FormControl>
              )}
            />

            {/* Description Field */}
            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="الوصف"
                  placeholder="أدخل وصف الوحدة"
                  fullWidth
                  size="small"
                  multiline
                  minRows={3}
                  disabled={isSubmitting}
                  value={field.value ?? ""}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />

            {/* Active Status Field */}
            <Controller
              control={control}
              name="is_active"
              render={({ field, fieldState }) => (
                <FormControl
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                >
                  <InputLabel>الحالة</InputLabel>
                  <Select
                    {...field}
                    label="الحالة"
                    value={field.value ? 'true' : 'false'}
                    onChange={(e) => field.onChange(e.target.value === 'true')}
                  >
                    <MenuItem value="true">
                      نشط
                    </MenuItem>
                    <MenuItem value="false">
                      غير نشط
                    </MenuItem>
                  </Select>
                  {fieldState.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {fieldState.error.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button
            type="button"
            onClick={handleClose}
            color="inherit"
            variant="outlined"
            disabled={isSubmitting}
            sx={{ minWidth: 100 }}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ minWidth: 100 }}
            startIcon={
              isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : undefined
            }
          >
            {isEditMode ? "تحديث" : "إنشاء"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default UnitFormModal;
