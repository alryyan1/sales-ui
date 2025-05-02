// src/services/authService.ts
import apiClient, { getValidationErrors, getErrorMessage } from '../lib/axios';
import axios, { AxiosError } from 'axios'; // Import AxiosError for type checking

// Define a type for the User object (matching Laravel's User model structure)
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null; // Adjust based on your User model
    created_at: string;
    updated_at: string;
}

// Define types for login/register credentials
interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean; // Optional 'remember me' flag
}

interface RegisterCredentials {
    name: string;
    email: string;
    password: string;
    password_confirmation: string; // Required by Laravel validation
}

// Define a type for the API error response structure (adjust if needed)
interface ApiErrorResponse {
    message: string;
    errors?: {
        [key: string]: string[]; // Field-specific validation errors
    };
}


// --- Type for Login/Register API Response ---
interface AuthResponse {
    user: User;
    access_token: string;
    token_type: 'Bearer';
    message?: string; // Optional message
}
const AUTH_TOKEN_KEY = 'authToken'; // Consistent key for localStorage

const authService = {
    // --- Store Token ---
    storeToken: (token: string): void => {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    },

    // --- Get Token ---
    getToken: (): string | null => {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    // --- Remove Token ---
    removeToken: (): void => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
    },


    // --- Login ---
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        try {
            const response = await apiClient.post<AuthResponse>('/login', credentials);
            if (response.data.access_token) {
                authService.storeToken(response.data.access_token); // Store the token
            }
            return response.data; // Return the full response (includes user and token)
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // --- Register ---
    register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
        try {
            const response = await apiClient.post<AuthResponse>('/register', credentials);
             if (response.data.access_token) {
                authService.storeToken(response.data.access_token); // Store the token
            }
            return response.data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    // --- Logout ---
    logout: async (): Promise<void> => {
        try {
            // Send request to invalidate token on backend
            // The interceptor will add the current token to the request header
            await apiClient.post('/logout');
        } catch (error) {
             // Log error, but proceed with client-side cleanup regardless
             console.error('Logout API error:', error);
             // Consider if specific errors (like 401) should be handled differently
        } finally {
             // Always remove the token from local storage on logout attempt
             authService.removeToken();
             console.log('Token removed from local storage.');
        }
    },

    // --- Get Current User ---
    getCurrentUser: async (): Promise<User | null> => {
         // Check if token exists client-side first (optional optimization)
         const token = authService.getToken();
         if (!token) {
             console.log("No token found locally, skipping /user request.");
             return null; // No need to make API call if no token
         }

        try {
            // Interceptor adds 'Authorization: Bearer <token>' header
            const response = await apiClient.get<User>('/user');
            return response.data;
        } catch (error) {
            console.error('Get user error:', error);
             // If API returns 401 Unauthorized, token is likely invalid/expired
             if (axios.isAxiosError(error) && error.response?.status === 401) {
                console.warn('Token validation failed (401). Removing invalid token.');
                authService.removeToken(); // Remove invalid token
             }
            // Don't throw error here, just return null to indicate no valid user found
            return null;
            // throw error; // Or rethrow if the calling component needs to know about the error
        }
    },

    // --- Error helpers (remain the same) ---
    getValidationErrors,
    getErrorMessage,
};



export default authService;