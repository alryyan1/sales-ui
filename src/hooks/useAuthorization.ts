// src/hooks/useAuthorization.ts

import { useAuth } from "@/context/AuthContext";

// All report pages a user can individually toggle on/off from the Users →
// "صلاحيات الوصول للصفحات" checklist (mirrors the "التقارير" category in
// navItems.ts). Used as a fallback for report permissions that guard a page
// with no single corresponding checkbox (e.g. the reports dashboard itself,
// or a sub-report reached only by drilling in) — access to any one report
// page implies access to those shared/derived report pages too.
const REPORT_NAV_ROUTES = [
  "/reports/sales",
  "/reports/inventory-log",
  "/reports/daily-income",
  "/reports/monthly-expenses",
  "/reports/best-selling-products",
  "/reports/stagnant-products",
  "/reports/low-stock-products",
  "/reports/shortages",
  "/reports/moved-expired-products",
  "/reports/monthly-shifts",
  "/reports/templates",
];

// Maps each `requiredPermission` string used by <PermissionGuard> in router.tsx
// to the nav route(s) (from navItems.ts) that an admin can check per-user in
// the "صلاحيات الوصول للصفحات" section of the user edit form. A route-guarded
// page becomes reachable once ANY of its mapped nav routes is present in the
// user's `allowed_navs`, even though the underlying Spatie permission (e.g.
// "view-products") was never actually seeded/assigned to any role.
const PERMISSION_NAV_ROUTES: Record<string, string[]> = {
  "view-clients": ["/clients"],
  "view-suppliers": ["/suppliers"],
  "view-products": ["/products"],
  "manage-warehouses": ["/admin/warehouses"],
  "view-purchases": ["/purchases"],
  "view-pos": ["/sales/pos", "/sales/pos-blank"],
  "view-sales": ["/sales/list"],
  "view-sales-returns": ["/sales/returns"],
  "view-stock-adjustments": ["/inventory/adjustments"],
  "view-stock-transfers": ["/inventory/transfers"],
  "view-reports": REPORT_NAV_ROUTES,
  "view-reports-sales": ["/reports/sales"],
  "view-reports-discounts": REPORT_NAV_ROUTES,
  "view-reports-inventory-log": ["/reports/inventory-log"],
  "view-reports-daily-income": ["/reports/daily-income"],
  "manage-users": ["/admin/users"],
  "manage-roles": ["/admin/roles"],
  // Categories/units are managed from a button inside the Products page, not
  // their own sidebar entry, so they piggyback on the "/products" checkbox.
  "manage-categories": ["/products"],
  "manage-expenses": ["/admin/expenses"],
  "manage-settings": ["/admin/settings", "/admin/whatsapp-test"],
  "manage-backups": ["/admin/backups"],
};

/**
 * Custom hook providing utility functions for checking user roles and permissions.
 */
export const useAuthorization = () => {
  const { user, roles = [], permissions = [] } = useAuth(); // Get user, roles, permissions from context

  /**
   * Checks if the current user has a specific role or one of several roles.
   * @param roleOrRoles A single role name (string) or an array of role names.
   * @returns True if the user has the role(s), false otherwise.
   */
  const hasRole = (roleOrRoles: string | string[]): boolean => {
    if (!user) return false; // Not logged in
    const rolesToCheck = Array.isArray(roleOrRoles)
      ? roleOrRoles
      : [roleOrRoles];
    // Check if any of the user's roles match any of the rolesToCheck
    return roles.some((userRole) => rolesToCheck.includes(userRole));
  };

  /**
   * Checks if the current user has a specific permission or one of several permissions.
   * @param permissionOrPermissions A single permission name (string) or an array.
   * @returns True if the user has the permission(s), false otherwise.
   */
  const hasPermission = (
    permissionOrPermissions: string | string[]
  ): boolean => {
    if (!user) return false;

    // Admin safeguard: Admins usually have all permissions
    // We check for both English 'admin' and Arabic 'ادمن' role names
    if (hasRole("admin") || hasRole("ادمن")) return true;

    const permissionsToCheck = Array.isArray(permissionOrPermissions)
      ? permissionOrPermissions
      : [permissionOrPermissions];

    return permissions.some((p) => permissionsToCheck.includes(p));
  };

  /**
   * Checks if the current user's per-user page list (`allowed_navs`, configured
   * from the Users edit form) grants access to the page(s) a given
   * `requiredPermission` guards. Falls back to false for permissions with no
   * known nav-route mapping (e.g. custom action permissions like "تخفيض").
   */
  const hasNavPageAccess = (
    permissionOrPermissions: string | string[]
  ): boolean => {
    if (!user) return false;
    if (hasRole("admin") || hasRole("ادمن")) return true;
    if (user.username === "superadmin" || user.allowed_navs === null || user.allowed_navs === undefined) {
      return true;
    }

    const permissionsToCheck = Array.isArray(permissionOrPermissions)
      ? permissionOrPermissions
      : [permissionOrPermissions];

    const candidateRoutes = permissionsToCheck.flatMap(
      (p) => PERMISSION_NAV_ROUTES[p] ?? []
    );

    return candidateRoutes.some((route) => user.allowed_navs?.includes(route));
  };

  /**
   * Checks if the current user has the 'admin' role.
   * @returns True if the user is an admin, false otherwise.
   */
  const isAdmin = (): boolean => {
    return hasRole("admin") || hasRole("ادمن");
  };

  return {
    user, // The user object
    roles, // Roles array
    permissions, // Permissions array
    isLoggedIn: !!user,
    hasRole, // Check Role
    hasPermission, // Check Permission
    hasNavPageAccess, // Check per-user page access (allowed_navs)
    isAdmin, // Check Admin
  };
};
