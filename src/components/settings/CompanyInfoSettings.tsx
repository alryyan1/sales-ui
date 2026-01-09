import { Controller, Control } from "react-hook-form";
import { Box, Card, CardContent, Typography, TextField } from "@mui/material";
import { AppSettings } from "@/services/settingService";

interface CompanyInfoSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const CompanyInfoSettings = ({ control }: CompanyInfoSettingsProps) => {
  return (
    <Card
      sx={{ borderRadius: 3, boxShadow: 1, mx: "auto", maxWidth: 900 }}
      dir="ltr"
    >
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
          معلومات الشركة الأساسية
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, rowGap: 3 }}>
          <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}>
            <Controller
              name="company_name"
              control={control}
              render={({ field }) => (
                <TextField
                  dir="ltr"
                  {...field}
                  fullWidth
                  label="اسم الشركة"
                  variant="outlined"
                  placeholder="أدخل اسم الشركة"
                />
              )}
            />
          </Box>
          <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}>
            <Controller
              name="company_phone"
              control={control}
              render={({ field }) => (
                <TextField
                  dir="ltr"
                  {...field}
                  fullWidth
                  label="رقم الهاتف 1"
                  variant="outlined"
                  placeholder="مثال: +249 1230 56130"
                />
              )}
            />
          </Box>
          <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}>
            <Controller
              name="company_phone_2"
              control={control}
              render={({ field }) => (
                <TextField
                  dir="ltr"
                  {...field}
             sx={{
        direction: 'ltr',
        '& label': {
          left: 0,
          right: 'auto',
          transformOrigin: 'left',
        },
        '& legend': {
          textAlign: 'left',
        },
      }}
                  fullWidth
                  label="رقم الهاتف 2"
                  variant="outlined"
                  placeholder="مثال: +249 1247 81028"
                  value={field.value || ""}
                />
              )}
            />
          </Box>
          <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}>
            <Controller
              name="company_email"
              control={control}
              render={({ field }) => (
                <TextField
                  dir="ltr"
                  {...field}
                  fullWidth
                  type="email"
                  label="البريد الإلكتروني"
                  value={field.value || ""}
                />
              )}
            />
          </Box>
          <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}>
            <Controller
              name="tax_number"
              control={control}
              render={({ field }) => (
                <TextField
                  dir="ltr"
                  {...field}
                  fullWidth
                  label="الرقم الضريبي"
                  value={field.value || ""}
                />
              )}
            />
          </Box>
          <Box sx={{ flex: "1 1 100%" }}>
            <Controller
              name="company_address"
              control={control}
              render={({ field }) => (
                <TextField
                  dir="ltr"

                  {...field}
                  fullWidth
                  label="العنوان"
                  multiline
                  rows={3}
                  placeholder="تفاصيل العنوان للظهور في الفواتير"
                />
              )}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
