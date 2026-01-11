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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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
    allowed_navs?: string[] | null;
  };

  type UpdateUserFormValues = {
    name: string;
    username: string;
    roles: string[];
    warehouse_id: number | null;
    allowed_navs?: string[] | null;
  };

  type CombinedUserFormValues = CreateUserFormValues | UpdateUserFormValues;

  // --- Form Setup ---
  const [allowedNavs, setAllowedNavs] = useState<string[]>([]);

  const form = useForm<CombinedUserFormValues>({
    defaultValues: {
      name: "",
      username: "",
      roles: [],
      // @ts-ignore
      password: "",
      password_confirmation: "",
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

  // --- Reset Form on Open ---
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      if (isEditMode && userToEdit) {
        const navs = userToEdit.allowed_navs || [];
        setAllowedNavs(Array.isArray(navs) ? navs : []);
        reset({
          name: userToEdit.name || "",
          username: userToEdit.username || "",
          roles: userToEdit.roles || [],
          // @ts-ignore
          password: "",
          password_confirmation: "",
          warehouse_id: userToEdit.warehouse_id || null,
          allowed_navs: navs,
        });
      } else {
        setAllowedNavs([]);
        reset({
          name: "",
          username: "",
          roles: [],
          // @ts-ignore
          password: "",
          password_confirmation: "",
          warehouse_id: null,
          allowed_navs: [],
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
        setError("password" as any, {
          type: "manual",
          message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        });
        return;
      }
      if (createData.password !== createData.password_confirmation) {
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
        const updateData = {
          name: data.name,
          username: data.username,
          roles: data.roles,
          warehouse_id: data.warehouse_id,
          allowed_navs: allowedNavs.length > 0 ? allowedNavs : null,
        };
        savedUser = await userService.updateUser(
          userToEdit.id,
          updateData as any
        );
      } else {
        const createData = {
          ...data,
          allowed_navs: allowedNavs.length > 0 ? allowedNavs : null,
        };
        savedUser = await userService.createUser(createData as any);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Header */}
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {isEditMode ? "تعديل مستخدم" : "إضافة مستخدم"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "تعديل بيانات المستخدم"
                  : "إضافة مستخدم جديد للنظام"}
              </DialogDescription>
            </DialogHeader>

            {/* Content */}
            <div className="space-y-6">
              {serverError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {/* Section 1: Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>البيانات الأساسية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="أدخل الاسم"
                            />
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
                            <div className="relative">
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                @
                              </span>
                              <Input
                                {...field}
                                placeholder="اسم المستخدم"
                                className="pr-8"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={control}
                    name="warehouse_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المستودع الرئيسي</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(value) =>
                            field.onChange(value === "" ? null : Number(value))
                          }
                          disabled={loadingWarehouses}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المستودع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value=" ">
                              <span className="text-muted-foreground">
                                غير محدد (مستودع افتراضي)
                              </span>
                            </SelectItem>
                            {warehouses.map((warehouse) => (
                              <SelectItem
                                key={warehouse.id}
                                value={warehouse.id.toString()}
                              >
                                {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Section 2: Security (Only for Create Mode) */}
              {!isEditMode && (
                <Card>
                  <CardHeader>
                    <CardTitle>الأمان</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>كلمة المرور</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="أدخل كلمة المرور"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                            <FormDescription>
                              يجب أن تكون 8 أحرف على الأقل
                            </FormDescription>
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
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="أعد إدخال كلمة المرور"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 3: Roles */}
              <Card>
                <CardHeader>
                  <CardTitle>تعيين الأدوار</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={control}
                    name="roles"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-3">
                          <div className="rounded-lg border p-4 max-h-60 overflow-y-auto">
                            <div className="flex flex-wrap gap-3">
                              {availableRoles.map((role) => {
                                const isSelected = field.value?.includes(
                                  role.name
                                );
                                return (
                                  <div
                                    key={role.id}
                                    className="flex items-center space-x-2 space-x-reverse"
                                  >
                                    <Checkbox
                                      id={`role-${role.id}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        const currentRoles = field.value || [];
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
                                    />
                                    <Label
                                      htmlFor={`role-${role.id}`}
                                      className="cursor-pointer font-normal"
                                    >
                                      {role.name}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Section 4: Navigation Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>صلاحيات الوصول للصفحات</CardTitle>
                </CardHeader>
                <CardContent>
                  <NavigationPermissionsSection
                    value={allowedNavs}
                    onChange={setAllowedNavs}
                    isSuperadmin={userToEdit?.username === "superadmin"}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isEditMode ? "تحديث" : "إنشاء"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;
