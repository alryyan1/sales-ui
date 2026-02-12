// src/services/saleReturnService.ts
import apiClient, {
  getValidationErrors,
  getErrorMessage,
  ApiErrorResponse,
} from "../lib/axios";
import { AxiosError } from "axios";
import { Product } from "./productService";
import { User } from "./authService";

// --- Interfaces for simple POS sale returns ---

export interface SimpleSaleReturnItemInput {
  product_id: number;
  quantity: number;
  price: number;
}

export interface CreateSaleReturnData {
  reason?: string | null;
  shift_id?: number | null;
  returned_payment_method: "cash" | "bankak" | "fawry" | "ocash";
  items: SimpleSaleReturnItemInput[];
}

export interface SaleReturnItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number | string;
  product?: Pick<Product, "id" | "name" | "sku">;
}

export interface SaleReturn {
  id: number;
  user_id: number;
  shift_id: number | null;
  reason: string | null;
  returned_payment_method: string;
  created_at: string;
  updated_at?: string;
  user?: Pick<User, "id" | "name">;
  items?: SaleReturnItem[];
}

const saleReturnService = {
  /**
   * Create a new simple sale return (POS).
   */
  createSaleReturn: async (
    data: CreateSaleReturnData,
  ): Promise<SaleReturn> => {
    try {
      const response = await apiClient.post<{ sale_return: SaleReturn }>(
        "/sale-returns",
        data,
      );
      return response.data.sale_return;
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.error("Error creating sale return:", error);
      // Surface validation / API messages up to callers
      (axiosError as any).validationErrors = getValidationErrors(axiosError);
      (axiosError as any).friendlyMessage = getErrorMessage(
        axiosError,
        "فشل إنشاء مردود المبيعات.",
      );
      throw axiosError;
    }
  },

  /**
   * Get sale returns for the current user with optional filters.
   */
  getSaleReturns: async (params: {
    page?: number;
    per_page?: number;
    shift_id?: number | null;
    start_date?: string | null;
    end_date?: string | null;
  } = {}): Promise<{ data: SaleReturn[]; meta?: any }> => {
    const searchParams = new URLSearchParams();
    searchParams.append("page", String(params.page ?? 1));
    searchParams.append("per_page", String(params.per_page ?? 15));
    if (params.shift_id) searchParams.append("shift_id", String(params.shift_id));
    if (params.start_date) searchParams.append("start_date", params.start_date);
    if (params.end_date) searchParams.append("end_date", params.end_date);

    const res = await apiClient.get<any>(`/sale-returns?${searchParams.toString()}`);
    const body = res.data;
    return {
      data: body.data ?? [],
      meta: body.meta ?? body,
    };
  },
};

export default saleReturnService;

