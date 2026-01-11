// src/components/layouts/navItems.ts
import {
  LayoutDashboard,
  Box as BoxIcon,
  ShoppingCart,
  CircleDollarSign,
  Settings,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { NavItem } from "./types";

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
        to: "/sales/pos-offline",
        label: "نقطة البيع (Offline)",
        permission: null,
        category: "المبيعات",
      },
      {
        to: "/sales/pos",
        label: "نقطة البيع (Online)",
        permission: null,
        category: "المبيعات",
      },
      {
        to: "/sales/returns",
        label: "مردودات المبيعات",
        permission: null, // or "view-sales-returns" if permissions are strict
        category: "المبيعات",
      },
      { to: "/clients", label: "العملاء", permission: null, category: "المبيعات" },
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
      { to: "/products", label: "المنتجات", permission: null, category: "المخزون" },
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
      { to: "/suppliers", label: "الموردون", permission: null, category: "المخزون" },
    ],
  },

  // Purchases Group
  {
    to: "#",
    label: "المشتريات",
    icon: ShoppingCart,
    permission: null,
    category: "المشتريات",
    children: [
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
      { to: "/reports/sales", label: "تقرير المبيعات", permission: null, category: "التقارير" },
      { to: "/reports/purchases", label: "تقرير المشتريات", permission: null, category: "التقارير" },
      { to: "/reports/suppliers-summary", label: "ملخص الموردين", permission: null, category: "التقارير" },
      { to: "/reports/inventory-log", label: "سجل المخزون", permission: null, category: "التقارير" },
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
      //moneth expenses
      {
        to:'/reports/monthly-expenses',
        label: 'تقرير المصروفات الشهرية',
        permission: null,
        category: "التقارير",
      }
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
      { to: "/admin/users", label: "المستخدمون", permission: null, category: "الإدارة" },
      { to: "/admin/roles", label: "الأدوار", permission: null, category: "الإدارة" },
      { to: "/admin/expenses", label: "المصروفات", permission: null, category: "الإدارة" },
      { to: "/admin/settings", label: "الإعدادات", permission: null, category: "الإدارة" },
      { to: "/admin/system", label: "النظام", permission: null, category: "الإدارة" },
      { to: "/admin/backups", label: "النسخ الاحتياطي", permission: null, category: "الإدارة" },
      { to: "/admin/warehouses", label: "المخازن", permission: null, category: "الإدارة" },
      {
        to: "/admin/whatsapp-schedulers",
        label: "جدولة واتساب",
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
      { to: "/admin/idb-manager", label: "إدارة DB المحلية", permission: null, category: "الإدارة" },
    ],
  },
];
