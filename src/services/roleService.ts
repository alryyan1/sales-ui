// src/services/roleService.ts
import apiClient, { getValidationErrors, getErrorMessage } from '../lib/axios';
import axios from 'axios';
import { PaginatedResponse } from './clientService'; // Assuming shared type
import { Role } from './userService'; // Assuming Role type is here or move it to a shared types file

// Type for Permission data from API
export interface Permission {
    id: number;
    name: string;
}

// Type for creating/updating roles
export interface RoleFormData {
    name: string;
    permissions: string[]; // Array of permission names
}

// Type for Role resource from API (including permissions)
export interface RoleWithPermissions extends Role {
     permissions?: string[]; // Array of permission names assigned to the role
     permissions_count?: number; // Optional count from backend
     users_count?: number; // Optional count from backend
}


const roleService = {
    /**
     * Get paginated list of roles. Requires admin privileges.
     */
    getRoles: async (
        page: number = 1,
        limit: number = 15
        // Add search/sort later if needed
    ): Promise<PaginatedResponse<RoleWithPermissions>> => { // Expect RoleWithPermissions
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('per_page', limit.toString());

            // Assumes route is /api/admin/roles
            const response = await apiClient.get<PaginatedResponse<RoleWithPermissions>>(`/admin/roles?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching roles:', error);
            throw error;
        }
    },

    /**
     * Get a list of all available permissions. Requires admin privileges.
     */
    getPermissions: async (): Promise<Permission[]> => {
        try {
            // Assumes API returns { data: Permission[] }
            const response = await apiClient.get<{ data: Permission[] }>(`/admin/permissions`);
            return response.data.data ?? response.data; // Handle both structures
        } catch (error) {
            console.error('Error fetching permissions:', error);
            throw error;
        }
    },

    /**
     * Get details for a single role including its permissions.
     */
     getRole: async (id: number): Promise<RoleWithPermissions> => {
        try {
            // Assuming API returns { role: RoleWithPermissions }
            const response = await apiClient.get<{ role: RoleWithPermissions }>(`/admin/roles/${id}`);
            return response.data.role; // Adjust if needed
        } catch (error) {
            console.error(`Error fetching role ${id}:`, error);
            throw error;
        }
    },


    /**
     * Create a new role with assigned permissions. Requires admin privileges.
     */
    createRole: async (roleData: RoleFormData): Promise<RoleWithPermissions> => {
        try {
             // Assumes API returns { role: RoleWithPermissions }
            const response = await apiClient.post<{ role: RoleWithPermissions }>('/admin/roles', roleData);
            return response.data.role;
        } catch (error) {
            console.error('Error creating role:', error);
            throw error;
        }
    },

    /**
     * Update an existing role (permissions only, usually name is not changed). Requires admin privileges.
     */
    updateRole: async (id: number, roleData: Pick<RoleFormData, 'permissions'>): Promise<RoleWithPermissions> => {
         // Typically only update permissions, maybe name if allowed by backend
        try {
             // Assumes API returns { role: RoleWithPermissions }
            const response = await apiClient.put<{ role: RoleWithPermissions }>(`/admin/roles/${id}`, roleData);
            return response.data.role;
        } catch (error) {
            console.error(`Error updating role ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete a role. Requires admin privileges.
     */
    deleteRole: async (id: number): Promise<void> => {
        try {
            await apiClient.delete(`/admin/roles/${id}`);
        } catch (error) {
            console.error(`Error deleting role ${id}:`, error);
             if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 409)) {
                 // Handle specific errors (cannot delete admin, role in use)
                 throw new Error(getErrorMessage(error, 'Cannot delete this role.'));
             }
            throw error;
        }
    },

    // --- Error Helpers ---
    getValidationErrors,
    getErrorMessage,
};

// Removed custom isAxiosError function as it is now imported from 'axios'.


export default roleService;
export type { Role };