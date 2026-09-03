import apiClient from "@/lib/axios";

export interface PaymentStats {
  total: number;
  by_method: Record<string, number>;
  /** Total of sale returns (refunds) over the window. */
  returns_total: number;
  /** Refunded amount broken down by the payment method used for the refund. */
  returns_by_method: Record<string, number>;
}

export interface PaymentRecord {
  id: number;
  amount: number;
  method: string;
  payment_date: string | null;
  reference_number: string | null;
  notes: string | null;
  user_name: string | null;
  sale_id: number;
  sale_date: string | null;
  client_name: string | null;
  client_id: number | null;
  sale_total: number;
  sale_paid: number;
  sale_due: number;
}

export interface PaymentsResponse {
  data: PaymentRecord[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface PaymentQueryParams {
  shift_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  user_id?: number | null;
  per_page?: number;
  page?: number;
}

const paymentService = {
  getPayments: async (params: PaymentQueryParams): Promise<PaymentsResponse> => {
    const query = new URLSearchParams();
    if (params.shift_id) query.set("shift_id", String(params.shift_id));
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    if (params.user_id) query.set("user_id", String(params.user_id));
    if (params.per_page) query.set("per_page", String(params.per_page));
    if (params.page) query.set("page", String(params.page));
    const res = await apiClient.get<PaymentsResponse>(
      `/payments?${query.toString()}`
    );
    return res.data;
  },

  getStats: async (params: Omit<PaymentQueryParams, "per_page" | "page">): Promise<PaymentStats> => {
    const query = new URLSearchParams();
    if (params.shift_id) query.set("shift_id", String(params.shift_id));
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    if (params.user_id) query.set("user_id", String(params.user_id));
    const res = await apiClient.get<PaymentStats>(
      `/payments/stats?${query.toString()}`
    );
    return res.data;
  },
};

export default paymentService;
