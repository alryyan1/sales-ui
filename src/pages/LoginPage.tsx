// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ShoppingCart, Users, Building, Box, BarChart3, CircleDollarSign } from 'lucide-react'; // Added more icons

// Auth Service and Context
import authService from '@/services/authService'; // Assuming LoginCredentials defined
import { useAuth } from '@/context/AuthContext';

// --- Zod Schema for Login Form ---
const loginSchema = z.object({
    email: z.string().min(1, { message: "validation:required" }).email({ message: "validation:email" }),
    password: z.string().min(1, { message: "validation:required" }),
    // remember: z.boolean().optional().default(false), // If you add "Remember Me"
});
type LoginFormValues = z.infer<typeof loginSchema>;

// --- Animated Feature Card Component ---
interface FeatureCardProps {
    icon: React.ElementType;
    titleKey: string;
    descriptionKey: string;
    delay?: string; // For animation delay
}
const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, titleKey, descriptionKey, delay }) => {
    const { t } = useTranslation(['login', 'navigation']); // Assuming titles are in navigation or login
    return (
        <Card className={cn(
            "bg-card/80 dark:bg-gray-800/70 backdrop-blur-sm border-border/50 shadow-lg",
            "transform transition-all duration-500 ease-out",
            "opacity-0 animate-fadeInUp", // Simple fade-in-up animation
        )} style={{ animationDelay: delay }}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                 <Icon className="h-6 w-6 text-primary" />
                 <CardTitle className="text-md font-medium text-card-foreground dark:text-gray-200">{t(titleKey)}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground dark:text-gray-400">{t(descriptionKey)}</p>
            </CardContent>
        </Card>
    );
};
// Add this animation to your global CSS (e.g., index.css)
/*
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeInUp {
  animation-name: fadeInUp;
  animation-fill-mode: both; // Keep final state
  animation-duration: 0.6s; // Default duration if not overridden by delay
}
*/


// --- Main Login Page Component ---
const LoginPage: React.FC = () => {
    const { t } = useTranslation(['login', 'common', 'validation', 'navigation']);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoading: isAuthLoading, handleLoginSuccess } = useAuth();

    const [serverError, setServerError] = useState<string | null>(null);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' /*, remember: false */ },
    });
    const { handleSubmit, control, formState: { isSubmitting } } = form;

    // --- Redirect if already logged in ---
    useEffect(() => {
        if (!isAuthLoading && user) {
            const from = location.state?.from?.pathname || "/dashboard";
            navigate(from, { replace: true });
        }
    }, [isAuthLoading, user, location.state, navigate]);

    // --- Form Submission ---
    const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
        setServerError(null);
        try {
            const authResponse = await authService.login(data);
            handleLoginSuccess(authResponse);
            // Redirect to intended destination or dashboard
            const from = location.state?.from?.pathname || "/dashboard";
            navigate(from, { replace: true });
        } catch (err) {
            const errorMsg = authService.getErrorMessage(err, t('login:loginFailed'));
            toast.error(t('common:error'), { description: errorMsg });
            setServerError(errorMsg);
        }
    };

    // --- Feature cards data ---
    const features = [
        { icon: CircleDollarSign, titleKey: "navigation:sales", descriptionKey: "navigation:salesDesc", delay: "0.1s" },
        { icon: ShoppingCart, titleKey: "navigation:purchases", descriptionKey: "navigation:purchasesDesc", delay: "0.2s" },
        { icon: Box, titleKey: "navigation:products", descriptionKey: "navigation:inventoryDesc", delay: "0.3s" },
        { icon: Users, titleKey: "navigation:clients", descriptionKey: "navigation:clientsDesc", delay: "0.4s" },
        { icon: Building, titleKey: "navigation:suppliers", descriptionKey: "navigation:suppliersDesc", delay: "0.5s" },
        { icon: BarChart3, titleKey: "navigation:reports", descriptionKey: "navigation:reportsDesc", delay: "0.6s" },
    ];


    if (isAuthLoading && !user) { // Show loader only if auth check is happening and no user yet
        return ( <div className="flex justify-center items-center h-screen bg-background dark:bg-gray-950"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div> );
    }
    // If user becomes available while still on login page (e.g. fast token refresh), redirect is handled by useEffect

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-gray-900 dark:via-gray-900 dark:to-slate-800">
            {/* Left Column: Animated Feature Cards */}
            <div className="hidden lg:flex flex-col items-center justify-center p-8 md:p-12 space-y-6 relative overflow-hidden">
                {/* Optional: Background elements or large logo */}
                 {/* <img src="/placeholder.svg" alt="App Illustration" className="absolute -bottom-32 -left-32 w-2/3 opacity-10 pointer-events-none" /> */}
                 <h1 className="text-3xl font-bold tracking-tight text-center text-gray-800 dark:text-gray-100 mb-8 animate-fadeInUp" style={{animationDelay: '0s'}}>
                     {t('common:appName')}
                 </h1>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                     {features.map((feature, index) => (
                         <FeatureCard
                            key={index}
                            icon={feature.icon}
                            titleKey={feature.titleKey}
                            descriptionKey={feature.descriptionKey}
                            delay={feature.delay}
                        />
                     ))}
                 </div>
                 <p className="text-xs text-muted-foreground dark:text-gray-500 mt-10 animate-fadeInUp" style={{animationDelay: '0.8s'}}>
                     {t('navigation:systemWelcome')} {/* Add key: e.g., "Welcome to the comprehensive sales management system." */}
                 </p>
            </div>

            {/* Right Column: Login Form */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
                 <div className="w-full max-w-md space-y-8 animate-fadeInUp" style={{animationDelay: '0.2s'}}> {/* Added animation */}
                     {/* Mobile Logo/Title */}
                     <div className="lg:hidden text-center">
                         <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                             {t('common:appName')}
                         </h1>
                     </div>

                    <Card className="shadow-xl dark:bg-gray-800/80 dark:border-gray-700/50 backdrop-blur-md">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{t('login:title')}</CardTitle>
                            <CardDescription className="dark:text-gray-400">{t('navigation:loginSubtitle')}</CardDescription> {/* Add key: "Access your account" */}
                        </CardHeader>
                        <CardContent>
                             {serverError && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>{t('common:error')}</AlertTitle>
                                    <AlertDescription>{serverError}</AlertDescription>
                                </Alert>
                            )}
                            <Form {...form}>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('login:emailLabel')}</FormLabel>
                                                <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isSubmitting} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel>{t('login:passwordLabel')}</FormLabel>
                                                     {/* Optional: Forgot Password Link */}
                                                     {/* <div className="text-sm">
                                                        <RouterLink to="/forgot-password" className="font-medium text-primary hover:text-primary/90">
                                                            {t('login:forgotPassword')}
                                                        </RouterLink>
                                                    </div> */}
                                                </div>
                                                <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     {/* Optional: Remember Me Checkbox */}
                                     {/* <FormField control={control} name="remember" render={...} /> */}

                                    <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
                                        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                        {t('login:submitButton')}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3 text-center text-sm">
                            {/* Optional: Link to Registration */}
                             <p className="text-muted-foreground dark:text-gray-400">
                                {t('login:registerPrompt')}{' '}
                                <RouterLink to="/register" className="font-medium text-primary hover:text-primary/90">
                                    {t('login:registerLink')}
                                </RouterLink>
                            </p>
                        </CardFooter>
                    </Card>
                     <p className="mt-10 text-center text-xs text-muted-foreground dark:text-gray-500">
                         © {new Date().getFullYear()} {t('common:appName')}. {t('navigation:allRightsReserved')}
                     </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;