// src/services/expenseService.ts
import apiClient, { getValidationErrors, getErrorMessage } from '../lib/axios';
import { PaginatedResponse } from './clientService';

export interface Expense {
  id: number;
  title: string;
  description: string | null;
  amount: number | string;
  expense_date: string; // YYYY-MM-DD
  payment_method: string | null;
  reference: string | null;
  expense_category_id: number | null;
  expense_category_name?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ExpenseFormData {
  title: string;
  description?: string | null;
  amount: number | string;
  expense_date: string;
  payment_method?: string | null;
  reference?: string | null;
  expense_category_id?: number | null;
}

const expenseService = {
  getExpenses: async (
    page: number = 1,
    perPage: number = 15,
    filters: {
      search?: string;
      expense_category_id?: number | null;
      date_from?: string;
      date_to?: string;
      min_amount?: number | string;
      max_amount?: number | string;
      sort_by?: string;
      sort_direction?: 'asc' | 'desc';
    } = {}
  ): Promise<PaginatedResponse<Expense>> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', String(perPage));
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const res = await apiClient.get<PaginatedResponse<Expense>>(`/admin/expenses?${params.toString()}`);
    return res.data;
  },

  getExpense: async (id: number): Promise<Expense> => {
    const res = await apiClient.get<{ expense: Expense }>(`/admin/expenses/${id}`);
    return res.data.expense;
  },

  createExpense: async (payload: ExpenseFormData): Promise<Expense> => {
    const res = await apiClient.post<{ expense: Expense }>(`/admin/expenses`, payload);
    return res.data.expense;
  },

  updateExpense: async (id: number, payload: Partial<ExpenseFormData>): Promise<Expense> => {
    const res = await apiClient.put<{ expense: Expense }>(`/admin/expenses/${id}`, payload);
    return res.data.expense;
  },

  deleteExpense: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/expenses/${id}`);
  },

  getValidationErrors,
  getErrorMessage,
};

export default expenseService;
export type { Expense as ExpenseType, ExpenseFormData as ExpenseFormDataType };


