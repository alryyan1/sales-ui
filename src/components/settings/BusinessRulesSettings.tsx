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
} from "@mui/material";
import { AppSettings } from "@/services/settingService";

interface BusinessRulesSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const BusinessRulesSettings = ({
  control,
}: BusinessRulesSettingsProps) => {
  return (
    <Card
      sx={{ borderRadius: 3, boxShadow: 1, mx: "auto", maxWidth: 900 }}
      dir="rtl"
    >
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
          الإعدادات المحلية وقواعد العمل
        </Typography>
        <Stack spacing={4}>
          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              gutterBottom
              sx={{ mb: 2 }}
            >
              تنسيق النظام
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, rowGap: 3 }}>
              <Box
                sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}
              >
                <Controller
                  name="currency_symbol"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="رمز العملة"
                      helperText="مثال: SDG, SAR, $"
                    />
                  )}
                />
              </Box>
              <Box
                sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}
              >
                <Controller
                  name="date_format"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="صيغة التاريخ"
                      placeholder="YYYY-MM-DD"
                    />
                  )}
                />
              </Box>
              <Box sx={{ flex: "1 1 100%" }}>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="المنطقة الزمنية"
                    >
                      <MenuItem value="Africa/Khartoum">
                        Africa/Khartoum
                      </MenuItem>
                      <MenuItem value="Asia/Muscat">Asia/Muscat</MenuItem>
                      <MenuItem value="Asia/Riyadh">Asia/Riyadh</MenuItem>
                      <MenuItem value="Asia/Dubai">Asia/Dubai</MenuItem>
                    </TextField>
                  )}
                />
              </Box>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              gutterBottom
              sx={{ mb: 2 }}
            >
              قواعد المخزون والمبيعات
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, rowGap: 3 }}>
              <Box
                sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}
              >
                <Controller
                  name="global_low_stock_threshold"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="حد تنبيه المخزون المنخفض"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      InputProps={{
                        endAdornment: (
                          <Typography variant="caption">وحدة</Typography>
                        ),
                      }}
                    />
                  )}
                />
              </Box>
              <Box
                sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}
              >
                <Controller
                  name="default_profit_rate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="هامش الربح الافتراضي"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      InputProps={{
                        endAdornment: (
                          <Typography variant="caption">%</Typography>
                        ),
                      }}
                    />
                  )}
                />
              </Box>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              gutterBottom
              sx={{ mb: 2 }}
            >
              ترقيم المستندات
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, rowGap: 3 }}>
              <Box
                sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}
              >
                <Controller
                  name="invoice_prefix"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="بادئة الفاتورة"
                      helperText="مثال: INV- (الناتج: INV-001)"
                    />
                  )}
                />
              </Box>
              <Box
                sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 12px)" } }}
              >
                <Controller
                  name="purchase_order_prefix"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="بادئة طلب الشراء"
                      helperText="مثال: PO- (الناتج: PO-001)"
                    />
                  )}
                />
              </Box>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
