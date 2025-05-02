// src/main.tsx (أو src/router.tsx إذا كنت تستخدم ملف منفصل)
// ... (imports: React, ReactDOM, createBrowserRouter, RouterProvider...)

// Import Layouts and Pages (تأكد من وجود هذه الملفات)
import RootLayout from './components/layouts/RootLayout';
import ProtectedRoute from './components/layouts/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ClientsPage from './pages/ClientsPage';
import DashboardPage from './pages/DashboardPage';
// ... (other imports: initializeCsrfToken, theme, i18n, CssBaseline, ThemeProvider)

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />, // هذا سيتم تعديله لاستخدام MUI و i18n
    errorElement: <NotFoundPage />, // هذا سيتم تعديله
    children: [
      { index: true, element: <HomePage /> }, // سيتم تعديله
      { path: 'login', element: <LoginPage /> }, // سيتم تعديله
      { path: 'register', element: <RegisterPage onRegisterSuccess={()=>{}} /> }, // سيتم تعديله
      {
        element: <ProtectedRoute />, // هذا سيتم تعديله
        children: [
          { path: 'dashboard', element: <DashboardPage /> }, // سيتم تعديله
          { path: 'clients', element: <ClientsPage /> }, // سيتم تعديله
          // ... other protected routes
        ],
      },
      { path: '*', element: <NotFoundPage /> } // سيتم تعديله
    ],
  },
]);

export default router; // Export إذا كان في ملف منفصل

// --- في main.tsx ---
// initializeCsrfToken().then(() => {
//  ReactDOM.createRoot(document.getElementById('root')!).render(
//    <React.StrictMode>
//      <ThemeProvider theme={theme}>
//        <CssBaseline />
//        {/* <I18nextProvider i18n={i18n}> // <--- يمكنك إضافته هنا أو الاعتماد على الاستيراد في i18n.js */}
//          <RouterProvider router={router} />
//        {/* </I18nextProvider> */}
//      </ThemeProvider>
//    </React.StrictMode>,
//  );
// }).catch(...)