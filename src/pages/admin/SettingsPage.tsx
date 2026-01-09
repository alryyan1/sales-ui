// src/pages/admin/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useSettings } from "@/context/SettingsContext";
import { AppSettings } from "@/services/settingService";
import { toast } from "sonner";
import settingService from "@/services/settingService";
import { PDF_FONTS } from "@/utils/pdfFontRegistry";

// Settings Subcomponents
import { CompanyInfoSettings } from "@/components/settings/CompanyInfoSettings";
import { BusinessRulesSettings } from "@/components/settings/BusinessRulesSettings";
import { PosSettings } from "@/components/settings/PosSettings";
import { PdfSettings } from "@/components/settings/PdfSettings";

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
  Stack,
  MenuItem,
  InputLabel,
  Divider,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Avatar,
  Tabs,
  Tab,
} from "@mui/material";

// Icons
import {
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Language as LanguageIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Receipt as ReceiptIcon,
  PictureAsPdf as PdfIcon,
  Save as SaveIcon,
  Store as StoreIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";

// Form values type
type SettingsFormValues = Partial<AppSettings>;

// --- Component ---
const SettingsPage: React.FC = () => {
  const theme = useTheme();
  const { settings, isLoadingSettings, updateSettings } = useSettings();
  const [serverError, setServerError] = useState<string | null>(null);

  // Tab/Section State
  const [activeSection, setActiveSection] = useState(0);

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
    watch,
    setValue,
    formState: { isSubmitting },
  } = form;

  const watchedLogoUrl = watch("company_logo_url");
  const watchedHeaderUrl = watch("company_header_url");
  const watchedBrandingType = watch("invoice_branding_type");

  // --- Effects ---
  useEffect(() => {
    if (settings) {
      reset({
        ...settings,
        global_low_stock_threshold: settings.global_low_stock_threshold ?? 10,
        default_profit_rate: settings.default_profit_rate ?? 20.0,
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

  useEffect(() => {
    if (watchedLogoUrl) setLogoPreview(watchedLogoUrl);
  }, [watchedLogoUrl]);

  useEffect(() => {
    if (watchedHeaderUrl) setHeaderPreview(watchedHeaderUrl);
  }, [watchedHeaderUrl]);

  // --- Handlers ---
  const onSubmit = async (data: SettingsFormValues) => {
    setServerError(null);
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

  // --- Navigation Sections ---
  const sections = [
    {
      id: 0,
      label: "بيانات الشركة",
      icon: <BusinessIcon />,
      description: "الاسم، العنوان، وأرقام التواصل",
    },
    {
      id: 1,
      label: "قواعد العمل والمخزون",
      icon: <InventoryIcon />,
      description: "العملة، التنبيهات، والضرائب",
    },
    {
      id: 2,
      label: "نقاط البيع (POS)",
      icon: <StoreIcon />,
      description: "إعدادات الورديات وطرق البيع",
    },
    {
      id: 3,
      label: "تخصيص الفواتير",
      icon: <ImageIcon />,
      description: "الشعار، الهيدر، والمظهر",
    },
    {
      id: 4,
      label: "إعدادات PDF",
      icon: <PdfIcon />,
      description: "الخطوط وتنسيق الطباعة",
    },
  ];

  if (isLoadingSettings && !settings) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto", direction: "rtl" }}
    >
      {/* Page Header */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48 }}>
            <SettingsIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              إعدادات النظام
            </Typography>
            <Typography variant="body1" color="text.secondary">
              تحكم في جميع خصائص وإعدادات التطبيق من مكان واحد
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Main Layout */}
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {serverError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {serverError}
          </Alert>
        )}

        {/* Tabs Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={activeSection}
            onChange={(e, newValue) => setActiveSection(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                minHeight: 64,
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
              },
            }}
          >
            {sections.map((section) => (
              <Tab
                key={section.id}
                value={section.id}
                icon={section.icon}
                iconPosition="start"
                label={section.label}
              />
            ))}
          </Tabs>
        </Box>

        {/* Content Area */}
        <Box>
          <Stack spacing={3} sx={{ pb: 10 }}>
            {/* SECTION 0: Company Info */}
            {activeSection === 0 && <CompanyInfoSettings control={control} />}

            {/* SECTION 1: Business Rules */}
            {activeSection === 1 && <BusinessRulesSettings control={control} />}

            {/* SECTION 2: POS Settings */}
            {activeSection === 2 && <PosSettings control={control} />}

            {/* SECTION 3: Branding */}
            {activeSection === 3 && (
              <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[1] }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    gutterBottom
                    sx={{ mb: 3 }}
                  >
                    هوية الفواتير (Branding)
                  </Typography>

                  <FormControl
                    component="fieldset"
                    sx={{ mb: 4, width: "100%" }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      نمط الترويسة
                    </Typography>
                    <Controller
                      name="invoice_branding_type"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup row {...field} sx={{ gap: 4 }}>
                          <FormControlLabel
                            value="logo"
                            control={<Radio />}
                            label="شعار و نص (Logo & Text)"
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

                  <Divider sx={{ mb: 4 }} />

                  {watchedBrandingType === "logo" && (
                    <Stack spacing={4}>
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          رفع الشعار
                        </Typography>
                        <Box
                          sx={{
                            border: "2px dashed",
                            borderColor: "divider",
                            borderRadius: 2,
                            p: 3,
                            textAlign: "center",
                          }}
                        >
                          {logoPreview ? (
                            <Box
                              sx={{
                                mb: 2,
                                height: 100,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <img
                                src={logoPreview}
                                alt="Logo"
                                style={{
                                  maxHeight: "100%",
                                  maxWidth: "100%",
                                }}
                              />
                            </Box>
                          ) : (
                            <ImageIcon
                              sx={{
                                fontSize: 48,
                                color: "text.disabled",
                                mb: 1,
                              }}
                            />
                          )}
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<CloudUploadIcon />}
                          >
                            رفع ملف جديد
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={handleLogoUpload}
                            />
                          </Button>
                        </Box>
                      </Box>

                      <Controller
                        name="logo_position"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            select
                            fullWidth
                            label="محاذاة الشعار"
                          >
                            <MenuItem value="right">يمين (Right)</MenuItem>
                            <MenuItem value="left">يسار (Left)</MenuItem>
                            <MenuItem value="center">وسط (Center)</MenuItem>
                          </TextField>
                        )}
                      />
                      <Stack direction="row" spacing={2}>
                        <Controller
                          name="logo_width"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              fullWidth
                              label="العرض (px)"
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          )}
                        />
                        <Controller
                          name="logo_height"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="number"
                              fullWidth
                              label="الارتفاع (px)"
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          )}
                        />
                      </Stack>
                    </Stack>
                  )}

                  {watchedBrandingType === "header" && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        صورة الهيدر الكاملة
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        paragraph
                      >
                        ستظهر هذه الصورة بعرض الصفحة الكامل في أعلى الفاتورة.
                        سيتم إخفاء بيانات الشركة النصية.
                      </Typography>
                      <Box
                        sx={{
                          border: "2px dashed",
                          borderColor: "divider",
                          borderRadius: 2,
                          p: 3,
                          textAlign: "center",
                        }}
                      >
                        {headerPreview ? (
                          <Box
                            sx={{
                              mb: 2,
                              height: 120,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                            }}
                          >
                            <img
                              src={headerPreview}
                              alt="Header"
                              style={{
                                height: "100%",
                                objectFit: "cover",
                                width: "100%",
                              }}
                            />
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              height: 80,
                              bgcolor: "action.hover",
                              mb: 2,
                              borderRadius: 1,
                            }}
                          />
                        )}
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<CloudUploadIcon />}
                          color="secondary"
                        >
                          رفع صورة الهيدر
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleHeaderUpload}
                          />
                        </Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SECTION 4: PDF & Printing */}
            {activeSection === 4 && (
              <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[1] }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    gutterBottom
                    sx={{ mb: 3 }}
                  >
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
            )}
          </Stack>
        </Box>

        {/* Floating Save Bar */}
        <Paper
          elevation={4}
          sx={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            width: "auto",
            minWidth: 300,
            borderRadius: 10,
            py: 1.5,
            px: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            zIndex: 1000,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" fontWeight={500} color="text.secondary">
            هل قمت بإجراء تعديلات؟
          </Typography>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting || isLoadingSettings}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            sx={{ borderRadius: 5, px: 4 }}
          >
            حفظ التغييرات
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default SettingsPage;
