// src/theme/index.ts
import { createTheme } from '@mui/material/styles';
import { arEG } from '@mui/material/locale'; // استيراد لغة MUI العربية (مثال: مصر)

// يمكنك تخصيص الألوان والخطوط هنا لاحقاً
const theme = createTheme({
  direction: 'rtl', // <-- تفعيل الاتجاه من اليمين لليسار
  typography: {
    fontFamily: [
      // أضف الخطوط التي تفضلها للغة العربية والإنجليزية
      'Cairo', // مثال لخط عربي
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
  },
  palette: {
    // يمكنك تخصيص الألوان الأساسية والثانوية
    // primary: {
    //   main: '#556cd6',
    // },
    // secondary: {
    //   main: '#19857b',
    // },
    // error: {
    //   main: red.A400,
    // },
  },
  // ... أي تخصيصات أخرى للـ theme
}, arEG); // <-- تمرير اللغة العربية لدعم مكونات MUI الداخلية مثل DatePicker

export default theme;