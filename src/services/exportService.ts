// src/services/exportService.ts
import apiClient from "../lib/axios";

export interface ExportFilters {
  search?: string;
  category_id?: number | null;
  in_stock_only?: boolean;
  low_stock_only?: boolean;
  out_of_stock_only?: boolean;
}

export interface PurchaseExportFilters {
  supplier_id?: number;
  reference_number?: string;
  purchase_date?: string;
  created_at?: string;
  status?: string;
  product_id?: number;
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

      if (filters.low_stock_only) {
        params.append('low_stock_only', '1');
      }

      if (filters.out_of_stock_only) {
        params.append('out_of_stock_only', '1');
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
   * Open price list PDF report in new tab
   */
  exportPriceListPdf: async (): Promise<void> => {
    const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
    window.open(`${baseUrl}/products/pricelist/pdf`, '_blank');
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

  /**
   * Export purchases to Excel and open in new tab
   * @param filters Optional filters to apply to the export
   * @returns Promise that resolves when Excel is opened
   */
  exportPurchasesExcel: async (filters: PurchaseExportFilters = {}): Promise<void> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.supplier_id) {
        params.append('supplier_id', filters.supplier_id.toString());
      }
      if (filters.reference_number) {
        params.append('reference_number', filters.reference_number);
      }
      if (filters.purchase_date) {
        params.append('purchase_date', filters.purchase_date);
      }
      if (filters.created_at) {
        params.append('created_at', filters.created_at);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.product_id) {
        params.append('product_id', filters.product_id.toString());
      }

      // Create the URL for the web Excel endpoint (not API)
      const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
      const excelUrl = `${baseUrl}/purchases/export/excel?${params.toString()}`;
      
      // Open Excel in new tab
      window.open(excelUrl, '_blank');
      
    } catch (error) {
      console.error('Error opening Excel:', error);
      throw new Error('Failed to open Excel. Please try again.');
    }
  },

  /**
   * Export supplier ledger to PDF and open in new tab
   * @param supplierId The ID of the supplier to export
   * @returns Promise that resolves when PDF is opened
   */
  exportSupplierLedgerPdf: async (supplierId: number): Promise<void> => {
    try {
      // Create the URL for the web PDF endpoint (not API)
      const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
      const pdfUrl = `${baseUrl}/suppliers/${supplierId}/ledger/pdf`;
      
      // Open PDF in new tab
      window.open(pdfUrl, '_blank');
      
    } catch (error) {
      console.error('Error opening PDF:', error);
      throw new Error('Failed to open PDF. Please try again.');
    }
  },
};

/**
 * Generate daily sales PDF report with filters
 * @param filterParams - Optional filter parameters as URLSearchParams string
 * @returns Promise that resolves when PDF opens in new tab
 */
export const generateDailySalesPdf = async (filterParams?: string): Promise<void> => {
  try {
    const params = new URLSearchParams();
    if (filterParams) {
      // Parse the filter params and add them to the request
      const filterSearchParams = new URLSearchParams(filterParams);
      for (const [key, value] of filterSearchParams.entries()) {
        params.append(key, value);
      }
    }

    const response = await apiClient.get(`/reports/daily-sales-pdf?${params}`, {
      responseType: 'blob',
    });

    // Create blob URL and open in new tab
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();
    
    // Clean up the blob URL
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate daily sales PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

/**
 * Export inventory audit PDF report with warehouse balance data
 * @param filters - Optional filters (search, category_id)
 * @returns Promise that resolves when PDF opens in new tab
 */
export const exportInventoryAuditPdf = async (filters: { search?: string; category_id?: number | null } = {}): Promise<void> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (filters.category_id) {
      params.append('category_id', filters.category_id.toString());
    }

    const response = await apiClient.get(`/reports/inventory-audit-pdf?${params}`, {
      responseType: 'blob',
    });

    // Create blob URL and open in new tab
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();
    
    // Clean up the blob URL
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate inventory audit PDF:', error);
    throw new Error('Failed to generate inventory audit report');
  }
};

/**
 * Export warehouse products list to PDF
 * @param warehouseId - The warehouse ID to export products for
 * @param filters - Additional filters like search term
 * @returns Promise that resolves when PDF opens in new tab
 */
export const exportWarehouseProductsPdf = async (
  warehouseId: number,
  filters: { search?: string } = {}
): Promise<void> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('warehouse_id', warehouseId.toString());

    if (filters.search) {
      params.append('search', filters.search);
    }

    const response = await apiClient.get(`/reports/warehouse-products-pdf?${params}`, {
      responseType: 'blob',
    });

    // Create blob URL and open in new tab
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();

    // Clean up the blob URL
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate warehouse products PDF:', error);
    throw new Error('Failed to generate warehouse products report');
  }
};

export default exportService; 