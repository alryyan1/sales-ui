import apiClient from "@/lib/axios";
import { Product } from "./productService";

export interface PackageItem {
  id?: number;
  package_id?: number;
  product_id: number;
  product?: Product;
}

export interface Package {
  id?: number;
  name: string;
  items?: PackageItem[];
  created_at?: string;
  updated_at?: string;
}

const packageService = {
  getPackages: async (): Promise<Package[]> => {
    const response = await apiClient.get("/packages");
    return response.data;
  },

  getPackage: async (id: number): Promise<Package> => {
    const response = await apiClient.get(`/packages/${id}`);
    return response.data;
  },

  createPackage: async (data: Omit<Package, "id">): Promise<Package> => {
    const response = await apiClient.post("/packages", data);
    return response.data;
  },

  updatePackage: async (id: number, data: Partial<Package>): Promise<Package> => {
    const response = await apiClient.put(`/packages/${id}`, data);
    return response.data;
  },

  deletePackage: async (id: number): Promise<void> => {
    await apiClient.delete(`/packages/${id}`);
  },

  getPackagesForAutocomplete: async (
    search: string = "",
    limit: number = 15,
  ): Promise<Package[]> => {
    try {
      const params = new URLSearchParams();
      if (search) {
        params.append("search", search);
      } else {
        params.append("show_all_for_empty_search", "true");
      }
      params.append("limit", limit.toString());

      const response = await apiClient.get<{ data: Package[] }>(
        `/packages/autocomplete?${params.toString()}`
      );
      const packages = response.data.data ?? response.data;
      return Array.isArray(packages) ? packages : [];
    } catch (error) {
      console.error("Error fetching packages for autocomplete:", error);
      return [];
    }
  },
};

export default packageService;
