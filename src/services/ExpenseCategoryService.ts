// src/services/ExpenseCategoryService.ts
import apiClient, { getValidationErrors, getErrorMessage } from '../lib/axios';
import { PaginatedResponse } from './clientService';

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  expenses_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface ExpenseCategoryFormData {
  name: string;
  description?: string | null;
}

const expenseCategoryService = {
  getCategories: async (
    page: number = 1,
    perPage: number = 15,
    search: string = '',
    allFlat: boolean = false
  ): Promise<PaginatedResponse<ExpenseCategory> | ExpenseCategory[]> => {
    const params = new URLSearchParams();
    if (!allFlat) {
      params.append('page', String(page));
      params.append('per_page', String(perPage));
    }
    if (search) params.append('search', search);
    if (allFlat) params.append('all_flat', 'true');

    const res = await apiClient.get<PaginatedResponse<ExpenseCategory> | { data: ExpenseCategory[] }>(`/admin/expense-categories?${params.toString()}`);
    if (allFlat) {
      return (res.data as { data: ExpenseCategory[] }).data ?? (res.data as unknown as ExpenseCategory[]);
    }
    return res.data as PaginatedResponse<ExpenseCategory>;
  },

  createCategory: async (payload: ExpenseCategoryFormData): Promise<ExpenseCategory> => {
    const res = await apiClient.post<{ category: ExpenseCategory }>(`/admin/expense-categories`, payload);
    return res.data.category;
  },

  updateCategory: async (id: number, payload: Partial<ExpenseCategoryFormData>): Promise<ExpenseCategory> => {
    const res = await apiClient.put<{ category: ExpenseCategory }>(`/admin/expense-categories/${id}`, payload);
    return res.data.category;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/expense-categories/${id}`);
  },

  getValidationErrors,
  getErrorMessage,
};

export default expenseCategoryService;
export type { ExpenseCategory as ExpenseCategoryType, ExpenseCategoryFormData as ExpenseCategoryFormDataType };


