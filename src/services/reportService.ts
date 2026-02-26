import apiClient, { getValidationErrors, getErrorMessage } from "../lib/axios";

export interface BestSellingProduct {
  id: number;
  name: string;
  sku: string | null;
  category_name: string;
  image_url: string | null;
  total_quantity_sold: number;
  total_revenue: number;
  current_stock: number;
}

export interface StagnantProduct {
  id: number;
  name: string;
  sku: string | null;
  category_name: string;
  stock_quantity: number;
  lifetime_sales: number;
}

export interface ExpiringProduct {
  id: number;
  name: string;
  sku: string | null;
  category_name: string;
  stock_quantity: number;
  earliest_expiry_date: string;
}

const reportService = {
  getBestSellingProducts: async (
    days: number = 30,
    limit: number = 10,
  ): Promise<BestSellingProduct[]> => {
    try {
      const response = await apiClient.get<{ data: BestSellingProduct[] }>(
        "/reports/stats/best-selling",
        {
          params: { days, limit },
        },
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching best selling products:", error);
      throw error;
    }
  },

  getStagnantProducts: async (
    months: number = 3,
    limit: number = 20,
  ): Promise<StagnantProduct[]> => {
    try {
      const response = await apiClient.get<{ data: StagnantProduct[] }>(
        "/reports/stats/stagnant",
        {
          params: { months, limit },
        },
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching stagnant products:", error);
      throw error;
    }
  },

  getExpiringProducts: async (
    months: number = 3,
    limit: number = 20,
  ): Promise<ExpiringProduct[]> => {
    try {
      const response = await apiClient.get<{ data: ExpiringProduct[] }>(
        "/reports/stats/expiring",
        {
          params: { months, limit },
        },
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching expiring products:", error);
      throw error;
    }
  },

  getMovedExpiredProducts: async (
    params: Record<string, any> = {},
  ): Promise<any> => {
    try {
      const response = await apiClient.get("/reports/moved-expired", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching moved expired products:", error);
      throw error;
    }
  },

  moveExpiredProduct: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.post(
        `/reports/expired-products/${id}/move`,
      );
      return response.data;
    } catch (error) {
      console.error("Error moving expired product:", error);
      throw error;
    }
  },

  exportMovedExpiredProductsPdf: async (
    params: Record<string, any> = {},
  ): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        params.token = token;
      }
      const queryString = new URLSearchParams(params as any).toString();
      const url = `${apiClient.defaults.baseURL}/reports/moved-expired-pdf${queryString ? `?${queryString}` : ""}`;
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error exporting moved expired products PDF:", error);
      throw error;
    }
  },
};

export default reportService;
