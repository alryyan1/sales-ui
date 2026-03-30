// src/components/admin/users/UserFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";

import {
  Visibility,
  VisibilityOff,
  CheckCircleOutline,
  PersonOutline,
  SecurityOutlined,
  BadgeOutlined,
  DashboardOutlined,
  ManageAccountsOutlined,
  WarehouseOutlined,
  ErrorOutline,
} from "@mui/icons-material";

// Services and Types
import userService, { Role } from "@/services/userService";
import { User } from "@/services/authService";
import { warehouseService, Warehouse } from "@/services/warehouseService";

// Custom Components
import NavigationPermissionsSection from "./NavigationPermissionsSection";

// --- Props ---
interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
  onSaveSuccess: (user: User) => void;
  availableRoles: Role[];
}

type UserFormValues = {
  name: string;
  username: string;
  password: string;
  password_confirmation: string;
  roles: string[];
  warehouse_id: number | null;
  allowed_navs: string[];
};

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: "error" | "warning" | "info" | "success";
} {
  if (!password) return { score: 0, label: "", color: "error" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "ضعيفة جداً", color: "error" };
  if (score === 2) return { score, label: "ضعيفة", color: "warning" };
  if (score === 3) return { score, label: "متوسطة", color: "info" };
  if (score === 4) return { score, label: "جيدة", color: "info" };
  return { score, label: "قوية", color: "success" };
}

// Section card wrapper
const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  badge?: string;
  children: React.ReactNode;
}> = ({ icon, title, badge, children }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1.25,
        bgcolor: "grey.50",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 1,
          bgcolor: "primary.main",
          color: "white",
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
        {title}
      </Typography>
      {badge && (
        <Chip label={badge} size="small" variant="outlined" color="default" />
      )}
    </Box>
    <Box sx={{ p: 2 }}>{children}</Box>
  </Paper>
);

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSaveSuccess,
  availableRoles,
}) => {
  const isEditMode = Boolean(userToEdit);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingWarehouses(true);
    warehouseService
      .getAll()
      .then(setWarehouses)
      .catch(console.error)
      .finally(() => setLoadingWarehouses(false));
  }, [isOpen]);

  const [allowedNavs, setAllowedNavs] = useState<string[] | null>(null);

  const {
    handleSubmit,
    reset,
    setError,
    control,
    formState: { isSubmitting, errors },
  } = useForm<UserFormValues>({
    defaultValues: {
      name: "",
      username: "",
      password: "",
      password_confirmation: "",
      roles: [],
      warehouse_id: null,
      allowed_navs: [],
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordValue("");

    if (isEditMode && userToEdit) {
      const navs = userToEdit.allowed_navs;
      const normalizedNavs =
        navs === null ? null : Array.isArray(navs) ? navs : [];
      setAllowedNavs(normalizedNavs);
      reset({
        name: userToEdit.name || "",
        username: userToEdit.username || "",
        password: "",
        password_confirmation: "",
        roles: userToEdit.roles || [],
        warehouse_id: userToEdit.warehouse_id || null,
        allowed_navs: normalizedNavs || [],
      });
    } else {
      setAllowedNavs([]);
      reset({
        name: "",
        username: "",
        password: "",
        password_confirmation: "",
        roles: [],
        warehouse_id: null,
        allowed_navs: [],
      });
    }
  }, [isOpen, isEditMode, userToEdit, reset]);

  const onSubmit: SubmitHandler<UserFormValues> = async (data) => {
    setServerError(null);

    if (!data.name?.trim()) {
      setError("name", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    if (!data.username?.trim()) {
      setError("username", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    if (!isEditMode) {
      if (!data.password || data.password.length < 8) {
        setError("password" as any, {
          type: "manual",
          message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        });
        return;
      }
      if (data.password !== data.password_confirmation) {
        setError("password_confirmation" as any, {
          type: "manual",
          message: "كلمات المرور غير متطابقة",
        });
        return;
      }
    }
    if (!data.roles || data.roles.length === 0) {
      setError("roles", {
        type: "manual",
        message: "يجب اختيار دور واحد على الأقل",
      });
      return;
    }

    try {
      let savedUser: User;
      if (isEditMode && userToEdit) {
        savedUser = await userService.updateUser(userToEdit.id, {
          name: data.name,
          username: data.username,
          roles: data.roles,
          warehouse_id: data.warehouse_id,
          allowed_navs: allowedNavs,
        } as any);
      } else {
        savedUser = await userService.createUser({
          ...data,
          allowed_navs: allowedNavs,
        } as any);
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
            setError(field as any, { type: "server", message: messages[0] });
          }
        });
        setServerError("يرجى التحقق من الحقول المُشار إليها وتصحيحها");
      } else {
        setServerError(generalError);
      }
    }
  };

  const pwStrength = getPasswordStrength(passwordValue);

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSubmitting && onClose()}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* ── Header ── */}
      <DialogTitle
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          py: 1.5,
          px: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "white",
              flexShrink: 0,
            }}
          >
            <ManageAccountsOutlined fontSize="small" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>
              {isEditMode
                ? `تعديل: ${userToEdit?.name}`
                : "إضافة مستخدم جديد"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isEditMode
                ? "تعديل بيانات وصلاحيات المستخدم"
                : "أدخل بيانات المستخدم الجديد وحدد صلاحياته"}
            </Typography>
          </Box>
          {isEditMode && userToEdit?.roles?.map((r) => (
            <Chip key={r} label={r} size="small" color="primary" variant="outlined" />
          ))}
        </Box>
      </DialogTitle>

      {/* ── Body ── */}
      <DialogContent sx={{ p: 2.5 }}>
        <Box
          component="form"
          id="user-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}
        >
          {serverError && (
            <Alert severity="error" icon={<ErrorOutline />} sx={{ py: 0.75 }}>
              {serverError}
            </Alert>
          )}

          {/* ── Section 1: Basic Info ── */}
          <SectionCard
            icon={<PersonOutline sx={{ fontSize: 16 }} />}
            title="البيانات الأساسية"
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="الاسم الكامل"
                      fullWidth
                      size="small"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      placeholder="أدخل الاسم الكامل"
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="اسم المستخدم"
                      fullWidth
                      size="small"
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      placeholder="username"
                      inputProps={{ dir: "ltr", style: { fontFamily: "monospace" } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography color="text.secondary" variant="body2">
                              @
                            </Typography>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name="warehouse_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <WarehouseOutlined sx={{ fontSize: 14 }} />
                          المستودع الرئيسي
                        </Box>
                      </InputLabel>
                      <Select
                        {...field}
                        label="المستودع الرئيسي"
                        value={field.value?.toString() ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                        disabled={loadingWarehouses}
                        endAdornment={
                          loadingWarehouses ? (
                            <InputAdornment position="end" sx={{ mr: 2 }}>
                              <CircularProgress size={14} />
                            </InputAdornment>
                          ) : undefined
                        }
                      >
                        <MenuItem value="">
                          <Typography variant="body2" color="text.secondary">
                            — غير محدد (افتراضي)
                          </Typography>
                        </MenuItem>
                        {warehouses.map((w) => (
                          <MenuItem key={w.id} value={w.id.toString()}>
                            {w.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </SectionCard>

          {/* ── Section 2: Password (create only) ── */}
          {!isEditMode && (
            <SectionCard
              icon={<SecurityOutlined sx={{ fontSize: 16 }} />}
              title="كلمة المرور"
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="كلمة المرور"
                        fullWidth
                        size="small"
                        type={showPassword ? "text" : "password"}
                        error={!!errors.password}
                        helperText={
                          errors.password?.message || "8 أحرف على الأقل"
                        }
                        placeholder="أدخل كلمة المرور"
                        onChange={(e) => {
                          field.onChange(e);
                          setPasswordValue(e.target.value);
                        }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                edge="end"
                              >
                                {showPassword ? (
                                  <VisibilityOff fontSize="small" />
                                ) : (
                                  <Visibility fontSize="small" />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                  {passwordValue && (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(pwStrength.score / 5) * 100}
                        color={pwStrength.color}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        قوة كلمة المرور:{" "}
                        <Box component="span" fontWeight={600} color="text.primary">
                          {pwStrength.label}
                        </Box>
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="password_confirmation"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="تأكيد كلمة المرور"
                        fullWidth
                        size="small"
                        type={showConfirmPassword ? "text" : "password"}
                        error={!!(errors as any).password_confirmation}
                        helperText={
                          (errors as any).password_confirmation?.message
                        }
                        placeholder="أعد إدخال كلمة المرور"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                tabIndex={-1}
                                edge="end"
                              >
                                {showConfirmPassword ? (
                                  <VisibilityOff fontSize="small" />
                                ) : (
                                  <Visibility fontSize="small" />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {/* ── Section 3: Roles ── */}
          <SectionCard
            icon={<BadgeOutlined sx={{ fontSize: 16 }} />}
            title="الأدوار الوظيفية"
            badge={`${availableRoles.length} دور متاح`}
          >
            <Controller
              name="roles"
              control={control}
              render={({ field }) => (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      p: 1.5,
                      border: "1px solid",
                      borderColor: errors.roles ? "error.main" : "divider",
                      borderRadius: 1.5,
                      bgcolor: "grey.50",
                      maxHeight: 140,
                      overflowY: "auto",
                    }}
                  >
                    {availableRoles.map((role) => {
                      const isSelected = field.value?.includes(role.name);
                      const isDisabled =
                        role.name === "admin" &&
                        userToEdit?.username === "superadmin";
                      return (
                        <Chip
                          key={role.id}
                          label={role.name}
                          size="small"
                          clickable={!isDisabled}
                          disabled={isDisabled}
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          icon={
                            isSelected ? (
                              <CheckCircleOutline sx={{ fontSize: 14 }} />
                            ) : undefined
                          }
                          onClick={() => {
                            if (isDisabled) return;
                            const current = field.value || [];
                            field.onChange(
                              isSelected
                                ? current.filter((r) => r !== role.name)
                                : [...current, role.name],
                            );
                          }}
                        />
                      );
                    })}
                  </Box>
                  {errors.roles && (
                    <FormHelperText error sx={{ mx: 1.75, mt: 0.5 }}>
                      {errors.roles.message}
                    </FormHelperText>
                  )}
                  {(field.value?.length ?? 0) > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      تم اختيار{" "}
                      <Box component="span" fontWeight={600} color="text.primary">
                        {field.value.length}
                      </Box>{" "}
                      {field.value.length === 1 ? "دور" : "أدوار"}
                    </Typography>
                  )}
                </>
              )}
            />
          </SectionCard>

          {/* ── Section 4: Navigation Permissions ── */}
          <SectionCard
            icon={<DashboardOutlined sx={{ fontSize: 16 }} />}
            title="صلاحيات الوصول للصفحات"
          >
            <NavigationPermissionsSection
              value={allowedNavs}
              onChange={setAllowedNavs}
              isSuperadmin={userToEdit?.username === "superadmin"}
            />
          </SectionCard>
        </Box>
      </DialogContent>

      {/* ── Footer ── */}
      <DialogActions
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          px: 3,
          py: 1.5,
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          disabled={isSubmitting}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          form="user-form"
          variant="contained"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CheckCircleOutline />
            )
          }
          sx={{ minWidth: 130 }}
        >
          {isSubmitting
            ? "جاري الحفظ..."
            : isEditMode
            ? "حفظ التعديلات"
            : "إنشاء المستخدم"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserFormModal;
