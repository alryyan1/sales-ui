// src/pages/HomePage.tsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

const HomePage: React.FC = () => {
  const { t } = useTranslation(); // لاستخدام الترجمة لاحقاً

  return (
    <Box sx={{ p: 3 }}> {/* إضافة padding باستخدام sx prop */}
      <Typography variant="h4" component="h1" gutterBottom>
        {/* يمكنك الحصول على هذا النص من الترجمة لاحقاً */}
        الصفحة الرئيسية
      </Typography>
      <Typography variant="body1">
        {/* محتوى الصفحة الرئيسية سيأتي هنا */}
        مرحباً بك في نظام إدارة المبيعات.
      </Typography>
      {/* يمكنك إضافة المزيد من مكونات MUI هنا */}
    </Box>
  );
};

export default HomePage;