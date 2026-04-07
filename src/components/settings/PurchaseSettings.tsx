import { Controller, Control } from "react-hook-form";
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Stack,
  alpha,
  useTheme,
  FormControlLabel,
  Divider,
} from "@mui/material";
import { AppSettings } from "@/services/settingService";

interface PurchaseSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const PurchaseSettings = ({ control }: PurchaseSettingsProps) => {
  const theme = useTheme();

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
          إعدادات المشتريات
        </Typography>

        {/* Default Currency */}
        <Box
          sx={{
            bgcolor: alpha(theme.palette.warning.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
            mb: 3,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
            العملة الافتراضية للمشتريات
          </Typography>
          <Controller
            name="default_purchase_currency"
            control={control}
            render={({ field }) => (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>العملة الافتراضية</InputLabel>
                <Select
                  value={field.value ?? "SDG"}
                  label="العملة الافتراضية"
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <MenuItem value="SDG">SDG — جنيه سوداني</MenuItem>
                  <MenuItem value="USD">USD — دولار أمريكي</MenuItem>
                </Select>
              </FormControl>
            )}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            سيتم استخدام هذه العملة كقيمة افتراضية عند إنشاء فاتورة شراء جديدة.
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              حقول أصناف المشتريات
            </Typography>
            <Stack spacing={2}>
              <Controller
                name="purchase_use_batch_number"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          استخدام رقم الباتش (Batch Number)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          عند التفعيل، يظهر عمود رقم الباتش في جدول أصناف
                          المشتريات ويمكن إدخاله لكل صنف.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start" }}
                  />
                )}
              />
              <Controller
                name="purchase_use_expiry_date"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          استخدام تاريخ الانتهاء (Expiry Date)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          عند التفعيل، يظهر عمود تاريخ الانتهاء في جدول أصناف
                          المشتريات ويمكن تحديده لكل صنف.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start" }}
                  />
                )}
              />
            </Stack>
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );
};
