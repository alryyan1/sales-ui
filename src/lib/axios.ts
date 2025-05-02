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

// --- Error handling helper functions (keep these) ---
export interface ApiErrorResponse { /* ... */ }
export const getValidationErrors = (error: unknown): { [key: string]: string[] } | null => { /* ... */ };
export const getErrorMessage = (error: unknown): string => { /* ... */ };


export default apiClient;