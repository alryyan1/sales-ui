// src/components/settings/PdfReportBrandingSettings.tsx
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Loader2, Save, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SegmentedControl } from "./shared/SegmentedControl";
import { SettingsSection } from "./shared/SettingsSection";
import { SettingsGroup } from "./shared/SettingsGroup";
import { SwitchField } from "./shared/SwitchField";
import { cn } from "@/lib/utils";

import settingService from "@/services/settingService";
import pdfReportSettingService, { PdfReportSetting } from "@/services/pdfReportSettingService";
import { useSettings } from "@/context/SettingsContext";

const INVOICE_REPORT_KEY = "invoice";

type LogoPosition = "left" | "right" | "both";

function ImageUploadTile({
  label,
  preview,
  uploading,
  onUpload,
}: {
  label: string;
  preview: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-40 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 transition-colors hover:border-primary hover:bg-accent/50"
        )}
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : preview ? (
          <img src={preview} alt={label} className="max-h-16 max-w-full object-contain" />
        ) : (
          <ImageIcon className="size-7 text-muted-foreground/60" />
        )}
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Upload className="size-3" />
          {preview ? "تغيير" : "رفع"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </button>
    </div>
  );
}

export const PdfReportBrandingSettings: React.FC = () => {
  const { settings, fetchSettings } = useSettings();

  const [logoPosition, setLogoPosition] = useState<LogoPosition>("right");
  const [logoWidth, setLogoWidth] = useState(60);
  const [logoHeight, setLogoHeight] = useState(60);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [stampUploading, setStampUploading] = useState(false);

  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureUploading, setSignatureUploading] = useState(false);

  const [invoiceReportSetting, setInvoiceReportSetting] = useState<PdfReportSetting | null>(null);
  const [savingStampToggle, setSavingStampToggle] = useState(false);
  const [savingSignatureToggle, setSavingSignatureToggle] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setLogoPosition((settings.logo_position as LogoPosition) ?? "right");
    setLogoWidth(settings.logo_width ?? 60);
    setLogoHeight(settings.logo_height ?? 60);
    if (settings.company_logo_url) setLogoPreview(settings.company_logo_url);
    if (settings.company_stamp_url) setStampPreview(settings.company_stamp_url);
    if (settings.company_signature_url) setSignaturePreview(settings.company_signature_url);
  }, [settings]);

  useEffect(() => {
    pdfReportSettingService
      .getAll()
      .then((list) => setInvoiceReportSetting(list.find((r) => r.report_key === INVOICE_REPORT_KEY) ?? null))
      .catch(() => {});
  }, []);

  const handleToggleStamp = async (checked: boolean) => {
    setSavingStampToggle(true);
    try {
      const updated = await pdfReportSettingService.update(INVOICE_REPORT_KEY, { show_stamp: checked });
      setInvoiceReportSetting(updated);
      toast.success("تم الحفظ");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSavingStampToggle(false);
    }
  };

  const handleToggleSignature = async (checked: boolean) => {
    setSavingSignatureToggle(true);
    try {
      const updated = await pdfReportSettingService.update(INVOICE_REPORT_KEY, { show_signature: checked });
      setInvoiceReportSetting(updated);
      toast.success("تم الحفظ");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSavingSignatureToggle(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
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
    }
  };

  const handleStampUpload = async (file: File) => {
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
    }
  };

  const handleSignatureUpload = async (file: File) => {
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
    }
  };

  const handleSaveLogoSettings = async () => {
    setSaving(true);
    try {
      await settingService.updateSettings({
        invoice_branding_type: "logo",
        logo_position: logoPosition,
        logo_width: logoWidth,
        logo_height: logoHeight,
      });
      await fetchSettings();
      toast.success("تم حفظ الإعدادات");
    } catch {
      toast.error("فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      title="شعار الفواتير"
      description="ارفع شعار الشركة وختمها وتوقيعها، وحدد مكان ظهور الشعار في الفواتير والتقارير المطبوعة."
    >
      <SettingsGroup title="شعار الشركة">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ImageUploadTile
            label="صورة الشعار"
            preview={logoPreview}
            uploading={logoUploading}
            onUpload={handleLogoUpload}
          />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">مكان الشعار</Label>
            <SegmentedControl
              value={logoPosition}
              onChange={(v) => setLogoPosition(v as LogoPosition)}
              options={[
                { value: "right", label: "يمين" },
                { value: "left", label: "يسار" },
                { value: "both", label: "الجانبين" },
              ]}
            />

            <div className="flex items-end gap-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="logo_width" className="text-xs font-medium text-muted-foreground">
                  العرض (مم)
                </Label>
                <Input
                  id="logo_width"
                  type="number"
                  min={10}
                  max={500}
                  value={logoWidth}
                  onChange={(e) => setLogoWidth(Number(e.target.value))}
                  className="w-20"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logo_height" className="text-xs font-medium text-muted-foreground">
                  الارتفاع (مم)
                </Label>
                <Input
                  id="logo_height"
                  type="number"
                  min={10}
                  max={500}
                  value={logoHeight}
                  onChange={(e) => setLogoHeight(Number(e.target.value))}
                  className="w-20"
                  dir="ltr"
                />
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSaveLogoSettings}
              disabled={saving}
              className="mt-2 min-w-[100px]"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              حفظ
            </Button>
          </div>
        </div>
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="ختم وتوقيع الشركة">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ImageUploadTile
            label="ختم الشركة"
            preview={stampPreview}
            uploading={stampUploading}
            onUpload={handleStampUpload}
          />
          <ImageUploadTile
            label="توقيع الشركة"
            preview={signaturePreview}
            uploading={signatureUploading}
            onUpload={handleSignatureUpload}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          تظهر صورتا الختم والتوقيع في الفواتير والتقارير التي تدعم هذه العناصر.
        </p>

        <div className="mt-2 space-y-1">
          <SwitchField
            label="إظهار الختم في فاتورة البيع (A4)"
            checked={invoiceReportSetting?.show_stamp ?? true}
            onCheckedChange={handleToggleStamp}
            className={savingStampToggle ? "pointer-events-none opacity-60" : undefined}
          />
          <SwitchField
            label="إظهار التوقيع في فاتورة البيع (A4)"
            checked={invoiceReportSetting?.show_signature ?? true}
            onCheckedChange={handleToggleSignature}
            className={savingSignatureToggle ? "pointer-events-none opacity-60" : undefined}
          />
        </div>
      </SettingsGroup>
    </SettingsSection>
  );
};
