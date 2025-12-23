// src/hooks/useAuthorization.ts

import { useAuth } from "@/context/AuthContext";

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
    isAdmin, // Check Admin
  };
};
