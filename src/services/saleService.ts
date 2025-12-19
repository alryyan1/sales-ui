// src/services/saleService.ts
import apiClient, {
  getValidationErrors,
  getErrorMessage,
  ApiErrorResponse,
} from "../lib/axios";
import { AxiosError } from "axios";

// Assuming PaginatedResponse is defined/exported from clientService or a shared types file
import { PaginatedResponse } from "./clientService"; // Or adjust import path

// Import related entity types
import { Product } from "./productService";
import { Client } from "./clientService";
import { User } from "./authService";
import { PurchaseItem as BatchType } from "./purchaseService"; // Batch is a PurchaseItem

// --- Interfaces for Sales Module ---

export interface Payment {
  id?: number; // Optional for new payments
  sale_id?: number; // Backend usually sets this
  user_id?: number | null;
  user_name?: string;
  method:
    | "cash"
    | "visa"
    | "mastercard"
    | "bank_transfer"
    | "mada"
    | "other"
    | "store_credit";
  amount: string | number; // String from form, number for API
  payment_date: string; // YYYY-MM-DD
  reference_number?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface SaleItem {
  id?: number; // Optional for new items
  sale_id?: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  product?: Product; // Full product for UI state

  purchase_item_id?: number | null; // ID of the batch it was sold from
  batch_number_sold?: string | null; // Copied from batch for display
  purchaseItemBatch?: Pick<
    BatchType,
    "id" | "batch_number" | "unit_cost" | "expiry_date" | "remaining_quantity"
  >; // For COGS and display

  // Current stock information from the product
  current_stock_quantity?: number;
  stock_alert_level?: number | null;
  earliest_expiry_date?: string | null;
  sellable_unit_name?: string;

  quantity: number;
  unit_price: string | number;
  total_price?: string | number; // Usually calculated by backend/resource
  cost_price_at_sale?: string | number; // Cost per sellable unit at sale time
  // available_stock from batch was a temporary UI field, not usually part of SaleItem model
  created_at?: string;
  updated_at?: string;
}

export interface Sale {
  id: number;
  sale_order_number?: number; // Order number for the day (1, 2, 3, etc.)
  client_id: number | null;
  client_name?: string;
  client?: Client; // Full client object if loaded

  user_id: number | null;
  user_name?: string;
  user?: User; // Full user object if loaded

  sale_date: string; // YYYY-MM-DD
  invoice_number: string | null;
  // Status column was removed from the backend; keep optional for backward compatibility
  status?: "completed" | "pending" | "draft" | "cancelled";
  total_amount: string | number;
  paid_amount: string | number; // Sum of payments
  due_amount?: string | number; // Calculated (total_amount - paid_amount)
  discount_amount?: string | number; // Discount amount
  discount_type?: "percentage" | "fixed"; // Discount type

  notes: string | null;
  created_at: string;
  updated_at?: string;

  items?: SaleItem[];
  payments?: Payment[];
}

// Data for creating a new sale
export interface CreateSaleData {
  client_id: number | null; // Allow null if client is optional for POS
  sale_date: string; // YYYY-MM-DD
  invoice_number?: string | null;
  status: "completed" | "pending" | "draft" | "cancelled";
  notes?: string | null;
  shift_id?: number | null;
  items: Array<{
    product_id: number;
    purchase_item_id?: number | null; // If specific batch is selected
    quantity: number;
    unit_price: number | string;
  }>;
  payments?: Array<{
    // Optional payments array on creation
    method: string;
    amount: number | string;
    payment_date: string; // YYYY-MM-DD
    reference_number?: string | null;
    notes?: string | null;
  }>;
}

// Data for updating an existing sale (more complex if items/payments are mutable)
export interface UpdateSaleData {
  // Header fields
  client_id?: number | null;
  sale_date?: string;
  invoice_number?: string | null;
  status?: "completed" | "pending" | "draft" | "cancelled";
  notes?: string | null;
  // Item and payment updates are complex and often handled by separate endpoints
  // or require careful backend logic to diff and manage stock/payments.
  // For simplicity, this might only allow header updates, or send full items/payments for backend to diff.
  items?: Array<{
    // If sending items for update
    id?: number | null; // For existing items
    product_id: number;
    purchase_item_id?: number | null;
    quantity: number;
    unit_price: number | string;
    _destroy?: boolean; // Common pattern for marking items for deletion
  }>;
  payments?: Array<{
    // If sending payments for update
    id?: number | null; // For existing payments
    method: string;
    amount: number | string;
    payment_date: string;
    reference_number?: string | null;
    notes?: string | null;
    _destroy?: boolean;
  }>;
}

// For items eligible for return
export interface ReturnableSaleItem extends SaleItem {
  max_returnable_quantity: number;
}

// --- Service Object ---
const saleService = {
  /**
   * Get today's sales by created_at (for POS TodaySalesColumn)
   */
  getTodaySalesByCreatedAt: async (): Promise<Sale[]> => {
    try {
      const response = await apiClient.get<{ data: Sale[] }>(
        "/sales/today-by-created-at"
      );

      return response.data.data || response.data;
    } catch (error) {
      console.error("Error fetching today's sales by created_at:", error);
      throw error;
    }
  },

  /**
   * Update discount on a sale (instantly persists discount_amount and discount_type)
   */
  updateSaleDiscount: async (
    saleId: number,
    data: { discount_amount: number; discount_type: "percentage" | "fixed" }
  ): Promise<Sale> => {
    try {
      const response = await apiClient.put<{ message: string; sale: Sale }>(
        `/sales/${saleId}/discount`,
        data
      );
      return response.data.sale;
    } catch (error) {
      console.error(`Error updating discount for sale ${saleId}:`, error);
      if (isAxiosError(error) && error.response?.status === 422) {
        throw new Error(getErrorMessage(error, "Invalid discount."));
      }
      throw error;
    }
  },

  /**
   * Get paginated list of sales.
   */
  getSales: async (
    page: number = 1,
    queryParams?: string,
    status: string = "",
    startDate: string = "",
    endDate: string = "",
    limit: number = 15,
    clientId?: number | null, // Optional client filter
    todayOnly?: boolean, // For SalesTerminalPage
    forCurrentUser?: number | null // For SalesTerminalPage (user_id)
  ): Promise<PaginatedResponse<Sale>> => {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("per_page", limit.toString());

      // If queryParams is provided, parse and add them
      if (queryParams) {
        const querySearchParams = new URLSearchParams(queryParams);
        for (const [key, value] of querySearchParams.entries()) {
          params.append(key, value);
        }
      } else {
        // Fallback to individual parameters for backward compatibility
        if (status) params.append("status", status);
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);
        if (clientId) params.append("client_id", clientId.toString());
        if (todayOnly) params.append("today_only", "true");
        if (forCurrentUser) params.append("user_id", forCurrentUser.toString());
      }

      const response = await apiClient.get<PaginatedResponse<Sale>>(
        `/sales?${params.toString()}`
      );
      console.log("getSales response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching sales:", error);
      throw error;
    }
  },

  /**
   * Get sales report data with advanced filtering and analytics.
   */
  getSalesReport: async (
    page: number = 1,
    startDate?: string,
    endDate?: string,
    clientId?: number | null,
    userId?: number | null,
    status?: string,
    limit: number = 25
  ): Promise<PaginatedResponse<Sale>> => {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("per_page", limit.toString());
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (clientId) params.append("client_id", clientId.toString());
      if (userId) params.append("user_id", userId.toString());
      if (status) params.append("status", status);

      const response = await apiClient.get<PaginatedResponse<Sale>>(
        `/reports/sales?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching sales report:", error);
      throw error;
    }
  },

  /**
   * Get a single sale by ID.
   * Backend should eager load: client, user, items.product, items.purchaseItemBatch, payments.user
   */
  getSale: async (id: number): Promise<Sale> => {
    try {
      const response = await apiClient.get<{ sale: Sale } | Sale>(
        `/sales/${id}`
      );
      // Check if 'sale' key exists (common pattern) or if data is the sale object directly
      if ("sale" in response.data) {
        return response.data.sale;
      }
      return response.data as Sale;
    } catch (error) {
      console.error(`Error fetching sale ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new sale.
   */
  createSale: async (saleData: CreateSaleData): Promise<Sale> => {
    try {
      const response = await apiClient.post<{ sale: Sale } | Sale>(
        "/sales",
        saleData
      );
      if ("sale" in response.data) {
        return response.data.sale;
      }
      return response.data as Sale;
    } catch (error) {
      console.error("Error creating sale:", error);
      if (isAxiosError(error) && error.response?.status === 422) {
        console.warn("Validation error (check stock?):", error.response.data);
      }
      throw error;
    }
  },

  /**
   * Create an empty sale (draft) for POS operations.
   */
  createEmptySale: async (data: {
    client_id?: number | null;
    sale_date: string;
    notes?: string | null;
  }): Promise<Sale> => {
    try {
      const response = await apiClient.post<{ sale: Sale }>(
        "/sales/create-empty",
        data
      );
      return response.data.sale;
    } catch (error) {
      console.error("Error creating empty sale:", error);
      throw error;
    }
  },

  /**
   * Update an existing sale.
   * Backend logic for this can be very complex if item/payment changes affect stock/totals.
   * A simplified version might only update header fields.
   */
  updateSale: async (id: number, saleData: UpdateSaleData): Promise<Sale> => {
    try {
      const response = await apiClient.put<{ sale: Sale } | Sale>(
        `/sales/${id}`,
        saleData
      );
      if ("sale" in response.data) {
        return response.data.sale;
      }
      return response.data as Sale;
    } catch (error) {
      console.error(`Error updating sale ${id}:`, error);
      if (isAxiosError(error) && error.response?.status === 422) {
        console.warn(
          "Validation error during sale update (check stock?):",
          error.response.data
        );
      }
      throw error;
    }
  },

  /**
   * Add payments to an existing sale.
   */
  addPaymentToSale: async (
    saleId: number,
    paymentData: {
      payments: Array<
        Omit<Payment, "id" | "sale_id" | "user_name" | "created_at">
      >;
    }
  ): Promise<Sale> => {
    try {
      console.log("addPaymentToSale called with:", { saleId, paymentData }); // Debug log
      // Assumes backend returns the updated Sale object with all its payments
      const response = await apiClient.post<{ sale: Sale } | Sale>(
        `/sales/${saleId}/payments`,
        paymentData
      );
      if ("sale" in response.data) {
        return response.data.sale;
      }
      return response.data as Sale;
    } catch (error) {
      console.error(`Error adding payment to sale ${saleId}:`, error);
      throw error;
    }
  },

  /**
   * Delete all payments from an existing sale.
   */
  deletePaymentsFromSale: async (saleId: number): Promise<Sale> => {
    try {
      console.log("deletePaymentsFromSale called for sale ID:", saleId);
      const response = await apiClient.delete<{ sale: Sale } | Sale>(
        `/sales/${saleId}/payments`
      );
      if ("sale" in response.data) {
        return response.data.sale;
      }
      return response.data as Sale;
    } catch (error) {
      console.error(`Error deleting payments from sale ${saleId}:`, error);
      throw error;
    }
  },

  /**
   * Add a single payment to an existing sale.
   */
  addPayment: async (
    saleId: number,
    paymentData: {
      method: string;
      amount: number;
      reference_number?: string | null;
      notes?: string | null;
    }
  ): Promise<void> => {
    try {
      await apiClient.post(`/sales/${saleId}/payments/single`, paymentData);
    } catch (error) {
      console.error(`Error adding payment to sale ${saleId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a single payment from an existing sale.
   */
  deletePayment: async (saleId: number, paymentId: number): Promise<void> => {
    try {
      await apiClient.delete(`/sales/${saleId}/payments/${paymentId}`);
    } catch (error) {
      console.error(
        `Error deleting payment ${paymentId} from sale ${saleId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Add a new item to an existing sale.
   */
  addSaleItem: async (
    saleId: number,
    itemData: {
      product_id: number;
      quantity: number;
      unit_price: number;
      purchase_item_id?: number | null; // Optional batch selection
    }
  ): Promise<{ sale: Sale; message: string }> => {
    try {
      const response = await apiClient.post<{ sale: Sale; message: string }>(
        `/sales/${saleId}/items`,
        itemData
      );
      return response.data;
    } catch (error) {
      console.error(`Error adding sale item to sale ${saleId}:`, error);
      throw error;
    }
  },

  /**
   * Add multiple items to an existing sale.
   */
  addMultipleSaleItems: async (
    saleId: number,
    itemsData: Array<{
      product_id: number;
      quantity: number;
      unit_price: number;
    }>
  ): Promise<{
    sale: Sale;
    message: string;
    total_added: number;
    errors: string[];
  }> => {
    try {
      const response = await apiClient.post<{
        sale: Sale;
        message: string;
        total_added: number;
        errors: string[];
      }>(`/sales/${saleId}/items/multiple`, { items: itemsData });
      return response.data;
    } catch (error) {
      console.error(
        `Error adding multiple sale items to sale ${saleId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Update an existing sale item.
   */
  updateSaleItem: async (
    saleId: number,
    saleItemId: number,
    itemData: {
      quantity: number;
      unit_price: number;
      purchase_item_id?: number | null; // Optional batch selection
    }
  ): Promise<Sale> => {
    try {
      const response = await apiClient.put<{ sale: Sale }>(
        `/sales/${saleId}/items/${saleItemId}`,
        itemData
      );
      return response.data.sale;
    } catch (error) {
      console.error(
        `Error updating sale item ${saleItemId} in sale ${saleId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Delete a specific sale item and return inventory quantity.
   */
  deleteSaleItem: async (
    saleId: number,
    saleItemId: number
  ): Promise<{
    message: string;
    deleted_quantity: number;
    product_name: string;
    returned_to_batch: string | null;
    new_sale_total: number;
    remaining_items_count: number;
    sale_status: string;
  }> => {
    try {
      const response = await apiClient.delete(
        `/sales/${saleId}/items/${saleItemId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error deleting sale item ${saleItemId} from sale ${saleId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Delete a sale (generally not recommended for completed sales).
   */
  deleteSale: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/sales/${id}`);
    } catch (error) {
      console.error(`Error deleting sale ${id}:`, error);
      if (isAxiosError(error) && error.response?.status === 403) {
        throw new Error(
          getErrorMessage(error, "Deleting sales records is not allowed.")
        );
      }
      throw error;
    }
  },

  /**
   * Get items from an original sale that are eligible for return.
   */
  getReturnableItems: async (
    originalSaleId: number
  ): Promise<ReturnableSaleItem[]> => {
    try {
      const response = await apiClient.get<
        { data: ReturnableSaleItem[] } | ReturnableSaleItem[]
      >(`/sales/${originalSaleId}/returnable-items`);
      if ("data" in response.data) {
        // Check if response has a 'data' wrapper
        return response.data.data;
      }
      return response.data as ReturnableSaleItem[];
    } catch (error) {
      console.error(
        `Error fetching returnable items for sale ${originalSaleId}:`,
        error
      );
      throw error;
    }
  },

  // ============================================
  // POS-OPTIMIZED API ENDPOINTS
  // These endpoints return Sale objects ready for POS use
  // ============================================

  /**
   * Get sale in POS format (with all relations loaded and formatted)
   * Backend should return data already in POS format
   */
  getSaleForPOS: async (id: number): Promise<Sale> => {
    try {
      const response = await apiClient.get<{ sale: Sale } | Sale>(
        `/sales/${id}/pos-format`
      );
      if ("sale" in response.data) {
        return response.data.sale;
      }
      return response.data as Sale;
    } catch (error) {
      console.error(`Error fetching sale ${id} for POS:`, error);
      throw error;
    }
  },

  /**
   * Add product to sale (creates sale if needed) - Returns updated Sale
   * This is a unified endpoint that handles both creating a sale and adding items
   */
  addProductToSalePOS: async (
    saleId: number | null,
    productData: {
      product_id: number;
      quantity?: number;
      purchase_item_id?: number | null;
    }
  ): Promise<{ sale: Sale; message: string }> => {
    try {
      const url = saleId ? `/sales/${saleId}/items` : "/sales/create-with-item";

      const payload = saleId
        ? {
            product_id: productData.product_id,
            quantity: productData.quantity || 1,
            unit_price: 0, // Backend should use product's last_sale_price
            purchase_item_id: productData.purchase_item_id || null,
          }
        : {
            client_id: null,
            sale_date: new Date().toISOString().split("T")[0],
            notes: null,
            item: {
              product_id: productData.product_id,
              quantity: productData.quantity || 1,
              purchase_item_id: productData.purchase_item_id || null,
            },
          };

      const response = await apiClient.post<{ sale: Sale; message: string }>(
        url,
        payload
      );
      return response.data;
    } catch (error) {
      console.error("Error adding product to sale (POS):", error);
      throw error;
    }
  },

  /**
   * Update quantity and return updated Sale
   */
  updateQuantityPOS: async (
    saleId: number,
    itemId: number,
    quantity: number
  ): Promise<Sale> => {
    try {
      const response = await apiClient.put<{ sale: Sale }>(
        `/sales/${saleId}/items/${itemId}`,
        { quantity }
      );
      return response.data.sale;
    } catch (error) {
      console.error(`Error updating quantity (POS):`, error);
      throw error;
    }
  },

  /**
   * Remove item and return updated Sale
   * Note: Backend returns metadata, not the sale object, so we fetch it separately
   */
  removeItemPOS: async (saleId: number, itemId: number): Promise<Sale> => {
    try {
      // Delete the item
      await apiClient.delete(`/sales/${saleId}/items/${itemId}`);
      // Fetch the updated sale - use the getSale method defined above
      const response = await apiClient.get<{ sale: Sale } | Sale>(
        `/sales/${saleId}`
      );
      if ("sale" in response.data) {
        return response.data.sale;
      }
      return response.data as Sale;
    } catch (error) {
      console.error(`Error removing item (POS):`, error);
      throw error;
    }
  },

  /**
   * Update batch for an item and return updated Sale
   */
  updateBatchPOS: async (
    saleId: number,
    itemId: number,
    batchData: {
      purchase_item_id: number | null;
      unit_price: number;
    }
  ): Promise<Sale> => {
    try {
      const response = await apiClient.put<{ sale: Sale }>(
        `/sales/${saleId}/items/${itemId}`,
        {
          quantity: undefined, // Keep existing quantity
          unit_price: batchData.unit_price,
          purchase_item_id: batchData.purchase_item_id,
        }
      );
      return response.data.sale;
    } catch (error) {
      console.error(`Error updating batch (POS):`, error);
      throw error;
    }
  },

  /**
   * Add payment and return updated Sale
   */
  addPaymentPOS: async (
    saleId: number,
    paymentData: {
      method: string;
      amount: number;
      reference_number?: string | null;
      notes?: string | null;
    }
  ): Promise<Sale> => {
    try {
      const response = await apiClient.post<{ sale: Sale }>(
        `/sales/${saleId}/payments`,
        { payments: [paymentData] }
      );
      return response.data.sale;
    } catch (error) {
      console.error(`Error adding payment (POS):`, error);
      throw error;
    }
  },

  /**
   * Get today's sales in POS format
   */
  getTodaySalesPOS: async (userId?: number | null): Promise<Sale[]> => {
    try {
      const params = new URLSearchParams();
      if (userId) {
        params.append("user_id", userId.toString());
      }

      const url = `/sales/today-by-created-at${
        params.toString() ? "?" + params.toString() : ""
      }`;
      const response = await apiClient.get<{ data: Sale[] } | Sale[]>(url);

      if ("data" in response.data) {
        return response.data.data;
      }
      return response.data as Sale[];
    } catch (error) {
      console.error("Error fetching today's sales (POS):", error);
      throw error;
    }
  },

  // --- Error Helpers ---
  getValidationErrors,
  getErrorMessage,
};

// Re-usable Axios error check function
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}

export default saleService;

// Export types for use in components
export type {
  SaleItem as SaleItemType,
  Sale as SaleType,
  Payment as PaymentType,
  CreateSaleData as CreateSaleDataType,
  UpdateSaleData as UpdateSaleDataType,
  ReturnableSaleItem as ReturnableSaleItemType,
};
