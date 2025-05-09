// src/components/admin/roles/RoleFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Services and Types
import roleService, {
  RoleFormData,
  RoleWithPermissions,
  Permission,
} from "../../../../services/roleService"; // Adjust path
import { useAuth } from "@/context/AuthContext";

// --- Zod Schema ---
const roleFormSchema = z.object({
  name: z.string().min(1, { message: "validation:required" }), // Role name is usually required
  permissions: z.array(z.string()), // Array of permission names assigned
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

// --- Component Props ---
interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit: RoleWithPermissions | null; // Role object for editing (includes current permissions)
  onSaveSuccess: (role: RoleWithPermissions) => void; // Callback with saved/created role
  availablePermissions: Permission[]; // List of all permissions from backend
  loadingPermissions: boolean; // Loading state for permissions list
}

// --- Component ---
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
  ]); // Add permissions namespace if needed
  const isEditMode = Boolean(roleToEdit);

  const [serverError, setServerError] = useState<string | null>(null);

  const {user} =  useAuth()
  // --- RHF Setup ---
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", permissions: [] }, // Default values for form fields
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, errors },
    setError,
  } = form;

  // --- Effect to Populate/Reset Form ---
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (isEditMode && roleToEdit) {
        console.log(roleToEdit, 'roleToEdit')
        reset({
          name: roleToEdit.name || "",
          permissions: roleToEdit.permissions || [], // Use permissions from the role object
        });
      } else {
        reset({ name: "", permissions: [] }); // Reset for adding
      }
    }
  }, [isOpen, isEditMode, roleToEdit, reset]);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<RoleFormValues> = async (data) => {
    setServerError(null);
    console.log(`Submitting ${isEditMode ? "update" : "create"} role:`, data);

    // Name is usually not updatable after creation, depends on backend controller logic
    const apiData: RoleFormData | Pick<RoleFormData, "permissions"> = isEditMode
      ? { permissions: data.permissions } // Only send permissions for update
      : data; // Send all data for create

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
        /* ... map apiErrors using setError (e.g., for 'name' if editable/creating) ... */
      }
    }
  };

  // --- Render Modal ---
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0">
        {" "}
        {/* Width suitable for role form */}
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
              <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isEditMode ? t("roles:editRole") : t("roles:addRole")}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {serverError &&
                !isSubmitting &&
                "/* ... Alert for serverError ... */"}

              {/* Role Name Field (Readonly in edit mode usually) */}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("roles:roleName")}{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("roles:roleNamePlaceholder")}
                        {...field}
                        disabled={isSubmitting || isEditMode} // Disable name change in edit mode
                        readOnly={isEditMode} // Make explicitly readonly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Permissions Assignment */}
              <FormField
                control={control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel className="text-base">
                        {t("roles:assignPermissions")}
                      </FormLabel>
                      <FormDescription>
                        {t("roles:assignPermissionsDesc")}
                      </FormDescription>
                    </div>
                    <ScrollArea className="h-64 w-full rounded-md border p-2 dark:border-gray-700">
                      {" "}
                      {/* Increased height */}
                      {loadingPermissions ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin me-2" />{" "}
                          {t("common:loading")}...
                        </div>
                      ) : availablePermissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          {t("permissions:noneAvailable")}
                        </p> // Add key
                      ) : (
                        availablePermissions.map((permission) => (
                          <FormField
                            key={permission.id}
                            control={control}
                            name="permissions"
                            render={({ field: permissionField }) => {
                              console.log(permissionField,'permissionField')
                              return (
                                <FormItem
                                  key={permission.id}
                                  className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse mb-2 px-2 py-1 rounded hover:bg-accent"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={permissionField.value?.includes(
                                        permission.name
                                      )}
                                      disabled={isSubmitting}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? permissionField.onChange([
                                              ...(permissionField.value || []),
                                              permission.name,
                                            ])
                                          : permissionField.onChange(
                                              (
                                                permissionField.value || []
                                              ).filter(
                                                (value) =>
                                                  value !== permission.name
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm cursor-pointer flex-grow">
                                    {/* Try translating permission name, fallback to original */}
                                    {t(`permissions:${permission.name}`, {
                                      defaultValue: permission.name,
                                    })}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))
                      )}
                    </ScrollArea>
                    <FormMessage>
                      {errors.permissions?.message
                        ? t(errors.permissions.message)
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="p-6 pt-4 border-t dark:border-gray-700">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSubmitting}>
                  {t("common:cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {" "}
                {isSubmitting && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}{" "}
                {isEditMode ? t("common:update") : t("common:create")}{" "}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleFormModal;
