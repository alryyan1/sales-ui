// src/services/exportService.ts
import apiClient from "../lib/axios";

export interface ExportFilters {
  search?: string;
  category_id?: number | null;
  in_stock_only?: boolean;
}

const exportService = {
  /**
   * Export products to PDF and open in new tab
   * @param filters Optional filters to apply to the export
   * @returns Promise that resolves when PDF is opened
   */
  exportProductsPdf: async (filters: ExportFilters = {}): Promise<void> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      if (filters.category_id) {
        params.append('category_id', filters.category_id.toString());
      }
      
      if (filters.in_stock_only) {
        params.append('in_stock_only', '1');
      }

      // Create the URL for the web PDF endpoint (not API)
      const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
      const pdfUrl = `${baseUrl}/products/export/pdf?${params.toString()}`;
      
      // Open PDF in new tab
      window.open(pdfUrl, '_blank');
      
    } catch (error) {
      console.error('Error opening PDF:', error);
      throw new Error('Failed to open PDF. Please try again.');
    }
  },

  /**
   * Export products to Excel and open in new tab
   * @param filters Optional filters to apply to the export
   * @returns Promise that resolves when Excel is opened
   */
  exportProductsExcel: async (filters: ExportFilters = {}): Promise<void> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      if (filters.category_id) {
        params.append('category_id', filters.category_id.toString());
      }
      
      if (filters.in_stock_only) {
        params.append('in_stock_only', '1');
      }

      // Create the URL for the web Excel endpoint (not API)
      const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
      const excelUrl = `${baseUrl}/products/export/excel?${params.toString()}`;
      
      // Open Excel in new tab
      window.open(excelUrl, '_blank');
      
    } catch (error) {
      console.error('Error opening Excel:', error);
      throw new Error('Failed to open Excel. Please try again.');
    }
  },

  /**
   * Export purchase details to PDF and open in new tab
   * @param purchaseId The ID of the purchase to export
   * @returns Promise that resolves when PDF is opened
   */
  exportPurchasePdf: async (purchaseId: number): Promise<void> => {
    try {
      // Create the URL for the web PDF endpoint (not API)
      const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
      const pdfUrl = `${baseUrl}/purchases/${purchaseId}/export/pdf`;
      
      // Open PDF in new tab
      window.open(pdfUrl, '_blank');
      
    } catch (error) {
      console.error('Error opening PDF:', error);
      throw new Error('Failed to open PDF. Please try again.');
    }
  },
};

export default exportService; 