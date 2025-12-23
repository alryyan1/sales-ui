// src/pages/RegisterPage.tsx
import React, { useState, FormEvent, useEffect } from 'react'; // Added useEffect
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useForm, SubmitHandler, Controller } from 'react-hook-form'; // Import Controller

// MUI Components
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField'; // We'll wrap this with Controller
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid'; // Import Grid
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Or AppRegistrationIcon
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Auth Service and Context
import authService, { User, RegisterCredentials } from '../services/authService'; // Ensure RegisterCredentials is defined or imported
import { useAuth } from '../context/AuthContext'; // Adjust import path as needed

// Type for validation errors specific to this form
interface RegistrationErrors {
    name?: string[];
    username?: string[];
    password?: string[];
    // Add other fields if your backend validation returns them
    [key: string]: string[] | undefined; // Index signature
}

// Define the shape of our form data
type RegisterFormInputs = RegisterCredentials; // Use the type from authService or define inline

const RegisterPage: React.FC = () => {
    const { user, isLoading: isAuthLoading, handleRegisterSuccess } = useAuth();

    // State for general API errors (non-validation)
    const [serverError, setServerError] = useState<string | null>(null);

    // --- React Hook Form Setup ---
    const {
        handleSubmit,
        reset,
        control, // Get control for Controller
        formState: { errors, isSubmitting },
        setError, // Get setError for API validation errors
        watch   // Get watch to compare passwords client-side
    } = useForm<RegisterFormInputs>({
        defaultValues: {
            name: '', username: '', password: '', password_confirmation: ''
        },
    });

    // Watch the password field to compare with confirmation
    const passwordValue = watch("password");

    // --- Redirect if already logged in ---
    useEffect(() => {
        if (!isAuthLoading && user) {
             console.log("RegisterPage: User already logged in, redirecting...");
        }
        // Reset form if user logs out while on this page (edge case)
        if (!user) {
            // reset(); // Might cause issues if called too often, handle carefully
        }
    }, [isAuthLoading, user, reset]);

    if (!isAuthLoading && user) {
        return <Navigate to="/dashboard" replace />;
    }

    // --- Form Submission Handler ---
    const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
        setServerError(null); // Clear previous server error

        // Client-side password match check (optional, RHF can handle this too)
        // if (data.password !== data.password_confirmation) {
        //     setError('password_confirmation', { type: 'manual', message: t('validation:passwordMismatch') });
        //     return;
        // }

        try {
            // Data is already validated by RHF if using rules/resolver
            const authResponse = await authService.register(data);
            handleRegisterSuccess(authResponse.user); // Call context handler on success
        } catch (err) {
            console.error("Registration failed:", err);
            const apiErrors = authService.getValidationErrors(err);
            const generalError = authService.getErrorMessage(err);

            if (apiErrors) {
                // Map API validation errors to RHF fields
                Object.entries(apiErrors).forEach(([field, messages]) => {
                     if (field in ({} as RegisterFormInputs)) { // Basic check
                         setError(field as keyof RegisterFormInputs, {
                            type: 'server',
                            message: messages[0] // Show first server error message
                         });
                     }
                 });
                 setServerError('يرجى التحقق من الحقول'); // General hint
            } else {
                setServerError(generalError); // Show general error
            }
        }
    };

     // --- Loading Check ---
     if (isAuthLoading) {
         return ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}> <CircularProgress /> </Box> );
     }

    // --- Render Registration Form ---
    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <LockOutlinedIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    إنشاء حساب جديد
                </Typography>

                {/* General Server Error Alert */}
                {serverError && (
                    <Alert severity="error" sx={{ width: '100%', mt: 2 }} onClose={() => setServerError(null)}>
                        {serverError}
                    </Alert>
                )}

                {/* Use form tag for RHF handleSubmit */}
                <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
                    {/* Use Grid container with spacing */}
                    {/* <Grid container spacing={2}> */}

                        {/* Name Field - Full width on all screens */}
                        {/* <Grid item xs={12}> */}
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: 'هذا الحقل مطلوب' }}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        autoComplete="name"
                                        required
                                        fullWidth
                                        id="name"
                                        label="الاسم"
                                        autoFocus // Focus this first
                                        variant="outlined"
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message || ' '}
                                        disabled={isSubmitting}
                                    />
                                )}
                            />
                        {/* </Grid> */}

                        {/* Username Field - Full width on all screens */}
                        {/* <Grid item xs={12}> */}
                             <Controller
                                name="username"
                                control={control}
                                rules={{
                                    required: 'هذا الحقل مطلوب',
                                }}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        id="username"
                                        label="اسم المستخدم"
                                        name="username" // RHF uses the 'name' from Controller
                                        autoComplete="username"
                                        variant="outlined"
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message || ' '}
                                        disabled={isSubmitting}
                                    />
                                )}
                            />
                        {/* </Grid> */}

                        {/* Password Field - Full width on xs, half on sm+ */}
                        {/* <Grid item xs={12} sm={6}> */}
                             <Controller
                                name="password"
                                control={control}
                                rules={{
                                    required: 'هذا الحقل مطلوب',
                                    minLength: { value: 8, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }
                                }}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        name="password"
                                        label="كلمة المرور"
                                        type="password"
                                        id="password"
                                        autoComplete="new-password"
                                        variant="outlined"
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message || ' '}
                                        disabled={isSubmitting}
                                    />
                                )}
                            />
                        {/* </Grid> */}

                        {/* Confirm Password Field - Full width on xs, half on sm+ */}
                        {/* <Grid item xs={12} sm={6}> */}
                             <Controller
                                name="password_confirmation"
                                control={control}
                                rules={{
                                    required: 'هذا الحقل مطلوب',
                                    validate: value => value === passwordValue || 'كلمات المرور غير متطابقة'
                                }}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        required
                                        fullWidth
                                        name="password_confirmation"
                                        label="تأكيد كلمة المرور"
                                        type="password"
                                        id="password_confirmation"
                                        autoComplete="new-password"
                                        variant="outlined"
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message || ' '}
                                        disabled={isSubmitting}
                                    />
                                )}
                            />
                        {/* </Grid> */}
                    {/* </Grid> */}
                     {/* End Grid container */}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{ mt: 3, mb: 2 }} // MUI spacing
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {isSubmitting ? 'جاري التسجيل...' : 'إنشاء حساب'}
                    </Button>

                    {/* Link to Login Page */}
                    <Grid container justifyContent="flex-end">
                        <Grid>
                            <Link component={RouterLink} to="/login" variant="body2">
                                لديك حساب بالفعل؟ تسجيل الدخول
                            </Link>
                        </Grid>
                    </Grid>
                </Box> {/* End Form Box */}
            </Box> {/* End Main Centering Box */}
        </Container>
    );
};

export default RegisterPage;