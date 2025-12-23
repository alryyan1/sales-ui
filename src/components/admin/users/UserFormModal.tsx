// src/components/admin/users/UserFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  Typography,
  IconButton,
  InputAdornment,
  Paper,
  Box,
  FormHelperText,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  Stack,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  Loader2,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
} from "lucide-react";

// Services and Types
import userService, { Role } from "@/services/userService";
import { User } from "@/services/authService";
import { warehouseService, Warehouse } from "@/services/warehouseService";

// --- Props ---
interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
  onSaveSuccess: (user: User) => void;
  availableRoles: Role[];
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSaveSuccess,
  availableRoles,
}) => {
  const isEditMode = Boolean(userToEdit);
  const [activeStep, setActiveStep] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Warehouse state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const data = await warehouseService.getAll();
        setWarehouses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWarehouses(false);
      }
    };
    if (isOpen) {
      fetchWarehouses();
      setActiveStep(0);
    }
  }, [isOpen]);

  // --- Form Types ---
  type CreateUserFormValues = {
    name: string;
    username: string;
    password: string;
    password_confirmation: string;
    roles: string[];
    warehouse_id: number | null;
  };

  type UpdateUserFormValues = {
    name: string;
    username: string;
    roles: string[];
    warehouse_id: number | null;
  };

  type CombinedUserFormValues = CreateUserFormValues | UpdateUserFormValues;

  // --- Form Setup ---
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<CombinedUserFormValues>({
    defaultValues: {
      name: "",
      username: "",
      roles: [],
      // @ts-ignore
      password: "",
      password_confirmation: "",
      warehouse_id: null,
    },
  });

  // --- Reset Form on Open ---
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setActiveStep(0);
      if (isEditMode && userToEdit) {
        reset({
          name: userToEdit.name || "",
          username: userToEdit.username || "",
          roles: userToEdit.roles || [],
          // @ts-ignore
          password: "",
          password_confirmation: "",
          warehouse_id: userToEdit.warehouse_id || null,
        });
      } else {
        reset({
          name: "",
          username: "",
          roles: [],
          // @ts-ignore
          password: "",
          password_confirmation: "",
          warehouse_id: null,
        });
      }
    }
  }, [isOpen, isEditMode, userToEdit, reset]);

  // --- Submit Handler ---
  const onSubmit: SubmitHandler<CombinedUserFormValues> = async (data) => {
    setServerError(null);
    
    // Basic validation
    if (!data.name || data.name.trim() === "") {
      setError("name", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    if (!data.username || data.username.trim() === "") {
      setError("username", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    if (!isEditMode) {
      const createData = data as CreateUserFormValues;
      if (!createData.password || createData.password.length < 8) {
        setError("password" as any, { type: "manual", message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
        return;
      }
      if (createData.password !== createData.password_confirmation) {
        setError("password_confirmation" as any, { type: "manual", message: "كلمات المرور غير متطابقة" });
        return;
      }
    }
    if (!data.roles || data.roles.length === 0) {
      setError("roles", { type: "manual", message: "يجب اختيار دور واحد على الأقل" });
      return;
    }

    try {
      let savedUser: User;
      if (isEditMode && userToEdit) {
        const updateData = {
          name: data.name,
          username: data.username,
          roles: data.roles,
          warehouse_id: data.warehouse_id,
        };
        savedUser = await userService.updateUser(
          userToEdit.id,
          updateData as any
        );
      } else {
        savedUser = await userService.createUser(data as any);
      }
      onSaveSuccess(savedUser);
      onClose();
    } catch (err: any) {
      console.error("Failed to save user:", err);
      const generalError = userService.getErrorMessage(err);
      const apiErrors = userService.getValidationErrors(err);

      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          if (["name", "username", "password", "roles"].includes(field)) {
            setError(field as any, {
              type: "server",
              message: messages[0],
            });
          }
        });
        setServerError("يرجى التحقق من الحقول");
      } else {
        setServerError(generalError);
      }
    }
  };

  const steps = isEditMode
    ? ["البيانات الأساسية", "الأدوار والصلاحيات"]
    : ["البيانات الأساسية", "الأمان", "الأدوار والصلاحيات"];

  return (
    <Dialog
      open={isOpen}
      onClose={(_, reason) => {
        if (reason !== "backdropClick" && !isSubmitting) onClose();
      }}
      maxWidth="md"
      fullWidth
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Header */}
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="h6">
                {isEditMode ? "تعديل مستخدم" : "إضافة مستخدم"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isEditMode
                  ? "تعديل بيانات المستخدم"
                  : "إضافة مستخدم جديد للنظام"}
              </Typography>
            </Box>
            <IconButton onClick={onClose} disabled={isSubmitting}>
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>

        {/* Stepper */}
        {!isEditMode && (
          <Box sx={{ px: 4, pt: 2, pb: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Content */}
        <DialogContent dir="rtl">
          <Stack spacing={3}>
            {serverError && (
              <Alert severity="error">
                {serverError}
              </Alert>
            )}

            {/* Section 1: Basic Information */}
            <Paper variant="outlined">
              <Stack spacing={3} sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  البيانات الأساسية
                </Typography>

                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="الاسم"
                          required
                          fullWidth
                          variant="outlined"
                          error={!!errors.name}
                          helperText={errors.name?.message}
                          onFocus={() => setActiveStep(0)}
                        />
                      )}
                    />
                    <Controller
                      name="username"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="اسم المستخدم"
                          required
                          fullWidth
                          variant="outlined"
                          error={!!errors.username}
                          helperText={errors.username?.message}
                          onFocus={() => setActiveStep(0)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                @
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Stack>
                  <Controller
                    name="warehouse_id"
                    control={control}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        error={!!errors.warehouse_id}
                        onFocus={() => setActiveStep(0)}
                      >
                        <InputLabel id="warehouse-label">
                          المستودع الرئيسي
                        </InputLabel>
                        <Select
                          {...field}
                          labelId="warehouse-label"
                          label="المستودع الرئيسي"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              String(e.target.value) === ""
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          disabled={loadingWarehouses}
                        >
                          <MenuItem value="">
                            <Typography variant="body2">
                              غير محدد (مستودع افتراضي)
                            </Typography>
                          </MenuItem>
                          {warehouses.map((warehouse) => (
                            <MenuItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Stack>
              </Stack>
            </Paper>

            {/* Section 2: Security (Only for Create Mode) */}
            {!isEditMode && (
              <Paper variant="outlined">
                <Stack spacing={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    الأمان
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Controller
                      name="password"
                      control={control as any}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="كلمة المرور"
                          type={showPassword ? "text" : "password"}
                          fullWidth
                          required
                          variant="outlined"
                          error={!!(errors as any).password}
                          helperText={(errors as any).password?.message}
                          onFocus={() => setActiveStep(1)}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                >
                                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="password_confirmation"
                      control={control as any}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="تأكيد كلمة المرور"
                          type={showConfirmPassword ? "text" : "password"}
                          fullWidth
                          required
                          variant="outlined"
                          error={!!(errors as any).password_confirmation}
                          helperText={(errors as any).password_confirmation?.message}
                          onFocus={() => setActiveStep(1)}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                  edge="end"
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Stack>
                </Stack>
              </Paper>
            )}

            {/* Section 3: Roles */}
            <Paper variant="outlined">
              <Stack spacing={2} sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  تعيين الأدوار
                </Typography>

                <FormControl error={!!errors.roles} component="fieldset" fullWidth>
                  <Paper variant="outlined" sx={{ p: 2, maxHeight: 240, overflowY: "auto" }}>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      <Controller
                        name="roles"
                        control={control}
                        render={({ field }) => (
                          <>
                            {availableRoles.map((role) => {
                              const isSelected = field.value?.includes(role.name);
                              return (
                                <FormControlLabel
                                  key={role.id}
                                  control={
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        const currentRoles = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentRoles, role.name]);
                                        } else {
                                          field.onChange(
                                            currentRoles.filter((r) => r !== role.name)
                                          );
                                        }
                                      }}
                                      disabled={
                                        role.name === "admin" &&
                                        userToEdit?.username === "superadmin"
                                      }
                                    />
                                  }
                                  label={role.name}
                                  onFocus={() => setActiveStep(isEditMode ? 1 : 2)}
                                />
                              );
                            })}
                          </>
                        )}
                      />
                    </Stack>
                  </Paper>
                  {errors.roles && (
                    <FormHelperText>{errors.roles.message}</FormHelperText>
                  )}
                </FormControl>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>

        {/* Footer */}
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting} variant="outlined">
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )
            }
          >
            {isEditMode ? "تحديث" : "إنشاء"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserFormModal;
