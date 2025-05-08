// src/router.tsx
import React from 'react'; // Import React if using Suspense/lazy later
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import RootLayout from './components/layouts/RootLayout';
import ProtectedRoute from './components/layouts/ProtectedRoute'; // Assuming this checks auth state
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductsPage from './pages/ProductsPage';
import PurchasesListPage from './pages/PurchasesListPage';
import SaleFormPage from './pages/SaleFormPage';
import SalesListPage from './pages/SalesListPage';
import ProfilePage from './pages/ProfilePage'; // Assuming created
import SalesReportPage from './pages/reports/SalesReportPage';
import PurchaseReportPage from './pages/reports/PurchaseReportPage'; // Assuming created
import InventoryReportPage from './pages/reports/InventoryReportPage'; // Assuming created
import NotFoundPage from './pages/NotFoundPage';
import { useAuthorization } from './hooks/useAuthorization';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PurchaseFormPage from './pages/AddPurchasePage';
import UsersListPage from './components/admin/users/UsersListPage';
import { AuthProvider } from './context/AuthContext';
import ProfitLossReportPage from './pages/reports/ProfitLossReportPage';
// ... other page imports

// --- Admin Route Guard Component ---
// Create this file: src/components/layouts/AdminRouteGuard.tsx
const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const { hasRole, isLoading, isLoggedIn } = useAuthorization(); // Use your auth hook

     if (isLoading) {
         return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>; // Or a better loading state
     }

     if (!isLoggedIn || !hasRole('admin')) {
          // Redirect non-admins away
          toast.error("Access Denied", { description: "You do not have permission to access this area." });
          return <Navigate to="/dashboard" replace />; // Redirect to dashboard or login
     }

     // Render the admin component if authorized
     return <>{children}</>;
};
// --- End Admin Route Guard ---


const router = createBrowserRouter([
    {
        path: '/',
        element: <AuthProvider><RootLayout /></AuthProvider>,
        errorElement: <NotFoundPage />,
        children: [
            { index: true, element: <HomePage /> },
            { path: 'login', element: <LoginPage /> },
            { path: 'register', element: <RegisterPage /> }, // Ensure props removed if using context
            {
                element: <ProtectedRoute />, // Ensures user is logged in
                children: [
                    { path: 'dashboard', element: <DashboardPage /> },
                    { path: 'profile', element: <ProfilePage /> },
                    { path: 'clients', element: <ClientsPage /> },
                    { path: 'suppliers', element: <SuppliersPage /> },
                    { path: 'products', element: <ProductsPage /> },
                    {
                        path: 'purchases', children: [
                            { index: true, element: <PurchasesListPage /> },
                            { path: 'add', element: <PurchaseFormPage /> },
                            { path: ':id/edit', element: <PurchaseFormPage /> }, // Edit Purchase
                            // { path: ':id', element: <PurchaseDetailsPage /> }, // Details
                        ]
                    },
                     {
                        path: 'sales', children: [
                            { index: true, element: <SalesListPage /> },
                            { path: 'add', element: <SaleFormPage /> },
                             { path: ':id/edit', element: <SaleFormPage /> }, // Edit Sale
                             // { path: ':id', element: <SaleDetailsPage /> }, // Details
                        ]
                    },
                    {
                        path: 'reports', children: [
                            { path: 'sales', element: <SalesReportPage /> },
                            { path: 'purchases', element: <PurchaseReportPage /> },
                            { path: 'inventory', element: <InventoryReportPage /> },
                            { path: 'profit-loss', element: <ProfitLossReportPage /> },
                        ]
                    },

                    // --- Admin Section ---
                    {
                        path: 'admin', // Base path for admin routes
                        element: <AdminRouteGuard><Outlet /></AdminRouteGuard>, // Wrap admin section with guard
                        children: [
                            // Requires 'admin' role due to AdminRouteGuard above
                            { path: 'users', element: <UsersListPage /> }, // User management
                            // { path: 'roles', element: <RolesListPage /> }, // Add later for role management
                        ]
                    },
                ],
            },
            { path: '*', element: <NotFoundPage /> }
        ],
    },
]);

export default router;