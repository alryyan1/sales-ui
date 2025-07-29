import apiClient, { getValidationErrors, getErrorMessage } from "@/lib/axios";

export interface Unit {
  id: number;
  name: string;
  type: 'stocking' | 'sellable';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitFormData {
  name: string;
  type: 'stocking' | 'sellable';
  description?: string;
  is_active?: boolean;
}

class UnitService {
  private baseUrl = "/units";

  async getUnits(
    page: number = 1,
    perPage: number = 15,
    search: string = "",
    includeInactive: boolean = false
  ): Promise<{ data: Unit[]; meta: any }> {
    try {
      const response = await apiClient.get(this.baseUrl, {
        params: {
          page,
          per_page: perPage,
          search,
          include_inactive: includeInactive,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getStockingUnits(): Promise<Unit[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stocking`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSellableUnits(): Promise<Unit[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/sellable`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createUnit(data: UnitFormData): Promise<Unit> {
    try {
      const response = await apiClient.post(this.baseUrl, data);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUnit(id: number, data: UnitFormData): Promise<Unit> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${id}`, data);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUnit(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUnit(id: number): Promise<Unit> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    return new Error("An error occurred while processing the request.");
  }

  getErrorMessage(error: any, fallbackMessage: string = "An error occurred"): string {
    return getErrorMessage(error, fallbackMessage);
  }

  getValidationErrors(error: any): Record<string, string[]> | null {
    return getValidationErrors(error);
  }
}

export default new UnitService(); 