// src/components/layouts/navItems.ts
import {
  LayoutDashboard,
  Box as BoxIcon,
  ShoppingCart,
  CircleDollarSign,
  Settings,
  BarChart3,
} from "lucide-react";
import { NavItem } from "./types";

/**
 * Registry of icons for routes and categories.
 * This is used to enrich the navigation data fetched from the backend.
 */
export const iconRegistry: Record<string, React.ElementType> = {
  // Routes
  "/dashboard": LayoutDashboard,
  "/sales/pos-blank": CircleDollarSign,
  "/sales/returns": CircleDollarSign,
  "/clients": CircleDollarSign,
  "/products": BoxIcon,
  "/inventory/adjustments": BoxIcon,
  "/inventory/transfers": BoxIcon,
  "/inventory/counts": BoxIcon,
  "/suppliers": ShoppingCart,
  "/purchases": ShoppingCart,
  "/reports/dashboard": BarChart3,
  "/reports/sales": BarChart3,
  "/reports/sale-returns": BarChart3,
  "/reports/purchases": BarChart3,
  "/reports/suppliers-summary": BarChart3,
  "/reports/inventory-log": BarChart3,
  "/reports/sales-discounts": BarChart3,
  "/reports/daily-income": BarChart3,
  "/reports/monthly-expenses": BarChart3,
  "/reports/profit-loss": BarChart3,
  "/reports/best-selling-products": BarChart3,
  "/reports/stagnant-products": BarChart3,
  "/reports/low-stock-products": BarChart3,
  "/reports/shortages": BarChart3,

  "/reports/monthly-shifts": BarChart3,
  "/admin/users": Settings,
  "/admin/roles": Settings,
  "/admin/expenses": Settings,
  "/admin/settings": Settings,
  "/admin/system": Settings,
  "/admin/backups": Settings,
  "/admin/warehouses": Settings,
  "/admin/whatsapp-schedulers": Settings,
  "/admin/whatsapp-test": Settings,
  "/admin/inventory/requisitions/request": Settings,
  "/admin/inventory/requisitions": Settings,
  "/admin/idb-manager": Settings,

  // Categories (used as parent icons)
  "لوحة التحكم": LayoutDashboard,
  المبيعات: CircleDollarSign,
  المخزون: BoxIcon,
  الواردات: ShoppingCart,
  التقارير: BarChart3,
  الإدارة: Settings,
};

export const navItems: NavItem[] = [
  // Dashboard
  {
    to: "/dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    permission: null,
    category: "لوحة التحكم",
  },

  // Sales Group
  {
    to: "#",
    label: "المبيعات",
    icon: CircleDollarSign,
    permission: null,
    category: "المبيعات",
    children: [
      {
        to: "/sales/pos-blank",
        label: "المعرض",
        permission: null,
        category: "المبيعات",
      },
      {
        to: "/sales/returns",
        label: "مردودات المبيعات",
        permission: null,
        category: "المبيعات",
      },
      {
        to: "/clients",
        label: "العملاء",
        permission: null,
        category: "المبيعات",
      },
    ],
  },

  // Inventory Group
  {
    to: "#",
    label: "المخزون",
    icon: BoxIcon,
    permission: null,
    category: "المخزون",
    children: [
      {
        to: "/products",
        label: "المعدات",
        permission: null,
        category: "المخزون",
      },
      {
        to: "/inventory/adjustments",
        label: "تعديلات المخزون",
        permission: null,
        category: "المخزون",
      },
      {
        to: "/inventory/transfers",
        label: "تحويل المخزون",
        permission: null,
        category: "المخزون",
      },
      {
        to: "/inventory/counts",
        label: "جرد المخزون",
        permission: null,
        category: "المخزون",
      },
    ],
  },

  // Purchases Group
  {
    to: "#",
    label: "الواردات",
    icon: ShoppingCart,
    permission: null,
    category: "الواردات",
    children: [
      {
        to: "/suppliers",
        label: "الموردون",
        permission: null,
        category: "المخزون",
      },
      {
        to: "/purchases",
        label: "قائمة المشتريات",
        permission: null,
        category: "المشتريات",
      },
    ],
  },

  // Reports Group
  {
    to: "#",
    label: "التقارير",
    icon: BarChart3,
    permission: null,
    category: "التقارير",
    children: [
      {
        to: "/reports/dashboard",
        label: "لوحة المعلومات",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/sales",
        label: "تقرير المبيعات",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/sale-returns",
        label: "تقرير مردودات المبيعات",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/purchases",
        label: "تقرير المشتريات",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/suppliers-summary",
        label: "ملخص الموردين",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/inventory-log",
        label: "سجل المخزون",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/sales-discounts",
        label: "المبيعات المخفضة",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/daily-income",
        label: "تقرير المبيعات الشهري",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/monthly-expenses",
        label: "تقرير المصروفات الشهرية",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/profit-loss",
        label: "الأرباح والخسائر",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/best-selling-products",
        label: "المنتجات الأكثر مبيعاً",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/stagnant-products",
        label: "المنتجات الراكدة",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/low-stock-products",
        label: "المنتجات منخفضة المخزون",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/shortages",
        label: "الطلبية (النواقص)",
        permission: null,
        category: "التقارير",
      },

      {
        to: "/reports/monthly-shifts",
        label: "تقرير الورديات الشهري",
        permission: null,
        category: "التقارير",
      },
    ],
  },

  // Admin Group
  {
    to: "#",
    label: "الإدارة",
    icon: Settings,
    permission: null,
    category: "الإدارة",
    children: [
      {
        to: "/admin/users",
        label: "المستخدمون",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/roles",
        label: "الأدوار",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/expenses",
        label: "المصروفات",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/settings",
        label: "الإعدادات",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/system",
        label: "النظام",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/backups",
        label: "النسخ الاحتياطي",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/warehouses",
        label: "المخازن",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/whatsapp-schedulers",
        label: "جدولة واتساب",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/whatsapp-test",
        label: "تجربة الواتساب",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/inventory/requisitions/request",
        label: "طلب مخزون",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/inventory/requisitions",
        label: "طلبات المخزون",
        permission: null,
        category: "الإدارة",
      },
      {
        to: "/admin/idb-manager",
        label: "إدارة DB المحلية",
        permission: null,
        category: "الإدارة",
      },
    ],
  },
];
