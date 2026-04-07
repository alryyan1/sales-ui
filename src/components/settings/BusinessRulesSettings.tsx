import { Controller, Control } from "react-hook-form";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Divider,
  Stack,
  Switch,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import { AppSettings } from "@/services/settingService";

interface BusinessRulesSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const BusinessRulesSettings = ({
  control,
}: BusinessRulesSettingsProps) => {
  const theme = useTheme();

  const textFieldSx = {
    "& .MuiInputBase-input": {
      direction: "ltr",
      textAlign: "left",
    },
    "& .MuiInputBase-root": {
      direction: "ltr",
    },
    "& .MuiSelect-select": {
      direction: "ltr",
      textAlign: "left",
    },
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        boxShadow: theme.shadows[2],
        mx: "auto",
        maxWidth: 900,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography
          variant="h6"
          fontWeight={600}
          gutterBottom
          sx={{ mb: 4, color: "text.primary" }}
        >
          الإعدادات المحلية وقواعد العمل
        </Typography>
        <Stack spacing={4}>
            <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
              عرض جدول المنتجات
            </Typography>
            <Controller
              name="product_row_color_highlight"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                  label={<Box>
                    <Typography variant="body2" fontWeight={500}>تلوين صفوف المنتجات المنتهية أو الناقصة</Typography>
                    <Typography variant="caption" color="text.secondary">
                      عند التفعيل، تُلوَّن صفوف المنتجات المنتهية الصلاحية (أحمر) والنافدة من المخزون (برتقالي)
                    </Typography>
                  </Box>}
                />
              )}
            />

            <Controller
              name="product_scientific_name_visible"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                  label={<Box>
                    <Typography variant="body2" fontWeight={500}>إظهار حقل الاسم العلمي في نموذج المنتج</Typography>
                    <Typography variant="caption" color="text.secondary">
                      عند التعطيل، يُخفى حقل "الاسم العلمي" كلياً من نموذج الإضافة والتعديل
                    </Typography>
                  </Box>}
                />
              )}
            />

            <Controller
              name="product_scientific_name_required"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} color="warning" />}
                  label={<Box>
                    <Typography variant="body2" fontWeight={500}>جعل الاسم العلمي إلزامياً</Typography>
                    <Typography variant="caption" color="text.secondary">
                      عند التفعيل، لا يمكن حفظ المنتج بدون إدخال الاسم العلمي
                    </Typography>
                  </Box>}
                />
              )}
            />
          </Box>

        </Stack>
      </CardContent>
    </Card>
  );
};
