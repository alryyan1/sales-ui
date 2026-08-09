// src/components/admin/users/roles/roleUtils.ts

/**
 * The seeded super-admin role is stored as "ادمن" (Arabic), not the literal
 * string "admin" — useAuthorization.hasRole() already checks both spellings.
 * Mirror that here so the protected/undeletable-role UI actually matches
 * real data instead of a check that silently never fires.
 */
export function isSystemRole(name: string): boolean {
  return name === "admin" || name === "ادمن";
}
