// src/services/authService.ts
import apiClient, { getValidationErrors, getErrorMessage } from "../lib/axios";
import axios, { AxiosError } from "axios"; // Import AxiosError for type checking

// Define a type for the User object (matching Laravel's User model structure)
// Update or Define the User interface/type
export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null; // Optional based on your API response
  created_at?: string; // Optional based on your API response
  updated_at?: string; // Optional based on your API response
  // Add roles and permissions arrays (make optional if user might not have any)
  roles?: string[];
  permissions?: string[];
}
// AuthResponse type (ensure it includes roles/permissions)

// Define types for login/register credentials
interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean; // Optional 'remember me' flag
}

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  password_confirmation: string; // Required by Laravel validation
}

// Type for Profile Update Payload
export interface UpdateProfileData {
  name: string;
  email: string;
}

// Type for Password Update Payload
export interface UpdatePasswordData {
  current_password: string;
  password: string; // This is the 'new_password'
  password_confirmation: string;
}
// --- Type for Login/Register API Response ---
export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: "Bearer";
  message?: string;
  roles?: string[]; // Ensure login response includes these if setting user directly
  permissions?: string[]; // Ensure login response includes these
}
const AUTH_TOKEN_KEY = "authToken"; // Consistent key for localStorage

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
  /**
   * Update the authenticated user's profile (name, email).
   */
  updateProfile: async (profileData: UpdateProfileData): Promise<User> => {
    try {
      // Assuming API returns { user: UserResource }
      const response = await apiClient.put<{ user: User }>(
        "/profile",
        profileData
      );
      return response.data.user; // Adjust if needed
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error; // Rethrow for form handling
    }
  },

  /**
   * Update the authenticated user's password.
   */
  updatePassword: async (
    passwordData: UpdatePasswordData
  ): Promise<{ message: string }> => {
    try {
      // Assuming API returns { message: '...' } on success
      const response = await apiClient.put<{ message: string }>(
        "/profile/password",
        passwordData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating password:", error);
      throw error; // Rethrow for form handling
    }
  },
  /**
   * Get the current authenticated user's profile details.
   * Reuses the /api/user endpoint logic, potentially refactored.
   */
  getCurrentUserProfile: async (): Promise<User | null> => {
    const token = authService.getToken();
    if (!token) return null;
    try {
      // Assumes /api/profile GET maps to ProfileController@show which returns UserResource
      // Or reuse /api/user if it returns the same detailed structure
      const response = await apiClient.get<User>("/profile"); // Or '/user'
      return response.data; // Assumes data is the User object directly or wrapped e.g. response.data.user
    } catch (error) {
      console.error("Get user profile error:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        authService.removeToken();
      }
      return null;
    }
  },

  // --- Login ---
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>(
        "/login",
        credentials
      );
      if (response.data.access_token) {
        authService.storeToken(response.data.access_token); // Store the token
      }
      return response.data; // Return the full response (includes user and token)
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // --- Register ---
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>(
        "/register",
        credentials
      );
      if (response.data.access_token) {
        authService.storeToken(response.data.access_token); // Store the token
      }
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  // --- Logout ---
  logout: async (): Promise<void> => {
    try {
      // Send request to invalidate token on backend
      // The interceptor will add the current token to the request header
      await apiClient.post("/logout");
    } catch (error) {
      // Log error, but proceed with client-side cleanup regardless
      console.error("Logout API error:", error);
      // Consider if specific errors (like 401) should be handled differently
    } finally {
      // Always remove the token from local storage on logout attempt
      authService.removeToken();
      console.log("Token removed from local storage.");
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
      const response = await apiClient.get<User>("/user");
      return response.data;
    } catch (error) {
      console.error("Get user error:", error);
      // If API returns 401 Unauthorized, token is likely invalid/expired
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.warn("Token validation failed (401). Removing invalid token.");
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
