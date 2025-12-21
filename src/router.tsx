// src/router.tsx
import React from "react"; // Import React if using Suspense/lazy later
import { createHashRouter, Navigate, Outlet } from "react-router-dom";
import RootLayout from "./components/layouts/RootLayout";
import ProtectedRoute from "./components/layouts/ProtectedRoute"; // Assuming this checks auth state
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ClientLedgerPage from "./pages/clients/ClientLedgerPage";
import SuppliersPage from "./pages/SuppliersPage";
import ProductsPage from "./pages/ProductsPage";
import PurchasesListPage from "./pages/purchases/PurchasesListPage";

import ProfilePage from "./pages/ProfilePage"; // Assuming created
import SalesReportPage from "./pages/reports/SalesReportPage";
import PurchaseReportPage from "./pages/reports/PurchaseReportPage"; // Assuming created
import InventoryReportPage from "./pages/reports/InventoryReportPage"; // Assuming created
import NotFoundPage from "./pages/NotFoundPage";
import { useAuthorization } from "./hooks/useAuthorization";
import { useAuth } from "./context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PurchaseFormPage from "./pages/PurchaseFormPage";
import UsersListPage from "./components/admin/users/UsersListPage";
import { AuthProvider } from "./context/AuthContext";
import ProfitLossReportPage from "./pages/reports/ProfitLossReportPage";
import RolesListPage from "./pages/admin/RolesListPage";
import StockAdjustmentsListPage from "./components/inventory/StockAdjustmentsListPage";
import CategoriesListPage from "./pages/admin/CategoriesListPage";
import SettingsPage from "./pages/admin/SettingsPage";
import SystemPage from "./pages/admin/SystemPage";
import PurchaseDetailsPage from "./pages/purchases/PurchaseDetailsPage";
import ManagePurchaseItemsPage from "./pages/purchases/ManagePurchaseItemsPage";
import PosPage from "./pages/PosPage";
import PosPageOffline from "./pages/PosPageOffline";
import RequestStockPage from "./pages/inventory/RequestStockPage";
import ManageStockRequisitionsListPage from "./pages/inventory/ManageStockRequisitionsListPage";
import ProcessRequisitionPage from "./components/admin/inventory/ProcessRequisitionPage";
import InventoryLogPage from "./pages/reports/InventoryLogPage";

import MonthlyRevenueReportPage from "./components/reports/MonthlyRevenueReportPage";
import SalesWithDiscountsPage from "./pages/reports/SalesWithDiscountsPage";
import DailyIncomeReportPage from "./pages/reports/DailyIncomeReportPage";
import SupplierLedgerPage from "./pages/suppliers/SupplierLedgerPage";
import BackupPage from "./pages/admin/BackupPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import WhatsAppSchedulersPage from "./pages/admin/WhatsAppSchedulersPage";
import ExpensesPage from "./pages/admin/ExpensesPage";
import IndexedDBManagerPage from "./pages/admin/IndexedDBManagerPage";
import WarehousesListPage from "./pages/warehouses/WarehousesListPage"; // Import Added
// ... other page imports

// --- Admin Route Guard Component ---
// Create this file: src/components/layouts/AdminRouteGuard.tsx
const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { hasRole, isLoggedIn } = useAuthorization(); // Use your auth hook
  const { isLoading } = useAuth(); // Get loading state from auth context

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ); // Or a better loading state
  }

  if (!isLoggedIn || !hasRole("admin")) {
    // Redirect non-admins away
    toast.error("تم رفض الوصول", {
      description: "ليس لديك صلاحية للوصول إلى هذه المنطقة.",
    });
    return <Navigate to="/dashboard" replace />; // Redirect to dashboard or login
  }

  // Render the admin component if authorized
  return <>{children}</>;
};
// --- End Admin Route Guard ---

const router = createHashRouter([
  // Auth routes (without navbar)
  {
    path: "/login",
    element: (
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    ),
  },
  {
    path: "/register",
    element: (
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    ),
  },
  // Main app routes (with navbar)
  {
    path: "/",
    element: (
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
    ),
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <ProtectedRoute />, // Ensures user is logged in
        children: [
          { index: true, element: <DashboardPage /> }, // Dashboard is the default home
          { path: "dashboard", element: <DashboardPage /> }, // explicit /dashboard path
          { path: "profile", element: <ProfilePage /> },
          {
            path: "clients",
            children: [
              { index: true, element: <ClientsPage /> },
              { path: ":id/ledger", element: <ClientLedgerPage /> },
            ],
          },
          {
            path: "suppliers",
            children: [
              { index: true, element: <SuppliersPage /> },
              { path: ":id/ledger", element: <SupplierLedgerPage /> },
            ],
          },
          { path: "products", element: <ProductsPage /> },
          {
            path: "purchases",
            children: [
              { index: true, element: <PurchasesListPage /> },
              { path: "add", element: <PurchaseFormPage /> },
              { path: ":id/edit", element: <PurchaseFormPage /> }, // Edit Purchase
              { path: ":id", element: <PurchaseDetailsPage /> }, // Details
              {
                path: ":id/manage-items",
                element: <ManagePurchaseItemsPage />,
              }, // Manage Purchase Items
            ],
          },
          {
            path: "sales",
            children: [
              // POS Routes (Promoted to main sales routes)
              { index: true, element: <Navigate to="pos" replace /> }, // Default to POS
              { path: "pos", element: <PosPage /> }, // Was pos-new
              { path: "pos-offline", element: <PosPageOffline /> },

              // Returns (Keep if separate from sales folder or move if user wants them gone too.
              // Assuming 'sales folder' meant the standard sales CRUD pages, I'll keep returns if they are distinct,
              // BUT they are in src/pages/sales/ too. So I must check if I deleted them.)
              // The user said "everyfile related to sales folder". This usually means everything in src/pages/sales.
              // If AddSaleReturnPage is in src/pages/sales, it must go.
              // So I will remove returns routes too, assuming POS handles returns or they are not needed.
            ],
          },
          {
            path: "inventory",
            children: [
              { path: "adjustments", element: <StockAdjustmentsListPage /> },
            ],
          },
          {
            path: "reports",
            children: [
              { path: "sales", element: <SalesReportPage /> },
              { path: "sales-discounts", element: <SalesWithDiscountsPage /> },
              { path: "purchases", element: <PurchaseReportPage /> },
              { path: "inventory", element: <InventoryReportPage /> },
              { path: "profit-loss", element: <ProfitLossReportPage /> },

              {
                path: "monthly-revenue",
                element: <MonthlyRevenueReportPage />,
              },
              {
                path: "inventory-log",
                element: <InventoryLogPage />,
              },
              {
                path: "daily-income",
                element: <DailyIncomeReportPage />,
              },
            ],
          },

          // Analytics
          { path: "analytics", element: <AnalyticsPage /> },

          // --- Admin Section ---
          {
            path: "admin", // Base path for admin routes
            element: (
              <AdminRouteGuard>
                <Outlet />
              </AdminRouteGuard>
            ), // Wrap admin section with guard
            children: [
              // Requires 'admin' role due to AdminRouteGuard above
              { path: "users", element: <UsersListPage /> }, // User management
              { path: "roles", element: <RolesListPage /> }, // Add later for role management
              { path: "categories", element: <CategoriesListPage /> },
              { path: "expenses", element: <ExpensesPage /> },
              { path: "settings", element: <SettingsPage /> },
              { path: "system", element: <SystemPage /> }, // System version and updates
              { path: "backups", element: <BackupPage /> }, // Database backup management
              {
                path: "whatsapp-schedulers",
                element: <WhatsAppSchedulersPage />,
              }, // WhatsApp schedulers management
              // ... other admin routes
              { path: "idb-manager", element: <IndexedDBManagerPage /> },
              {
                path: "inventory",
                children: [
                  {
                    path: "requisitions/request",
                    element: <RequestStockPage />,
                  },
                  {
                    path: "requisitions",
                    element: <ManageStockRequisitionsListPage />,
                  },
                  ///admin/inventory/requisitions/:requisitionId/process)
                  {
                    path: "requisitions/:requisitionId/process",
                    element: <ProcessRequisitionPage />,
                  },
                ],
              },
              { path: "warehouses", element: <WarehousesListPage /> }, // Added Warehouses Route
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default router;
