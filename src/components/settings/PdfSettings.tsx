import { Controller, Control } from "react-hook-form";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
} from "@mui/material";
import { AppSettings } from "@/services/settingService";
import { PDF_FONTS } from "@/utils/pdfFontRegistry";

interface PdfSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const PdfSettings = ({ control }: PdfSettingsProps) => {
  return (
    <Card
      sx={{ borderRadius: 3, boxShadow: 1, mx: "auto", maxWidth: 900 }}
      dir="rtl"
    >
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
          إعدادات الطباعة و PDF
        </Typography>
        <Controller
          name="pdf_font"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              fullWidth
              label="نوع الخط العربي (Arabic Font)"
              helperText="يؤثر على طريقة ظهور النصوص العربية في الفواتير المصدرة PDF"
            >
              <MenuItem value={PDF_FONTS.AMIRI}>
                Amiri (خط نسخ كلاسيكي - Serif)
              </MenuItem>
              <MenuItem value={PDF_FONTS.TAJAWAL}>
                Tajawal (خط حديث - Sans Serif)
              </MenuItem>
              <MenuItem value={PDF_FONTS.IBM_PLEX}>
                IBM Plex Sans Arabic (خط عصري - Modern)
              </MenuItem>
              <MenuItem value={PDF_FONTS.ARIAL}>
                Arial (قياسي - Standard)
              </MenuItem>
            </TextField>
          )}
        />
      </CardContent>
    </Card>
  );
};
