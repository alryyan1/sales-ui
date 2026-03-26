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
  Switch,
  TextField,
  Stack,
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
          إعدادات نقاط البيع (POS)
        </Typography>
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
              sx={{ mb: 3 }}
            >
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
                        <Typography
                          variant="body1"
                          fontWeight={500}
                          gutterBottom
                        >
                          نظام الورديات (Shift Based)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          يتطلب فتح وإغلاق وردية لكل مستخدم. مناسب للمحلات
                          التجارية ذات الموظفين المتعددين.
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 3, alignItems: "flex-start" }}
                  />
                  <FormControlLabel
                    value="days"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography
                          variant="body1"
                          fontWeight={500}
                          gutterBottom
                        >
                          نظام الأيام (Daily Based)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
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

        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            mt: 3,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              تصفية المبيعات
            </Typography>
            <Controller
              name="pos_filter_sales_by_user"
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
                      <Typography variant="body1" fontWeight={500} gutterBottom>
                        عرض مبيعات المستخدم الحالي فقط
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        عند تفعيل هذا الخيار، سيتم عرض مبيعات المستخدم المسجل
                        حالياً فقط في قائمة المبيعات المعلقة. عند إلغاء التفعيل،
                        سيتم عرض جميع المبيعات.
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start" }}
                />
              )}
            />
          </FormControl>
        </Box>

        {/* Product Visibility Settings */}
        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            mt: 3,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              ظهور المنتجات (Product Visibility)
            </Typography>
            <Stack spacing={2}>
              <Controller
                name="pos_show_expired_products"
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
                          عرض المنتجات المنتهية الصلاحية
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          عند التفعيل، ستظهر المنتجات منتهية الصلاحية في نتائج بحث نقطة البيع.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start" }}
                  />
                )}
              />
              <Controller
                name="pos_show_out_of_stock_products"
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
                          عرض المنتجات التي نفد مخزونها
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          عند التفعيل، ستظهر المنتجات التي رصيدها صفراً أو أقل في نتائج بحث نقطة البيع.
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
        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            mt: 3,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              إشعارات الواتساب (WhatsApp Notifications)
            </Typography>
            <Controller
              name="whatsapp_shift_closure_numbers"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ""}
                  label="أرقام استلام تقرير إغلاق الوردية"
                  placeholder="مثال: 249991961111,249123456789"
                  helperText="أدخل أرقام الهواتف (مفصولة بفاصلة) التي يجب أن تتلقى رسالة الواتساب عند إغلاق أي وردية. يجب أن تتضمن الرمز الدولي بدون +"
                  fullWidth
                  variant="outlined"
                  dir="ltr"
                />
              )}
            />
          </FormControl>
        </Box>
        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            mt: 3,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              إعدادات Firebase (Firebase Settings)
            </Typography>
            <Controller
              name="firebase_collection_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || "one_care"}
                  label="اسم مجموعة Firebase (Collection Name)"
                  placeholder="مثال: one_care"
                  helperText="اسم المجموعة (Collection) في Firestore حيث يتم تخزين المنتجات والورديات."
                  fullWidth
                  variant="outlined"
                  dir="ltr"
                />
              )}
            />
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );
};
