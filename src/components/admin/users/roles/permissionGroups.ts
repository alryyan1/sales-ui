// src/components/admin/users/roles/permissionGroups.ts
import type { Permission } from "@/services/roleService";

/**
 * The API returns a flat, uncategorized permission list. Grouping them by
 * keyword gives the assignment UI real structure without requiring a
 * backend category field. Anything that matches no rule falls into "أخرى"
 * so newly added permissions never disappear.
 */
const GROUP_RULES: { id: string; label: string; test: RegExp }[] = [
  { id: "shifts", label: "إدارة الورديات", test: /وردي/ },
  { id: "financial", label: "العمليات المالية", test: /سداد|دولار|سعر/ },
  { id: "sales", label: "المبيعات والفواتير", test: /فاتورة|تخفيض|بيع|منتج/ },
];

const OTHER_GROUP = { id: "other", label: "أخرى" };

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: Permission[];
}

export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const buckets = new Map<string, PermissionGroup>();

  for (const permission of permissions) {
    const rule = GROUP_RULES.find((r) => r.test.test(permission.name));
    const target = rule ?? OTHER_GROUP;
    if (!buckets.has(target.id)) {
      buckets.set(target.id, { id: target.id, label: target.label, permissions: [] });
    }
    buckets.get(target.id)!.permissions.push(permission);
  }

  // Keep declaration order (shifts, financial, sales, other) rather than first-seen order.
  const order = [...GROUP_RULES.map((r) => r.id), OTHER_GROUP.id];
  return order
    .map((id) => buckets.get(id))
    .filter((group): group is PermissionGroup => Boolean(group));
}
