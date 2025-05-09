// src/services/categoryService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios';
import axios, { AxiosError, isAxiosError } from 'axios';
import { PaginatedResponse } from './clientService'; // Assuming shared type

export interface Category {
    id: number;
    name: string;
    description: string | null;
    parent_id: number | null;
    parent_name?: string; // If included by resource when loaded
    products_count?: number; // If included by resource withCount
    children_count?: number; // If included by resource withCount
    // children?: Category[]; // For recursive display if needed
    created_at: string;
}

export interface CategoryFormData {
    name: string;
    description?: string | null;
    parent_id?: number | null;
}

const categoryService = {
    getCategories: async (
        page: number = 1,
        limit: number = 15,
        search: string = '',
        topLevelOnly: boolean = false,
        allFlat: boolean = false // For dropdowns, fetch all non-paginated
    ): Promise<PaginatedResponse<Category> | Category[]> => { // Return type can vary
        try {
            const params = new URLSearchParams();
            if (!allFlat) {
                params.append('page', page.toString());
                params.append('per_page', limit.toString());
            }
            if (search) params.append('search', search);
            if (topLevelOnly) params.append('top_level_only', 'true');
            if (allFlat) params.append('all_flat', 'true');

            const response = await apiClient.get<PaginatedResponse<Category> | { data: Category[] }>(`/admin/categories?${params.toString()}`);
             // Backend might return {data: Category[]} directly if allFlat=true
            if (allFlat) {
                return (response.data as { data: Category[] }).data ?? response.data as Category[];
            }
            return response.data as PaginatedResponse<Category>;
        } catch (error) { console.error('Error fetching categories:', error); throw error; }
    },

    getCategory: async (id: number): Promise<Category> => {
        try {
            const response = await apiClient.get<{ category: Category }>(`/admin/categories/${id}`);
            return response.data.category; // Assuming backend wraps in 'category' key
        } catch (error) { console.error(`Error fetching category ${id}:`, error); throw error; }
    },

    createCategory: async (categoryData: CategoryFormData): Promise<Category> => {
        try {
            const response = await apiClient.post<{ category: Category }>('/admin/categories', categoryData);
            return response.data.category;
        } catch (error) { console.error('Error creating category:', error); throw error; }
    },

    updateCategory: async (id: number, categoryData: Partial<CategoryFormData>): Promise<Category> => {
        try {
            const response = await apiClient.put<{ category: Category }>(`/admin/categories/${id}`, categoryData);
            return response.data.category;
        } catch (error) { console.error(`Error updating category ${id}:`, error); throw error; }
    },

    deleteCategory: async (id: number): Promise<void> => {
        try {
            await apiClient.delete(`/admin/categories/${id}`);
        } catch (error) {
            console.error(`Error deleting category ${id}:`, error);
             if (axios.isAxiosError(error) && error.response?.status === 409) { // Conflict
                 throw new Error(getErrorMessage(error, 'Cannot delete category. It has products or subcategories assigned.'));
             }
            throw error;
        }
    },

    getValidationErrors,
    getErrorMessage,
};

function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
    return (error as AxiosError)?.isAxiosError === true;
}

export default categoryService;
export type { Category as CategoryType, CategoryFormData as CategoryFormDataType };