// src/services/supplierPaymentService.ts
import apiClient from "../lib/axios";

export interface SupplierPayment {
  id: number;
  supplier_id: number;
  purchase_id?: number | null;
  user_id: number;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'visa';
  reference_number?: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface CreatePaymentData {
  amount: number;
  method: 'cash' | 'bank_transfer' | 'visa';
  reference_number?: string;
  payment_date: string;
  purchase_id?: number | string | null;
}

export interface UpdatePaymentData extends CreatePaymentData {
  id: number;
}

export interface LedgerEntry {
  id: string;
  purchase_id?: number | string;
  date: string;
  type: 'purchase' | 'payment';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
  created_at: string;
  user?: string;
  payments?: SupplierPayment[];
}

export interface SupplierLedger {
  supplier: {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    client_id?: number | null;
    is_client?: boolean;
  };
  summary: {
    total_purchases: number;
    total_payments: number;
    balance: number;
  };
  ledger_entries: LedgerEntry[];
}

export interface PaymentMethod {
  value: string;
  label: string;
}

export interface PaymentType {
  value: string;
  label: string;
}

const supplierPaymentService = {
  /**
   * Get supplier ledger
   */
  getLedger: async (supplierId: number): Promise<SupplierLedger> => {
    const response = await apiClient.get(`/suppliers/${supplierId}/ledger`);
    return response.data;
  },

  /**
   * Settle supplier debt across unpaid purchases (FIFO)
   */
  settleDebt: async (supplierId: number, data: {
    amount: number;
    method: string;
    payment_date: string;
    reference_number?: string;
  }): Promise<{ message: string; result: { payments_created: number; total_applied: number; remaining_unapplied: number; affected_purchases: number[] } }> => {
    const response = await apiClient.post(`/suppliers/${supplierId}/settle-debt`, data);
    return response.data;
  },

  /**
   * Create a new payment
   */
  createPayment: async (supplierId: number, data: CreatePaymentData): Promise<SupplierPayment> => {
    const response = await apiClient.post(`/suppliers/${supplierId}/payments`, data);
    return response.data.payment;
  },

  /**
   * Update a payment
   */
  updatePayment: async (paymentId: number, data: UpdatePaymentData): Promise<SupplierPayment> => {
    const response = await apiClient.put(`/supplier-payments/${paymentId}`, data);
    return response.data.payment;
  },

  /**
   * Delete a payment
   */
  deletePayment: async (paymentId: number): Promise<void> => {
    await apiClient.delete(`/supplier-payments/${paymentId}`);
  },

  /**
   * Get payment methods
   */
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.get('/payment-methods');
    return response.data.methods;
  },

  /**
   * Get payment types
   */
  getPaymentTypes: async (): Promise<PaymentType[]> => {
    const response = await apiClient.get('/payment-types');
    return response.data.types;
  },

  /**
   * Get error message from API error
   */
  getErrorMessage: (error: any): string => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An error occurred while processing your request.';
  },

  /**
   * Get validation errors from API error
   */
  getValidationErrors: (error: any): Record<string, string[]> | null => {
    if (error.response?.data?.errors) {
      return error.response.data.errors;
    }
    return null;
  },
};

export default supplierPaymentService;