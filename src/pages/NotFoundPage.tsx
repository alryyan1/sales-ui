// src/pages/NotFoundPage.tsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom'; // لاستخدام Link الخاص بالراوتر

const NotFoundPage: React.FC = () => {

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 150px)', // اضبط الارتفاع حسب الحاجة (ليأخذ باقي الشاشة بعد الـ AppBar مثلاً)
        textAlign: 'center',
        p: 3,
      }}
    >
      <Typography variant="h1" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
        404
      </Typography>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        {/* نص من الترجمة */}
        عفواً، الصفحة غير موجودة!
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
        {/* نص من الترجمة */}
        يبدو أنك  (ضللت الطريق). الصفحة التي تبحث عنها غير متاحة.
      </Typography>
      <Button
        variant="contained"
        component={RouterLink} // اجعل الزر يعمل كرابط
        to="/" // يوجه للصفحة الرئيسية
      >
        {/* نص من الترجمة */}
        العودة إلى الرئيسية
      </Button>
    </Box>
  );
};

export default NotFoundPage;