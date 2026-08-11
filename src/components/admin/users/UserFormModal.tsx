// src/components/admin/users/UserFormModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  UserRound,
  KeyRound,
  ShieldCheck,
  PanelLeft,
  Eye,
  EyeOff,
  Settings2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

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

const NO_WAREHOUSE = "__none__";

function isAdminRoleName(name: string) {
  return name === "admin" || name === "ادمن";
}

function getPasswordStrength(password: string): {
  label: string;
  textClass: string;
  barClass: string;
  percent: number;
} {
  if (!password) return { label: "", textClass: "", barClass: "", percent: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const percent = (score / 5) * 100;
  if (score <= 1)
    return {
      label: "ضعيفة جداً",
      textClass: "text-destructive",
      barClass: "[&>[data-slot=progress-indicator]]:bg-destructive",
      percent,
    };
  if (score === 2)
    return {
      label: "ضعيفة",
      textClass: "text-amber-600 dark:text-amber-500",
      barClass: "[&>[data-slot=progress-indicator]]:bg-amber-500",
      percent,
    };
  if (score === 3 || score === 4)
    return {
      label: score === 3 ? "متوسطة" : "جيدة",
      textClass: "text-blue-600 dark:text-blue-400",
      barClass: "[&>[data-slot=progress-indicator]]:bg-blue-500",
      percent,
    };
  return {
    label: "قوية",
    textClass: "text-green-600 dark:text-green-500",
    barClass: "[&>[data-slot=progress-indicator]]:bg-green-500",
    percent,
  };
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSaveSuccess,
  availableRoles,
}) => {
  const isEditMode = Boolean(userToEdit);
  const isSuperadmin = userToEdit?.username === "superadmin";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const [navPermissionsOpen, setNavPermissionsOpen] = useState(false);

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

  const form = useForm<UserFormValues>({
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
  const {
    handleSubmit,
    reset,
    setError,
    control,
    watch,
    formState: { isSubmitting },
  } = form;

  const nameValue = watch("name");

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordValue("");
    setNavPermissionsOpen(false);

    if (isEditMode && userToEdit) {
      const navs = userToEdit.allowed_navs;
      const normalizedNavs = navs === null ? null : Array.isArray(navs) ? navs : [];
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
        setError("password", {
          type: "manual",
          message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        });
        return;
      }
      if (data.password !== data.password_confirmation) {
        setError("password_confirmation", {
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
        });
      } else {
        savedUser = await userService.createUser({
          ...data,
          allowed_navs: allowedNavs,
        });
      }
      onSaveSuccess(savedUser);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to save user:", err);
      const generalError = userService.getErrorMessage(err);
      const apiErrors = userService.getValidationErrors(err);

      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          if (["name", "username", "password", "roles"].includes(field)) {
            setError(field as keyof UserFormValues, { type: "server", message: messages[0] });
          }
        });
        setServerError("يرجى التحقق من الحقول المُشار إليها وتصحيحها");
      } else {
        setServerError(generalError);
      }
    }
  };

  const pwStrength = getPasswordStrength(passwordValue);

  const navSummaryLabel = useMemo(() => {
    if (allowedNavs === null) return "كل الصفحات متاحة";
    if (allowedNavs.length === 0) return "لم يتم تحديد أي صفحة بعد";
    return `${allowedNavs.length} صفحة محددة`;
  }, [allowedNavs]);

  const initials = (userToEdit?.name || nameValue || "؟").trim().charAt(0).toUpperCase();

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{isEditMode ? `تعديل: ${userToEdit?.name}` : "إضافة مستخدم جديد"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "تعديل بيانات وصلاحيات المستخدم" : "أدخل بيانات المستخدم الجديد وحدد صلاحياته"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Basic info ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <UserRound className="size-3.5" />
                <h3 className="text-xs font-medium uppercase tracking-wide">البيانات الأساسية</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الكامل</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل الاسم الكامل" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input placeholder="username" dir="ltr" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="warehouse_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المستودع الرئيسي</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : NO_WAREHOUSE}
                        onValueChange={(v) => field.onChange(v === NO_WAREHOUSE ? null : Number(v))}
                        disabled={loadingWarehouses}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingWarehouses ? "جاري التحميل..." : "غير محدد"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_WAREHOUSE}>— غير محدد (افتراضي)</SelectItem>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ── Password (create only) ── */}
            {!isEditMode && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <KeyRound className="size-3.5" />
                    <h3 className="text-xs font-medium uppercase tracking-wide">كلمة المرور</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="8 أحرف على الأقل"
                                className="pe-9"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setPasswordValue(e.target.value);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                              >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </FormControl>
                          {passwordValue && (
                            <div className="space-y-1">
                              <Progress value={pwStrength.percent} className={cn("h-1.5", pwStrength.barClass)} />
                              <p className="text-xs text-muted-foreground">
                                قوة كلمة المرور: <span className={cn("font-medium", pwStrength.textClass)}>{pwStrength.label}</span>
                              </p>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="password_confirmation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تأكيد كلمة المرور</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="أعد إدخال كلمة المرور"
                                className="pe-9"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                              >
                                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* ── Roles ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  <h3 className="text-xs font-medium uppercase tracking-wide">الأدوار الوظيفية</h3>
                </div>
                <span className="text-xs text-muted-foreground">{availableRoles.length} دور متاح</span>
              </div>
              <FormField
                control={control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableRoles.map((role) => {
                        const isAdminRole = isAdminRoleName(role.name);
                        const isDisabled = isAdminRole && isSuperadmin;
                        const checked = field.value?.includes(role.name) ?? false;
                        return (
                          <div key={role.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={checked}
                              disabled={isDisabled}
                              onCheckedChange={(c) => {
                                const current = field.value || [];
                                field.onChange(
                                  c
                                    ? [...current, role.name]
                                    : current.filter((r) => r !== role.name)
                                );
                              }}
                            />
                            <FormLabel
                              htmlFor={`role-${role.id}`}
                              className={cn(
                                "cursor-pointer font-normal",
                                isAdminRole && "font-semibold",
                                isDisabled && "cursor-not-allowed opacity-60"
                              )}
                            >
                              {role.name}
                            </FormLabel>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* ── Navigation permissions — summary row, editing happens in its own dialog ── */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <PanelLeft className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">القوائم الجانبية</h3>
                  <p className="truncate text-xs text-muted-foreground">{navSummaryLabel}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setNavPermissionsOpen(true)}
              >
                <Settings2 className="size-3.5" />
                تخصيص القوائم الجانبية
              </Button>
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button type="submit" form="user-form" disabled={isSubmitting}>
            {isSubmitting ? "جاري الحفظ..." : isEditMode ? "حفظ التعديلات" : "إنشاء المستخدم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── Sidebar navigation customization — its own dialog, on top of the user form ── */}
    <Dialog open={navPermissionsOpen} onOpenChange={setNavPermissionsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تخصيص القوائم الجانبية</DialogTitle>
          <DialogDescription>
            اختر الصفحات التي تظهر في القائمة الجانبية لهذا المستخدم.
          </DialogDescription>
        </DialogHeader>

        <NavigationPermissionsSection
          value={allowedNavs}
          onChange={setAllowedNavs}
          isSuperadmin={isSuperadmin}
        />

        <DialogFooter>
          <Button type="button" onClick={() => setNavPermissionsOpen(false)}>
            تم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default UserFormModal;
