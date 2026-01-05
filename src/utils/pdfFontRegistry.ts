import { Font } from "@react-pdf/renderer";
import { AppSettings } from "../services/settingService";

// Font configuration
export const PDF_FONTS = {
  AMIRI: "Amiri",
  TAJAWAL: "Tajawal",
  IBM_PLEX: "IBM Plex Sans Arabic",
  ARIAL: "Arial",
};

export const registerPdfFonts = () => {
  // Register Amiri
  Font.register({
    family: PDF_FONTS.AMIRI,
    fonts: [
      { src: "/fonts/Amiri-Regular.ttf" },
      { src: "/fonts/Amiri-Bold.ttf", fontWeight: "bold" },
    ],
  });

  // Register Tajawal
  Font.register({
    family: PDF_FONTS.TAJAWAL,
    fonts: [
      { src: "/fonts/Tajawal-Regular.ttf" },
      { src: "/fonts/Tajawal-Bold.ttf", fontWeight: "bold" },
      { src: "/fonts/Tajawal-Medium.ttf", fontWeight: "medium" },
      { src: "/fonts/Tajawal-Light.ttf", fontWeight: "light" },
    ],
  });

  // Register IBM Plex Sans Arabic
  Font.register({
    family: PDF_FONTS.IBM_PLEX,
    fonts: [
      { src: "/fonts/IBMPlexSansArabic-Regular.ttf" },
      { src: "/fonts/IBMPlexSansArabic-Bold.ttf", fontWeight: "bold" },
    ],
  });

  // Register Arial
  Font.register({
    family: PDF_FONTS.ARIAL,
    fonts: [
      { src: "/fonts/ARIAL.ttf" },
      { src: "/fonts/ARIAL.ttf", fontStyle: "italic" }, // Use regular font for italic
      { src: "/fonts/ARIAL.ttf", fontWeight: "bold" },
      { src: "/fonts/ARIAL.ttf", fontWeight: "bold", fontStyle: "italic" }, // Use regular font for bold italic
    ],
  });
};

export const getPdfFont = (settings?: AppSettings | null): string => {
  return settings?.pdf_font || PDF_FONTS.AMIRI;
};
