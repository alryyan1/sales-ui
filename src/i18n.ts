// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// --- استيراد ملفات الترجمة لكل Namespace ---
import commonAR from './locales/ar/common.json';
import validationAR from './locales/ar/validation.json';
import navigationAR from './locales/ar/navigation.json';
import loginAR from './locales/ar/login.json';
import registerAR from './locales/ar/register.json';
import clientsAR from './locales/ar/clients.json';
// ... استيراد ملفات أخرى

// --- تعريف الموارد ---
// الآن، كل لغة تحتوي على كائنات تمثل الـ namespaces
const resources = {
  ar: {
    common: commonAR, // Namespace: common
    validation: validationAR, // Namespace: validation
    navigation: navigationAR, // Namespace: navigation
    login: loginAR, // Namespace: login
    register: registerAR, // Namespace: register
    clients: clientsAR, // Namespace: clients
    // ... namespaces أخرى
  },
  // يمكنك إضافة لغات أخرى هنا بنفس الهيكل
  // en: {
  //   common: commonEN,
  //   validation: validationEN,
  //   ...
  // }
};

// --- تعريف قائمة الـ Namespaces المستخدمة ---
// هذا يساعد i18next على معرفة الملفات التي يجب تحميلها (خاصة مع التحميل عند الطلب)
export const namespaces = [
    'common',
    'validation',
    'navigation',
    'login',
    'register',
    'clients',
    // ... أسماء namespaces أخرى
];

i18n
  // .use(LanguageDetector) // كاشف اللغة (اختياري)
  .use(initReactI18next) // تمرير i18n إلى react-i18next
  .init({
    resources, // المصادر مع الـ namespaces
    ns: namespaces, // قائمة بجميع الـ namespaces
    defaultNS: 'common', // تحديد الـ Namespace الافتراضي (مهم!)

    lng: 'ar', // اللغة النشطة الافتراضية
    fallbackLng: 'ar', // اللغة الاحتياطية

    interpolation: {
      escapeValue: false // React يحمي بالفعل من XSS
    },

    // --- إعدادات اختيارية للتحميل عند الطلب (Lazy Loading) ---
    // تحتاج إلى إعداد إضافي (مثل i18next-http-backend) إذا كنت تريد تحميل
    // الملفات من الخادم بدلاً من استيرادها كلها مباشرة.
    // backend: {
    //   loadPath: '/locales/{{lng}}/{{ns}}.json'
    // },
    // react: {
    //   useSuspense: true // يفضل استخدامه مع التحميل عند الطلب
    // }
  });

export default i18n;