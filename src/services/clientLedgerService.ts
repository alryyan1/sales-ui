// src/services/clientLedgerService.ts
import apiClient from "../lib/axios";

export interface ClientLedgerEntry {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  description: string;
  debit: number;   // Amount client owes (e.g., sale)
  credit: number;  // Amount received from client (payment)
  balance: number;
  reference?: string;
  notes?: string;
  created_at?: string;
  user?: string;
}

export interface ClientLedger {
  client: {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  summary: {
    total_sales: number;
    total_payments: number;
    balance: number;
  };
  ledger_entries: ClientLedgerEntry[];
}

const clientLedgerService = {
  getLedger: async (clientId: number): Promise<ClientLedger> => {
    const response = await apiClient.get(`/clients/${clientId}/ledger`);
    return response.data;
  },

  openLedgerPdfInNewTab: async (clientId: number): Promise<void> => {
    // Fetch with auth headers, then open blob in new tab to avoid auth redirect issues
    const response = await apiClient.get(`/clients/${clientId}/ledger/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Revoke URL later to keep tab working
    setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  },

  settleDebt: async (clientId: number, data: { amount: number; payment_date: string; method: string; reference_number?: string; notes?: string; }) => {
    const response = await apiClient.post(`/clients/${clientId}/settle-debt`, data);
    return response.data;
  },

  getErrorMessage: (error: any): string => {
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.message) return error.message;
    return 'An error occurred while processing your request.';
  },
};

export default clientLedgerService; 