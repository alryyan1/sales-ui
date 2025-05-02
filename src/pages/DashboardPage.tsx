// src/pages/DashboardPage.tsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation(); // لاستخدام الترجمة

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('navigation.dashboard')} {/* استخدام مفتاح الترجمة */}
      </Typography>
      <Typography variant="body1">
        {/* محتوى لوحة التحكم سيأتي هنا (رسوم بيانية، إحصائيات سريعة، إلخ) */}
        هنا ستظهر ملخصات وإحصائيات النظام.
      </Typography>
      {/* مكونات لوحة التحكم (مثل Cards, Charts) ستضاف هنا */}
    </Box>
  );
};

export default DashboardPage;