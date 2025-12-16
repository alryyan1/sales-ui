// src/components/admin/units/UnitFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

// --- Zod Schema ---
const unitFormSchema = z.object({
  name: z.string().min(1, { message: "validation:required" }),
  type: z.enum(['stocking', 'sellable'], { message: "validation:required" }),
  description: z.string().optional(),
  is_active: z.boolean(),
});
type UnitFormValues = z.infer<typeof unitFormSchema>;

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
  const { t } = useTranslation(["units", "common", "validation"]);
  const isEditMode = Boolean(unitToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
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

      toast.success(t("common:success"), {
        description: t(
          isEditMode ? "units:updateSuccess" : "units:createSuccess"
        ),
        duration: 3000,
      });

      onSaveSuccess(savedUnit);
      onClose();
    } catch (err) {
      console.error("Failed to save unit:", err);
      const generalError = unitService.getErrorMessage(err);
      const apiErrors = unitService.getValidationErrors(err);

      toast.error(t("common:error"), {
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
        setServerError(t("validation:checkFields"));
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
          {isEditMode
            ? t("units:editUnit")
            : t("units:addUnit")}
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
                <AlertTitle>{t("common:error")}</AlertTitle>
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
                required: t("validation:required"),
              }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={
                    <>
                      {t("units:name")}
                      <span style={{ color: "red" }}> *</span>
                    </>
                  }
                  placeholder={t("units:namePlaceholder")}
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ? t(fieldState.error.message) : ""}
                />
              )}
            />

            {/* Type Field */}
            <Controller
              control={control}
              name="type"
              rules={{
                required: t("validation:required"),
              }}
              render={({ field, fieldState }) => (
                <FormControl
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                >
                  <InputLabel>
                    {t("units:type")}
                    <span style={{ color: "red" }}> *</span>
                  </InputLabel>
                  <Select
                    {...field}
                    label={`${t("units:type")} *`}
                    value={field.value}
                  >
                    <MenuItem value="stocking">
                      {t("units:stockingUnit")}
                    </MenuItem>
                    <MenuItem value="sellable">
                      {t("units:sellableUnit")}
                    </MenuItem>
                  </Select>
                  {fieldState.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {fieldState.error.message ? t(fieldState.error.message) : ""}
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
                  label={t("units:description")}
                  placeholder={t("units:descriptionPlaceholder")}
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
                  <InputLabel>{t("units:status")}</InputLabel>
                  <Select
                    {...field}
                    label={t("units:status")}
                    value={field.value ? 'true' : 'false'}
                    onChange={(e) => field.onChange(e.target.value === 'true')}
                  >
                    <MenuItem value="true">
                      {t("units:active")}
                    </MenuItem>
                    <MenuItem value="false">
                      {t("units:inactive")}
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
            {t("common:cancel")}
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
            {isEditMode ? t("common:update") : t("common:create")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default UnitFormModal;
