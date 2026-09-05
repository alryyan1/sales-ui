// src/router.tsx
import { createHashRouter, Navigate } from "react-router-dom";
import RootLayout from "./components/layouts/RootLayout";
import ProtectedRoute from "./components/layouts/ProtectedRoute";
import PermissionGuard from "./components/layouts/PermissionGuard"; // New Guard
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
// Clients & Suppliers
import ClientsPage from "./pages/ClientsPage";
import ClientLedgerPage from "./pages/clients/ClientLedgerPage";
import SuppliersPage from "./pages/SuppliersPage";
import SupplierLedgerPage from "./pages/suppliers/SupplierLedgerPage";
// Products & Inventory
import ProductsPage from "./pages/ProductsPage";
import PurchasesListPage from "./pages/purchases/PurchasesListPage";
import PurchaseFormPage from "./pages/PurchaseFormPage";
import PurchaseDetailsPage from "./pages/purchases/PurchaseDetailsPage";
import ManagePurchaseItemsPage from "./pages/purchases/ManagePurchaseItemsPage";
import TaxCustomsManagementPage from "./pages/purchases/TaxCustomsManagementPage";
import StockAdjustmentsListPage from "./components/inventory/StockAdjustmentsListPage";
import StockTransfersPage from "./pages/inventory/StockTransfersPage";
import TransitOrdersPage from "./pages/inventory/TransitOrdersPage";
import InventoryCountPage from "./pages/inventory/InventoryCountPage";
import ManageInventoryCountPage from "./pages/inventory/ManageInventoryCountPage";
import WarehousesListPage from "./pages/warehouses/WarehousesListPage";
import WarehouseProductsPage from "./pages/warehouses/WarehouseProductsPage";
// Sales & POS
import PosPage from "./pages/pos/PosPage";
import PosBlankPage from "./pages/PosBlankPage";
import SalesListPage from "./pages/sales/SalesListPage";
import SalesReturnsListPage from "./pages/sales/SalesReturnsListPage";
import SaleDetailsPage from "./pages/sales/SaleDetailsPage";
// Reports
import SalesReportPage from "./pages/reports/SalesReportPage";
import SaleReturnsReportPage from "./pages/reports/SaleReturnsReportPage";
import SalesWithDiscountsPage from "./pages/reports/SalesWithDiscountsPage";
import DailyIncomeReportPage from "./pages/reports/DailyIncomeReportPage";
import InventoryLogPage from "./pages/reports/InventoryLogPage";
import SuppliersSummaryPage from "./pages/reports/SuppliersSummaryPage";
import SupplierPurchasesPage from "./pages/reports/SupplierPurchasesPage";
import MonthlyExpensesPage from "./pages/reports/MonthlyExpensesPage";
import ProfitLossReportPage from "./pages/reports/ProfitLossReportPage";
import ReportsDashboardPage from "./pages/reports/ReportsDashboardPage";
import MonthlyShiftsReportPage from "./pages/reports/MonthlyShiftsReportPage";
import BestSellingProductsPage from "./pages/reports/BestSellingProductsPage";
import StagnantProductsPage from "./pages/reports/StagnantProductsPage";
import LowStockProductsPage from "./pages/reports/LowStockProductsPage";
import ShortagesPage from "./pages/reports/ShortagesPage";
import MovedExpiredProductsPage from "./pages/reports/MovedExpiredProductsPage";
import ReportTemplatesPage from "./pages/reports/ReportTemplatesPage";
// Admin
import ProfilePage from "./pages/ProfilePage";
import UsersListPage from "./components/admin/users/UsersListPage";
import RolesListPage from "./pages/admin/RolesListPage";
import CategoriesListPage from "./pages/admin/CategoriesListPage";
import ExpensesPage from "./pages/admin/ExpensesPage";
import SettingsPage from "./pages/admin/SettingsPage";
import BackupPage from "./pages/admin/BackupPage";
import UnitsPage from "./pages/UnitsPage";
import NotFoundPage from "./pages/NotFoundPage";
import WhatsAppTestPage from "./pages/admin/WhatsAppTestPage";

import { AuthProvider } from "./context/AuthContext";

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
          // --- General Access ---
          { index: true, element: <Navigate to="/dashboard" replace /> },
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          { path: "profile", element: <ProfilePage /> },

          // --- Clients ---
          {
            path: "clients",
            element: <PermissionGuard requiredPermission="view-clients" />,
            children: [
              { index: true, element: <ClientsPage /> },
              { path: ":id/ledger", element: <ClientLedgerPage /> },
            ],
          },

          // --- Suppliers ---
          {
            path: "suppliers",
            element: <PermissionGuard requiredPermission="view-suppliers" />,
            children: [
              { index: true, element: <SuppliersPage /> },
              { path: ":id/ledger", element: <SupplierLedgerPage /> },
            ],
          },

          // --- Products ---
          {
            path: "products",
            element: (
              <PermissionGuard requiredPermission="view-products">
                <ProductsPage />
              </PermissionGuard>
            ),
          },

          // --- Warehouses ---
          {
            path: "warehouses/:warehouseId/products",
            element: (
              <PermissionGuard requiredPermission="manage-warehouses">
                <WarehouseProductsPage />
              </PermissionGuard>
            ),
          },

          // --- Purchases ---
          {
            path: "purchases",
            element: <PermissionGuard requiredPermission="view-purchases" />,
            children: [
              { index: true, element: <PurchasesListPage /> },
              { path: "add", element: <PurchaseFormPage /> },
              {
                path: ":id/edit",
                element: <Navigate to="../manage-items" replace />,
              },
              { path: ":id", element: <PurchaseDetailsPage /> },
              {
                path: ":id/manage-items",
                element: <ManagePurchaseItemsPage />,
              },
              {
                path: "tax-customs",
                element: <TaxCustomsManagementPage />,
              },
            ],
          },

          // --- Sales/POS ---
          {
            path: "sales",
            children: [
              { index: true, element: <Navigate to="pos" replace /> },
              {
                path: "pos",
                element: (
                  <PermissionGuard requiredPermission="view-pos">
                    <PosPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "pos-blank",
                element: (
                  <PermissionGuard requiredPermission="view-pos">
                    <PosBlankPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "list",
                element: (
                  <PermissionGuard requiredPermission="view-sales">
                    <SalesListPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "returns",
                element: (
                  <PermissionGuard requiredPermission="view-sales-returns">
                    <SalesReturnsListPage />
                  </PermissionGuard>
                ),
              },
              {
                path: ":id",
                element: (
                  <PermissionGuard requiredPermission="view-sales">
                    <SaleDetailsPage />
                  </PermissionGuard>
                ),
              },
            ],
          },

          // --- Inventory Operations ---
          {
            path: "inventory",
            children: [
              {
                path: "adjustments",
                element: (
                  <PermissionGuard requiredPermission="view-stock-adjustments">
                    <StockAdjustmentsListPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "transfers",
                element: (
                  <PermissionGuard requiredPermission="view-stock-transfers">
                    <StockTransfersPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "transit-orders",
                element: <TransitOrdersPage />,
              },
              {
                path: "counts",
                children: [
                  {
                    index: true,
                    element: <InventoryCountPage />,
                  },
                  {
                    path: ":id",
                    element: <ManageInventoryCountPage />,
                  },
                ],
              },
            ],
          },

          // --- Reports ---
          {
            path: "reports",
            children: [
              {
                path: "dashboard",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <ReportsDashboardPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "sales",
                element: (
                  <PermissionGuard requiredPermission="view-reports-sales">
                    <SalesReportPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "sale-returns",
                element: (
                  <PermissionGuard requiredPermission="view-reports-sales">
                    <SaleReturnsReportPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "sales-discounts",
                element: (
                  <PermissionGuard requiredPermission="view-reports-discounts">
                    <SalesWithDiscountsPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "inventory-log",
                element: (
                  <PermissionGuard requiredPermission="view-reports-inventory-log">
                    <InventoryLogPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "daily-income",
                element: (
                  <PermissionGuard requiredPermission="view-reports-daily-income">
                    <DailyIncomeReportPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "suppliers-summary",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <SuppliersSummaryPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "suppliers/:supplierId/purchases",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <SupplierPurchasesPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "monthly-expenses",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <MonthlyExpensesPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "profit-loss",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <ProfitLossReportPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "monthly-shifts",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <MonthlyShiftsReportPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "best-selling-products",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <BestSellingProductsPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "stagnant-products",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <StagnantProductsPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "low-stock-products",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <LowStockProductsPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "shortages",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <ShortagesPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "moved-expired-products",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <MovedExpiredProductsPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "templates",
                element: (
                  <PermissionGuard requiredPermission="view-reports">
                    <ReportTemplatesPage />
                  </PermissionGuard>
                ),
              },
            ],
          },

          // --- Admin Section (Now Permission Guarded) ---
          {
            path: "admin",
            children: [
              {
                path: "users",
                element: (
                  <PermissionGuard requiredPermission="manage-users">
                    <UsersListPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "roles",
                element: (
                  <PermissionGuard requiredPermission="manage-roles">
                    <RolesListPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "categories",
                element: (
                  <PermissionGuard requiredPermission="manage-categories">
                    <CategoriesListPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "units",
                element: (
                  <PermissionGuard requiredPermission="manage-categories">
                    <UnitsPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "expenses",
                element: (
                  <PermissionGuard requiredPermission="manage-expenses">
                    <ExpensesPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "settings",
                element: (
                  <PermissionGuard requiredPermission="manage-settings">
                    <SettingsPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "backups",
                element: (
                  <PermissionGuard requiredPermission="manage-backups">
                    <BackupPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "whatsapp-test",
                element: (
                  <PermissionGuard requiredPermission="manage-settings">
                    <WhatsAppTestPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "warehouses",
                element: (
                  <PermissionGuard requiredPermission="manage-warehouses">
                    <WarehousesListPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "warehouses/:warehouseId/products",
                element: (
                  <PermissionGuard requiredPermission="manage-warehouses">
                    <WarehouseProductsPage />
                  </PermissionGuard>
                ),
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
