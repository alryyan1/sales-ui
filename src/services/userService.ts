// src/services/userService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse ,} from '../lib/axios';
import { AxiosError, isAxiosError } from 'axios';
import { PaginatedResponse } from './clientService'; // Assuming shared type
import { User } from './authService'; // Reuse User type (ensure it includes roles)

// Type for Role data from API
export interface Role {
    id: number;
    name: string;
}

// Type for creating/updating users (password only on create)
export interface UserFormData {
    name: string;
    username: string;
    password?: string; // Optional for update
    password_confirmation?: string; // Optional for update
    roles: string[]; // Array of role names
}

const userService = {

    /**
     * Get paginated list of users. Requires admin privileges.
     */
    getUsers: async (
        page: number = 1,
        search: string = '',
        role: string = '', // Filter by role name
        limit: number = 15
    ): Promise<PaginatedResponse<User>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('per_page', limit.toString());
            if (search) params.append('search', search);
            if (role) params.append('role', role);

            // Assumes route is /api/admin/users due to route group prefix
            const response = await apiClient.get<PaginatedResponse<User>>(`/admin/users?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    /**
     * Get details for a single user. Requires admin privileges.
     */
    getUser: async (id: number): Promise<User> => {
        try {
            // Assumes API returns user object directly or wrapped { user: User }
            const response = await apiClient.get<{ user: User } | User>(`/admin/users/${id}`);
             // Adjust based on actual response structure
            return ('user' in response.data) ? response.data.user : response.data;
        } catch (error) {
            console.error(`Error fetching user ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get a list of all available roles. Requires admin privileges.
     */
    getRoles: async (): Promise<Role[]> => {
        try {
            // Assumes API returns { data: Role[] }
            const response = await apiClient.get<{ data: Role[] }>(`/admin/roles`);
            return response.data.data ?? response.data; // Handle both structures
        } catch (error) {
            console.error('Error fetching roles:', error);
            throw error;
        }
    },

    /**
     * Create a new user. Requires admin privileges.
     */
    createUser: async (userData: UserFormData): Promise<User> => {
        try {
             // Assumes API returns { user: User }
            const response = await apiClient.post<{ user: User }>('/admin/users', userData);
            return response.data.user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    /**
     * Update an existing user (name, email, roles). Requires admin privileges.
     */
    updateUser: async (id: number, userData: Partial<UserFormData>): Promise<User> => {
         // Remove password fields if they accidentally got included for update
         const { password, password_confirmation, ...updateData } = userData;
        try {
             // Assumes API returns { user: User }
            const response = await apiClient.put<{ user: User }>(`/admin/users/${id}`, updateData);
            return response.data.user;
        } catch (error) {
            console.error(`Error updating user ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete a user. Requires admin privileges.
     */
    deleteUser: async (id: number): Promise<void> => {
        try {
            await apiClient.delete(`/admin/users/${id}`);
        } catch (error) {
            console.error(`Error deleting user ${id}:`, error);
             if (isAxiosError(error) && error.response?.status === 403) {
                 throw new Error(getErrorMessage(error, 'You cannot delete this user (e.g., self-deletion).'));
             }
            throw error;
        }
    },

    // --- Error Helpers ---
    getValidationErrors,
    getErrorMessage,
};

// Re-usable Axios error check function
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}

export default userService;
