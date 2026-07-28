// Static, hardcoded mapping of role name -> page-access keys.
//
// This intentionally does NOT go through Spatie permissions (the backend
// `permissions` table / "إدارة الأدوار" screen), so it never shows up as an
// assignable permission there. Only the 6 real POS action permissions
// (سداد، تخفيض، ...) live in that table. Page-level access for non-admin
// roles is controlled purely by this file.
//
// Keys here must match the `requiredPermission` values used in router.tsx.
export const ROLE_PAGE_ACCESS: Record<string, string[]> = {
  "مسوول المبيعات": [
    "view-dashboard",
    "view-clients",
    "view-suppliers",
    "view-products",
    "view-purchases",
    "view-pos",
    "view-sales",
    "view-sales-returns",
    "view-reports",
    "view-reports-sales",
    "view-reports-discounts",
    "view-reports-daily-income",
  ],
  "مسوول المخزن": [
    "view-dashboard",
    "view-products",
    "view-purchases",
    "manage-warehouses",
    "view-stock-adjustments",
    "view-stock-transfers",
    "view-reports",
    "view-reports-purchases",
    "view-reports-inventory-log",
  ],
  "كاشير": [
    "view-dashboard",
    "view-pos",
    "view-sales",
    "view-sales-returns",
  ],
};
