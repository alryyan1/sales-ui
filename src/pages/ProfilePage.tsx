// src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form'; // Import FormProvider
import { useAuth } from '@/context/AuthContext'; // Get user data and update context
import authService, { UpdateProfileData, UpdatePasswordData, User } from '@/services/authService'; // Import service methods
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, KeyRound, UserCircle, AlertCircle } from 'lucide-react';

// Types for forms
export type ProfileFormValues = {
    name: string;
    username: string;
};

export type PasswordFormValues = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

// --- Child Form Components ---

// Profile Details Form Component
interface ProfileDetailsFormProps {
    currentUser: User; // Receive current user data
    onUpdateSuccess: (updatedUser: User) => void; // Callback to update context
}
const ProfileDetailsForm: React.FC<ProfileDetailsFormProps> = ({ currentUser, onUpdateSuccess }) => {
    const { t } = useTranslation(["profile"]);
    const [serverError, setServerError] = useState<string | null>(null);
    const form = useForm<ProfileFormValues>({
        defaultValues: {
            name: currentUser.name || '',
            username: currentUser.username || '',
        },
    });
    const { handleSubmit, control, formState: { isSubmitting, errors }, setError } = form;

    const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
        setServerError(null);
        
        // Basic validation
        if (!data.name || data.name.trim() === "") {
            setError("name", { type: "manual", message: t("profile:fieldRequired") });
            return;
        }
        if (!data.username || data.username.trim() === "") {
            setError("username", { type: "manual", message: t("profile:fieldRequired") });
            return;
        }

        try {
            const result = await authService.updateProfile(data);
            toast.success(t("profile:successTitle"), { description: t("profile:profileUpdateSuccessDesc") });
            onUpdateSuccess(result); // Update user in global context
        } catch (err) {
            const generalError = authService.getErrorMessage(err);
            const apiErrors = authService.getValidationErrors(err);
            toast.error(t("profile:errorTitle"), { description: generalError });
            setServerError(generalError);
            if (apiErrors) {
                Object.entries(apiErrors).forEach(([field, messages]) => {
                    if (["name", "username"].includes(field)) {
                        setError(field as keyof ProfileFormValues, {
                            type: "server",
                            message: messages[0],
                        });
                    }
                });
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5"/> {t("profile:detailsCardTitle")}</CardTitle>
                <CardDescription>{t("profile:detailsCardDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                         {serverError && !isSubmitting && ( <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t("profile:errorTitle")}</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert> )}
                        <FormField control={control} name="name" render={({ field }) => ( <FormItem> <FormLabel>{t("profile:nameLabel")}</FormLabel> <FormControl><Input {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.name?.message || null}</FormMessage> </FormItem> )} />
                        <FormField control={control} name="username" render={({ field }) => ( <FormItem> <FormLabel>{t("profile:usernameLabel")}</FormLabel> <FormControl><Input {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.username?.message || null}</FormMessage> </FormItem> )} />
                        <div className="flex justify-end">
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {t("profile:saveChangesButton")}
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
    const { t } = useTranslation(["profile"]);
    const [serverError, setServerError] = useState<string | null>(null);
    const form = useForm<PasswordFormValues>({
        defaultValues: { current_password: '', password: '', password_confirmation: '' },
    });
    const { handleSubmit, control, formState: { isSubmitting, errors }, setError, reset: resetPasswordForm } = form;

    const onSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
        setServerError(null);
        
        // Basic validation
        if (!data.current_password || data.current_password.trim() === "") {
            setError("current_password", { type: "manual", message: t("profile:fieldRequired") });
            return;
        }
        if (!data.password || data.password.length < 8) {
            setError("password", { type: "manual", message: t("profile:passwordMinLength") });
            return;
        }
        if (data.password !== data.password_confirmation) {
            setError("password_confirmation", { type: "manual", message: t("profile:passwordsMismatch") });
            return;
        }

        try {
            const result = await authService.updatePassword(data);
            toast.success(t("profile:successTitle"), { description: t("profile:passwordUpdateSuccessDesc") });
            resetPasswordForm(); // Clear form on success
        } catch (err) {
            const generalError = authService.getErrorMessage(err);
            const apiErrors = authService.getValidationErrors(err);
            toast.error(t("profile:errorTitle"), { description: generalError });
            setServerError(generalError);
            if (apiErrors) {
                Object.entries(apiErrors).forEach(([field, messages]) => {
                     if (field in ({} as PasswordFormValues)) {
                        setError(field as keyof PasswordFormValues, { type: 'server', message: messages[0] });
                    } else if (field === 'password' && messages[0].includes('current password')) {
                         setError('current_password', { type: 'server', message: messages[0] });
                    }
                 });
                 if (Object.keys(apiErrors).length > 0) setServerError(t("profile:pleaseCheckFields"));
            }
        }
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/> {t("profile:passwordCardTitle")}</CardTitle>
                <CardDescription>{t("profile:passwordCardDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {serverError && !isSubmitting && ( <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t("profile:errorTitle")}</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert> )}
                        <FormField control={control} name="current_password" render={({ field }) => ( <FormItem> <FormLabel>{t("profile:currentPasswordLabel")}</FormLabel> <FormControl><Input type="password" {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.current_password?.message || null}</FormMessage> </FormItem> )} />
                        <FormField control={control} name="password" render={({ field }) => ( <FormItem> <FormLabel>{t("profile:newPasswordLabel")}</FormLabel> <FormControl><Input type="password" {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.password?.message || null}</FormMessage> </FormItem> )} />
                        <FormField control={control} name="password_confirmation" render={({ field }) => ( <FormItem> <FormLabel>{t("profile:confirmNewPasswordLabel")}</FormLabel> <FormControl><Input type="password" {...field} disabled={isSubmitting} /></FormControl> <FormMessage>{errors.password_confirmation?.message || null}</FormMessage> </FormItem> )} />
                        <div className="flex justify-end">
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {t("profile:updatePasswordButton")}
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
    const { t } = useTranslation(["profile"]);
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
        return <div className="p-6 text-center">{t("profile:loadingEllipsis")}</div>;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto"> {/* Center content */}
             <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
                {t("profile:pageTitle")}
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