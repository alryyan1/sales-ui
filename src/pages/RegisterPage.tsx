// src/pages/RegisterPage.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// MUI Components
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Or AppRegistrationIcon
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Auth Service and Context
import authService from '../services/authService';
import { useAuth } from '../components/layouts/RootLayout'; // Context Hook

// Type for validation errors specific to this form
interface RegistrationErrors {
    name?: string[];
    email?: string[];
    password?: string[];
    // Add other fields if your backend validation returns them
}


const RegisterPage: React.FC = () => {
    const { t } = useTranslation(['register', 'common', 'validation']); // Load namespaces
    const { user, isLoading: isAuthLoading, handleRegisterSuccess } = useAuth(); // Get from context

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState<string | null>(null); // General error
    const [validationErrors, setValidationErrors] = useState<RegistrationErrors | null>(null); // Field-specific errors
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Redirect if already logged in ---
    useEffect(() => {
        if (!isAuthLoading && user) {
             console.log("RegisterPage: User already logged in, redirecting...");
        }
    }, [isAuthLoading, user]);

    if (!isAuthLoading && user) {
        return <Navigate to="/dashboard" replace />;
    }

    // --- Form Submission Handler ---
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setValidationErrors(null);

        // Basic client-side check for password match
        if (password !== passwordConfirmation) {
            setError(t('validation:passwordMismatch')); // Use translation key
            return;
        }

        setIsSubmitting(true);

        try {
            const credentials = { name, email, password, password_confirmation: passwordConfirmation };
            const authResponse = await authService.register(credentials);
            handleRegisterSuccess(authResponse.user); // Call context handler on success
        } catch (err) {
            console.error("Registration failed:", err);
            // Try to get specific validation errors first
            const specificErrors = authService.getValidationErrors(err);
            if (specificErrors) {
                 // Ensure type compatibility if necessary
                setValidationErrors(specificErrors as RegistrationErrors);
            } else {
                // Otherwise, show a general error message
                setError(authService.getErrorMessage(err));
            }
            setIsSubmitting(false);
        }
    };

    // --- Loading Check ---
    if (isAuthLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
                <CircularProgress />
            </Box>
        );
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
                    <LockOutlinedIcon /> {/* Or AppRegistrationIcon */}
                </Avatar>
                <Typography component="h1" variant="h5">
                    {t('register:title')}
                </Typography>

                {/* General Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                        {/* Name Field */}
                        <Grid item xs={12}>
                            <TextField
                                autoComplete="name"
                                name="name"
                                required
                                fullWidth
                                id="name"
                                label={t('register:nameLabel')}
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                                error={!!validationErrors?.name} // Show error state if validation error exists
                                helperText={validationErrors?.name?.[0]} // Show first validation error message
                            />
                        </Grid>
                        {/* Email Field */}
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="email"
                                label={t('register:emailLabel')}
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                                error={!!validationErrors?.email}
                                helperText={validationErrors?.email?.[0]}
                            />
                        </Grid>
                        {/* Password Field */}
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="password"
                                label={t('register:passwordLabel')}
                                type="password"
                                id="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isSubmitting}
                                error={!!validationErrors?.password}
                                helperText={validationErrors?.password?.[0]}
                            />
                        </Grid>
                        {/* Confirm Password Field */}
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="password_confirmation"
                                label={t('register:confirmPasswordLabel')}
                                type="password"
                                id="password_confirmation"
                                autoComplete="new-password"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                disabled={isSubmitting}
                                // No separate validation error shown here usually, mismatch handled by general error
                            />
                        </Grid>
                    </Grid>
                    {/* Submit Button */}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{ mt: 3, mb: 2 }}
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {isSubmitting ? t('register:submitButtonLoading') : t('register:submitButton')}
                    </Button>
                    {/* Link to Login Page */}
                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link component={RouterLink} to="/login" variant="body2">
                                {t('register:loginPrompt')} {t('register:loginLink')}
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Container>
    );
};

export default RegisterPage;