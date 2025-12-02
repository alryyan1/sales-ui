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
} from 'lucide-react';
import { NavItem } from './types';

export const navItems: NavItem[] = [
    { to: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, permission: null },
    { to: '/clients', label: 'العملاء', icon: Users, permission: 'view-clients' },
    { to: '/suppliers', label: 'الموردون', icon: Building, permission: 'view-suppliers' },
    { to: '/products', label: 'المنتجات', icon: BoxIcon, permission: 'view-products' },
    { to: '/purchases', label: 'المشتريات', icon: ShoppingCart, permission: 'view-purchases' },
    { to: '/inventory/adjustments', label: 'تعديلات المخزون', icon: BoxIcon, permission: 'adjust-stock' },
    { to: '/sales', label: 'المبيعات', icon: CircleDollarSign, permission: 'view-sales' },
    { to: '/sales/pos-new', label: 'نقطة البيع', icon: CircleDollarSign, permission: 'view-sales' },
    { to: '/sales/returns', label: 'مرتجعات المبيعات', icon: CircleDollarSign, permission: 'view-returns' },
];

export const reportItems: NavItem[] = [
    { to: '/analytics', label: 'التحليلات', permission: 'view-reports' },
    { to: '/reports/sales', label: 'تقرير المبيعات', permission: 'view-reports' },
    { to: '/reports/purchases', label: 'تقرير المشتريات', permission: 'view-reports' },
    { to: '/reports/inventory', label: 'تقرير المخزون', permission: 'view-reports' },
    { to: '/reports/profit-loss', label: 'تقرير الأرباح والخسائر', permission: 'view-reports' },
    { to: '/reports/inventory-log', label: 'سجل المخزون', permission: 'view-reports' },
    { to: '/reports/near-expiry', label: 'قرب انتهاء الصلاحية', permission: 'view-reports' },
    { to: '/reports/monthly-revenue', label: 'الإيرادات الشهرية', permission: 'view-reports' },
    { to: '/reports/sales-discounts', label: 'المبيعات المخفضة', permission: 'view-reports' },
];

export const adminItems: NavItem[] = [
    { to: '/admin/users', label: 'المستخدمون', permission: 'manage-users' },
    { to: '/admin/roles', label: 'الأدوار', permission: 'manage-roles' },
    { to: '/admin/categories', label: 'الفئات', permission: 'manage-categories' },
    { to: '/admin/expenses', label: 'المصروفات', permission: 'manage-settings' },
    { to: '/admin/settings', label: 'الإعدادات', permission: 'manage-settings' },
    { to: '/admin/system', label: 'النظام', permission: 'view-system' },
    { to: '/admin/backups', label: 'النسخ الاحتياطي', permission: 'manage-settings' },
    { to: '/admin/whatsapp-schedulers', label: 'جدولة واتساب', permission: 'manage-whatsapp-schedulers' },
    { to: '/admin/inventory/requisitions/request', label: 'طلب مخزون', permission: 'view-all-stock-requisitions' },
    { to: '/admin/inventory/requisitions', label: 'طلبات المخزون', permission: 'view-all-stock-requisitions' },
];

