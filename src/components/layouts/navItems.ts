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
  },

  // Sales Group
  {
    to: "#",
    label: "المبيعات",
    icon: CircleDollarSign,
    permission: null,
    children: [
      {
        to: "/sales/pos-offline",
        label: "نقطة البيع (Offline)",
        permission: null,
      },
      {
        to: "/sales/pos",
        label: "نقطة البيع (Online)",
        permission: null,
      },
      {
        to: "/sales/returns",
        label: "مردودات المبيعات",
        icon: RefreshCw,
        permission: null, // or "view-sales-returns" if permissions are strict
      },
      { to: "/clients", label: "العملاء", permission: null },
    ],
  },

  // Inventory Group
  {
    to: "#",
    label: "المخزون",
    icon: BoxIcon,
    permission: null,
    children: [
      { to: "/products", label: "المنتجات", permission: null },
      {
        to: "/inventory/adjustments",
        label: "تعديلات المخزون",
        permission: null,
      },
      {
        to: "/inventory/transfers",
        label: "تحويل المخزون",
        permission: null,
      },
      { to: "/suppliers", label: "الموردون", permission: null },
    ],
  },

  // Purchases Group
  {
    to: "#",
    label: "المشتريات",
    icon: ShoppingCart,
    permission: null,
    children: [
      {
        to: "/purchases",
        label: "قائمة المشتريات",
        permission: null,
      },
    ],
  },

  // Reports Group
  {
    to: "#",
    label: "التقارير",
    icon: BarChart3,
    permission: null,
    children: [
      { to: "/reports/sales", label: "تقرير المبيعات", permission: null },
      { to: "/reports/purchases", label: "تقرير المشتريات", permission: null },
      { to: "/reports/suppliers-summary", label: "ملخص الموردين", permission: null },
      { to: "/reports/inventory-log", label: "سجل المخزون", permission: null },
      {
        to: "/reports/sales-discounts",
        label: "المبيعات المخفضة",
        permission: null,
      },
      {
        to: "/reports/daily-income",
        label: "تقرير المبيعات الشهري",
        permission: null,
      },
    ],
  },

  // Admin Group
  {
    to: "#",
    label: "الإدارة",
    icon: Settings,
    permission: null,
    children: [
      { to: "/admin/users", label: "المستخدمون", permission: null },
      { to: "/admin/roles", label: "الأدوار", permission: null },
      { to: "/admin/expenses", label: "المصروفات", permission: null },
      { to: "/admin/settings", label: "الإعدادات", permission: null },
      { to: "/admin/system", label: "النظام", permission: null },
      { to: "/admin/backups", label: "النسخ الاحتياطي", permission: null },
      { to: "/admin/warehouses", label: "المخازن", permission: null },
      {
        to: "/admin/whatsapp-schedulers",
        label: "جدولة واتساب",
        permission: null,
      },
      {
        to: "/admin/inventory/requisitions/request",
        label: "طلب مخزون",
        permission: null,
      },
      {
        to: "/admin/inventory/requisitions",
        label: "طلبات المخزون",
        permission: null,
      },
      { to: "/admin/idb-manager", label: "إدارة DB المحلية", permission: null },
    ],
  },
];
