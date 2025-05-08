// src/components/layouts/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// استيراد Hook السياق للوصول إلى حالة المصادقة
import { useAuth } from './../../context/AuthContext'; // تأكد من أن المسار صحيح

// استيراد مكونات MUI للتحميل
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box'; // للمساعدة في التوسيط

const ProtectedRoute: React.FC = () => {
    // الحصول على حالة المستخدم وحالة التحميل من السياق الأب (RootLayout)
    const { user, isLoading } = useAuth();
    const location = useLocation(); // للحصول على المسار الحالي لتمريره عند إعادة التوجيه

    console.log('ProtectedRoute: isLoading=', isLoading, 'user=', !!user); // للتصحيح

    // 1. إذا كان التحقق الأولي من المصادقة لا يزال جاريًا
    if (isLoading) {
        console.log('ProtectedRoute: Showing loading spinner.');
        // عرض مؤشر التحميل في المنتصف
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}> {/* ارتفاع تقديري */}
                <CircularProgress />
            </Box>
        );
    }

    // 2. إذا انتهى التحقق ولم يتم العثور على مستخدم (غير مصادق عليه)
    if (!user) {
        console.log('ProtectedRoute: User not authenticated, redirecting to login.');
        // إعادة التوجيه إلى صفحة تسجيل الدخول
        // state={{ from: location }} يحفظ المسار الذي كان المستخدم يحاول الوصول إليه
        // replace={true} يمنع إضافة صفحة التحويل إلى سجل المتصفح
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. إذا انتهى التحقق والمستخدم مصادق عليه
    console.log('ProtectedRoute: User authenticated, rendering Outlet.');
    // عرض المكون الفرعي المطابق للمسار الحالي (الموجود داخل هذا المسار المحمي)
    // يمكنك تمرير السياق مرة أخرى إذا كانت المكونات الفرعية المتداخلة تحتاجه أيضًا
    // return <Outlet context={useAuth()} />;
    // أو ببساطة عرض Outlet إذا كانت المكونات الفرعية لا تحتاج للوصول المباشر للسياق من هنا
    return <Outlet />;
};

export default ProtectedRoute;