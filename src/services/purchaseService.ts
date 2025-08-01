// src/services/purchaseService.ts
import apiClient, {
  getValidationErrors,
  getErrorMessage,
} from "../lib/axios";
// Assuming PaginatedResponse is defined/exported from clientService or a shared types file
import { PaginatedResponse } from "./clientService";
import { Product } from "./productService"; // For purchase item details
import { Supplier } from "./supplierService"; // For purchase header details

// --- Interfaces ---

// Matches PurchaseItemResource structure


export interface PurchaseItem {
    id: number;
    product_id: number;
    product_name?: string;
    product_sku?: string;
    batch_number: string | null;
    quantity: number; // Original quantity in STOCKING units
    remaining_quantity: number; // Quantity remaining in SELLABLE units
    unit_cost: string | number; // Cost per STOCKING unit
    cost_per_sellable_unit: string | number; // New: Cost per SELLABLE unit (calculated by backend)
    total_cost: string | number; // Original total cost (quantity_stocking * unit_cost_stocking)
    sale_price: string | number | null; // Intended sale price per SELLABLE unit for this batch
    expiry_date: string | null; // Format YYYY-MM-DD
    product?: Product; // Optional full product details
}

// Data structure for updating an existing purchase
// It's often similar to CreatePurchaseData but items MUST have IDs if they are existing,
// or no ID if they are new items being added during the update.
export interface UpdatePurchaseData {
  // Header fields that can be updated
  supplier_id?: number; // Optional if not changing supplier
  purchase_date?: string; // Format YYYY-MM-DD
  reference_number?: string | null;
  status?: "received" | "pending" | "ordered";
  notes?: string | null;
  // Items array can contain existing items (with ID) and new items (without ID)
  items: Array<{
    id?: number | null; // ID of existing item to update, null/missing for new item
    product_id: number;
    batch_number?: string | null;
    quantity: number;
    unit_cost: number | string;
    sale_price?: number | string | null;
    expiry_date?: string | null;
    _destroy?: boolean; // Optional: If backend supports marking items for deletion
  }>;
  // Backend might not expect total_amount for update, as it will recalculate
}
// Matches PurchaseResource structure
export interface Purchase {
  id: number;
  supplier_id: number | null; // Can be null if supplier deleted + set null constraint
  supplier_name?: string; // Included if eager loaded
  user_id: number | null; // Can be null if user deleted + set null constraint
  user_name?: string; // Included if eager loaded
  purchase_date: string; // Format YYYY-MM-DD
  reference_number: string | null;
  status: "received" | "pending" | "ordered";
  total_amount: string; // Comes as string
  notes: string | null;
  created_at: string;
  items?: PurchaseItem[]; // Array of items, included if eager loaded (e.g., on show)
  supplier?: Supplier; // Optional: Full supplier details if loaded
}

// Data structure for creating a new purchase (matches backend validation)
export interface CreatePurchaseData {
  supplier_id: number;
  purchase_date: string;
  reference_number?: string | null;
  status: "received" | "pending" | "ordered";
  notes?: string | null;
  items: Array<{
    product_id: number;
    batch_number?: string | null; // New
    quantity: number;
    unit_cost: number | string; // Cost Price
    sale_price?: number | string | null; // New: Intended Sale Price
    expiry_date?: string | null; // New: YYYY-MM-DD
  }>;
}
// --- Service Object ---
const purchaseService = {
  /**
   * Get paginated list of purchases.
   */
  getPurchases: async (
    page: number = 1,
    queryParams?: string
  ): Promise<PaginatedResponse<Purchase>> => {
    try {
      const params = new URLSearchParams();
      
      // If queryParams is provided, use them directly
      if (queryParams) {
        const existingParams = new URLSearchParams(queryParams);
        existingParams.forEach((value, key) => {
          params.append(key, value);
        });
      } else {
        // Only add page if no queryParams provided
        params.append("page", page.toString());
      }

      const response = await apiClient.get<PaginatedResponse<Purchase>>(
        `/purchases?${params.toString()}`
      );
      console.log("getPurchases response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching purchases:", error);
      throw error;
    }
  },

  /**
   * Get a single purchase by ID (usually includes items).
   */
  getPurchase: async (id: number): Promise<Purchase> => {
    try {
      // Assuming API returns { purchase: { ... } }
      const response = await apiClient.get<{ purchase: Purchase }>(
        `/purchases/${id}`
      );
      return response.data.purchase; // Adjust if needed
    } catch (error) {
      console.error(`Error fetching purchase ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new purchase.
   */
  createPurchase: async (
    purchaseData: CreatePurchaseData
  ): Promise<Purchase> => {
    try {
      // Assuming API returns { purchase: { ... } }
      const response = await apiClient.post<{ purchase: Purchase }>(
        "/purchases",
        purchaseData
      );
      return response.data.purchase; // Adjust if needed
    } catch (error) {
      console.error("Error creating purchase:", error);
      throw error;
    }
  },

  /**
   * Delete a purchase (if allowed by backend).
   */
  deletePurchase: async (id: number): Promise<void> => {
    try {
      // Note: Backend controller might return 403 Forbidden
      await apiClient.delete(`/purchases/${id}`);
    } catch (error) {
      console.error(`Error deleting purchase ${id}:`, error);
      // Check for specific status codes if needed
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        // Handle forbidden error specifically if desired
        console.warn("Deletion forbidden by server policy.");
        throw new Error(
          getErrorMessage(error, "Deleting purchases is not allowed.")
        ); // Throw specific message
      }
      throw error; // Rethrow other errors
    }
  },
  /**
   * Update an existing purchase.
   * NOTE: Backend 'update' method for purchases must be carefully designed
   * to handle stock reversals/reapplications if items are modified.
   * The current PurchaseController example has a simplified update.
   */
  updatePurchase: async (
    id: number,
    purchaseData: UpdatePurchaseData
  ): Promise<Purchase> => {
    try {
      // Assuming API returns { purchase: { ... } } after successful update
      // The backend will need to handle diffing items, updating stock, etc.
      const response = await apiClient.put<{ purchase: Purchase }>(
        `/purchases/${id}`,
        purchaseData
      );
      console.log(`updatePurchase response for ID ${id}:`, response.data);
      return response.data.purchase; // Adjust if your API returns the purchase object directly
    } catch (error) {
      console.error(`Error updating purchase ${id}:`, error);
      // Handle specific validation errors if backend returns them (e.g., stock issues)
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        console.warn(
          `Validation error during purchase update for ID ${id}:`,
          error.response.data
        );
      }
      throw error; // Rethrow for component/form handling
    }
  },

  /**
   * Get purchases with items for a specific product.
   */
  getPurchasesForProduct: async (productId: number): Promise<Purchase[]> => {
    try {
      const response = await apiClient.get<{ data: Purchase[] }>(
        `/purchases?product_id=${productId}&include_items=true`
      );
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching purchases for product ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Import purchase items from Excel file - Step 1: Upload file and get headers
   * @param file Excel file to upload
   * @returns Promise resolving to headers from Excel file
   */
  importPurchaseItemsStep1: async (file: File): Promise<{ headers: string[]; message: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/purchases/import-items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading Excel file:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Import purchase items from Excel file - Preview: Preview data with column mapping
   * @param file Excel file
   * @param columnMapping Mapping of purchase item fields to Excel columns
   * @param skipHeader Whether to skip the header row
   * @returns Promise resolving to preview data
   */
  importPurchaseItemsPreview: async (
    file: File, 
    columnMapping: Record<string, string>, 
    skipHeader: boolean = true
  ): Promise<{ preview: any[] }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipHeader', skipHeader ? '1' : '0');
      
      // Add column mapping as JSON
      Object.entries(columnMapping).forEach(([field, column]) => {
        formData.append(`columnMapping[${field}]`, column);
      });

      const response = await apiClient.post('/purchases/preview-import-items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 1 minute timeout for preview
      });

      return response.data;
    } catch (error) {
      console.error('Error previewing import:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Import purchase items from Excel file - Step 2: Process import with column mapping
   * @param file Excel file
   * @param columnMapping Mapping of purchase item fields to Excel columns
   * @param skipHeader Whether to skip the header row
   * @param purchaseId The purchase ID to add items to
   * @returns Promise resolving to import results
   */
  importPurchaseItemsStep2: async (
    file: File, 
    columnMapping: Record<string, string>, 
    skipHeader: boolean = true,
    purchaseId: number
  ): Promise<{ imported: number; errors: number; message: string; errorDetails: any[] }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipHeader', skipHeader ? '1' : '0');
      formData.append('purchase_id', purchaseId.toString());
      
      // Add column mapping as JSON
      Object.entries(columnMapping).forEach(([field, column]) => {
        formData.append(`columnMapping[${field}]`, column);
      });

      const response = await apiClient.post('/purchases/process-import-items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout for large imports
      });

      return response.data;
    } catch (error) {
      console.error('Error processing import:', error);
      throw new Error(getErrorMessage(error));
    }
  },
  // --- Error Helpers ---
  getValidationErrors,
  getErrorMessage,
};

export default purchaseService;

// Export types
export type {
  PurchaseItem as PurchaseItemType,
  Purchase as PurchaseType,
  CreatePurchaseData as CreatePurchaseDataType,
};

// Re-exporting AxiosError might be useful if components need it
import axios, { AxiosError as GlobalAxiosError } from "axios";
export type { GlobalAxiosError };
