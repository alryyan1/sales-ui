// src/router.tsx
import React from "react"; // Import React if using Suspense/lazy later
import { createBrowserRouter, createHashRouter, Navigate, Outlet } from "react-router-dom";
import RootLayout from "./components/layouts/RootLayout";
import ProtectedRoute from "./components/layouts/ProtectedRoute"; // Assuming this checks auth state
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PurchaseFormPage from "./pages/PurchaseFormPage";
import UsersListPage from "./components/admin/users/UsersListPage";
import { AuthProvider } from "./context/AuthContext";
import ProfitLossReportPage from "./pages/reports/ProfitLossReportPage";
import RolesListPage from "./pages/admin/RolesListPage";
import StockAdjustmentsListPage from "./components/inventory/StockAdjustmentsListPage";
import StockAdjustmentFormModal from "./components/inventory/StockAdjustmentFormModal";
import CategoriesListPage from "./pages/admin/CategoriesListPage";
import SettingsPage from "./pages/admin/SettingsPage";
import AddSaleReturnPage from "./pages/sales/AddSaleReturnPage";
import SaleDetailsPage from "./pages/sales/SaleDetailsPage";
import SaleReturnDetailsPage from "./pages/sales/SaleReturnDetailsPage";
import SaleReturnsListPage from "./pages/sales/SaleReturnsListPage";
import RequestStockPage from "./pages/inventory/RequestStockPage";
import ManageStockRequisitionsListPage from "./pages/inventory/ManageStockRequisitionsListPage";
import ProcessRequisitionPage from "./components/admin/inventory/ProcessRequisitionPage";
import InventoryLogPage from "./pages/reports/InventoryLogPage";
import PurchaseDetailsPage from "./pages/purchases/PurchaseDetailsPage";
import SalesTerminalPage from "./pages/sales/SalesTerminalPage";
import PosPage from "./pages/PosPage";
import NearExpiryReportPage from "./components/reports/NearExpiryReportPage";
import MonthlyRevenueReportPage from "./components/reports/MonthlyRevenueReportPage";
import SupplierLedgerPage from "./pages/suppliers/SupplierLedgerPage";
import BackupPage from "./pages/admin/BackupPage";
// ... other page imports

// --- Admin Route Guard Component ---
// Create this file: src/components/layouts/AdminRouteGuard.tsx
const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { hasRole, isLoading, isLoggedIn } = useAuthorization(); // Use your auth hook

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
  {
    path: "/",
    element: (
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
    ),
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> }, // Ensure props removed if using context
      {
        element: <ProtectedRoute />, // Ensures user is logged in
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "clients", element: <ClientsPage /> },
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
            ],
          },
          {
            path: "sales",
            children: [
              { index: true, element: <SalesListPage /> },
              { path: "add", element: <SaleFormPage /> },
              { path: "pos", element: <SalesTerminalPage /> },
              { path: "pos-new", element: <PosPage /> },
              { path: ":id/edit", element: <SaleFormPage /> }, // Edit Sale
              // --- Routes for Sale Returns ---
              // Option A: Generic add return page, ID passed via state
              { path: "return/add", element: <AddSaleReturnPage /> },

              // Option B: Add return page linked to an original sale via URL
              // { path: ':originalSaleIdParam/return/add', element: <AddSaleReturnPage /> },

              // Optional: Route to view details of a specific sale return
              { path: "returns", element: <SaleReturnsListPage /> },
              { path: "returns/:returnId", element: <SaleReturnDetailsPage /> },
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
              { path: "purchases", element: <PurchaseReportPage /> },
              { path: "inventory", element: <InventoryReportPage /> },
              { path: "profit-loss", element: <ProfitLossReportPage /> },
              {
                path:"near-expiry", element:<NearExpiryReportPage/>
              },
              {
                path:"monthly-revenue",element:<MonthlyRevenueReportPage/>
              },
              {
                path:'inventory-log', element: <InventoryLogPage />
              }
            ],
          },

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
              { path: "settings", element: <SettingsPage /> },
              { path: "backups", element: <BackupPage /> }, // Database backup management
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
