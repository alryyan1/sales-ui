// src/pages/ProfilePage.tsx (or a separate validation file)
import * as z from 'zod';

// src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form'; // Import FormProvider
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext'; // Get user data and update context
import authService, { UpdateProfileData, UpdatePasswordData, User } from '@/services/authService'; // Import service methods
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, KeyRound, UserCircle, AlertCircle } from 'lucide-react';

// Schema for updating profile details
export const profileSchema = z.object({
    name: z.string().min(1, { message: "validation:required" }),
    username: z.string().min(1, { message: "validation:required" }),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

// Schema for changing password
export const passwordSchema = z.object({
    current_password: z.string().min(1, { message: "validation:required" }),
    password: z.string().min(8, { message: "validation:minLength", params: { count: 8 } }), // Add params if your t() supports it
    password_confirmation: z.string().min(1, { message: "validation:required" }),
}).refine(data => data.password === data.password_confirmation, {
    message: "validation:passwordMismatch",
    path: ["password_confirmation"], // Error applies to confirmation field
});
export type PasswordFormValues = z.infer<typeof passwordSchema>;

// --- Child Form Components ---

// Profile Details Form Component
interface ProfileDetailsFormProps {
    currentUser: User; // Receive current user data
    onUpdateSuccess: (updatedUser: User) => void; // Callback to update context
}
const ProfileDetailsForm: React.FC<ProfileDetailsFormProps> = ({ currentUser, onUpdateSuccess }) => {
    const { t } = useTranslation(['profile', 'common', 'validation']);
    const [serverError, setServerError] = useState<string | null>(null);
    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: currentUser.name || '',
            username: currentUser.username || '',
        },
    });
    const { handleSubmit, control, formState: { isSubmitting, errors }, setError } = form;

    const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
        setServerError(null);
        try {
            const result = await authService.updateProfile(data);
            toast.success(t('common:success'), { description: t('profile:updateSuccess') });
            onUpdateSuccess(result); // Update user in global context
        } catch (err) {
            const generalError = authService.getErrorMessage(err);
            const apiErrors = authService.getValidationErrors(err);
            toast.error(t('common:error'), { description: generalError });
            setServerError(generalError);
            if (apiErrors) { /* ... map errors using setError ... */ }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5"/> {t('profile:detailsTitle')}</CardTitle>
                <CardDescription>{t('profile:detailsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                         {serverError && !isSubmitting && ( <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t('common:error')}</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert> )}
                        <FormField control={control} name="name" render={({ field }) => ( <FormItem> <FormLabel>{t('profile:nameLabel')}</FormLabel> <FormControl><Input {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.name?.message ? t(errors.name.message) : null}</FormMessage> </FormItem> )} />
                        <FormField control={control} name="username" render={({ field }) => ( <FormItem> <FormLabel>{t('profile:usernameLabel')}</FormLabel> <FormControl><Input {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.username?.message ? t(errors.username.message) : null}</FormMessage> </FormItem> )} />
                        <div className="flex justify-end">
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {t('common:saveChanges')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

// Change Password Form Component
interface ChangePasswordFormProps { } // No extra props needed, uses auth context implicitly if required
const ChangePasswordForm: React.FC<ChangePasswordFormProps> = () => {
    const { t } = useTranslation(['profile', 'common', 'validation']);
    const [serverError, setServerError] = useState<string | null>(null);
    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { current_password: '', password: '', password_confirmation: '' },
    });
    const { handleSubmit, control, formState: { isSubmitting, errors }, setError, reset: resetPasswordForm } = form;

    const onSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
        setServerError(null);
        try {
            const result = await authService.updatePassword(data);
            toast.success(t('common:success'), { description: t('profile:passwordUpdateSuccess') });
            resetPasswordForm(); // Clear form on success
        } catch (err) {
            const generalError = authService.getErrorMessage(err);
            const apiErrors = authService.getValidationErrors(err);
            toast.error(t('common:error'), { description: generalError });
            setServerError(generalError);
            if (apiErrors) {
                // Map errors like current_password incorrect, or new password validation
                Object.entries(apiErrors).forEach(([field, messages]) => {
                     if (field in ({} as PasswordFormValues)) {
                        setError(field as keyof PasswordFormValues, { type: 'server', message: messages[0] });
                    } else if (field === 'password' && messages[0].includes('current password')) { // Handle specific backend message for current_password
                         setError('current_password', { type: 'server', message: messages[0] });
                    }
                 });
                 if (Object.keys(apiErrors).length > 0) setServerError(t('validation:checkFields'));

            }
        }
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/> {t('profile:passwordTitle')}</CardTitle>
                <CardDescription>{t('profile:passwordDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {serverError && !isSubmitting && ( <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t('common:error')}</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert> )}
                        <FormField control={control} name="current_password" render={({ field }) => ( <FormItem> <FormLabel>{t('profile:currentPasswordLabel')}</FormLabel> <FormControl><Input type="password" {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.current_password?.message ? t(errors.current_password.message) : null}</FormMessage> </FormItem> )} />
                        <FormField control={control} name="password" render={({ field }) => ( <FormItem> <FormLabel>{t('profile:newPasswordLabel')}</FormLabel> <FormControl><Input type="password" {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.password?.message ? t(errors.password.message, { count: 8 } as any) : null}</FormMessage> </FormItem> )} />
                        <FormField control={control} name="password_confirmation" render={({ field }) => ( <FormItem> <FormLabel>{t('profile:confirmPasswordLabel')}</FormLabel> <FormControl><Input type="password" {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.password_confirmation?.message ? t(errors.password_confirmation.message) : null}</FormMessage> </FormItem> )} />
                        <div className="flex justify-end">
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {t('profile:updatePasswordButton')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};


// --- Main Profile Page Component ---
const ProfilePage: React.FC = () => {
    const { t } = useTranslation(['profile', 'common']);
    const { user, setUser } = useAuth(); // Get user and a way to update it in context

     // Callback to update user in global context after successful profile update
     const handleProfileUpdateSuccess = (updatedUser: User) => {
         // Create a new user object merging existing with updated, preserving roles/permissions if not returned by update endpoint
         setUser(prevUser => prevUser ? ({
            ...prevUser, // Keep existing fields like roles/permissions
            ...updatedUser // Override with updated fields (id, name, email etc)
         }) : null);
     };

    if (!user) {
        // Should be handled by ProtectedRoute, but good fallback
        return <div className="p-6 text-center">{t('common:loading')}...</div>;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto"> {/* Center content */}
             <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
                {t('profile:pageTitle')}
            </h1>

             {/* Pass user data and update callback to details form */}
             <ProfileDetailsForm
                currentUser={user}
                onUpdateSuccess={handleProfileUpdateSuccess}
             />

            <Separator />

            {/* Password change form */}
            <ChangePasswordForm />

        </div>
    );
};

export default ProfilePage;