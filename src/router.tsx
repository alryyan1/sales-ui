// src/router.tsx
import React from "react";
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
import StockAdjustmentsListPage from "./components/inventory/StockAdjustmentsListPage";
import StockTransfersPage from "./pages/inventory/StockTransfersPage";
import RequestStockPage from "./pages/inventory/RequestStockPage";
import ManageStockRequisitionsListPage from "./pages/inventory/ManageStockRequisitionsListPage";
import ProcessRequisitionPage from "./components/admin/inventory/ProcessRequisitionPage";
import WarehousesListPage from "./pages/warehouses/WarehousesListPage";
import WarehouseProductsPage from "./pages/warehouses/WarehouseProductsPage";
// Sales & POS
import PosPage from "./pages/PosPage";
import PosPageOffline from "./pages/PosPageOffline"; // Ensure this exists
import SalesReturnsPage from "./pages/sales/SalesReturnsPage";
import SalesReturnsListPage from "./pages/sales/SalesReturnsListPage";
import SaleDetailsPage from "./pages/sales/SaleDetailsPage";
// Reports
import SalesReportPage from "./pages/reports/SalesReportPage";
import PurchaseReportPage from "./pages/reports/PurchaseReportPage";
import SalesWithDiscountsPage from "./pages/reports/SalesWithDiscountsPage";
import DailyIncomeReportPage from "./pages/reports/DailyIncomeReportPage";
import InventoryLogPage from "./pages/reports/InventoryLogPage";
import SuppliersSummaryPage from "./pages/reports/SuppliersSummaryPage";
import SupplierPurchasesPage from "./pages/reports/SupplierPurchasesPage";
// Admin
import ProfilePage from "./pages/ProfilePage";
import UsersListPage from "./components/admin/users/UsersListPage";
import RolesListPage from "./pages/admin/RolesListPage";
import CategoriesListPage from "./pages/admin/CategoriesListPage";
import ExpensesPage from "./pages/admin/ExpensesPage";
import SettingsPage from "./pages/admin/SettingsPage";
import SystemPage from "./pages/admin/SystemPage";
import BackupPage from "./pages/admin/BackupPage";
import WhatsAppSchedulersPage from "./pages/admin/WhatsAppSchedulersPage";
import IndexedDBManagerPage from "./pages/admin/IndexedDBManagerPage";
import NotFoundPage from "./pages/NotFoundPage";

import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";

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
        <NotificationProvider>
          <RootLayout />
        </NotificationProvider>
      </AuthProvider>
    ),
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <ProtectedRoute />, // Ensures user is logged in
        children: [
          // --- General Access ---
          { index: true, element: <DashboardPage /> },
          {
            path: "dashboard",
            element: (
              <PermissionGuard requiredPermission="view-dashboard">
                <DashboardPage />
              </PermissionGuard>
            ),
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
              { path: ":id/edit", element: <PurchaseFormPage /> },
              { path: ":id", element: <PurchaseDetailsPage /> },
              {
                path: ":id/manage-items",
                element: <ManagePurchaseItemsPage />,
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
                path: "pos-offline",
                element: (
                  <PermissionGuard requiredPermission="view-pos-offline">
                    <PosPageOffline />
                  </PermissionGuard>
                ),
              },
              {
                path: "returns",
                children: [
                  {
                    index: true,
                    element: (
                      <PermissionGuard requiredPermission="view-sales-returns">
                        <SalesReturnsListPage />
                      </PermissionGuard>
                    ),
                  },
                  {
                    path: "new",
                    element: (
                      <PermissionGuard requiredPermission="view-sales-returns">
                        <SalesReturnsPage />
                      </PermissionGuard>
                    ),
                  },
                ],
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
            ],
          },

          // --- Reports ---
          {
            path: "reports",
            children: [
              {
                path: "sales",
                element: (
                  <PermissionGuard requiredPermission="view-reports-sales">
                    <SalesReportPage />
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
                path: "purchases",
                element: (
                  <PermissionGuard requiredPermission="view-reports-purchases">
                    <PurchaseReportPage />
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
                path: "system",
                element: (
                  <PermissionGuard requiredPermission="manage-system">
                    <SystemPage />
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
                path: "whatsapp-schedulers",
                element: (
                  <PermissionGuard requiredPermission="manage-whatsapp-schedulers">
                    <WhatsAppSchedulersPage />
                  </PermissionGuard>
                ),
              },
              {
                path: "idb-manager",
                element: (
                  <PermissionGuard requiredPermission="manage-idb">
                    <IndexedDBManagerPage />
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

              // Admin Inventory
              {
                path: "inventory",
                children: [
                  {
                    path: "requisitions/request",
                    element: (
                      <PermissionGuard requiredPermission="request-stock">
                        <RequestStockPage />
                      </PermissionGuard>
                    ),
                  },
                  {
                    path: "requisitions",
                    element: (
                      <PermissionGuard requiredPermission="view-stock-requisitions">
                        <ManageStockRequisitionsListPage />
                      </PermissionGuard>
                    ),
                  },
                  {
                    path: "requisitions/:requisitionId/process",
                    element: (
                      <PermissionGuard requiredPermission="view-stock-requisitions">
                        <ProcessRequisitionPage />
                      </PermissionGuard>
                    ),
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
