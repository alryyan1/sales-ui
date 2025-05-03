// src/lib/axios.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'; // Import InternalAxiosRequestConfig

// --- Base URL ---
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: `${VITE_API_BASE_URL}/api`,
    // withCredentials: false, // <--- Changed: Not needed for bearer tokens
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
         // 'X-Requested-With': 'XMLHttpRequest' // Still good practice
    }
});

// --- Axios Request Interceptor ---
// This function will run before every request is sent
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // 1. Get the token from wherever you store it (e.g., localStorage)
        const token = localStorage.getItem('authToken'); // Use a consistent key

        // 2. If the token exists, add the Authorization header
        if (token) {
            // Ensure headers object exists
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${token}`;
            console.log('Interceptor: Added Bearer token to headers'); // For debugging
        } else {
             console.log('Interceptor: No token found, sending request without Authorization header'); // For debugging
        }

        // 3. Return the modified config object
        return config;
    },
    (error) => {
        // Handle request errors (e.g., network issues before sending)
        console.error('Axios request interceptor error:', error);
        return Promise.reject(error);
    }
);

// --- Remove initializeCsrfToken function ---
// export const initializeCsrfToken = async () => { ... }; // Delete this


// --- Error Handling Helper Functions ---

/**
 * Interface representing the expected structure of API error responses,
 * especially for validation errors (HTTP 422).
 * Adjust based on your Laravel backend's actual error response format.
 */
export interface ApiErrorResponse {
    message: string; // General error message (e.g., "The given data was invalid.")
    errors?: {
        // Key is the field name (e.g., "email"), value is an array of error strings
        [key: string]: string[];
    };
}

/**
 * Type guard to check if an error object is an AxiosError.
 * Useful for safely accessing Axios-specific properties like `error.response`.
 * @param error The error object to check.
 * @returns True if the object is an AxiosError, false otherwise.
 */
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  // Axios errors should have the 'isAxiosError' property set to true.
  // We also cast the generic type here for better type inference later.
  return axios.isAxiosError(error);
}


/**
 * Extracts validation errors from an AxiosError, typically from a 422 response.
 * @param error The error object thrown by Axios.
 * @returns An object where keys are field names and values are arrays of error messages,
 *          or null if the error is not a validation error or doesn't match the expected format.
 */
export const getValidationErrors = (error: unknown): { [key: string]: string[] } | null => {
    if (isAxiosError(error)) {
        
        // Check if it's a validation error (status 422) and has the 'errors' object
        if (error.response?.status === 422 && error.response.data?.errors) {
            // Ensure the 'errors' property matches the expected structure
            const errors = error.response.data.errors;
            if (typeof errors === 'object' && errors !== null) {
                 // Basic check to filter out non-string arrays if necessary, though usually fine
                // You could add more rigorous checks here depending on API guarantees
                return errors as { [key: string]: string[] };
            }
        }
    }
    // Return null if it's not an Axios error, not a 422, or doesn't have the 'errors' object
    return null;
};

/**
 * Extracts a user-friendly error message from various error types.
 * Prioritizes messages from the API response, then Axios messages, then generic messages.
 * @param error The error object (can be AxiosError or any other error).
 * @param defaultMessage Optional default message if no other message can be extracted.
 * @returns A string containing the best available error message.
 */
export const getErrorMessage = (error: unknown, defaultMessage: string = 'An unexpected error occurred.'): string => {
    if (isAxiosError(error)) {
        // 1. Try to get the message from the API response data (e.g., error.response.data.message)
        if (error.response?.data?.message && typeof error.response.data.message === 'string') {
            return error.response.data.message;
        }
        // 2. If no specific message from data, use the Axios error message (e.g., "Network Error")
        // Check error.message first as it might be more specific than statusText
        if (error.message) {
            return error.message;
        }
        // 3. Fallback to HTTP status text if available
        if(error.response?.statusText) {
            return error.response.statusText;
        }
    } else if (error instanceof Error) {
        // 4. Handle standard JavaScript Error objects
        return error.message;
    }

    // 5. Fallback for unknown error types or if no other message was found
    return defaultMessage;
};



export default apiClient;