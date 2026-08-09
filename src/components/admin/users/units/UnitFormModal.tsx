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
import { useTranslation } from "react-i18next";

// --- Form Types ---
type UnitFormValues = {
  name: string;
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
  const { t } = useTranslation(["units"]);
  const isEditMode = Boolean(unitToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<UnitFormValues>({
    defaultValues: { 
      name: "", 
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
          description: unitToEdit.description || "",
          is_active: unitToEdit.is_active,
          is_default: unitToEdit.is_default,
        });
      } else {
        reset({
          name: "",
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
      setError("name", { type: "manual", message: t("units:nameRequired") });
      return;
    }
    const dataToSend: UnitFormData = {
      name: data.name.trim(),
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

      toast.success(t("units:successTitle"), {
        description: isEditMode ? t("units:updateSuccess") : t("units:createSuccess"),
        duration: 3000,
      });

      onSaveSuccess(savedUnit);
      onClose();
    } catch (err) {
      console.error("Failed to save unit:", err);
      const generalError = unitService.getErrorMessage(err);
      const apiErrors = unitService.getValidationErrors(err);

      toast.error(t("units:errorTitle"), {
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
        setServerError(t("units:pleaseCheckFields"));
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
          {isEditMode ? t("units:editTitle") : t("units:createTitle")}
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
                <AlertTitle>{t("units:errorTitle")}</AlertTitle>
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
                required: t("units:nameRequired"),
              }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={t("units:name")}
                  placeholder={t("units:namePlaceholderExample")}
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message || ""}
                  autoFocus
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
                      {t("units:setAsDefault")}
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
            {t("units:cancel")}
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
            {isEditMode ? t("units:update") : t("units:save")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default UnitFormModal;
