import { AppSettings } from "../services/settingService";

// Font configuration
export const PDF_FONTS = {
  AMIRI: "Amiri",
  TAJAWAL: "Tajawal",
  IBM_PLEX: "IBM Plex Sans Arabic",
  ARIAL: "Arial",
};

export const getPdfFont = (settings?: AppSettings | null): string => {
  return settings?.pdf_font || PDF_FONTS.AMIRI;
};
