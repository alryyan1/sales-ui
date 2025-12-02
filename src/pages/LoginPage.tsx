// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "sonner";
import {
    Box,
    Container,
    Card,
    Button,
    TextField,
    Typography,
    Alert,
    AlertTitle,
    CircularProgress,
    Stack,
    useTheme,
    alpha,
} from '@mui/material';
import { TrendingUp } from 'lucide-react';

// Auth Service and Context
import authService from '@/services/authService';
import { useAuth } from '@/context/AuthContext';

// --- Zod Schema for Login Form ---
const loginSchema = z.object({
    username: z.string().min(1, { message: "اسم المستخدم مطلوب" }),
    password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// --- Main Login Page Component ---
const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoading: isAuthLoading, handleLoginSuccess } = useAuth();

    const [serverError, setServerError] = useState<string | null>(null);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { username: '', password: '' /*, remember: false */ },
    });
    const {
        handleSubmit,
        register,
        formState: { errors, isSubmitting },
    } = form;

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
            const errorMsg = authService.getErrorMessage(err, 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
            toast.error('خطأ', { description: errorMsg });
            setServerError(errorMsg);
        }
    };

    const theme = useTheme();

    if (isAuthLoading && !user) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    backgroundColor: 'background.default',
                }}
            >
                <CircularProgress color="primary" />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                backgroundColor: 'background.default',
                position: 'relative',
                overflow: 'hidden',
                height: '100vh',
            }}
        >
            {/* Background decorative elements */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '50%',
                    height: '100%',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                    display: { xs: 'none', lg: 'block' },
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-50%',
                        right: '-20%',
                        width: '600px',
                        height: '600px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
                    },
                }}
            />

            {/* Left Column: Branding & Features */}
            <Box
                sx={{
                    display: { xs: 'none', lg: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '50%',
                    p: 6,
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <Container maxWidth="sm">
                    <Stack spacing={4}>
                        {/* Logo/Brand Section */}
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 3,
                                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                                }}
                            >
                                <TrendingUp size={40} color="white" />
                            </Box>
                            <Typography
                                variant="h3"
                                fontWeight={700}
                                gutterBottom
                                sx={{
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                نظام إدارة المبيعات
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                                حل شامل لإدارة أعمالك بكفاءة واحترافية
                            </Typography>
                        </Box>

                    </Stack>
                </Container>
            </Box>

            {/* Right Column: Login Form */}
            <Box
                sx={{
                    width: { xs: '100%', lg: '50%' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: { xs: 3, sm: 4 },
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <Container maxWidth="sm">
                    <Stack spacing={4} justifyContent="center" alignItems="center">
                        {/* Mobile Logo */}
                        <Box sx={{ textAlign: 'center', display: { xs: 'block', lg: 'none' }, mb: 2 }}>
                            <Typography variant="h4" fontWeight={700} gutterBottom>
                                نظام إدارة المبيعات
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                حل شامل لإدارة أعمالك
                            </Typography>
                        </Box>

                        {/* Login Card */}
                        <Card
                            elevation={0}
                            sx={{
                                p: { xs: 3, sm: 4 },
                                width: '400px',
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
                                backgroundColor: 'background.paper',
                            }}
                        >
                            <Stack spacing={3} >
                                {/* Header */}
                                <Box sx={{ textAlign: 'center', mb: 1 }}>
                                    <Typography variant="h4" fontWeight={700} gutterBottom>
                                        تسجيل الدخول
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        أدخل بياناتك للوصول إلى حسابك
                                    </Typography>
                                </Box>

                                {/* Error Alert */}
                                {serverError && (
                                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                                        <AlertTitle>خطأ</AlertTitle>
                                        {serverError}
                                    </Alert>
                                )}

                                {/* Login Form */}
                                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                                    <Stack spacing={3} >
                                        <TextField
                                            label="اسم المستخدم"
                                            type="text"
                                            placeholder="أدخل اسم المستخدم"
                                            fullWidth
                                            disabled={isSubmitting}
                                            {...register('username')}
                                            error={!!errors.username}
                                            helperText={errors.username?.message as string}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                },
                                            }}
                                        />
                                        <TextField
                                            label="كلمة المرور"
                                            type="password"
                                            placeholder="••••••••"
                                            fullWidth
                                            disabled={isSubmitting}
                                            {...register('password')}
                                            error={!!errors.password}
                                            helperText={errors.password?.message as string}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                },
                                            }}
                                        />

                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            disabled={isSubmitting}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                fontSize: '1rem',
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                                '&:hover': {
                                                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                                },
                                            }}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                                                    جاري التحقق...
                                                </>
                                            ) : (
                                                'تسجيل الدخول'
                                            )}
                                        </Button>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Card>

                        {/* Footer */}
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ textAlign: 'center', display: 'block' }}
                        >
                            © {new Date().getFullYear()} نظام إدارة المبيعات. جميع الحقوق محفوظة.
                        </Typography>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
};

export default LoginPage;