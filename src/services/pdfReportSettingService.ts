// src/services/pdfReportSettingService.ts
import apiClient from "../lib/axios";

export interface PdfReportSetting {
  id: number;
  report_key: string;
  report_name: string;
  branding_type: "logo" | "header" | "none" | null; // null = use global
  logo_position: "left" | "right" | "center" | null; // null = use global
  logo_height: number | null; // null = use global
  logo_width: number | null;  // null = use global
  show_watermark: boolean;
  show_stamp: boolean;
  show_signature: boolean;
}

const pdfReportSettingService = {
  getAll: async (): Promise<PdfReportSetting[]> => {
    const response = await apiClient.get("/admin/pdf-report-settings");
    return response.data;
  },

  update: async (
    reportKey: string,
    data: Partial<Omit<PdfReportSetting, "id" | "report_key" | "report_name">>
  ): Promise<PdfReportSetting> => {
    const response = await apiClient.put(
      `/admin/pdf-report-settings/${reportKey}`,
      data
    );
    return response.data;
  },
};

export default pdfReportSettingService;
