// src/services/productService.ts
import apiClient, {
  getValidationErrors,
  getErrorMessage,
  ApiErrorResponse,
} from "../lib/axios";
import { AxiosError } from "axios";
// Assuming PaginatedResponse is defined/exported from clientService or a shared types file
import { PaginatedResponse } from "./clientService"; // Or adjust import path
import { Category } from "./CategoryService";

// --- Interfaces ---

// Matches ProductResource structure from Laravel
export interface Product {
  id: number;
  name: string;
  scientific_name: string | null;
  sku: string | null;
  description: string | null;
  // Prices/Stock come as defined by backend Resource (often string for decimals)
  stock_quantity: number; // Integer
  stock_alert_level: number | null; // Integer or null
  // unit?: string | null;
  category?: Category; // Define Category interface if needed
  created_at: string;
  updated_at: string;
  // NEW/UPDATED FIELDS
  stocking_unit_id?: number | null;
  stocking_unit_name?: string | null; // e.g., "Box", "Carton"
  sellable_unit_id?: number | null;
  sellable_unit_name?: string | null; // e.g., "Piece", "Item"
  units_per_stocking_unit?: number | null; // e.g., 12 (pieces per box) - ensure backend default is 1
  category_id?: number | null; // Optional if not included in resource
  category_name?: string | null; // Optional if included by resource
  // Optional accessors that might be added by backend ProductResource
      // --- Stock (always in sellable units) ---
  latest_purchase_cost?: string | number | null;
  suggested_sale_price?: string | number | null;
  latest_cost_per_sellable_unit?: number | null;
  suggested_sale_price_per_sellable_unit?: number | null;
  last_sale_price_per_sellable_unit?: number | null;
  earliest_expiry_date?: string | null;
  current_stock_quantity?: number;
  available_batches?: {
    batch_id: number;
    quantity: number;
    expiry_date?: string;
  }[]; // Replace 'any[]' with a specific type
}

// Data type for creating/updating - matches form fields before potential conversion
// Use string for numbers coming from text inputs for flexibility during input,
// Zod schema/validation handles conversion/checking before sending to API if needed.
export interface ProductFormData {
  name: string;
  scientific_name: string | null;
  sku: string | null;
  description: string | null;
  // NEW/UPDATED FIELDS
  stocking_unit_id?: number | null;
  sellable_unit_id?: number | null;
  units_per_stocking_unit?: string | number | null; // Form might send string
  stock_quantity: string | number; // Form might use string, API expects integer
  stock_alert_level: string | number | null; // Form might use string, API expects integer/null
  // unit?: string | null;
  category_id?: number | null;
}

// --- Service Object ---
const productService = {
  /**
   * Get paginated list of products, optionally with search/sort.
   * @param page Page number.
   * @param search Search term.
   * @param sortBy Field to sort by.
   * @param sortDirection Sort direction ('asc' or 'desc').
   * @param limit Number of items per page.
   * @param categoryId Optional category ID to filter by.
   * @param inStockOnly Optional filter to show only products with stock > 0.
   * @returns Promise resolving to paginated product data.
   */
  getProducts: async (
    page: number = 1,
    search: string = "",
    sortBy: string = "created_at",
    sortDirection: "asc" | "desc" = "desc",
    limit: number = 15, // Use the 'per_page' naming convention for Laravel's paginate
    categoryId?: number | null,
    inStockOnly?: boolean
  ): Promise<PaginatedResponse<Product>> => {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("per_page", limit.toString()); // Use 'per_page' for Laravel paginator
      if (search) params.append("search", search);
      if (sortBy) params.append("sort_by", sortBy);
      if (sortDirection) params.append("sort_direction", sortDirection);
      if (categoryId) params.append("category_id", categoryId.toString());
      if (inStockOnly) params.append("in_stock_only", "1");

      const response = await apiClient.get<PaginatedResponse<Product>>(
        `/products?${params.toString()}`
      );
      console.log("getProducts response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  },

  /**
   * Get products specifically for autocomplete (lightweight response).
   * @param search Search term.
   * @param limit Max number of results.
   * @returns Promise resolving to an array of products (only essential fields).
   */
  getProductsForAutocomplete: async (
    search: string = "",
    limit: number = 20
  ): Promise<Product[]> => {
    // Returns flat array, not paginated
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("limit", limit.toString());

      // Assumes backend endpoint /api/products/autocomplete exists
      const response = await apiClient.get<{ data: Product[] }>(
        `/products/autocomplete?${params.toString()}`
      );
      console.log("getProductsForAutocomplete response:", response.data.data);
      // Adapt if backend directly returns array: return response.data;
      return response.data.data ?? response.data; // Handle both {data: []} and [] structures
    } catch (error) {
      console.error("Error fetching products for autocomplete:", error);
      throw error;
    }
  },

  /**
   * Fetch multiple products by their IDs.
   * Useful for populating form selects/displays when editing related records.
   * @param ids Array of product IDs.
   * @returns Promise resolving to an array of matching products.
   */
  getProductsByIds: async (ids: number[]): Promise<Product[]> => {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]); // Return empty array if no IDs provided
    }
    try {
      // Send IDs as POST request with JSON body to ensure proper array format
      const response = await apiClient.post<{ data: Product[] } | Product[]>(
        `/product/by-ids`,
        { ids: ids }
      );
      console.log("getProductsByIds response:", response.data);
      
      // Handle Laravel Resource Collection response
      // ProductResource::collection() returns a collection with 'data' property
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data; // Laravel Resource Collection format
      } else if (response.data && Array.isArray(response.data)) {
        return response.data; // Direct array (fallback)
      } else {
        console.warn("Unexpected response structure from getProductsByIds:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching products by IDs:", error);
      throw error;
    }
  },

  /**
   * Get a single product by ID.
   */
  getProduct: async (id: number): Promise<Product> => {
    try {
      // Assuming API returns { product: { ... } }
      const response = await apiClient.get<{ product: Product }>(
        `/products/${id}`
      );
      return response.data.product; // Adjust if needed
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new product.
   * Accepts ProductFormData, sends potentially converted data if needed.
   */
  createProduct: async (productData: ProductFormData): Promise<Product> => {
    try {
      // Optional: Convert string numbers from form to actual numbers before sending if API requires it strictly
      // const dataToSend = {
      //     ...productData,
      //     purchase_price: Number(productData.purchase_price),
      //     sale_price: Number(productData.sale_price),
      //     stock_quantity: parseInt(String(productData.stock_quantity), 10),
      //     stock_alert_level: productData.stock_alert_level ? parseInt(String(productData.stock_alert_level), 10) : null,
      // };
      const response = await apiClient.post<{ product: Product }>(
        "/products",
        productData
      ); // Send ProductFormData directly if backend handles conversion
      return response.data.product; // Adjust if needed
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  /**
   * Update an existing product.
   */
  updateProduct: async (
    id: number,
    productData: Partial<ProductFormData>
  ): Promise<Product> => {
    try {
      // Optional: Convert string numbers before sending
      // const dataToSend = { ...productData };
      // if (dataToSend.purchase_price !== undefined) dataToSend.purchase_price = Number(dataToSend.purchase_price);
      // // ... etc for other numeric fields
      const response = await apiClient.put<{ product: Product }>(
        `/products/${id}`,
        productData
      );
      return response.data.product; // Adjust if needed
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a product.
   */
  deleteProduct: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/products/${id}`);
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      if (isAxiosError(error) && error.response?.status === 409) {
        // Handle conflict error (e.g., product used in sales/purchases)
        console.warn(`Cannot delete product ${id} due to existing records.`);
        throw new Error(
          getErrorMessage(error, "Cannot delete product with existing records.")
        );
      }
      throw error;
    }
  },

  // --- Error Helpers (Imported from axios.ts) ---
  getValidationErrors,
  getErrorMessage,
};

// Re-usable Axios error check function
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}

export default productService;

// Export types if needed elsewhere
export type { Product as ProductType, ProductFormData as ProductFormDataType };
