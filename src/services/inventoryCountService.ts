import apiClient from "@/lib/axios";

export interface InventoryCount {
  id: number;
  warehouse_id: number;
  user_id: number;
  count_date: string;
  status: "draft" | "in_progress" | "completed" | "approved" | "rejected";
  notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  warehouse?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
  };
  approvedBy?: {
    id: number;
    name: string;
  };
  items?: InventoryCountItem[];
  items_count?: number;
}

export interface InventoryCountItem {
  id: number;
  inventory_count_id: number;
  product_id: number;
  expected_quantity: number;
  actual_quantity: number | null;
  difference: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    name: string;
    sku: string | null;
    image_url?: string | null;
  };
}

export interface InventoryCountFormData {
  warehouse_id: number;
  count_date: string;
  notes?: string | null;
}

export interface InventoryCountItemFormData {
  product_id: number;
  actual_quantity?: number | null;
  notes?: string | null;
}

export interface InventoryCountFilters {
  warehouse_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

class InventoryCountService {
  /**
   * Get all inventory counts with optional filters
   */
  async getInventoryCounts(filters?: InventoryCountFilters) {
    const response = await apiClient.get("/inventory-counts", {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get a single inventory count by ID
   */
  async getInventoryCount(id: number): Promise<InventoryCount> {
    const response = await apiClient.get(`/inventory-counts/${id}`);
    return response.data.count;
  }

  /**
   * Create a new inventory count
   */
  async createInventoryCount(
    data: InventoryCountFormData,
  ): Promise<InventoryCount> {
    const response = await apiClient.post("/inventory-counts", data);
    return response.data.count;
  }

  /**
   * Update an existing inventory count
   */
  async updateInventoryCount(
    id: number,
    data: Partial<InventoryCountFormData>,
  ): Promise<InventoryCount> {
    const response = await apiClient.put(`/inventory-counts/${id}`, data);
    return response.data.count;
  }

  /**
   * Delete an inventory count
   */
  async deleteInventoryCount(id: number): Promise<void> {
    await apiClient.delete(`/inventory-counts/${id}`);
  }

  /**
   * Add an item to the count
   */
  async addCountItem(
    countId: number,
    data: InventoryCountItemFormData,
  ): Promise<InventoryCountItem> {
    const response = await apiClient.post(
      `/inventory-counts/${countId}/items`,
      data,
    );
    return response.data.item;
  }

  /**
   * Update a count item
   */
  async updateCountItem(
    countId: number,
    itemId: number,
    data: Partial<InventoryCountItemFormData>,
  ): Promise<InventoryCountItem> {
    const response = await apiClient.put(
      `/inventory-counts/${countId}/items/${itemId}`,
      data,
    );
    return response.data.item;
  }

  /**
   * Delete a count item
   */
  async deleteCountItem(countId: number, itemId: number): Promise<void> {
    await apiClient.delete(`/inventory-counts/${countId}/items/${itemId}`);
  }

  /**
   * Approve an inventory count
   */
  async approveCount(id: number): Promise<InventoryCount> {
    const response = await apiClient.post(`/inventory-counts/${id}/approve`);
    return response.data.count;
  }

  /**
   * Reject an inventory count
   */
  async rejectCount(id: number): Promise<InventoryCount> {
    const response = await apiClient.post(`/inventory-counts/${id}/reject`);
    return response.data.count;
  }

  /**
   * Import all products from warehouse into the inventory count
   */
  async importAllProducts(id: number): Promise<{
    message: string;
    imported_count: number;
    skipped_count: number;
  }> {
    const response = await apiClient.post(
      `/inventory-counts/${id}/import-all-products`,
    );
    return response.data;
  }

  /**
   * Get error message from API error
   */
  getErrorMessage(
    error: unknown,
    defaultMessage = "حدث خطأ غير متوقع",
  ): string {
    if (typeof error === "object" && error !== null) {
      const err = error as any;
      return err?.response?.data?.message || err?.message || defaultMessage;
    }
    return defaultMessage;
  }

  /**
   * Get validation errors from API error
   */
  getValidationErrors(error: unknown): Record<string, string[]> | null {
    if (typeof error === "object" && error !== null) {
      const err = error as any;
      return err?.response?.data?.errors || null;
    }
    return null;
  }
}

export default new InventoryCountService();
