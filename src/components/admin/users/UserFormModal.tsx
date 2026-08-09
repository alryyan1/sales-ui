// src/components/admin/users/UserFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

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

function getPasswordStrength(password: string): { label: string; className: string } {
  if (!password) return { label: "", className: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "ضعيفة جداً", className: "text-destructive" };
  if (score === 2) return { label: "ضعيفة", className: "text-amber-600 dark:text-amber-500" };
  if (score === 3) return { label: "متوسطة", className: "text-blue-600 dark:text-blue-400" };
  if (score === 4) return { label: "جيدة", className: "text-blue-600 dark:text-blue-400" };
  return { label: "قوية", className: "text-green-600 dark:text-green-500" };
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
    formState: { isSubmitting },
  } = form;

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordValue("");

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `تعديل: ${userToEdit?.name}` : "إضافة مستخدم جديد"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "تعديل بيانات وصلاحيات المستخدم" : "أدخل بيانات المستخدم الجديد وحدد صلاحياته"}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Basic info ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold">البيانات الأساسية</h3>
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
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="text-sm font-semibold">كلمة المرور</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>كلمة المرور</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="8 أحرف على الأقل"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setPasswordValue(e.target.value);
                              }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? "إخفاء" : "إظهار"}
                          </Button>
                        </div>
                        {passwordValue && (
                          <p className="text-xs text-muted-foreground">
                            قوة كلمة المرور: <span className={cn("font-medium", pwStrength.className)}>{pwStrength.label}</span>
                          </p>
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
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="أعد إدخال كلمة المرور"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                          >
                            {showConfirmPassword ? "إخفاء" : "إظهار"}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* ── Roles ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">الأدوار الوظيفية</h3>
                <span className="text-xs text-muted-foreground">{availableRoles.length} دور متاح</span>
              </div>
              <Separator />
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

            {/* ── Navigation permissions ── */}
            <NavigationPermissionsSection
              value={allowedNavs}
              onChange={setAllowedNavs}
              isSuperadmin={isSuperadmin}
            />
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
  );
};

export default UserFormModal;
