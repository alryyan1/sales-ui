// src/components/layouts/navItems.ts
import {
  LayoutDashboard,
  Box as BoxIcon,
  ShoppingCart,
  CircleDollarSign,
  Settings,
  BarChart3,
} from "lucide-react";
import type { TFunction } from "i18next";
import { NavItem } from "./types";

/** Builds the sidebar navigation tree with labels translated via i18next. */
export const getNavItems = (t: TFunction): NavItem[] => [
  // Dashboard
  {
    to: "/dashboard",
    label: t("navigation:dashboard"),
    icon: LayoutDashboard,
    permission: null,
    category: t("navigation:dashboard"),
  },

  // Sales Group
  {
    to: "#",
    label: t("navigation:sales"),
    icon: CircleDollarSign,
    permission: null,
    category: t("navigation:sales"),
    children: [
      {
        to: "/sales/pos-blank",
        label: t("navigation:showroom"),
        permission: null,
        category: t("navigation:sales"),
      },
      {
        to: "/sales/returns",
        label: t("navigation:salesReturns"),
        permission: null,
        category: t("navigation:sales"),
      },
      {
        to: "/clients",
        label: t("navigation:clients"),
        permission: null,
        category: t("navigation:sales"),
      },
    ],
  },

  // Inventory Group
  {
    to: "#",
    label: t("navigation:inventory"),
    icon: BoxIcon,
    permission: null,
    category: t("navigation:inventory"),
    children: [
      {
        to: "/products",
        label: t("navigation:products"),
        permission: null,
        category: t("navigation:inventory"),
      },
      {
        to: "/inventory/adjustments",
        label: t("navigation:stockAdjustments"),
        permission: null,
        category: t("navigation:inventory"),
      },
      {
        to: "/inventory/transfers",
        label: t("navigation:stockTransfers"),
        permission: null,
        category: t("navigation:inventory"),
      },
      {
        to: "/inventory/counts",
        label: t("navigation:inventoryCounts"),
        permission: null,
        category: t("navigation:inventory"),
      },
    ],
  },

  // Purchases Group
  {
    to: "#",
    label: t("navigation:purchasesGroup"),
    icon: ShoppingCart,
    permission: null,
    category: t("navigation:purchases"),
    children: [
      {
        to: "/suppliers",
        label: t("navigation:suppliers"),
        permission: null,
        category: t("navigation:inventory"),
      },
      {
        to: "/purchases",
        label: t("navigation:purchasesList"),
        permission: null,
        category: t("navigation:purchases"),
      },
    ],
  },

  // Reports Group
  {
    to: "#",
    label: t("navigation:reports"),
    icon: BarChart3,
    permission: null,
    category: t("navigation:reports"),
    children: [
      {
        to: "/reports/sales",
        label: t("navigation:salesReport"),
        permission: null,
        category: t("navigation:reports"),
      },
      {
        to: "/reports/purchases",
        label: t("navigation:purchasesReport"),
        permission: null,
        category: t("navigation:reports"),
      },
      {
        to: "/reports/inventory-log",
        label: t("navigation:inventoryLog"),
        permission: null,
        category: t("navigation:reports"),
      },
      {
        to: "/reports/daily-income",
        label: t("navigation:dailyIncomeReport"),
        permission: null,
        category: t("navigation:reports"),
      },
      {
        to: "/reports/monthly-expenses",
        label: t("navigation:monthlyExpensesReport"),
        permission: null,
        category: t("navigation:reports"),
      },
      {
        to: "/reports/best-selling-products",
        label: t("navigation:bestSellingProducts"),
        permission: null,
        category: t("navigation:reports"),
      },
      {
        to: "/reports/stagnant-products",
        label: t("navigation:stagnantProducts"),
        permission: null,
        category: t("navigation:reports"),
      },
      {
        to: "/reports/low-stock-products",
        label: t("navigation:lowStockProducts"),
        permission: null,
        category: t("navigation:reports"),
      },
      {
        to: "/reports/monthly-shifts",
        label: t("navigation:monthlyShiftsReport"),
        permission: null,
        category: t("navigation:reports"),
      },
    ],
  },

  // Admin Group
  {
    to: "#",
    label: t("navigation:admin"),
    icon: Settings,
    permission: null,
    category: t("navigation:admin"),
    children: [
      {
        to: "/admin/users",
        label: t("navigation:users"),
        permission: null,
        category: t("navigation:admin"),
      },
      {
        to: "/admin/roles",
        label: t("navigation:roles"),
        permission: null,
        category: t("navigation:admin"),
      },
      {
        to: "/admin/expenses",
        label: t("navigation:expenses"),
        permission: null,
        category: t("navigation:admin"),
      },
      {
        to: "/admin/settings",
        label: t("navigation:settings"),
        permission: null,
        category: t("navigation:admin"),
      },
      {
        to: "/admin/backups",
        label: t("navigation:backups"),
        permission: null,
        category: t("navigation:admin"),
      },
      {
        to: "/admin/warehouses",
        label: t("navigation:warehouses"),
        permission: null,
        category: t("navigation:admin"),
      },
    ],
  },
];
