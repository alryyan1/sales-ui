// src/components/layouts/navItems.ts
import {
  LayoutDashboard,
  Box as BoxIcon,
  Users,
  Building,
  ShoppingCart,
  CircleDollarSign,
  BarChart3,
  Settings,
} from "lucide-react";
import { NavItem } from "./types";

export const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    permission: null,
  },
  { to: "/clients", label: "العملاء", icon: Users, permission: null },
  { to: "/suppliers", label: "الموردون", icon: Building, permission: null },
  { to: "/products", label: "المنتجات", icon: BoxIcon, permission: null },
  {
    to: "/purchases",
    label: "المشتريات",
    icon: ShoppingCart,
    permission: null,
  },
  {
    to: "/inventory/adjustments",
    label: "تعديلات المخزون",
    icon: BoxIcon,
    permission: null,
  },
  {
    to: "/sales/pos",
    label: "نقطة البيع",
    icon: CircleDollarSign,
    permission: null,
  },
  {
    to: "/sales/pos-offline",
    label: "نقطة البيع (Offline)",
    icon: CircleDollarSign,
    permission: null,
  },
];

export const reportItems: NavItem[] = [
  { to: "/analytics", label: "التحليلات", permission: null },
  { to: "/reports/sales", label: "تقرير المبيعات", permission: null },
  { to: "/reports/purchases", label: "تقرير المشتريات", permission: null },
  { to: "/reports/inventory", label: "تقرير المخزون", permission: null },
  {
    to: "/reports/profit-loss",
    label: "تقرير الأرباح والخسائر",
    permission: null,
  },
  { to: "/reports/inventory-log", label: "سجل المخزون", permission: null },

  {
    to: "/reports/monthly-revenue",
    label: "الإيرادات الشهرية",
    permission: null,
  },
  {
    to: "/reports/sales-discounts",
    label: "المبيعات المخفضة",
    permission: null,
  },
  {
    to: "/reports/daily-income",
    label: "تقرير الدخل اليومي",
    permission: null,
  },
];

export const adminItems: NavItem[] = [
  { to: "/admin/users", label: "المستخدمون", permission: null },
  { to: "/admin/roles", label: "الأدوار", permission: null },
  { to: "/admin/categories", label: "الفئات", permission: null },
  { to: "/admin/expenses", label: "المصروفات", permission: null },
  { to: "/admin/settings", label: "الإعدادات", permission: null },
  { to: "/admin/system", label: "النظام", permission: null },
  { to: "/admin/backups", label: "النسخ الاحتياطي", permission: null },
  { to: "/admin/warehouses", label: "المخازن", permission: null },
  { to: "/admin/whatsapp-schedulers", label: "جدولة واتساب", permission: null },
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
];
