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
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Language as LanguageIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Receipt as ReceiptIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import { PDF_FONTS } from "@/utils/pdfFontRegistry";
import settingService from "@/services/settingService";

// Form values type (matches AppSettings but all optional for partial updates)
type SettingsFormValues = Partial<AppSettings>;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// --- Component ---
const SettingsPage: React.FC = () => {
  const { settings, isLoadingSettings, updateSettings } = useSettings();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Previews
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    defaultValues: {
      company_name: "",
      company_address: "",
      company_phone: "",
      company_email: "",
      company_logo_url: "",
      company_header_url: "",
      currency_symbol: "$",
      date_format: "YYYY-MM-DD",
      timezone: "Africa/Khartoum",
      global_low_stock_threshold: 10,
      invoice_prefix: "INV-",
      purchase_order_prefix: "PO-",
      default_profit_rate: 20.0,
      invoice_branding_type: "logo",
      logo_position: "right",
      logo_height: 60,
      logo_width: 60,
      tax_number: "",
      pdf_font: "Amiri",
      pos_mode: "shift",
    },
  });

  const {
    handleSubmit,
    control,
    reset,
    getValues,
    watch,
    setValue,
    formState: { isSubmitting },
  } = form;

  const watchedLogoUrl = watch("company_logo_url");
  const watchedHeaderUrl = watch("company_header_url");
  const watchedBrandingType = watch("invoice_branding_type");

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // --- Effect to Populate Form with Loaded Settings ---
  useEffect(() => {
    if (settings) {
      reset({
        ...settings,
        global_low_stock_threshold: settings.global_low_stock_threshold ?? 10,
        default_profit_rate: settings.default_profit_rate ?? 20.0,
        // Ensure defaults for new fields if missing
        invoice_branding_type: settings.invoice_branding_type || "logo",
        logo_position: settings.logo_position || "right",
        logo_height: settings.logo_height || 60,
        logo_width: settings.logo_width || 60,
        tax_number: settings.tax_number || "",
        pdf_font: settings.pdf_font || "Amiri",
        pos_mode: settings.pos_mode || "shift",
      });

      if (settings.company_logo_url) setLogoPreview(settings.company_logo_url);
      if (settings.company_header_url)
        setHeaderPreview(settings.company_header_url);
    }
  }, [settings, reset]);

  // Update previews when watched value changes
  useEffect(() => {
    if (watchedLogoUrl) setLogoPreview(watchedLogoUrl);
  }, [watchedLogoUrl]);

  useEffect(() => {
    if (watchedHeaderUrl) setHeaderPreview(watchedHeaderUrl);
  }, [watchedHeaderUrl]);

  // --- Form Submission ---
  const onSubmit = async (data: SettingsFormValues) => {
    setServerError(null);

    // Prepare data
    const dataToSubmit: Partial<AppSettings> = {
      ...data,
      global_low_stock_threshold: data.global_low_stock_threshold
        ? Number(data.global_low_stock_threshold)
        : undefined,
      company_email: data.company_email || undefined,
      company_logo_url: data.company_logo_url || null,
      company_header_url: data.company_header_url || null,
      logo_height: data.logo_height ? Number(data.logo_height) : 60,
      logo_width: data.logo_width ? Number(data.logo_width) : 60,
      tax_number: data.tax_number || undefined,
      pdf_font: data.pdf_font || "Amiri",
      pos_mode: data.pos_mode || "shift",
    };

    try {
      await updateSettings(dataToSubmit);
      toast.success("تم تحديث الإعدادات بنجاح");
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
      setValue("company_logo_url", updated.company_logo_url || "");
      toast.success("تم رفع الشعار بنجاح");
    } catch (err) {
      toast.error("فشل رفع الشعار");
    }
  };

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await settingService.uploadHeader(file);
      setValue("company_header_url", updated.company_header_url || "");
      toast.success("تم رفع الهيدر بنجاح");
    } catch (err) {
      toast.error("فشل رفع الهيدر");
    }
  };

  // --- Render Logic ---
  if (isLoadingSettings && !settings) {
    return (
      <Box sx={{ p: 4, maxWidth: "1200px", mx: "auto" }}>
        <CircularProgress />
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
          إعدادات النظام
        </Typography>
      </Stack>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {serverError && !isSubmitting && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {serverError}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="settings tabs"
          >
            <Tab
              icon={<BusinessIcon />}
              iconPosition="start"
              label="معلومات الشركة والنظام"
            />
            <Tab
              icon={<ReceiptIcon />}
              iconPosition="start"
              label="تخصيص الفاتورة (Branding)"
            />
            <Tab icon={<PdfIcon />} iconPosition="start" label="إعدادات PDF" />
          </Tabs>
        </Box>

        {/* --- TAB 0: General Settings --- */}
        <CustomTabPanel value={tabValue} index={0}>
          {/* Company Information Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <BusinessIcon color="primary" fontSize="small" />
                بيانات الشركة الأساسية
              </Typography>
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
                        label="البريد الإلكتروني"
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
                        label="رقم الهاتف"
                        variant="outlined"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="tax_number"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="الرقم الضريبي"
                        value={field.value || ""}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="company_address"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="العنوان"
                        multiline
                        rows={2}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Localization & Formatting */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <LanguageIcon color="primary" fontSize="small" />
                الترجمة والتنسيق
              </Typography>
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
                        helperText="مثال: AED, SAR, $"
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
                        placeholder="YYYY-MM-DD"
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
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Business Rules */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <InventoryIcon color="primary" fontSize="small" />
                قواعد العمل والمخزون
              </Typography>
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
                        label="حد تنبيه المخزون المنخفض"
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* POS Mode Configuration */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <ReceiptIcon color="primary" fontSize="small" />
                إعدادات نظام نقاط البيع (POS)
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      gutterBottom
                    >
                      وضع التشغيل:
                    </Typography>
                    <Controller
                      name="pos_mode"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup row {...field} value={field.value || "shift"}>
                          <FormControlLabel
                            value="shift"
                            control={<Radio />}
                            label="وضع الورديات (يتطلب فتح وإغلاق الورديات)"
                          />
                          <FormControlLabel
                            value="days"
                            control={<Radio />}
                            label="وضع الأيام (لا يتطلب ورديات، المبيعات حسب تاريخ الإنشاء)"
                          />
                        </RadioGroup>
                      )}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      في وضع الأيام، لن تحتاج لفتح أو إغلاق ورديات. سيتم عرض المبيعات حسب تاريخ الإنشاء.
                    </Typography>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Document Prefixes Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <DescriptionIcon color="primary" />
                <Typography
                  variant="h6"
                  component="h2"
                  sx={{ fontWeight: 600 }}
                >
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
        </CustomTabPanel>

        {/* --- TAB 1: Invoice Branding --- */}
        <CustomTabPanel value={tabValue} index={1}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <ImageIcon color="primary" fontSize="small" />
                تخصيص مظهر الفاتورة (A4)
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                اختر بين استخدام "شعار الشركة" التقليدي أو "صورة هيدر كاملة".
                الفاتورة الحرارية ستستخدم الشعار دائماً.
              </Alert>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      gutterBottom
                    >
                      نوع الترويسة (Header Type):
                    </Typography>
                    <Controller
                      name="invoice_branding_type"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup row {...field}>
                          <FormControlLabel
                            value="logo"
                            control={<Radio />}
                            label="شعار + بيانات نصية"
                          />
                          <FormControlLabel
                            value="header"
                            control={<Radio />}
                            label="صورة هيدر كاملة (Full Header Image)"
                          />
                        </RadioGroup>
                      )}
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Show specific sections based on selection */}
          {watchedBrandingType === "logo" && (
            <Card sx={{ mb: 3, border: "1px solid #1976d2" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إعدادات الشعار
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <InputLabel sx={{ mb: 1 }}>موضع الشعار</InputLabel>
                    <Controller
                      name="logo_position"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select fullWidth>
                          <MenuItem value="right">يمين (Right)</MenuItem>
                          <MenuItem value="left">يسار (Left)</MenuItem>
                          <MenuItem value="both">كلاهما (Both)</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <InputLabel sx={{ mb: 1 }}>موضع الشعار</InputLabel>
                    <Controller
                      name="logo_position"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select fullWidth>
                          <MenuItem value="right">يمين (Right)</MenuItem>
                          <MenuItem value="left">يسار (Left)</MenuItem>
                          <MenuItem value="both">كلاهما (Both)</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <InputLabel sx={{ mb: 1 }}>عرض الشعار (px)</InputLabel>
                    <Controller
                      name="logo_width"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          fullWidth
                          placeholder="60"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <InputLabel sx={{ mb: 1 }}>ارتفاع الشعار (px)</InputLabel>
                    <Controller
                      name="logo_height"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          fullWidth
                          placeholder="60"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <InputLabel sx={{ mb: 1 }}>رفع الشعار</InputLabel>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<ImageIcon />}
                      >
                        اختر ملف الشعار
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </Button>
                      {logoPreview && (
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1,
                            backgroundColor: "#f5f5f5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <img
                            src={logoPreview}
                            alt="Logo"
                            style={{
                              maxHeight: watchedHeaderUrl
                                ? 60
                                : Number(watch("logo_height") || 60),
                              maxWidth: watchedHeaderUrl
                                ? 100
                                : Number(watch("logo_width") || 100),
                              // Use watched values for preview if possible
                            }}
                          />
                        </Paper>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {watchedBrandingType === "header" && (
            <Card sx={{ mb: 3, border: "1px solid #ed6c02" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إعدادات الهيدر الكامل
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  سيتم عرض هذه الصورة في أعلى صفحة A4 بعرض الصفحة الكامل. سيتم
                  إخفاء اسم الشركة وبياناتها النصية لأنها مفترض أن تكون موجودة
                  داخل التصميم.
                </Typography>

                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    component="label"
                    sx={{ width: "fit-content" }}
                    startIcon={<ImageIcon />}
                    color="warning"
                  >
                    رفع صورة الهيدر (Header Image)
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleHeaderUpload}
                    />
                  </Button>

                  {headerPreview && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption">معاينة:</Typography>
                      <Paper
                        elevation={3}
                        sx={{
                          width: "100%",
                          maxWidth: "600px", // Limit width for UI preview
                          height: "100px",
                          backgroundImage: `url(${headerPreview})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          border: "1px dashed #ccc",
                        }}
                      />
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </CustomTabPanel>

        {/* --- TAB 2: PDF Settings --- */}
        <CustomTabPanel value={tabValue} index={2}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <PdfIcon color="primary" fontSize="small" />
                إعدادات ملفات PDF
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="pdf_font"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        label="نوع الخط في ملفات PDF"
                        helperText="سيتم تطبيق هذا الخط على جميع الفواتير والتقارير"
                      >
                        <MenuItem value={PDF_FONTS.AMIRI}>
                          Amiri (افتراضي - Serif)
                        </MenuItem>
                        <MenuItem value={PDF_FONTS.TAJAWAL}>
                          Tajawal (Sans-Serif)
                        </MenuItem>
                        <MenuItem value={PDF_FONTS.IBM_PLEX}>
                          IBM Plex Sans Arabic (Modern)
                        </MenuItem>
                        <MenuItem value={PDF_FONTS.ARIAL}>
                          Arial (Standard)
                        </MenuItem>
                      </TextField>
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </CustomTabPanel>

        {/* Submit Button */}
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            backgroundColor: "background.paper",
            p: 2,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 10,
          }}
        >
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
            sx={{ minWidth: 200 }}
          >
            حفظ التغييرات
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsPage;
