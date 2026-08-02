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

};

export default reportService;
