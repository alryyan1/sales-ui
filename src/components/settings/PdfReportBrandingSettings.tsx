// src/components/settings/PdfReportBrandingSettings.tsx
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Droplets, ImageIcon, Loader2, Save, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SwitchField } from "./shared/SwitchField";
import { SegmentedControl } from "./shared/SegmentedControl";
import { SettingsSection } from "./shared/SettingsSection";
import { SettingsGroup } from "./shared/SettingsGroup";
import { cn } from "@/lib/utils";

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
  show_stamp: boolean;
  show_signature: boolean;
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
    show_stamp: s.show_stamp ?? false,
    show_signature: s.show_signature ?? false,
    saving: false,
  };
}

const brandingTypeLabel = (type: BrandingType) =>
  type === "logo" ? "شعار" : type === "header" ? "هيدر" : type === "none" ? "بدون" : "افتراضي";

// ─── Small building blocks ────────────────────────────────────────────────────

function UploadBox({
  label,
  preview,
  uploading,
  onClick,
  inputRef,
  onChange,
  imgClassName,
  className,
}: {
  label: string;
  preview: string | null;
  uploading: boolean;
  onClick: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imgClassName?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-3 transition-colors hover:border-primary hover:bg-accent/50",
        className
      )}
    >
      {uploading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : preview ? (
        <img src={preview} alt={label} className={cn("max-h-14 max-w-full object-contain", imgClassName)} />
      ) : (
        <ImageIcon className="size-7 text-muted-foreground/60" />
      )}
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Upload className="size-3" />
        {preview ? `تغيير ${label}` : `رفع ${label}`}
      </span>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onChange} />
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export const PdfReportBrandingSettings: React.FC = () => {
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
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [stampUploading, setStampUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

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
    if (settings.company_stamp_url) setStampPreview(settings.company_stamp_url);
    if (settings.company_signature_url) setSignaturePreview(settings.company_signature_url);
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

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStampUploading(true);
    try {
      const updated = await settingService.uploadStamp(file);
      setStampPreview(updated.company_stamp_url ?? null);
      await fetchSettings();
      toast.success("تم رفع الختم بنجاح");
    } catch {
      toast.error("فشل رفع الختم");
    } finally {
      setStampUploading(false);
      if (stampInputRef.current) stampInputRef.current.value = "";
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSignatureUploading(true);
    try {
      const updated = await settingService.uploadSignature(file);
      setSignaturePreview(updated.company_signature_url ?? null);
      await fetchSettings();
      toast.success("تم رفع التوقيع بنجاح");
    } catch {
      toast.error("فشل رفع التوقيع");
    } finally {
      setSignatureUploading(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
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
        show_stamp: s.show_stamp,
        show_signature: s.show_signature,
      });
      toast.success("تم الحفظ");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      patchReport(reportKey, { saving: false });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SettingsSection
      title="تقارير PDF والهيدر"
      description="تحكم بالشعار والختم والتوقيع، وهيدر كل تقرير على حدة."
    >
      <SettingsGroup title="شعار الشركة وعناصر الهيدر">
        {/* Image uploads */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">صورة الشعار</Label>
            <UploadBox
              label="شعار"
              preview={logoPreview}
              uploading={logoUploading}
              onClick={() => logoInputRef.current?.click()}
              inputRef={logoInputRef}
              onChange={handleLogoUpload}
            />
          </div>

          <div className="flex-[2] space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              صورة الهيدر الكامل (تمتد بعرض الصفحة)
            </Label>
            <UploadBox
              label="هيدر"
              preview={headerPreview}
              uploading={headerUploading}
              onClick={() => headerInputRef.current?.click()}
              inputRef={headerInputRef}
              onChange={handleHeaderUpload}
              imgClassName="w-full rounded object-cover"
              className="min-h-20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">صورة الختم</Label>
            <UploadBox
              label="ختم"
              preview={stampPreview}
              uploading={stampUploading}
              onClick={() => stampInputRef.current?.click()}
              inputRef={stampInputRef}
              onChange={handleStampUpload}
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">صورة التوقيع</Label>
            <UploadBox
              label="توقيع"
              preview={signaturePreview}
              uploading={signatureUploading}
              onClick={() => signatureInputRef.current?.click()}
              inputRef={signatureInputRef}
              onChange={handleSignatureUpload}
            />
          </div>
        </div>
      </SettingsGroup>

      <Separator />

      <SettingsGroup
        title="نمط الهيدر الافتراضي"
        description="تطبّق على جميع التقارير التي لا تملك إعداداً مخصصاً"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGlobalSave}
            disabled={global.saving}
            className="min-w-[130px]"
          >
            {global.saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            حفظ
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">النمط</Label>
            <SegmentedControl
              value={global.invoice_branding_type}
              onChange={(v) => patchGlobal({ invoice_branding_type: v })}
              options={[
                { value: "logo", label: "شعار ونص" },
                { value: "header", label: "هيدر كامل" },
              ]}
            />
          </div>

          {global.invoice_branding_type === "logo" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">موضع الشعار</Label>
                <Select
                  value={global.logo_position}
                  onValueChange={(v) =>
                    patchGlobal({ logo_position: v as "left" | "right" | "center" })
                  }
                >
                  <SelectTrigger size="sm" className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">يمين</SelectItem>
                    <SelectItem value="left">يسار</SelectItem>
                    <SelectItem value="center">وسط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">العرض (mm)</Label>
                <Input
                  type="number"
                  min={10}
                  max={200}
                  dir="ltr"
                  value={global.logo_width}
                  onChange={(e) => patchGlobal({ logo_width: Number(e.target.value) })}
                  className="h-8 w-[90px] text-left"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">الارتفاع (mm)</Label>
                <Input
                  type="number"
                  min={10}
                  max={200}
                  dir="ltr"
                  value={global.logo_height}
                  onChange={(e) => patchGlobal({ logo_height: Number(e.target.value) })}
                  className="h-8 w-[90px] text-left"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">خط PDF</Label>
            <Select value={global.pdf_font} onValueChange={(v) => patchGlobal({ pdf_font: v })}>
              <SelectTrigger size="sm" className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PDF_FONTS.AMIRI}>Amiri — نسخ كلاسيكي</SelectItem>
                <SelectItem value={PDF_FONTS.TAJAWAL}>Tajawal — حديث</SelectItem>
                <SelectItem value={PDF_FONTS.IBM_PLEX}>IBM Plex Arabic — عصري</SelectItem>
                <SelectItem value={PDF_FONTS.ARIAL}>Arial — قياسي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsGroup>

      <Separator />

      <SettingsGroup
        title="تخصيص كل تقرير"
        description="يمكن لكل تقرير تجاوز الإعداد العام أو استخدامه"
      >
        <div className="overflow-hidden rounded-lg border">
          {reports.map((report, idx) => {
            const s = reportStates[report.report_key];
            if (!s) return null;

            const isCustom = s.branding_type !== "global";

            return (
              <Collapsible
                key={report.report_key}
                className={cn(idx < reports.length - 1 && "border-b")}
              >
                <CollapsibleTrigger
                  type="button"
                  className="group flex w-full items-center gap-2 px-5 py-2.5 text-start hover:bg-accent/40"
                >
                  <span className="flex-1 text-sm font-medium">{report.report_name}</span>
                  {isCustom && (
                    <Badge variant="outline" className="h-5 text-[11px]">
                      {brandingTypeLabel(s.branding_type)}
                    </Badge>
                  )}
                  {s.show_watermark && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Droplets className="size-3.5 text-blue-500" />
                      </TooltipTrigger>
                      <TooltipContent>علامة مائية مفعّلة</TooltipContent>
                    </Tooltip>
                  )}
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-3 bg-muted/30 px-5 pt-1 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-20 text-xs text-muted-foreground">نمط الهيدر</span>
                    <SegmentedControl
                      value={s.branding_type}
                      onChange={(v) => patchReport(report.report_key, { branding_type: v })}
                      options={[
                        { value: "global", label: "افتراضي" },
                        { value: "logo", label: "شعار" },
                        { value: "header", label: "هيدر كامل" },
                        { value: "none", label: "بدون" },
                      ]}
                    />
                  </div>

                  {s.branding_type === "logo" && (
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">الموضع</Label>
                        <Select
                          value={s.logo_position ?? "__global__"}
                          onValueChange={(v) =>
                            patchReport(report.report_key, {
                              logo_position:
                                v === "__global__" ? null : (v as "left" | "right" | "center"),
                            })
                          }
                        >
                          <SelectTrigger size="sm" className="w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__global__">عام ({global.logo_position})</SelectItem>
                            <SelectItem value="right">يمين</SelectItem>
                            <SelectItem value="left">يسار</SelectItem>
                            <SelectItem value="center">وسط</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">العرض (mm)</Label>
                        <Input
                          type="number"
                          min={10}
                          max={200}
                          dir="ltr"
                          placeholder={String(global.logo_width)}
                          value={s.logo_width ?? ""}
                          onChange={(e) =>
                            patchReport(report.report_key, {
                              logo_width: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="h-8 w-[85px] text-left text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">الارتفاع (mm)</Label>
                        <Input
                          type="number"
                          min={10}
                          max={200}
                          dir="ltr"
                          placeholder={String(global.logo_height)}
                          value={s.logo_height ?? ""}
                          onChange={(e) =>
                            patchReport(report.report_key, {
                              logo_height: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="h-8 w-[85px] text-left text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <SwitchField
                        label="علامة مائية"
                        checked={s.show_watermark}
                        onCheckedChange={(v) => patchReport(report.report_key, { show_watermark: v })}
                        className="items-center gap-2"
                      />
                      <SwitchField
                        label="ختم"
                        checked={s.show_stamp}
                        onCheckedChange={(v) => patchReport(report.report_key, { show_stamp: v })}
                        className="items-center gap-2"
                      />
                      <SwitchField
                        label="توقيع"
                        checked={s.show_signature}
                        onCheckedChange={(v) => patchReport(report.report_key, { show_signature: v })}
                        className="items-center gap-2"
                      />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleReportSave(report.report_key)}
                      disabled={s.saving}
                      className="h-7 min-w-20 text-xs"
                    >
                      {s.saving ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Save className="size-3" />
                      )}
                      حفظ
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </SettingsGroup>
    </SettingsSection>
  );
};
