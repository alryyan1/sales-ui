// src/services/productService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import { AxiosError } from 'axios';
// Assuming PaginatedResponse is defined/exported from clientService or a shared types file
import { PaginatedResponse } from './clientService'; // Or adjust import path

// --- Interfaces ---

// Matches ProductResource structure from Laravel
export interface Product {
    id: number;
    name: string;
    sku: string | null;
    description: string | null;
    // Ensure frontend types match backend casts (string for decimals often safer for precision)
    purchase_price: string; // Comes as string from JSON usually due to precision
    sale_price: string;     // Comes as string from JSON
    stock_quantity: number; // Integer
    stock_alert_level: number | null; // Integer or null
    // unit?: string | null; // Add if using units
    // category?: any; // Define Category interface if needed
    created_at: string;
    updated_at: string;
}

// Data type for creating/updating (match form fields)
// Use string for prices/numbers initially, convert/validate before sending if needed
export interface ProductFormData {
    name: string;
    sku: string | null;
    description: string | null;
    purchase_price: string; // Input as string
    sale_price: string;     // Input as string
    stock_quantity: string; // Input as string initially
    stock_alert_level: string | null; // Input as string or null
    // unit?: string | null;
    // category_id?: number | null;
}

// --- Service Object ---
const productService = {

    /**
     * Get paginated list of products, optionally with search/sort.
     */
    getProducts: async (
        page: number = 1,
        search: string = '',
        sortBy: string = 'created_at', // Default sort
        sortDirection: 'asc' | 'desc' = 'desc' // Default direction
    ): Promise<PaginatedResponse<Product>> => {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            if (search) params.append('search', search);
            if (sortBy) params.append('sort_by', sortBy);
            if (sortDirection) params.append('sort_direction', sortDirection);

            const response = await apiClient.get<PaginatedResponse<Product>>(`/products?${params.toString()}`);
            console.log('getProducts response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    },

    /**
     * Get a single product by ID.
     */
    getProduct: async (id: number): Promise<Product> => {
        try {
            // Assuming API returns { product: { ... } }
            const response = await apiClient.get<{ product: Product }>(`/products/${id}`);
            return response.data.product; // Adjust if API returns product directly
        } catch (error) {
            console.error(`Error fetching product ${id}:`, error);
            throw error;
        }
    },

    /**
     * Create a new product.
     */
    createProduct: async (productData: ProductFormData): Promise<Product> => {
        try {
            // Assuming API returns { product: { ... } }
            const response = await apiClient.post<{ product: Product }>('/products', productData);
            return response.data.product; // Adjust if needed
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    },

    /**
     * Update an existing product.
     */
    updateProduct: async (id: number, productData: Partial<ProductFormData>): Promise<Product> => {
        try {
            // Assuming API returns { product: { ... } }
            const response = await apiClient.put<{ product: Product }>(`/products/${id}`, productData);
            return response.data.product; // Adjust if needed
        } catch (error) {
            console.error(`Error updating product ${id}:`, error);
            throw error;
        }
    },

    /**
     * Delete a product.
     */
    deleteProduct: async (id: number): Promise<void> => {
        try {
            await apiClient.delete(`/products/${id}`);
        } catch (error) {
            console.error(`Error deleting product ${id}:`, error);
            throw error;
        }
    },

    // --- Error Helpers ---
    getValidationErrors,
    getErrorMessage,
};

export default productService;

// Export types if needed elsewhere
// export type { Product, ProductFormData };