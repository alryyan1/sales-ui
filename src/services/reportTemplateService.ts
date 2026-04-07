import apiClient from "@/lib/axios";

export interface ReportTemplate {
  id: number;
  name: string;
  content: string;
  footer_text?: string;
  created_at: string;
  updated_at: string;
}

const reportTemplateService = {
  getAll: async (): Promise<ReportTemplate[]> => {
    const response = await apiClient.get<ReportTemplate[]>("/reports/templates");
    return response.data;
  },

  create: async (payload: { name: string; content: string; footer_text?: string }): Promise<ReportTemplate> => {
    const response = await apiClient.post<ReportTemplate>("/reports/templates", payload);
    return response.data;
  },

  update: async (templateId: number, payload: { name: string; content: string; footer_text?: string }): Promise<ReportTemplate> => {
    const response = await apiClient.put<ReportTemplate>(`/reports/templates/${templateId}`, payload);
    return response.data;
  },

  remove: async (templateId: number): Promise<void> => {
    await apiClient.delete(`/reports/templates/${templateId}`);
  },

  downloadPdf: async (templateId: number, date: string): Promise<void> => {
    const response = await apiClient.get(`/reports/templates/${templateId}/pdf`, {
      params: { date },
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.click();
    window.URL.revokeObjectURL(url);
  },
};

export default reportTemplateService;
