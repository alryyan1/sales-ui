// src/components/admin/users/UserFormModal.tsx
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input"; // Base Input
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'; // <-- Import Eye and EyeOff
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Services and Types
import userService, { UserFormData, Role } from '../../../services/userService'; // Adjust path
import { User } from '../../../services/authService'; // Base User type



// --- Component Props ---
interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToEdit: User | null; // User object for editing
    onSaveSuccess: (user: User) => void; // Callback with saved/created user
    availableRoles: Role[]; // List of all roles from backend
}

// --- Component ---
const UserFormModal: React.FC<UserFormModalProps> = ({
    isOpen, onClose, userToEdit, onSaveSuccess, availableRoles
}) => {
    const { t } = useTranslation(['users', 'roles', 'common', 'validation']);
    const isEditMode = Boolean(userToEdit);

    // State for password visibility toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [serverError, setServerError] = useState<string | null>(null);

    // --- Zod Schema ---
    // We need to define the schema *inside* the component or pass `t` to it
    // because it now uses the `t` function for messages.
    const createUserSchema = z.object({
        name: z.string().min(1, { message: t("validation:required") }), // Direct use of t()
        email: z.string().min(1, { message: t("validation:required") }).email({ message: t("validation:email") }),
        password: z.string().min(8, { message: t("validation:minLength", { count: 8 }) }), // Interpolation works here if t is configured
        password_confirmation: z.string(),
        roles: z.array(z.string()).min(1, { message: t("validation:roleRequired") }),
    }).refine(data => data.password === data.password_confirmation, {
        message: t("validation:passwordMismatch"),
        path: ["password_confirmation"],
    });

    const updateUserSchema = z.object({
        name: z.string().min(1, { message: t("validation:required") }),
        email: z.string().min(1, { message: t("validation:required") }).email({ message: t("validation:email") }),
        roles: z.array(z.string()).min(1, { message: t("validation:roleRequired") }),
    });

    // Infer types
    type CreateUserFormValues = z.infer<typeof createUserSchema>;
    type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
    type CombinedUserFormValues = CreateUserFormValues | UpdateUserFormValues;

    // --- RHF Setup ---
    const form = useForm<CombinedUserFormValues>({
        resolver: zodResolver(isEditMode ? updateUserSchema : createUserSchema),
        defaultValues: {
            name: '', email: '', roles: [],
            password: '', password_confirmation: '', // Initialize even if conditionally rendered
        },
    });
    const { handleSubmit, control, reset, formState: { isSubmitting, errors }, setError } = form;

    // --- Effect to Populate/Reset Form ---
    useEffect(() => {
        if (isOpen) {
            setServerError(null);
            // Reset visibility toggles when opening
            setShowPassword(false);
            setShowConfirmPassword(false);
            if (isEditMode && userToEdit) {
                reset({
                    name: userToEdit.name || '',
                    email: userToEdit.email || '',
                    roles: userToEdit.roles || [],
                    password: '', password_confirmation: '', // Ensure passwords cleared for edit
                });
            } else {
                reset({ name: '', email: '', roles: [], password: '', password_confirmation: '' });
            }
        }
    }, [isOpen, isEditMode, userToEdit, reset]);

    // --- Form Submission ---
    const onSubmit: SubmitHandler<CombinedUserFormValues> = async (data) => {
        // ... (same onSubmit logic as before) ...
         setServerError(null);
         console.log(`Submitting ${isEditMode ? 'update' : 'create'} user:`, data);
         const { password_confirmation, ...apiData } = data;
         try {
             let savedUser: User;
             if (isEditMode && userToEdit) {
                 const updateData: Partial<UserFormData> = { name: apiData.name, email: apiData.email, roles: apiData.roles };
                 savedUser = await userService.updateUser(userToEdit.id, updateData);
             } else {
                 savedUser = await userService.createUser(data as CreateUserFormValues);
             }
             toast.success(t('common:success'), { description: t(isEditMode ? 'users:updateSuccess' : 'users:createSuccess') });
             onSaveSuccess(savedUser);
             onClose();
         } catch (err) {
             console.error("Failed to save user:", err);
             const generalError = userService.getErrorMessage(err);
             const apiErrors = userService.getValidationErrors(err);
             toast.error(t('common:error'), { description: generalError });
             setServerError(generalError);
             if (apiErrors) {
                 Object.entries(apiErrors).forEach(([field, messages]) => {
                     if (field in ({} as CombinedUserFormValues)) {
                         setError(field as keyof CombinedUserFormValues, { type: 'server', message: messages[0] });
                     }
                 });
                 setServerError(t('validation:checkFields'));
             }
         }
    };

    // --- Render Modal ---
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg p-0">
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
                             <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {isEditMode ? t('users:editUser') : t('users:addUser')}
                             </DialogTitle>
                        </DialogHeader>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {serverError && !isSubmitting && ( '/* ... Alert ... */ ')}

                       {/* Name Field */}
                       <FormField control={control} name="name" render={({ field }) => ( <FormItem> <FormLabel>{t('users:nameLabel')} <span className="text-red-500">*</span></FormLabel> <FormControl><Input {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )} />
                            {/* Email Field */}
                            <FormField control={control} name="email" render={({ field }) => ( <FormItem> <FormLabel>{t('users:emailLabel')} <span className="text-red-500">*</span></FormLabel> <FormControl><Input type="email" {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )} />

                            {/* Password Fields (ONLY FOR CREATE MODE with Visibility Toggle) */}
                            {!isEditMode && (
                                <>
                                    <FormField
                                        control={control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('users:passwordLabel')} <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    {/* Input wrapped for icon */}
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? "text" : "password"}
                                                            {...field}
                                                            disabled={isSubmitting}
                                                            className="pe-10" // Add padding for icon
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                                        >
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="password_confirmation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('users:confirmPasswordLabel')} <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                         <Input
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            {...field}
                                                            disabled={isSubmitting}
                                                            className="pe-10"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                                                        >
                                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {/* Role Assignment */}
                                                      <FormField
                                                         control={control}
                                                         name="roles"
                                                         render={({ field }) => (
                                                             <FormItem>
                                                                 <div className="mb-2">
                                                                     <FormLabel className="text-base">{t('roles:assignRoles')}</FormLabel>
                                                                     <FormDescription>{t('roles:assignRolesDesc')}</FormDescription>
                                                                 </div>
                                                                  {/* Use ScrollArea if many roles */}
                                                                  <ScrollArea className="h-40 w-full rounded-md border p-2 dark:border-gray-700">
                                                                     {availableRoles.map((role) => (
                                                                         <FormField
                                                                             key={role.id}
                                                                             control={control}
                                                                             name="roles"
                                                                             render={({ field: roleField }) => { // Inner field for array handling
                                                                                 return (
                                                                                     <FormItem
                                                                                         key={role.id}
                                                                                         className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse mb-2 px-2 py-1 rounded hover:bg-accent"
                                                                                     >
                                                                                         <FormControl>
                                                                                             <Checkbox
                                                                                                 checked={roleField.value?.includes(role.name)}
                                                                                                 disabled={isSubmitting || (role.name === 'admin' && userToEdit?.email === 'admin@example.com')} // Example: prevent removing admin from default admin
                                                                                                 onCheckedChange={(checked) => {
                                                                                                     return checked
                                                                                                         ? roleField.onChange([...(roleField.value || []), role.name]) // Add role
                                                                                                         : roleField.onChange( (roleField.value || []).filter((value) => value !== role.name) ); // Remove role
                                                                                                 }}
                                                                                             />
                                                                                         </FormControl>
                                                                                         <FormLabel className="font-normal text-sm cursor-pointer">
                                                                                             {t(`roles:${role.name}`, { defaultValue: role.name })} {/* Translate role name */}
                                                                                         </FormLabel>
                                                                                     </FormItem>
                                                                                 );
                                                                             }}
                                                                         />
                                                                     ))}
                                                                 </ScrollArea>
                                                                 <FormMessage>{errors.roles?.message ? t(errors.roles.message) : null}</FormMessage> {/* Error for roles array */}
                                                             </FormItem>
                                                         )}
                                                     />

                        </div>
                        <DialogFooter className="p-6 pt-4 border-t dark:border-gray-700">
                             {/* ... Cancel and Save/Update Buttons ... */}
                             <DialogClose asChild><Button type="button" variant="ghost" disabled={isSubmitting}>{t('common:cancel')}</Button></DialogClose>
                             <Button type="submit" disabled={isSubmitting}> {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />} {isEditMode ? t('common:update') : t('common:create')} </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default UserFormModal;