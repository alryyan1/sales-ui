// src/main.tsx (أو src/router.tsx إذا كنت تستخدم ملف منفصل)
// ... (imports: React, ReactDOM, createBrowserRouter, RouterProvider...)

// Import Layouts and Pages (تأكد من وجود هذه الملفات)
import RootLayout from "./components/layouts/RootLayout";
import ProtectedRoute from "./components/layouts/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { createBrowserRouter } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ClientsPage from "./pages/ClientsPage";
import DashboardPage from "./pages/DashboardPage";
import SuppliersPage from "./pages/SuppliersPage";
import ProductsPage from "./pages/ProductsPage";
import PurchasesListPage from "./pages/PurchasesListPage";
import AddPurchasePage from "./pages/AddPurchasePage";
import PurchaseDetailsPage from "./pages/PurchaseDetailsPage";
import SalesListPage from "./pages/SalesListPage";
// ... (other imports: initializeCsrfToken, theme, i18n, CssBaseline, ThemeProvider)

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />, // هذا سيتم تعديله لاستخدام MUI و i18n
    errorElement: <NotFoundPage />, // هذا سيتم تعديله
    children: [
      { index: true, element: <HomePage /> }, // سيتم تعديله
      { path: "login", element: <LoginPage /> }, // سيتم تعديله
      {
        path: "register",
        element: <RegisterPage onRegisterSuccess={() => {}} />,
      }, // سيتم تعديله
      {
        element: <ProtectedRoute />, // هذا سيتم تعديله
        children: [
          { path: "dashboard", element: <DashboardPage /> }, // سيتم تعديله
          { path: "clients", element: <ClientsPage /> }, // سيتم تعديله
          { path: "suppliers", element: <SuppliersPage /> }, // <-- Add this route
          { path: "products", element: <ProductsPage /> },

          // --- Purchase Routes ---
          {
            path: "purchases", // Base path for purchases
            children: [
              {
                index: true, // Matches /purchases exactly
                element: <PurchasesListPage />,
              },
              {
                path: "add", // Matches /purchases/add
                element: <AddPurchasePage />,
              },
              {
                path: ":id", // <-- Matches /purchases/ANY_ID (dynamic segment)
                element: <PurchaseDetailsPage />, // <-- Points to the details page component
                // Optional: Add a loader here for data fetching with React Router loaders
                // loader: async ({ params }) => {
                //     if (!params.id || isNaN(Number(params.id))) {
                //         throw new Response("Not Found", { status: 404 });
                //     }
                //     return purchaseService.getPurchase(Number(params.id));
                // },
              },
            ],
          }, // Route for list page
          {
            element: <ProtectedRoute />,
            children: [
                // ... dashboard, clients, suppliers, products, purchases ...
                {
                    path: 'sales', // Base path for sales
                    children: [
                        { index: true, element: <SalesListPage /> },
                        // { path: 'add', element: <AddSalePage /> }, // Add later
                        // { path: ':id', element: <SaleDetailsPage /> }, // Add later
                    ]
                },
            ],
        },
          // ... other protected routes
        ],
      },
      { path: "*", element: <NotFoundPage /> }, // سيتم تعديله
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
