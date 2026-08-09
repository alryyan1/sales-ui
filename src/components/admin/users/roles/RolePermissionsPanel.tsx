// src/components/admin/users/roles/RolePermissionsPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Loader2,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsGroup } from "@/components/settings/shared/SettingsGroup";
import { SwitchField } from "@/components/settings/shared/SwitchField";
import { cn } from "@/lib/utils";

import roleService, {
  RoleFormData,
  RoleWithPermissions,
  Permission,
} from "@/services/roleService";
import { groupPermissions } from "./permissionGroups";
import { isSystemRole } from "./roleUtils";

type RoleFormValues = {
  name: string;
  permissions: string[];
};

interface RolePermissionsPanelProps {
  mode: "create" | "edit";
  role: RoleWithPermissions | null;
  availablePermissions: Permission[];
  loadingPermissions: boolean;
  permissionsError?: boolean;
  onCreate: (data: RoleFormData) => Promise<RoleWithPermissions>;
  onUpdate: (
    id: number,
    data: Pick<RoleFormData, "permissions">
  ) => Promise<RoleWithPermissions>;
  onSaved: (mode: "create" | "update", role: RoleWithPermissions) => void;
  onCancel: () => void;
  onRequestDelete: (role: RoleWithPermissions) => void;
  onSubmittingChange?: (submitting: boolean) => void;
  className?: string;
}

export function RolePermissionsPanel({
  mode,
  role,
  availablePermissions,
  loadingPermissions,
  permissionsError,
  onCreate,
  onUpdate,
  onSaved,
  onCancel,
  onRequestDelete,
  onSubmittingChange,
  className,
}: RolePermissionsPanelProps) {
  const isEditMode = mode === "edit";
  const isProtected = isEditMode && !!role && isSystemRole(role.name);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RoleFormValues>({
    defaultValues: { name: "", permissions: [] },
  });
  const {
    handleSubmit,
    control,
    reset,
    setError,
    formState: { isSubmitting, isDirty },
  } = form;

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  useEffect(() => {
    setServerError(null);
    if (isEditMode && role) {
      reset({ name: role.name, permissions: role.permissions ?? [] });
    } else {
      reset({ name: "", permissions: [] });
    }
  }, [mode, role, isEditMode, reset]);

  const groups = useMemo(
    () => groupPermissions(availablePermissions),
    [availablePermissions]
  );

  const onSubmit = async (data: RoleFormValues) => {
    setServerError(null);

    if (!isEditMode && !data.name.trim()) {
      setError("name", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    if (data.permissions.length === 0) {
      setError("permissions", {
        type: "manual",
        message: "يجب اختيار صلاحية واحدة على الأقل",
      });
      return;
    }

    try {
      if (isEditMode && role) {
        const updated = await onUpdate(role.id, { permissions: data.permissions });
        onSaved("update", updated);
      } else {
        const created = await onCreate({ name: data.name, permissions: data.permissions });
        onSaved("create", created);
      }
    } catch (err) {
      const message = roleService.getErrorMessage(err);
      setServerError(message);
      const fieldErrors = roleService.getValidationErrors(err);
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof RoleFormValues, {
            type: "manual",
            message: messages[0],
          });
        });
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex h-full flex-col overflow-hidden", className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        {isEditMode && role ? (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">
                {role.name}
              </h2>
              {isProtected && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="size-3" />
                  دور نظام
                </Badge>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {role.users_count ? (
                <Link
                  to={`/admin/users?role=${encodeURIComponent(role.name)}`}
                  className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                >
                  <Users className="size-3.5" />
                  {role.users_count} مستخدم
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  لا يوجد مستخدمون
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <Controller
              control={control}
              name="name"
              rules={{ required: "هذا الحقل مطلوب" }}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="role-name"
                    placeholder="اسم الدور الجديد..."
                    autoFocus
                    disabled={isSubmitting}
                    aria-invalid={!!fieldState.error}
                    className="h-auto border-none bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
                    {...field}
                  />
                  {fieldState.error ? (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      دور جديد — حدد الصلاحيات التي سيحصل عليها المستخدمون المعينون له
                    </p>
                  )}
                </>
              )}
            />
          </div>
        )}

        {isEditMode && role && !isProtected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">إجراءات الدور</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem variant="destructive" onSelect={() => onRequestDelete(role)}>
                <Trash2 className="size-4" />
                حذف الدور
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>تعذر الحفظ</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Controller
          control={control}
          name="permissions"
          render={({ field, fieldState }) => {
            const selected = new Set(field.value);
            const toggle = (name: string, checked: boolean) => {
              field.onChange(
                checked ? [...field.value, name] : field.value.filter((p) => p !== name)
              );
            };

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">الصلاحيات</h3>
                    <p className="text-xs text-muted-foreground">
                      {selected.size} من {availablePermissions.length} محددة
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={isSubmitting || loadingPermissions}
                      onClick={() => field.onChange(availablePermissions.map((p) => p.name))}
                    >
                      تحديد الكل
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={isSubmitting || loadingPermissions}
                      onClick={() => field.onChange([])}
                    >
                      إلغاء الكل
                    </Button>
                  </div>
                </div>

                {permissionsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>تعذر تحميل قائمة الصلاحيات</AlertTitle>
                    <AlertDescription>حاول إعادة تحميل الصفحة</AlertDescription>
                  </Alert>
                ) : loadingPermissions ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : availablePermissions.length === 0 ? (
                  <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    لا توجد صلاحيات متاحة في النظام
                  </p>
                ) : (
                  <div className="space-y-6">
                    {groups.map((group) => {
                      const groupSelected = group.permissions.filter((p) =>
                        selected.has(p.name)
                      ).length;
                      return (
                        <SettingsGroup
                          key={group.id}
                          title={group.label}
                          description={`${groupSelected}/${group.permissions.length} محددة`}
                        >
                          {group.permissions.map((permission) => (
                            <SwitchField
                              key={permission.id}
                              label={permission.name}
                              checked={selected.has(permission.name)}
                              onCheckedChange={(checked) => toggle(permission.name, checked)}
                              className={
                                isSubmitting ? "pointer-events-none opacity-60" : undefined
                              }
                            />
                          ))}
                        </SettingsGroup>
                      );
                    })}
                  </div>
                )}

                {fieldState.error && (
                  <p className="text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t bg-background px-5 py-3.5">
        {isDirty && (
          <span className="me-auto text-xs text-muted-foreground">تغييرات غير محفوظة</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSubmitting || (isEditMode && !isDirty)}
          onClick={() => {
            if (isEditMode && role) {
              reset({ name: role.name, permissions: role.permissions ?? [] });
            } else {
              onCancel();
            }
          }}
          className="gap-1.5"
        >
          {isEditMode ? (
            <>
              <RotateCcw className="size-3.5" />
              تراجع
            </>
          ) : (
            "إلغاء"
          )}
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="min-w-28 gap-2">
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isEditMode ? "حفظ التغييرات" : "إنشاء الدور"}
        </Button>
      </div>
    </form>
  );
}
