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
import SupplierAr from './locales/ar/suppliers.json';
import productsAr from './locales/ar/products.json';
import purchasesAr from './locales/ar/purchases.json';
import salesAr from './locales/ar/sales.json';
import reportAr from './locales/ar/reports.json';
import usersAR from './locales/ar/users.json';     // <-- Import
import rolesAR from './locales/ar/roles.json';       // <-- Import
import profileAr from './locales/ar/profile.json'; // <-- Import
import permissionsAR from './locales/ar/permissions.json'; // <-- Import
import inventortAr from './locales/ar/inventory.json'; // <-- Import
import categoryAr from './locales/ar/categories.json'; // <-- Import
import settingsAr from './locales/ar/settings.json'; // <-- Import
import paymentMethodsAr from './locales/ar/paymentMethods.json'; // <-- Import
import unitsAr from './locales/ar/units.json'; // <-- Import
import posAr from './locales/ar/pos.json'; // <-- Import
import analyticsAr from './locales/ar/analytics.json'; // <-- Import
import expensesAr from './locales/ar/expenses.json';
import dashboardAr from './locales/ar/dashboard.json';
import sidebarAr from './locales/ar/sidebar.json';
import cartPanelAr from './locales/ar/cartPanel.json';
import saleActionsBarAr from './locales/ar/saleActionsBar.json';
import themeColorPickerAr from './locales/ar/themeColorPicker.json';
import saleSummaryPanelAr from './locales/ar/saleSummaryPanel.json';
import paymentDialogAr from './locales/ar/paymentDialog.json';
import saleCompleteDialogAr from './locales/ar/saleCompleteDialog.json';
import customerPickerAr from './locales/ar/customerPicker.json';
import productSearchPanelAr from './locales/ar/productSearchPanel.json';
import expiryProductsDialogAr from './locales/ar/expiryProductsDialog.json';
import dueRemindersDialogAr from './locales/ar/dueRemindersDialog.json';
import shiftSalesColumnAr from './locales/ar/shiftSalesColumn.json';
import topSellingProductsDialogAr from './locales/ar/topSellingProductsDialog.json';
import productFormModalAr from './locales/ar/productFormModal.json';
import barcodeLabelPdfDialogAr from './locales/ar/barcodeLabelPdfDialog.json';
import packageFormModalAr from './locales/ar/packageFormModal.json';
import editPurchaseDialogAr from './locales/ar/editPurchaseDialog.json';
import purchaseLedgerDialogAr from './locales/ar/purchaseLedgerDialog.json';
import inventoryCountAr from './locales/ar/inventoryCount.json';
import inventoryCountManageAr from './locales/ar/inventoryCountManage.json';
import transitOrdersAr from './locales/ar/transitOrders.json';
import adminSettingsAr from './locales/ar/adminSettings.json';

// English imports
import commonEN from './locales/en/common.json';
import validationEN from './locales/en/validation.json';
import navigationEN from './locales/en/navigation.json';
import loginEN from './locales/en/login.json';
import registerEN from './locales/en/register.json';
import clientsEN from './locales/en/clients.json';
import supplierEN from './locales/en/suppliers.json';
import productsEN from './locales/en/products.json';
import purchasesEN from './locales/en/purchases.json';
import salesEN from './locales/en/sales.json';
import reportEN from './locales/en/reports.json';
import usersEN from './locales/en/users.json';
import rolesEN from './locales/en/roles.json';
import profileEN from './locales/en/profile.json';
import permissionsEN from './locales/en/permissions.json';
import inventoryEN from './locales/en/inventory.json';
import categoryEN from './locales/en/categories.json';
import settingsEN from './locales/en/settings.json';
import paymentMethodsEN from './locales/en/paymentMethods.json';
import unitsEN from './locales/en/units.json';
import posEN from './locales/en/pos.json';
import analyticsEN from './locales/en/analytics.json';
import expensesEN from './locales/en/expenses.json';
import dashboardEN from './locales/en/dashboard.json';
import sidebarEN from './locales/en/sidebar.json';
import cartPanelEN from './locales/en/cartPanel.json';
import saleActionsBarEN from './locales/en/saleActionsBar.json';
import themeColorPickerEN from './locales/en/themeColorPicker.json';
import saleSummaryPanelEN from './locales/en/saleSummaryPanel.json';
import paymentDialogEN from './locales/en/paymentDialog.json';
import saleCompleteDialogEN from './locales/en/saleCompleteDialog.json';
import customerPickerEN from './locales/en/customerPicker.json';
import productSearchPanelEN from './locales/en/productSearchPanel.json';
import expiryProductsDialogEN from './locales/en/expiryProductsDialog.json';
import dueRemindersDialogEN from './locales/en/dueRemindersDialog.json';
import shiftSalesColumnEN from './locales/en/shiftSalesColumn.json';
import topSellingProductsDialogEN from './locales/en/topSellingProductsDialog.json';
import productFormModalEN from './locales/en/productFormModal.json';
import barcodeLabelPdfDialogEN from './locales/en/barcodeLabelPdfDialog.json';
import packageFormModalEN from './locales/en/packageFormModal.json';
import editPurchaseDialogEN from './locales/en/editPurchaseDialog.json';
import purchaseLedgerDialogEN from './locales/en/purchaseLedgerDialog.json';
import inventoryCountEN from './locales/en/inventoryCount.json';
import inventoryCountManageEN from './locales/en/inventoryCountManage.json';
import transitOrdersEN from './locales/en/transitOrders.json';
import adminSettingsEN from './locales/en/adminSettings.json';


// ... استيراد ملفات أخرى

// Read the persisted language choice synchronously so the very first render
// (and the flash-prevention script in index.html) agree with i18next from the start.
const storedLanguage =
  (typeof window !== 'undefined' && localStorage.getItem('app-language')) || 'ar';

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
    suppliers:SupplierAr,
    products:productsAr,
    purchases:purchasesAr,
    sales:salesAr,
    reports:reportAr,
    users:usersAR, // <-- Add this line
    roles:rolesAR, // <-- Add this line
    profile:profileAr, // <-- Add this line
    permissions:permissionsAR, // <-- Add this line
    inventory:inventortAr, // <-- Add this line
    categories:categoryAr, // <-- Add this line
    settings:settingsAr, // <-- Add this line
    paymentMethods:paymentMethodsAr,
    units:unitsAr,
    pos:posAr,
    analytics:analyticsAr
    ,expenses:expensesAr
    ,dashboard:dashboardAr
    ,sidebar:sidebarAr
    ,cartPanel:cartPanelAr
    ,saleActionsBar:saleActionsBarAr
    ,themeColorPicker:themeColorPickerAr
    ,saleSummaryPanel:saleSummaryPanelAr
    ,paymentDialog:paymentDialogAr
    ,saleCompleteDialog:saleCompleteDialogAr
    ,customerPicker:customerPickerAr
    ,productSearchPanel:productSearchPanelAr
    ,expiryProductsDialog:expiryProductsDialogAr
    ,dueRemindersDialog:dueRemindersDialogAr
    ,shiftSalesColumn:shiftSalesColumnAr
    ,topSellingProductsDialog:topSellingProductsDialogAr
    ,productFormModal:productFormModalAr
    ,barcodeLabelPdfDialog:barcodeLabelPdfDialogAr
    ,packageFormModal:packageFormModalAr
    ,editPurchaseDialog:editPurchaseDialogAr
    ,purchaseLedgerDialog:purchaseLedgerDialogAr
    ,inventoryCount:inventoryCountAr
    ,inventoryCountManage:inventoryCountManageAr
    ,transitOrders:transitOrdersAr
    ,adminSettings:adminSettingsAr

    // ... namespaces أخرى
  },
  en: {
    common: commonEN,
    validation: validationEN,
    navigation: navigationEN,
    login: loginEN,
    register: registerEN,
    clients: clientsEN,
    suppliers: supplierEN,
    products: productsEN,
    purchases: purchasesEN,
    sales: salesEN,
    reports: reportEN,
    users: usersEN,
    roles: rolesEN,
    profile: profileEN,
    permissions: permissionsEN,
    inventory: inventoryEN,
    categories: categoryEN,
    settings: settingsEN,
    paymentMethods: paymentMethodsEN,
    units: unitsEN,
    pos: posEN,
    analytics: analyticsEN
    ,expenses: expensesEN
    ,dashboard: dashboardEN
    ,sidebar: sidebarEN
    ,cartPanel: cartPanelEN
    ,saleActionsBar: saleActionsBarEN
    ,themeColorPicker: themeColorPickerEN
    ,saleSummaryPanel: saleSummaryPanelEN
    ,paymentDialog: paymentDialogEN
    ,saleCompleteDialog: saleCompleteDialogEN
    ,customerPicker: customerPickerEN
    ,productSearchPanel: productSearchPanelEN
    ,expiryProductsDialog: expiryProductsDialogEN
    ,dueRemindersDialog: dueRemindersDialogEN
    ,shiftSalesColumn: shiftSalesColumnEN
    ,topSellingProductsDialog: topSellingProductsDialogEN
    ,productFormModal: productFormModalEN
    ,barcodeLabelPdfDialog: barcodeLabelPdfDialogEN
    ,packageFormModal: packageFormModalEN
    ,editPurchaseDialog: editPurchaseDialogEN
    ,purchaseLedgerDialog: purchaseLedgerDialogEN
    ,inventoryCount: inventoryCountEN
    ,inventoryCountManage: inventoryCountManageEN
    ,transitOrders: transitOrdersEN
    ,adminSettings: adminSettingsEN
  }
  // يمكنك إضافة لغات أخرى هنا بنفس الهيكل
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
    'suppliers',
    'products',
    'purchases',
    'sales',
    'reports',
    'users', // <-- Add namespace
    'roles', // <-- Add namespace
    'profile', // <-- Add namespace
    'permissions', // <-- Add namespace
    'inventory', // <-- Add namespace
    'categories', // <-- Add namespace
    'settings', // <-- Add namespace
    'paymentMethods',
    'units',
    'pos',
    'analytics'
    ,'expenses'
    ,'dashboard'
    ,'sidebar'
    ,'cartPanel'
    ,'saleActionsBar'
    ,'themeColorPicker'
    ,'saleSummaryPanel'
    ,'paymentDialog'
    ,'saleCompleteDialog'
    ,'customerPicker'
    ,'productSearchPanel'
    ,'expiryProductsDialog'
    ,'dueRemindersDialog'
    ,'shiftSalesColumn'
    ,'topSellingProductsDialog'
    ,'productFormModal'
    ,'barcodeLabelPdfDialog'
    ,'packageFormModal'
    ,'editPurchaseDialog'
    ,'purchaseLedgerDialog'
    ,'inventoryCount'
    ,'inventoryCountManage'
    ,'transitOrders'
    ,'adminSettings'
    // ... أسماء namespaces أخرى
];

i18n
  // .use(LanguageDetector) // كاشف اللغة (اختياري)
  .use(initReactI18next) // تمرير i18n إلى react-i18next
  .init({
    resources, // المصادر مع الـ namespaces
    ns: namespaces, // قائمة بجميع الـ namespaces
    defaultNS: 'common', // تحديد الـ Namespace الافتراضي (مهم!)

    lng: storedLanguage, // اللغة النشطة الافتراضية، مقروءة من التخزين المحلي
    fallbackLng: 'en', // اللغة الاحتياطية

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