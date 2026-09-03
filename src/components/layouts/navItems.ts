// src/components/layouts/navItems.ts
import {
  Box as BoxIcon,
  ShoppingCart,
  CircleDollarSign,
  BarChart3,
} from "lucide-react";
import { NavItem } from "./types";

// `label` holds an i18next key within the "sidebar" namespace (see
// src/locales/{ar,en}/sidebar.json), not literal display text — SidebarPro
// and NavigationPermissionsSection both translate it via t(item.label).
export const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "dashboard",
    icon: BarChart3,
    permission: null,
    category: "الرئيسية",
  },
  // Sales Group
  {
    to: "#",
    label: "sales",
    icon: CircleDollarSign,
    permission: null,
    category: "المبيعات",
    children: [
      {
        to: "/sales/pos",
        label: "pos",
        permission: null,
        category: "المبيعات",
      },
      {
        to: "/sales/pos-blank",
        label: "gallery",
        permission: null,
        category: "المبيعات",
      },
      {
        to: "/sales/list",
        label: "salesList",
        permission: null,
        category: "المبيعات",
      },
      {
        to: "/sales/returns",
        label: "salesReturns",
        permission: null,
        category: "المبيعات",
      },
      {
        to: "/clients",
        label: "clients",
        permission: null,
        category: "المبيعات",
      },
    ],
  },

  // Inventory Group
  {
    to: "#",
    label: "inventory",
    icon: BoxIcon,
    permission: null,
    category: "المخزون",
    children: [
      {
        to: "/products",
        label: "products",
        permission: null,
        category: "المخزون",
      },
      {
        to: "/inventory/adjustments",
        label: "inventoryAdjustments",
        permission: null,
        category: "المخزون",
      },
      {
        to: "/inventory/transfers",
        label: "inventoryTransfers",
        permission: null,
        category: "المخزون",
      },
      {
        to: "/inventory/counts",
        label: "inventoryCounts",
        permission: null,
        category: "المخزون",
      },
    ],
  },

  // Purchases Group
  {
    to: "#",
    label: "purchasesGroup",
    icon: ShoppingCart,
    permission: null,
    category: "المشتريات",
    children: [
      {
        to: "/suppliers",
        label: "suppliers",
        permission: null,
        category: "المخزون",
      },
      {
        to: "/purchases",
        label: "purchasesList",
        permission: null,
        category: "المشتريات",
      },
      {
        to: "/inventory/transit-orders",
        label: "transitOrders",
        permission: null,
        category: "المشتريات",
      },

    ],
  },

];

// Reports and Administration were moved out of the sidebar and are surfaced as
// sub-menus in the user menu (see UserMenu.tsx), next to Settings. `label` holds
// a key within the "sidebar" i18next namespace.
export const reportNavItems: NavItem[] = [
  {
    to: "/reports/sales",
    label: "salesReport",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/purchases",
    label: "purchaseReport",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/inventory-log",
    label: "inventoryLogReport",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/daily-income",
    label: "dailyIncomeReport",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/monthly-expenses",
    label: "monthlyExpensesReport",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/profit-overview",
    label: "profitOverview",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/best-selling-products",
    label: "bestSellingProducts",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/stagnant-products",
    label: "stagnantProducts",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/low-stock-products",
    label: "lowStockProducts",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/shortages",
    label: "shortages",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/moved-expired-products",
    label: "movedExpiredProducts",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/monthly-shifts",
    label: "monthlyShiftsReport",
    permission: null,
    category: "التقارير",
  },
  {
    to: "/reports/templates",
    label: "reportTemplates",
    permission: null,
    category: "التقارير",
  },
];

export const adminNavItems: NavItem[] = [
  {
    to: "/admin/users",
    label: "users",
    permission: null,
    category: "الإدارة",
  },
  {
    to: "/admin/roles",
    label: "roles",
    permission: null,
    category: "الإدارة",
  },
  {
    to: "/admin/expenses",
    label: "expenses",
    permission: null,
    category: "الإدارة",
  },
  {
    to: "/admin/settings",
    label: "settings",
    permission: null,
    category: "الإدارة",
  },
  {
    to: "/admin/backups",
    label: "backups",
    permission: null,
    category: "الإدارة",
  },
  {
    to: "/admin/warehouses",
    label: "warehouses",
    permission: null,
    category: "الإدارة",
  },
  {
    to: "/admin/whatsapp-test",
    label: "whatsappTest",
    permission: null,
    category: "الإدارة",
  },
];
