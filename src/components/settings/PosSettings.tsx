import { Controller, Control } from "react-hook-form";
import {
  Box,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  alpha,
  useTheme,
} from "@mui/material";
import { AppSettings } from "@/services/settingService";

interface PosSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const PosSettings = ({ control }: PosSettingsProps) => {
  const theme = useTheme();

  return (
    <Card
      sx={{ borderRadius: 3, boxShadow: 1, mx: "auto", maxWidth: 900 }}
      dir="rtl"
    >
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
          إعدادات نقاط البيع (POS)
        </Typography>
        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 2,
            borderRadius: 2,
          }}
        >
          <FormControl component="fieldset">
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              نظام التشغيل
            </Typography>
            <Controller
              name="pos_mode"
              control={control}
              render={({ field }) => (
                <RadioGroup {...field} value={field.value || "shift"}>
                  <FormControlLabel
                    value="shift"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          نظام الورديات (Shift Based)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          يتطلب فتح وإغلاق وردية لكل مستخدم. مناسب للمحلات
                          التجارية ذات الموظفين المتعددين.
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 2, alignItems: "flex-start" }}
                  />
                  <FormControlLabel
                    value="days"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          نظام الأيام (Daily Based)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          لا توجد ورديات. يتم تجميع المبيعات يومياً تلقائياً.
                          أبسط وأسرع للأنشطة الصغيرة.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start" }}
                  />
                </RadioGroup>
              )}
            />
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );
};
