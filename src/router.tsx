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
import SaleFormPage from "./pages/sales/SaleFormPage";
import SalesListPage from "./pages/sales/SalesListPage";
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
import AddSaleReturnPage from "./pages/sales/AddSaleReturnPage";
import SaleDetailsPage from "./pages/sales/SaleDetailsPage";
import SaleReturnDetailsPage from "./pages/sales/SaleReturnDetailsPage";
import SaleReturnsListPage from "./pages/sales/SaleReturnsListPage";
import RequestStockPage from "./pages/inventory/RequestStockPage";
import ManageStockRequisitionsListPage from "./pages/inventory/ManageStockRequisitionsListPage";
import ProcessRequisitionPage from "./components/admin/inventory/ProcessRequisitionPage";
import InventoryLogPage from "./pages/reports/InventoryLogPage";
import PurchaseDetailsPage from "./pages/purchases/PurchaseDetailsPage";
import ManagePurchaseItemsPage from "./pages/purchases/ManagePurchaseItemsPage";
import SalesTerminalPage from "./pages/sales/SalesTerminalPage";
import PosPage from "./pages/PosPage";
import PosPageOffline from "./pages/PosPageOffline";
import NearExpiryReportPage from "./components/reports/NearExpiryReportPage";
import MonthlyRevenueReportPage from "./components/reports/MonthlyRevenueReportPage";
import SalesWithDiscountsPage from "./pages/reports/SalesWithDiscountsPage";
import SupplierLedgerPage from "./pages/suppliers/SupplierLedgerPage";
import BackupPage from "./pages/admin/BackupPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import WhatsAppSchedulersPage from "./pages/admin/WhatsAppSchedulersPage";
import ExpensesPage from "./pages/admin/ExpensesPage";
import IndexedDBManagerPage from "./pages/admin/IndexedDBManagerPage";
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
    toast.error("Access Denied", {
      description: "You do not have permission to access this area.",
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
            ]
          },
          {
            path: "suppliers",
            children: [
              { index: true, element: <SuppliersPage /> },
              { path: ":id/ledger", element: <SupplierLedgerPage /> },
            ]
          },
          { path: "products", element: <ProductsPage /> },
          {
            path: "purchases",
            children: [
              { index: true, element: <PurchasesListPage /> },
              { path: "add", element: <PurchaseFormPage /> },
              { path: ":id/edit", element: <PurchaseFormPage /> }, // Edit Purchase
              { path: ':id', element: <PurchaseDetailsPage /> }, // Details
              { path: ':id/manage-items', element: <ManagePurchaseItemsPage /> }, // Manage Purchase Items
            ],
          },
          {
            path: "sales",
            children: [
              { index: true, element: <SalesListPage /> },
              { path: "add", element: <SaleFormPage /> },
              { path: "pos", element: <SalesTerminalPage /> },
              { path: "pos-new", element: <PosPage /> },
              { path: "pos-offline", element: <PosPageOffline /> },
              // --- Routes for Sale Returns ---
              { path: "returns", element: <SaleReturnsListPage /> },
              { path: "returns/:returnId", element: <SaleReturnDetailsPage /> },
              { path: "return/add", element: <AddSaleReturnPage /> },
              // Dynamic routes should come last to avoid conflicts
              { path: ":id/edit", element: <SaleFormPage /> }, // Edit Sale
              { path: ":id", element: <SaleDetailsPage /> }, // Details
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
                path: "near-expiry", element: <NearExpiryReportPage />
              },
              {
                path: "monthly-revenue", element: <MonthlyRevenueReportPage />
              },
              {
                path: 'inventory-log', element: <InventoryLogPage />
              }
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
              { path: "whatsapp-schedulers", element: <WhatsAppSchedulersPage /> }, // WhatsApp schedulers management
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
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default router;
