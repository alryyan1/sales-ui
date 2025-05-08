// src/pages/LoginPage.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { Navigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// استيراد مكونات MUI
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline'; // يمكن إزالته إذا كان موجودًا في main.tsx وهو كافٍ
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link'; // رابط MUI
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // أيقونة القفل
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress'; // للتحميل
import Alert from '@mui/material/Alert'; // لعرض رسائل الخطأ

// استيراد خدمة المصادقة والسياق
import authService from '../services/authService';
import { useAuth } from '@/context/AuthContext';

const LoginPage: React.FC = () => {
    const { t } = useTranslation('login');
    const { user, isLoading: isAuthLoading, handleLoginSuccess } = useAuth(); // الحصول على الحالة والدالة من السياق
    const location = useLocation(); // لتحديد الوجهة بعد تسجيل الدخول

    // حالة النموذج
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null); // للأخطاء العامة
    const [isSubmitting, setIsSubmitting] = useState(false); // حالة الإرسال

    // إعادة التوجيه إذا كان المستخدم مسجل دخوله بالفعل والتحقق الأولي قد انتهى
    useEffect(() => {
        if (!isAuthLoading && user) {
            const from = location.state?.from?.pathname || "/dashboard";
            console.log("LoginPage: User already logged in, redirecting to:", from);
            // لا يمكن استخدام Navigate مباشرة داخل useEffect، لكن هذا التأثير سيسبب إعادة عرض
            // والمكون سيعيد التوجيه في الجزء التالي.
            // أو يمكنك استخدام navigate() hook إذا كان ذلك متاحًا هنا.
        }
    }, [isAuthLoading, user, location.state]);

    // إعادة التوجيه الفوري إذا تحققت الشروط
    if (!isAuthLoading && user) {
        const from = location.state?.from?.pathname || "/dashboard";
        return <Navigate to={from} replace />;
    }


    // دالة معالجة إرسال النموذج
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Call the updated login service function
            const authResponse = await authService.login({ email, password });
            // On success, call the handler from RootLayout context with the user object
            handleLoginSuccess(authResponse);
        } catch (err) {
            console.error("Login failed:", err);
            setError(authService.getErrorMessage(err));
            setIsSubmitting(false);
        }
    };

    // عرض التحميل إذا كان التحقق الأولي للمصادقة جاريًا
    if (isAuthLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
                <CircularProgress />
            </Box>
        );
    }

    // عرض نموذج تسجيل الدخول
    return (
        <Container component="main" maxWidth="xs"> {/* تحديد عرض الحاوية */}
            {/* CssBaseline يمكن إزالته إذا تم تطبيقه عالميًا في main.tsx */}
            {/* <CssBaseline /> */}
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {/* أيقونة القفل */}
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <LockOutlinedIcon />
                </Avatar>
                {/* عنوان الصفحة */}
                <Typography component="h1" variant="h5">
                    {t('title')}
                </Typography>

                {/* رسالة الخطأ العامة */}
                {error && (
                    <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* النموذج */}
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    {/* حقل البريد الإلكتروني */}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label={t('emailLabel')} // تسمية من الترجمة
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting} // تعطيل أثناء الإرسال
                    />
                    {/* حقل كلمة المرور */}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label={t('passwordLabel')} // تسمية من الترجمة
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting} // تعطيل أثناء الإرسال
                    />
                    {/* يمكنك إضافة Checkbox لـ "تذكرني" هنا إذا أردت */}
                    {/* <FormControlLabel
                        control={<Checkbox value="remember" color="primary" />}
                        label="Remember me"
                    /> */}

                    {/* زر الإرسال */}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={isSubmitting} // تعطيل أثناء الإرسال
                        sx={{ mt: 3, mb: 2 }}
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null} // أيقونة التحميل
                    >
                        {isSubmitting ? t('submitButtonLoading') : t('submitButton')}
                    </Button>

                    {/* روابط إضافية (إنشاء حساب، نسيت كلمة المرور) */}
                    <Grid container>
                        {/* <Grid item xs>
                            <Link href="#" variant="body2">
                                نسيت كلمة المرور؟
                            </Link>
                        </Grid> */}
                        <Grid item>
                            {/* استخدام Link من MUI مع component={RouterLink} للتكامل */}
                            <Link component={RouterLink} to="/register" variant="body2">
                                {t('registerPrompt')} {t('registerLink')}
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
            {/* يمكنك إضافة حقوق النشر أو Footer صغير هنا */}
            {/* <Copyright sx={{ mt: 8, mb: 4 }} /> */}
        </Container>
    );
};

// يمكنك إنشاء مكون Copyright منفصل إذا أردت استخدامه في أماكن أخرى
// function Copyright(props: any) {
//   return (
//     <Typography variant="body2" color="text.secondary" align="center" {...props}>
//       {'Copyright © '}
//       <Link color="inherit" href="https://mui.com/">
//         Your Website
//       </Link>{' '}
//       {new Date().getFullYear()}
//       {'.'}
//     </Typography>
//   );
// }

export default LoginPage;