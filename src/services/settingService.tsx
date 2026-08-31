// src/services/settingService.ts
import apiClient, { getValidationErrors, getErrorMessage } from "../lib/axios";

// Interface for the settings object (should match keys in config/app_settings.php)
export interface AppSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_phone_2?: string;
  company_email: string;
  company_logo_url: string | null;
  currency_symbol: string;
  global_low_stock_threshold: number;
  default_profit_rate: number; // Default profit rate percentage
  timezone: string;

  whatsapp_shift_closure_numbers: string;

  // Add other settings as defined in your config
  // UI preferences
  sidebar_layout?: boolean;
  tax_number?: string;
  account_number?: string;
  company_header_url?: string | null;
  company_stamp_url?: string | null;
  company_signature_url?: string | null;
  invoice_branding_type?: "logo" | "header";
  logo_position?: "left" | "right" | "both";
  stamp_position?: "left" | "center" | "right";
  logo_height?: number;
  logo_width?: number;
  pdf_font?: string;
  pos_mode?: "shift" | "days"; // POS operation mode: shift-based or day-based
  pos_filter_sales_by_user?: boolean; // Filter sales by logged-in user in POS
  /** Comma-separated PaymentMethod list — which payment methods show up in the POS payment dialog. See PAYMENT_METHODS in lib/paymentMethods.ts. */
  pos_active_payment_methods?: string;
  product_images_show_in_list?: boolean;
  product_images_show_in_pos?: boolean;
  product_images_show_in_invoices?: boolean;
  product_images_show_in_reports?: boolean;
  firebase_collection_name?: string;
  usd_to_sdg_factor?: number;
  /** Master switch for USD→local-currency price conversion (hides the TopAppBar rate widget and disables the multiplication when off). */
  usd_conversion_enabled?: boolean;
  product_row_color_highlight?: boolean;
  product_scientific_name_visible?: boolean;
  product_scientific_name_required?: boolean;
  /** Overrides the sidebar's "products" nav item label (falls back to the translated "Products" when empty). */
  products_nav_label?: string | null;
  /** Master switch — hides every expiry-date field/column/report/badge across the system. */
  hide_expiry_date?: boolean;
  pos_show_expired_products?: boolean;
  pos_show_out_of_stock_products?: boolean;
  /** Whether the expiry date column shows in the sale items table (SaleItemsTable, gallery page). Defaults to true. */
  pos_show_expiry_date_column?: boolean;
  purchase_use_batch_number?: boolean;
  purchase_use_expiry_date?: boolean;
  default_purchase_currency?: "SDG" | "OMR" | "USD";
  /** Drives decimal-place display everywhere money amounts are shown — see CURRENCY_DECIMALS in constants.ts. */
  currency_code?: "SDG" | "OMR" | "USD";

  // Sales Behavior
  sales_allow_zero_stock?: boolean;
  sales_allow_negative_stock?: boolean;
  sales_require_customer?: boolean;
  sales_default_customer_id?: number | null;
  sales_allow_price_edit?: boolean;
  sales_allow_invoice_date_edit?: boolean;
  /** Whether the "الوحده" (unit) column shows on the A4 invoice PDF. Defaults to true. */
  sales_a4_show_unit_column?: boolean;
}

// Type for the update payload (can be partial)
export type UpdateAppSettingsData = Partial<AppSettings>;

const settingService = {
  /**
   * Fetch all current application settings.
   * Requires 'view-settings' permission.
   */
  getSettings: async (): Promise<AppSettings> => {
    try {
      // Backend returns { data: AppSettings }
      const response = await apiClient.get<{ data: AppSettings }>(
        "/admin/settings",
      );
      return response.data.data; // Assuming data is nested under 'data' key
    } catch (error) {
      console.error("Error fetching settings:", error);
      throw error;
    }
  },

  /**
   * Update application settings.
   * Requires 'update-settings' permission.
   */
  updateSettings: async (
    settingsData: UpdateAppSettingsData,
  ): Promise<AppSettings> => {
    try {
      // Backend returns { message: '...', data: AppSettings }
      const response = await apiClient.put<{
        message: string;
        data: AppSettings;
      }>("/admin/settings", settingsData);
      return response.data.data; // Return the updated settings
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  },

  /**
   * Upload company logo image. Returns updated settings with new company_logo_url.
   */
  uploadLogo: async (file: File): Promise<AppSettings> => {
    const form = new FormData();
    form.append("logo", file);
    try {
      const response = await apiClient.post<{
        message: string;
        url: string;
        data: AppSettings;
      }>("/admin/settings/logo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    } catch (error) {
      console.error("Error uploading logo:", error);
      throw error;
    }
  },

  /**
   * Upload company header image.
   */
  uploadHeader: async (file: File): Promise<AppSettings> => {
    const form = new FormData();
    form.append("header", file);
    try {
      const response = await apiClient.post<{
        message: string;
        url: string;
        data: AppSettings;
      }>("/admin/settings/header", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    } catch (error) {
      console.error("Error uploading header:", error);
      throw error;
    }
  },

  /**
   * Upload company stamp image.
   */
  uploadStamp: async (file: File): Promise<AppSettings> => {
    const form = new FormData();
    form.append("stamp", file);
    const response = await apiClient.post<{ message: string; url: string; data: AppSettings }>(
      "/admin/settings/stamp",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
  },

  /**
   * Upload company signature image.
   */
  uploadSignature: async (file: File): Promise<AppSettings> => {
    const form = new FormData();
    form.append("signature", file);
    const response = await apiClient.post<{ message: string; url: string; data: AppSettings }>(
      "/admin/settings/signature",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
  },

  // --- Error Helpers ---
  getValidationErrors,
  getErrorMessage,
};

export default settingService;
export type { AppSettings as AppSettingsType }; // Export type
