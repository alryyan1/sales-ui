// src/pages/admin/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { useSettings } from "@/context/SettingsContext";
import { AppSettings } from "@/services/settingService";
import { toast } from "sonner";

// Material-UI Components
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Skeleton,
  Stack,
  MenuItem,
  InputLabel,
  Divider,
  Paper,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Language as LanguageIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import settingService from "@/services/settingService";

// Form values type (matches AppSettings but all optional for partial updates)
type SettingsFormValues = Partial<AppSettings>;

// --- Component ---
const SettingsPage: React.FC = () => {
  const { settings, isLoadingSettings, updateSettings } = useSettings();
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    defaultValues: {
      company_name: "",
      company_address: "",
      company_phone: "",
      company_email: "",
      company_logo_url: "",
      currency_symbol: "$",
      date_format: "YYYY-MM-DD",
      timezone: "Africa/Khartoum",
      global_low_stock_threshold: 10,
      invoice_prefix: "INV-",
      purchase_order_prefix: "PO-",
      default_profit_rate: 20.0,
    },
  });

  const {
    handleSubmit,
    control,
    reset,
    getValues,
    watch,
    formState: { isSubmitting },
  } = form;

  const watchedLogoUrl = watch("company_logo_url");

  // --- Effect to Populate Form with Loaded Settings ---
  useEffect(() => {
    if (settings) {
      console.log("Populating settings form:", settings);
      reset({
        company_name: settings.company_name || "",
        company_address: settings.company_address || "",
        company_phone: settings.company_phone || "",
        company_email: settings.company_email || "",
        company_logo_url: settings.company_logo_url || "",
        currency_symbol: settings.currency_symbol || "$",
        date_format: settings.date_format || "YYYY-MM-DD",
        timezone: settings.timezone || "Africa/Khartoum",
        global_low_stock_threshold: settings.global_low_stock_threshold ?? 10,
        invoice_prefix: settings.invoice_prefix || "INV-",
        purchase_order_prefix: settings.purchase_order_prefix || "PO-",
        default_profit_rate: settings.default_profit_rate ?? 20.0,
      });
      if (settings.company_logo_url) {
        setLogoPreview(settings.company_logo_url);
      }
    }
  }, [settings, reset]);

  // Update logo preview when watched value changes
  useEffect(() => {
    if (watchedLogoUrl) {
      setLogoPreview(watchedLogoUrl);
    }
  }, [watchedLogoUrl]);

  // --- Form Submission ---
  const onSubmit = async (data: SettingsFormValues) => {
    setServerError(null);
    console.log("Submitting settings:", data);

    // Prepare data (ensure numbers are numbers, nulls are null)
    const dataToSubmit: Partial<AppSettings> = {
      ...data,
      global_low_stock_threshold: data.global_low_stock_threshold
        ? Number(data.global_low_stock_threshold)
        : undefined,
      company_email: data.company_email || undefined,
      company_logo_url: data.company_logo_url || null,
    };

    try {
      await updateSettings(dataToSubmit);
    } catch (err) {
      console.error("Failed to update settings:", err);
      setServerError("حدث خطأ أثناء تحديث الإعدادات");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await settingService.uploadLogo(file);
      reset({
        ...getValues(),
        company_logo_url: updated.company_logo_url || "",
      });
      setLogoPreview(updated.company_logo_url || null);
      toast.success("تم بنجاح", {
        description: "تم تحديث الشعار بنجاح",
      });
    } catch (err) {
      toast.error("حدث خطأ");
    }
  };

  // --- Render Logic ---
  if (isLoadingSettings && !settings) {
    return (
      <Box sx={{ p: { xs: 2, md: 3, lg: 4 }, maxWidth: "1200px", mx: "auto" }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={200} height={40} />
        </Stack>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="60%" height={24} sx={{ mb: 4 }} />
            <Stack spacing={3}>
              {[...Array(5)].map((_, i) => (
                <Box key={i}>
                  <Skeleton variant="text" width="25%" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" width="100%" height={56} />
                </Box>
              ))}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Skeleton variant="rectangular" width={120} height={40} />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3, lg: 4 },
        maxWidth: "1200px",
        mx: "auto",
        pb: 5,
        direction: "rtl",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <SettingsIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          الإعدادات العامة
        </Typography>
      </Stack>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {serverError && !isSubmitting && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {serverError}
          </Alert>
        )}

        {/* Company Information Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <BusinessIcon color="primary" />
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                معلومات الشركة
              </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="company_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="اسم الشركة"
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="company_email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="email"
                      label="البريد الإلكتروني للشركة"
                      variant="outlined"
                      value={field.value || ""}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="company_phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="هاتف الشركة"
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <InputLabel sx={{ mb: 1.5, fontWeight: 500 }}>شعار الشركة</InputLabel>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button variant="outlined" component="label" size="medium">
                    اختر ملف
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </Button>
                  {logoPreview && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        display: "inline-block",
                      }}
                    >
                      <Box
                        component="img"
                        src={logoPreview}
                        alt="Logo"
                        sx={{
                          height: 80,
                          width: "auto",
                          maxWidth: 200,
                          objectFit: "contain",
                        }}
                      />
                    </Paper>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="company_address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="عنوان الشركة"
                      variant="outlined"
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Localization & Formatting Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <LanguageIcon color="primary" />
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                الترجمة والتنسيق
              </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Controller
                  name="currency_symbol"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="رمز العملة"
                      variant="outlined"
                      inputProps={{ maxLength: 5 }}
                      helperText="مثال: $, €, د.إ"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="date_format"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="صيغة التاريخ"
                      variant="outlined"
                      placeholder="YYYY-MM-DD"
                      helperText="استخدم YYYY للسنة، MM للشهر، DD لليوم"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      select
                      label="المنطقة الزمنية"
                      variant="outlined"
                    >
                      <MenuItem value="Africa/Khartoum">Africa/Khartoum</MenuItem>
                      <MenuItem value="Asia/Muscat">Asia/Muscat</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Business Rules Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <InventoryIcon color="primary" />
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                قواعد العمل
              </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="global_low_stock_threshold"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="حد تنبيه انخفاض المخزون"
                      variant="outlined"
                      inputProps={{ min: 0 }}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      helperText="سيتم تنبيهك عندما ينخفض المخزون عن هذا الحد"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="default_profit_rate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="هامش الربح الافتراضي (%)"
                      variant="outlined"
                      inputProps={{ min: 0, max: 1000, step: 0.1 }}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      helperText="النسبة المئوية الافتراضية للربح عند إضافة منتجات جديدة"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Document Prefixes Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <DescriptionIcon color="primary" />
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                بادئات المستندات
              </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="invoice_prefix"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="بادئة الفاتورة"
                      variant="outlined"
                      helperText="مثال: INV- سيصبح INV-001"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="purchase_order_prefix"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="بادئة طلب الشراء"
                      variant="outlined"
                      helperText="مثال: PO- سيصبح PO-001"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting || isLoadingSettings}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SettingsIcon />
              )
            }
            sx={{ minWidth: 160 }}
          >
            حفظ التغييرات
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsPage;
