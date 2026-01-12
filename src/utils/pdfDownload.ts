import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import React from "react";

/**
 * Downloads a PDF document generated from a React-PDF component
 * @param pdfDocument - The React-PDF Document component
 * @param filename - The filename for the downloaded PDF
 */
export const downloadPdf = async (
  pdfDocument: React.ReactElement,
  filename: string
): Promise<void> => {
  try {
    const blob = await pdf(pdfDocument).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل الملف بنجاح", {
      description: filename,
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("خطأ", {
      description: "فشل في إنشاء ملف PDF",
    });
  }
};

