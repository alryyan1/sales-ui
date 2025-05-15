// src/hooks/useAuthorization.ts

import { useAuth } from "@/context/AuthContext";
 /**
     * Checks if the current user has a specific permission.
     * @param permissionName The name of the permission to check.
     * @returns True if the user has the permission, false otherwise.
     */
    export type PermissionName = 

        'create-sale-returns'
        | 'view-clients'
        | 'manage-settings'
        | 'create-clients'
        | 'edit-clients'
        | 'delete-clients'
        | 'view-suppliers'
        | 'create-suppliers'
        | 'edit-suppliers'
        | 'delete-suppliers'
        | 'view-products'
        | 'view-returns'
        | 'create-products'
        | 'edit-products'
        | 'delete-products'
        | 'view-purchases'
        | 'create-purchases'
        | 'view-sales'
        | 'create-sales'
        | 'view-reports'
        | 'manage-users'
        | 'manage-roles'
        | 'view-stock-adjustments'
        | 'adjust-stock'
        | 'view-categories'
        | 'create-categories'
        | 'manage-categories'
        | 'view-settings'
        | 'update-settings'
        | 'request-stock'
        | 'view-own-stock-requisitions'
        | 'view-all-stock-requisitions'
        | 'process-stock-requisitions';
/**
 * Custom hook providing utility functions for checking user roles and permissions.
 */
export const useAuthorization = () => {
    const { user, roles = [], permissions = [] } = useAuth(); // Get user, roles, permissions from context

   

    const can = (permissionName: PermissionName): boolean => {
        if (!user || !permissionName) return false; // Not logged in or no permission specified
        // Admins typically bypass explicit permission checks (depends on your backend setup)
        if (roles.includes('admin')) {
            return true;
        }
        // Check if the permission exists in the user's permissions array
        return permissions.includes(permissionName);
    };

    /**
     * Checks if the current user has a specific role or one of several roles.
     * @param roleOrRoles A single role name (string) or an array of role names.
     * @returns True if the user has the role(s), false otherwise.
     */
    const hasRole = (roleOrRoles: string | string[]): boolean => {
        if (!user) return false; // Not logged in
        const rolesToCheck = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
        // Check if any of the user's roles match any of the rolesToCheck
        return roles.some(userRole => rolesToCheck.includes(userRole));
    };

    /**
     * Checks if the current user has the 'admin' role.
     * @returns True if the user is an admin, false otherwise.
     */
    const isAdmin = (): boolean => {
        return hasRole('admin');
    };

    return {
        user,       // The user object (including roles/permissions)
        roles,      // Just the roles array
        permissions,// Just the permissions array
        isLoggedIn: !!user, // Convenience boolean
        can,        // Function: can('permission-name')
        hasRole,    // Function: hasRole('role-name') or hasRole(['role1', 'role2'])
        isAdmin,    // Function: isAdmin()
    };
};