// src/hooks/useAuthorization.ts

import { useAuth } from "@/context/AuthContext";

/**
 * Custom hook providing utility functions for checking user roles.
 */
export const useAuthorization = () => {
    const { user, roles = [] } = useAuth(); // Get user, roles from context

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
        user,       // The user object (including roles)
        roles,      // Just the roles array
        isLoggedIn: !!user, // Convenience boolean
        hasRole,    // Function: hasRole('role-name') or hasRole(['role1', 'role2'])
        isAdmin,    // Function: isAdmin()
    };
};