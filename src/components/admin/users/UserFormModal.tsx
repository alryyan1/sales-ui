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
  useTheme,
  alpha,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Fade,
  Chip,
} from "@mui/material";
import {
  Loader2,
  Eye,
  EyeOff,
  X,
  User as UserIcon,
  Lock,
  Shield,
  CheckCircle2,
  Store,
  AlertCircle,
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
  const theme = useTheme();
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
    trigger,
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
      onClose={(event, reason) => {
        if (reason !== "backdropClick" && !isSubmitting) onClose();
      }}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Header */}
        <DialogTitle
          sx={{
            py: 3,
            px: 4,
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: theme.palette.primary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserIcon size={24} style={{ color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {isEditMode ? "تعديل مستخدم" : "إضافة مستخدم"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isEditMode
                  ? "تعديل بيانات المستخدم"
                  : "إضافة مستخدم جديد للنظام"}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={onClose}
            size="small"
            disabled={isSubmitting}
            sx={{
              color: "text.secondary",
              "&:hover": {
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: "error.main",
              },
              transition: "all 0.2s",
            }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>

        {/* Stepper */}
        {!isEditMode && (
          <Box sx={{ px: 4, pt: 3, pb: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      "& .MuiStepLabel-label": {
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Content */}
        <DialogContent
          sx={{
            p: 4,
            flex: 1,
            maxHeight: "70vh",
            overflowY: "auto",
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: alpha(theme.palette.divider, 0.1),
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: alpha(theme.palette.primary.main, 0.3),
              borderRadius: "4px",
              "&:hover": {
                background: alpha(theme.palette.primary.main, 0.5),
              },
            },
          }}
          dir="rtl"
        >
          <Stack spacing={4}>
            {serverError && (
              <Fade in>
                <Alert
                  severity="error"
                  icon={<AlertCircle size={20} />}
                  sx={{
                    borderRadius: 2,
                    "& .MuiAlert-message": {
                      width: "100%",
                    },
                  }}
                >
                  {serverError}
                </Alert>
              </Fade>
            )}

            {/* Section 1: Basic Information */}
            <Fade in timeout={300}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Stack spacing={3}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: theme.palette.primary.main,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <UserIcon size={18} style={{ color: "white" }} />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="text.primary"
                    >
                      البيانات الأساسية
                    </Typography>
                  </Stack>

                  <Stack spacing={3}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                      <Box flex={1}>
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
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 2,
                                  bgcolor: "background.paper",
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    "& fieldset": {
                                      borderColor: theme.palette.primary.main,
                                    },
                                  },
                                },
                              }}
                            />
                          )}
                        />
                      </Box>
                      <Box flex={1}>
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
                                  <InputAdornment
                                    position="start"
                                    sx={{ color: "text.disabled" }}
                                  >
                                    @
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 2,
                                  bgcolor: "background.paper",
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    "& fieldset": {
                                      borderColor: theme.palette.primary.main,
                                    },
                                  },
                                },
                              }}
                            />
                          )}
                        />
                      </Box>
                    </Stack>
                    <Box>
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
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value)
                                )
                              }
                              disabled={loadingWarehouses}
                              startAdornment={
                                <InputAdornment position="start">
                                  <Store size={18} />
                                </InputAdornment>
                              }
                              sx={{
                                borderRadius: 2,
                                bgcolor: "background.paper",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: alpha(
                                    theme.palette.divider,
                                    0.5
                                  ),
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                  borderColor: theme.palette.primary.main,
                                },
                              }}
                            >
                              <MenuItem value="">
                                <Typography
                                  color="text.secondary"
                                  variant="body2"
                                >
                                  غير محدد (مستودع افتراضي)
                                </Typography>
                              </MenuItem>
                              {warehouses.map((warehouse) => (
                                <MenuItem key={warehouse.id} value={warehouse.id}>
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                  >
                                    <Store size={16} />
                                    <Typography>{warehouse.name}</Typography>
                                  </Stack>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                  </Stack>
                </Stack>
              </Paper>
            </Fade>

            {/* Section 2: Security (Only for Create Mode) */}
            {!isEditMode && (
              <Fade in timeout={400}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.warning.main, 0.02),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                  }}
                >
                  <Stack spacing={3}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: theme.palette.warning.main,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Lock size={18} style={{ color: "white" }} />
                      </Box>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        color="text.primary"
                      >
                        الأمان
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                      <Box flex={1}>
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
                                      onClick={() =>
                                        setShowPassword(!showPassword)
                                      }
                                      edge="end"
                                      size="small"
                                      sx={{
                                        color: "text.secondary",
                                        "&:hover": {
                                          color: "primary.main",
                                        },
                                      }}
                                    >
                                      {showPassword ? (
                                        <EyeOff size={18} />
                                      ) : (
                                        <Eye size={18} />
                                      )}
                                    </IconButton>
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 2,
                                  bgcolor: "background.paper",
                                },
                              }}
                            />
                          )}
                        />
                      </Box>
                      <Box flex={1}>
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
                              helperText={
                                (errors as any).password_confirmation?.message
                              }
                              onFocus={() => setActiveStep(1)}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <IconButton
                                      onClick={() =>
                                        setShowConfirmPassword(
                                          !showConfirmPassword
                                        )
                                      }
                                      edge="end"
                                      size="small"
                                      sx={{
                                        color: "text.secondary",
                                        "&:hover": {
                                          color: "primary.main",
                                        },
                                      }}
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
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: 2,
                                  bgcolor: "background.paper",
                                },
                              }}
                            />
                          )}
                        />
                      </Box>
                    </Stack>
                  </Stack>
                </Paper>
              </Fade>
            )}

            {/* Section 3: Roles */}
            <Fade in timeout={500}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.info.main, 0.02),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <Stack spacing={3}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: theme.palette.info.main,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Shield size={18} style={{ color: "white" }} />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="text.primary"
                    >
                      تعيين الأدوار
                    </Typography>
                  </Stack>

                  <FormControl error={!!errors.roles} component="fieldset">
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        maxHeight: 240,
                        overflowY: "auto",
                        bgcolor: "background.paper",
                        borderColor: errors.roles
                          ? theme.palette.error.main
                          : alpha(theme.palette.divider, 0.5),
                        "&::-webkit-scrollbar": {
                          width: 6,
                        },
                        "&::-webkit-scrollbar-thumb": {
                          bgcolor: alpha(theme.palette.text.secondary, 0.2),
                          borderRadius: 3,
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={1.5}
                        sx={{ width: "100%" }}
                      >
                        <Controller
                          name="roles"
                          control={control}
                          render={({ field }) => (
                            <>
                              {availableRoles.map((role) => {
                                const isSelected = field.value?.includes(
                                  role.name
                                );
                                return (
                                  <Box
                                    key={role.id}
                                    sx={{
                                      width: { xs: "100%", sm: "48%" },
                                    }}
                                    onFocus={() =>
                                      setActiveStep(isEditMode ? 1 : 2)
                                    }
                                  >
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={isSelected}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            const currentRoles =
                                              field.value || [];
                                            if (checked) {
                                              field.onChange([
                                                ...currentRoles,
                                                role.name,
                                              ]);
                                            } else {
                                              field.onChange(
                                                currentRoles.filter(
                                                  (r) => r !== role.name
                                                )
                                              );
                                            }
                                          }}
                                          disabled={
                                            role.name === "admin" &&
                                            userToEdit?.username === "superadmin"
                                          }
                                          sx={{
                                            "&.Mui-checked": {
                                              color: theme.palette.primary.main,
                                            },
                                          }}
                                        />
                                      }
                                      label={
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          spacing={1}
                                        >
                                          <Shield size={16} />
                                          <Typography
                                            variant="body2"
                                            fontWeight={600}
                                          >
                                            {role.name}
                                          </Typography>
                                        </Stack>
                                      }
                                      sx={{
                                        width: "100%",
                                        m: 0,
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: isSelected
                                          ? alpha(
                                              theme.palette.primary.main,
                                              0.08
                                            )
                                          : "transparent",
                                        border: `1px solid ${
                                          isSelected
                                            ? theme.palette.primary.main
                                            : alpha(theme.palette.divider, 0.5)
                                        }`,
                                        transition: "all 0.2s",
                                        "&:hover": {
                                          bgcolor: alpha(
                                            theme.palette.primary.main,
                                            0.04
                                          ),
                                          borderColor:
                                            theme.palette.primary.main,
                                        },
                                      }}
                                    />
                                  </Box>
                                );
                              })}
                            </>
                          )}
                        />
                      </Stack>
                    </Paper>
                    {errors.roles && (
                      <FormHelperText sx={{ mt: 1, ml: 0 }}>
                        {errors.roles.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                </Stack>
              </Paper>
            </Fade>
          </Stack>
        </DialogContent>

        {/* Footer */}
        <DialogActions
          sx={{
            p: 3,
            bgcolor: alpha(theme.palette.background.default, 0.8),
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            gap: 2,
          }}
        >
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            variant="outlined"
            color="inherit"
            sx={{
              fontWeight: 600,
              px: 4,
              py: 1,
              borderRadius: 2,
              textTransform: "none",
            }}
          >
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
            sx={{
              fontWeight: 700,
              px: 4,
              py: 1,
              boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
              borderRadius: 2,
              textTransform: "none",
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              "&:hover": {
                boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
              },
              "&:disabled": {
                background: alpha(theme.palette.primary.main, 0.5),
              },
            }}
          >
            {isEditMode ? "تحديث" : "إنشاء"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserFormModal;
