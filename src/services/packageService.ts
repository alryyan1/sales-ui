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
};

export default packageService;
