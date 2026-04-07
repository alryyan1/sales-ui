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
        label: "نقطة البيع ",
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
        label: "المنتجات",
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
    label: "المشتريات",
    icon: ShoppingCart,
    permission: null,
    category: "المشتريات",
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
        to: "/reports/sales",
        label: "تقرير المبيعات",
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
        to: "/reports/inventory-log",
        label: "سجل المخزون",
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
        label: "الطلبية ",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/moved-expired-products",
        label: "المنتجات التالفة/المنتهية",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/monthly-shifts",
        label: "تقرير الورديات الشهري",
        permission: null,
        category: "التقارير",
      },
      {
        to: "/reports/templates",
        label: "نماذج التقارير",
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
        to: "/admin/whatsapp-test",
        label: "تجربة الواتساب",
        permission: null,
        category: "الإدارة",
      },
    ],
  },
];
