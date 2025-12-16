// src/components/admin/roles/RoleFormModal.tsx
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
  Typography,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Paper,
} from "@mui/material";
import { Loader2, AlertCircle } from "lucide-react";

// Services and Types
import roleService, {
  RoleFormData,
  RoleWithPermissions,
  Permission,
} from "../../../../services/roleService";
import { useAuth } from "@/context/AuthContext";

// --- Zod Schema ---
const roleFormSchema = z.object({
  name: z.string().min(1, { message: "validation:required" }),
  permissions: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

// --- Component Props ---
interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit: RoleWithPermissions | null;
  onSaveSuccess: (role: RoleWithPermissions) => void;
  availablePermissions: Permission[];
  loadingPermissions: boolean;
}

const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  onClose,
  roleToEdit,
  onSaveSuccess,
  availablePermissions,
  loadingPermissions,
}) => {
  const { t } = useTranslation([
    "roles",
    "common",
    "validation",
    "permissions",
  ]);
  const isEditMode = Boolean(roleToEdit);
  const [serverError, setServerError] = useState<string | null>(null);
  const { user } = useAuth();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", permissions: [] },
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, errors },
    setError,
  } = form;

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (isEditMode && roleToEdit) {
        console.log(roleToEdit, 'roleToEdit');
        reset({
          name: roleToEdit.name || "",
          permissions: roleToEdit.permissions || [],
        });
      } else {
        reset({ name: "", permissions: [] });
      }
    }
  }, [isOpen, isEditMode, roleToEdit, reset]);

  const onSubmit = async (data: RoleFormValues) => {
    setServerError(null);
    console.log(`Submitting ${isEditMode ? "update" : "create"} role:`, data);

    const apiData: RoleFormData | Pick<RoleFormData, "permissions"> = isEditMode
      ? { permissions: data.permissions }
      : data;

    try {
      let savedRole: RoleWithPermissions;
      if (isEditMode && roleToEdit) {
        savedRole = await roleService.updateRole(
          roleToEdit.id,
          apiData as Pick<RoleFormData, "permissions">
        );
      } else {
        savedRole = await roleService.createRole(apiData as RoleFormData);
      }
      toast.success(t("common:success"), {
        description: t(
          isEditMode ? "roles:updateSuccess" : "roles:createSuccess"
        ),
      });
      onSaveSuccess(savedRole);
      onClose();
    } catch (err) {
      console.error("Failed to save role:", err);
      const generalError = roleService.getErrorMessage(err);
      const apiErrors = roleService.getValidationErrors(err);
      toast.error(t("common:error"), { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, message]) => {
          setError(field as keyof RoleFormValues, {
            type: "manual",
            message: t(`validation:${message}`, { defaultValue: message }),
          });
        });
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
          {isEditMode ? t("roles:editRole") : t("roles:addRole")}
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
            {/* Role Name Field */}
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
                      {t("roles:roleName")}
                      <span style={{ color: "red" }}> *</span>
                    </>
                  }
                  placeholder={t("roles:roleNamePlaceholder")}
                  fullWidth
                  size="small"
                  disabled={isSubmitting || isEditMode}
                  InputProps={{
                    readOnly: isEditMode,
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />

            {/* Permissions Assignment */}
            <Controller
              control={control}
              name="permissions"
              render={({ field, fieldState }) => (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t("roles:assignPermissions")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
                    {t("roles:assignPermissionsDesc")}
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      maxHeight: 300,
                      overflowY: "auto",
                    }}
                  >
                    {loadingPermissions ? (
                      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
                        <Loader2 className="h-5 w-5 animate-spin" style={{ marginRight: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          {t("common:loading")}...
                        </Typography>
                      </Box>
                    ) : availablePermissions.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                        {t("permissions:noneAvailable")}
                      </Typography>
                    ) : (
                      <FormGroup>
                        {availablePermissions.map((permission) => (
                          <FormControlLabel
                            key={permission.id}
                            control={
                              <Checkbox
                                checked={field.value?.includes(permission.name)}
                                disabled={isSubmitting}
                                onChange={(e) => {
                                  const currentPermissions = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentPermissions, permission.name]);
                                  } else {
                                    field.onChange(
                                      currentPermissions.filter((p) => p !== permission.name)
                                    );
                                  }
                                }}
                              />
                            }
                            label={
                              <Typography variant="body2">
                                {t(`permissions:${permission.name}`, {
                                  defaultValue: permission.name,
                                })}
                              </Typography>
                            }
                            sx={{
                              mb: 0.5,
                              "&:hover": {
                                bgcolor: "action.hover",
                                borderRadius: 1,
                              },
                            }}
                          />
                        ))}
                      </FormGroup>
                    )}
                  </Paper>
                  {fieldState.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {errors.permissions?.message
                        ? t(errors.permissions.message)
                        : ""}
                    </Typography>
                  )}
                </Box>
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

export default RoleFormModal;
