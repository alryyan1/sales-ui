// src/components/settings/PdfReportBrandingSettings.tsx
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Image as ImageIcon,
  Save as SaveIcon,
  SettingsApplications as SettingsIcon,
  Tune as TuneIcon,
  Upload as UploadIcon,
  WaterDrop as WatermarkIcon,
} from "@mui/icons-material";

import pdfReportSettingService, {
  PdfReportSetting,
} from "@/services/pdfReportSettingService";
import settingService from "@/services/settingService";
import { useSettings } from "@/context/SettingsContext";
import { PDF_FONTS } from "@/utils/pdfFontRegistry";

// ─── Types ───────────────────────────────────────────────────────────────────

type BrandingType = "global" | "logo" | "header" | "none";

interface ReportState {
  branding_type: BrandingType;
  logo_position: "left" | "right" | "center" | null;
  logo_height: number | null;
  logo_width: number | null;
  show_watermark: boolean;
  saving: boolean;
}

interface GlobalState {
  invoice_branding_type: "logo" | "header";
  logo_position: "left" | "right" | "center";
  logo_height: number;
  logo_width: number;
  pdf_font: string;
  saving: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toReportState(s: PdfReportSetting): ReportState {
  return {
    branding_type: (s.branding_type as BrandingType) ?? "global",
    logo_position: s.logo_position,
    logo_height: s.logo_height,
    logo_width: s.logo_width,
    show_watermark: s.show_watermark,
    saving: false,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PdfReportBrandingSettings: React.FC = () => {
  const theme = useTheme();
  const { settings, fetchSettings } = useSettings();

  // ── Global settings state ────────────────────────────────────────────────
  const [global, setGlobal] = useState<GlobalState>({
    invoice_branding_type: "logo",
    logo_position: "right",
    logo_height: 24,
    logo_width: 24,
    pdf_font: "Amiri",
    saving: false,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [headerUploading, setHeaderUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  // ── Per-report state ─────────────────────────────────────────────────────
  const [reports, setReports] = useState<PdfReportSetting[]>([]);
  const [reportStates, setReportStates] = useState<Record<string, ReportState>>({});
  const [loading, setLoading] = useState(true);

  // Sync global state from settings context
  useEffect(() => {
    if (!settings) return;
    setGlobal((prev) => ({
      ...prev,
      invoice_branding_type: settings.invoice_branding_type ?? "logo",
      logo_position: (settings.logo_position as "left" | "right" | "center") ?? "right",
      logo_height: settings.logo_height ?? 24,
      logo_width: settings.logo_width ?? 24,
      pdf_font: settings.pdf_font ?? "Amiri",
    }));
    if (settings.company_logo_url) setLogoPreview(settings.company_logo_url);
    if (settings.company_header_url) setHeaderPreview(settings.company_header_url);
  }, [settings]);

  // Load per-report settings
  useEffect(() => {
    pdfReportSettingService
      .getAll()
      .then((data) => {
        setReports(data);
        const init: Record<string, ReportState> = {};
        data.forEach((r) => (init[r.report_key] = toReportState(r)));
        setReportStates(init);
      })
      .catch(() => toast.error("فشل تحميل إعدادات التقارير"))
      .finally(() => setLoading(false));
  }, []);

  // ── Global settings handlers ─────────────────────────────────────────────

  const patchGlobal = (patch: Partial<GlobalState>) =>
    setGlobal((prev) => ({ ...prev, ...patch }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const updated = await settingService.uploadLogo(file);
      setLogoPreview(updated.company_logo_url ?? null);
      await fetchSettings();
      toast.success("تم رفع الشعار بنجاح");
    } catch {
      toast.error("فشل رفع الشعار");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeaderUploading(true);
    try {
      const updated = await settingService.uploadHeader(file);
      setHeaderPreview(updated.company_header_url ?? null);
      await fetchSettings();
      toast.success("تم رفع الهيدر بنجاح");
    } catch {
      toast.error("فشل رفع الهيدر");
    } finally {
      setHeaderUploading(false);
      if (headerInputRef.current) headerInputRef.current.value = "";
    }
  };

  const handleGlobalSave = async () => {
    patchGlobal({ saving: true });
    try {
      await settingService.updateSettings({
        invoice_branding_type: global.invoice_branding_type,
        logo_position: global.logo_position,
        logo_height: global.logo_height,
        logo_width: global.logo_width,
        pdf_font: global.pdf_font,
      });
      await fetchSettings();
      toast.success("تم حفظ الإعدادات العامة");
    } catch {
      toast.error("فشل حفظ الإعدادات");
    } finally {
      patchGlobal({ saving: false });
    }
  };

  // ── Per-report handlers ──────────────────────────────────────────────────

  const patchReport = (key: string, patch: Partial<ReportState>) =>
    setReportStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleReportSave = async (reportKey: string) => {
    const s = reportStates[reportKey];
    if (!s) return;
    patchReport(reportKey, { saving: true });
    try {
      await pdfReportSettingService.update(reportKey, {
        branding_type: s.branding_type === "global" ? null : s.branding_type,
        logo_position: s.logo_position ?? null,
        logo_height: s.logo_height ?? null,
        logo_width: s.logo_width ?? null,
        show_watermark: s.show_watermark,
      });
      toast.success("تم الحفظ");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      patchReport(reportKey, { saving: false });
    }
  };

  // ── Card/panel sx ────────────────────────────────────────────────────────

  const cardSx = {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 2,
    overflow: "hidden",
  };

  const uploadBoxSx = {
    border: `1.5px dashed ${theme.palette.divider}`,
    borderRadius: 1.5,
    p: 2,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 1,
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
    "&:hover": {
      borderColor: theme.palette.primary.main,
      bgcolor: theme.palette.action.hover,
    },
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Stack spacing={2} dir="rtl">
      {/* ── Section 1: Global Branding ──────────────────────────────────── */}
      <Box sx={cardSx}>
        {/* Header */}
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            bgcolor: theme.palette.action.selected,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <SettingsIcon fontSize="small" color="primary" />
          <Typography fontWeight={600} fontSize={14}>
            الإعدادات العامة للهيدر
          </Typography>
          <Typography
            fontSize={12}
            color="text.secondary"
            sx={{ mr: "auto" }}
          >
            تطبّق على جميع التقارير التي لا تملك إعداداً مخصصاً
          </Typography>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            {/* Image uploads */}
            <Stack direction="row" spacing={2}>
              {/* Logo upload */}
              <Box sx={{ flex: 1 }}>
                <Typography fontSize={12} fontWeight={500} color="text.secondary" mb={0.75}>
                  صورة الشعار
                </Typography>
                <Box
                  component="label"
                  sx={uploadBoxSx}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoUploading ? (
                    <CircularProgress size={20} />
                  ) : logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="logo"
                      style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <ImageIcon sx={{ fontSize: 32, color: "text.disabled" }} />
                  )}
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <UploadIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography fontSize={12} color="text.secondary">
                      {logoPreview ? "تغيير الشعار" : "رفع شعار"}
                    </Typography>
                  </Stack>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleLogoUpload}
                  />
                </Box>
              </Box>

              {/* Header image upload */}
              <Box sx={{ flex: 2 }}>
                <Typography fontSize={12} fontWeight={500} color="text.secondary" mb={0.75}>
                  صورة الهيدر الكامل (تمتد بعرض الصفحة)
                </Typography>
                <Box
                  component="label"
                  sx={{ ...uploadBoxSx, minHeight: 80 }}
                  onClick={() => headerInputRef.current?.click()}
                >
                  {headerUploading ? (
                    <CircularProgress size={20} />
                  ) : headerPreview ? (
                    <img
                      src={headerPreview}
                      alt="header"
                      style={{ maxHeight: 56, width: "100%", objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <ImageIcon sx={{ fontSize: 32, color: "text.disabled" }} />
                  )}
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <UploadIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography fontSize={12} color="text.secondary">
                      {headerPreview ? "تغيير الهيدر" : "رفع هيدر"}
                    </Typography>
                  </Stack>
                  <input
                    ref={headerInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleHeaderUpload}
                  />
                </Box>
              </Box>
            </Stack>

            <Divider />

            {/* Branding type + logo options + font */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
              {/* Branding type toggle */}
              <Box>
                <Typography fontSize={12} fontWeight={500} color="text.secondary" mb={0.75}>
                  نمط الهيدر الافتراضي
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={global.invoice_branding_type}
                  onChange={(_, v) => v && patchGlobal({ invoice_branding_type: v })}
                >
                  <ToggleButton value="logo" sx={{ px: 2, fontSize: 12 }}>
                    شعار ونص
                  </ToggleButton>
                  <ToggleButton value="header" sx={{ px: 2, fontSize: 12 }}>
                    هيدر كامل
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Logo options (shown when logo type) */}
              {global.invoice_branding_type === "logo" && (
                <>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel sx={{ fontSize: 12 }}>موضع الشعار</InputLabel>
                    <Select
                      label="موضع الشعار"
                      value={global.logo_position}
                      onChange={(e) =>
                        patchGlobal({ logo_position: e.target.value as "left" | "right" | "center" })
                      }
                      sx={{ fontSize: 13 }}
                    >
                      <MenuItem value="right">يمين</MenuItem>
                      <MenuItem value="left">يسار</MenuItem>
                      <MenuItem value="center">وسط</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    label="العرض (mm)"
                    type="number"
                    value={global.logo_width}
                    onChange={(e) => patchGlobal({ logo_width: Number(e.target.value) })}
                    inputProps={{ min: 10, max: 200, dir: "ltr" }}
                    sx={{ width: 100, "& input": { textAlign: "left" } }}
                  />
                  <TextField
                    size="small"
                    label="الارتفاع (mm)"
                    type="number"
                    value={global.logo_height}
                    onChange={(e) => patchGlobal({ logo_height: Number(e.target.value) })}
                    inputProps={{ min: 10, max: 200, dir: "ltr" }}
                    sx={{ width: 110, "& input": { textAlign: "left" } }}
                  />
                </>
              )}

              {/* PDF font */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel sx={{ fontSize: 12 }}>خط PDF</InputLabel>
                <Select
                  label="خط PDF"
                  value={global.pdf_font}
                  onChange={(e) => patchGlobal({ pdf_font: e.target.value })}
                  sx={{ fontSize: 13 }}
                >
                  <MenuItem value={PDF_FONTS.AMIRI}>Amiri — نسخ كلاسيكي</MenuItem>
                  <MenuItem value={PDF_FONTS.TAJAWAL}>Tajawal — حديث</MenuItem>
                  <MenuItem value={PDF_FONTS.IBM_PLEX}>IBM Plex Arabic — عصري</MenuItem>
                  <MenuItem value={PDF_FONTS.ARIAL}>Arial — قياسي</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Save global */}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                size="small"
                startIcon={global.saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                onClick={handleGlobalSave}
                disabled={global.saving}
                sx={{ minWidth: 120, fontSize: 13 }}
              >
                حفظ الإعدادات العامة
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* ── Section 2: Per-Report Settings ──────────────────────────────── */}
      <Box sx={cardSx}>
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            bgcolor: theme.palette.action.selected,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <TuneIcon fontSize="small" color="primary" />
          <Typography fontWeight={600} fontSize={14}>
            إعدادات هيدر كل تقرير
          </Typography>
          <Typography fontSize={12} color="text.secondary" sx={{ mr: "auto" }}>
            يمكن لكل تقرير تجاوز الإعداد العام أو استخدامه
          </Typography>
        </Box>

        <Box>
          {reports.map((report, idx) => {
            const s = reportStates[report.report_key];
            if (!s) return null;

            const isCustom = s.branding_type !== "global";
            const hasWatermark = s.show_watermark;

            return (
              <Accordion
                key={report.report_key}
                disableGutters
                elevation={0}
                square
                sx={{
                  borderBottom:
                    idx < reports.length - 1
                      ? `1px solid ${theme.palette.divider}`
                      : "none",
                  "&:before": { display: "none" },
                  "&.Mui-expanded": { margin: 0 },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    minHeight: 44,
                    px: 2.5,
                    "& .MuiAccordionSummary-content": {
                      my: 0.75,
                      alignItems: "center",
                      gap: 1,
                    },
                  }}
                >
                  <Typography fontSize={13} fontWeight={500} sx={{ flex: 1 }}>
                    {report.report_name}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {isCustom && (
                      <Chip
                        label={
                          s.branding_type === "logo"
                            ? "شعار"
                            : s.branding_type === "header"
                              ? "هيدر"
                              : "بدون"
                        }
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    )}
                    {hasWatermark && (
                      <Tooltip title="علامة مائية مفعّلة">
                        <WatermarkIcon
                          sx={{ fontSize: 16, color: "info.main" }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                </AccordionSummary>

                <AccordionDetails
                  sx={{
                    px: 2.5,
                    pb: 2,
                    pt: 0,
                    bgcolor: theme.palette.action.hover,
                  }}
                >
                  <Stack spacing={1.5}>
                    {/* Branding type */}
                    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                      <Typography fontSize={12} color="text.secondary" minWidth={80}>
                        نمط الهيدر
                      </Typography>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={s.branding_type}
                        onChange={(_, v) =>
                          v && patchReport(report.report_key, { branding_type: v as BrandingType })
                        }
                      >
                        <ToggleButton value="global" sx={{ px: 1.5, fontSize: 11 }}>
                          افتراضي
                        </ToggleButton>
                        <ToggleButton value="logo" sx={{ px: 1.5, fontSize: 11 }}>
                          شعار
                        </ToggleButton>
                        <ToggleButton value="header" sx={{ px: 1.5, fontSize: 11 }}>
                          هيدر كامل
                        </ToggleButton>
                        <ToggleButton value="none" sx={{ px: 1.5, fontSize: 11 }}>
                          بدون
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    {/* Logo sub-options */}
                    {s.branding_type === "logo" && (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
                        <FormControl size="small" sx={{ minWidth: 110 }}>
                          <InputLabel sx={{ fontSize: 12 }}>الموضع</InputLabel>
                          <Select
                            label="الموضع"
                            value={s.logo_position ?? ""}
                            onChange={(e) =>
                              patchReport(report.report_key, {
                                logo_position: e.target.value
                                  ? (e.target.value as "left" | "right" | "center")
                                  : null,
                              })
                            }
                            sx={{ fontSize: 12 }}
                          >
                            <MenuItem value="">
                              <em>عام ({global.logo_position})</em>
                            </MenuItem>
                            <MenuItem value="right">يمين</MenuItem>
                            <MenuItem value="left">يسار</MenuItem>
                            <MenuItem value="center">وسط</MenuItem>
                          </Select>
                        </FormControl>

                        <TextField
                          size="small"
                          label="العرض (mm)"
                          type="number"
                          placeholder={String(global.logo_width)}
                          value={s.logo_width ?? ""}
                          onChange={(e) =>
                            patchReport(report.report_key, {
                              logo_width: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          inputProps={{ min: 10, max: 200, dir: "ltr" }}
                          sx={{ width: 95, "& input": { textAlign: "left", fontSize: 12 } }}
                        />
                        <TextField
                          size="small"
                          label="الارتفاع (mm)"
                          type="number"
                          placeholder={String(global.logo_height)}
                          value={s.logo_height ?? ""}
                          onChange={(e) =>
                            patchReport(report.report_key, {
                              logo_height: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          inputProps={{ min: 10, max: 200, dir: "ltr" }}
                          sx={{ width: 105, "& input": { textAlign: "left", fontSize: 12 } }}
                        />
                      </Box>
                    )}

                    {/* Watermark + Save row */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={s.show_watermark}
                            onChange={(e) =>
                              patchReport(report.report_key, {
                                show_watermark: e.target.checked,
                              })
                            }
                          />
                        }
                        label={
                          <Typography fontSize={12} color="text.secondary">
                            علامة مائية (يستخدم الشعار)
                          </Typography>
                        }
                      />

                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          s.saving ? (
                            <CircularProgress size={12} color="inherit" />
                          ) : (
                            <SaveIcon sx={{ fontSize: 14 }} />
                          )
                        }
                        onClick={() => handleReportSave(report.report_key)}
                        disabled={s.saving}
                        sx={{ fontSize: 12, minWidth: 80 }}
                      >
                        حفظ
                      </Button>
                    </Stack>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
};
