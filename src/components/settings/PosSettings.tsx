import { useMemo, useState } from "react";
import { Controller, Control } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SettingsSection } from "./shared/SettingsSection";
import { SettingsGroup } from "./shared/SettingsGroup";
import { SwitchField } from "./shared/SwitchField";
import { AppSettings } from "@/services/settingService";
import { PAYMENT_METHODS, PaymentMethod, parseActivePaymentMethods } from "@/lib/paymentMethods";

const PAYMENT_METHOD_LABELS_AR: Record<PaymentMethod, string> = {
  cash: "نقدي",
  bankak: "بنكك",
  fawry: "فوري",
  ocash: "أوكاش",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة",
};

interface PosSettingsProps {
  control: Control<Partial<AppSettings>>;
}

function parseNumbers(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

function WhatsappNumbersField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const numbers = useMemo(() => parseNumbers(value), [value]);
  const [draft, setDraft] = useState("");

  const addNumber = () => {
    const trimmed = draft.trim();
    if (!trimmed || numbers.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...numbers, trimmed].join(","));
    setDraft("");
  };

  const removeNumber = (number: string) => {
    onChange(numbers.filter((n) => n !== number).join(","));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="whatsapp_shift_closure_numbers">أرقام استلام تقرير إغلاق الوردية</Label>

      {numbers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {numbers.map((number) => (
            <span
              key={number}
              dir="ltr"
              className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium"
            >
              {number}
              <button
                type="button"
                onClick={() => removeNumber(number)}
                className="text-muted-foreground transition-colors hover:text-destructive"
                aria-label={`إزالة ${number}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          id="whatsapp_shift_closure_numbers"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addNumber();
            }
          }}
          placeholder="مثال: 249991961111"
          dir="ltr"
          className="text-left"
        />
        <Button type="button" variant="outline" onClick={addNumber} disabled={!draft.trim()} className="gap-1.5 shrink-0">
          <Plus className="size-4" />
          إضافة
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        اكتب رقم الهاتف ثم اضغط "إضافة" أو Enter لإضافته إلى القائمة. يجب أن يتضمن الرمز الدولي بدون +
      </p>
    </div>
  );
}

function ActivePaymentMethodsField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const activeMethods = parseActivePaymentMethods(value);

  const toggleMethod = (method: PaymentMethod, checked: boolean) => {
    const next = checked
      ? [...activeMethods, method]
      : activeMethods.filter((m) => m !== method);
    if (next.length === 0) return; // at least one method must stay active
    onChange(PAYMENT_METHODS.filter((m) => next.includes(m)).join(","));
  };

  return (
    <div className="space-y-1">
      {PAYMENT_METHODS.map((method) => (
        <SwitchField
          key={method}
          label={PAYMENT_METHOD_LABELS_AR[method]}
          checked={activeMethods.includes(method)}
          onCheckedChange={(checked) => toggleMethod(method, checked)}
        />
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        يجب أن تبقى طريقة دفع واحدة على الأقل مفعّلة.
      </p>
    </div>
  );
}

export const PosSettings = ({ control }: PosSettingsProps) => {
  return (
    <SettingsSection
      title="إعدادات نقاط البيع (POS)"
      description="تحكم في سلوك شاشة نقطة البيع وإشعاراتها."
    >
      <SettingsGroup title="ظهور المنتجات (Product Visibility)">
        <Controller
          name="pos_show_expired_products"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="عرض المنتجات المنتهية الصلاحية"
              description="عند التفعيل، ستظهر المنتجات منتهية الصلاحية في نتائج بحث نقطة البيع."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          name="pos_show_out_of_stock_products"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="عرض المنتجات التي نفد مخزونها"
              description="عند التفعيل، ستظهر المنتجات التي رصيدها صفراً أو أقل في نتائج بحث نقطة البيع."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="طرق الدفع في نقطة البيع (Payment Methods)">
        <Controller
          name="pos_active_payment_methods"
          control={control}
          render={({ field }) => (
            <ActivePaymentMethodsField value={field.value} onChange={field.onChange} />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="سعر صرف الدولار (USD Conversion)">
        <Controller
          name="usd_conversion_enabled"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="تفعيل تحويل أسعار الدولار"
              description='عند التعطيل، يُخفى زر سعر الصرف من الشريط العلوي، وتُعرض/تُباع المنتجات المسعّرة بالدولار بقيمتها كما هي بدون ضرب في سعر الصرف.'
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="إشعارات الواتساب (WhatsApp Notifications)">
        <Controller
          name="whatsapp_shift_closure_numbers"
          control={control}
          render={({ field }) => (
            <WhatsappNumbersField value={field.value} onChange={field.onChange} />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="إعدادات Firebase (Firebase Settings)">
        <Controller
          name="firebase_collection_name"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="firebase_collection_name">
                اسم مجموعة Firebase (Collection Name)
              </Label>
              <Input
                id="firebase_collection_name"
                {...field}
                value={field.value || "none"}
                placeholder="مثال: none"
                dir="ltr"
                className="text-left"
              />
              <p className="text-xs text-muted-foreground">
                اسم المجموعة (Collection) في Firestore حيث يتم تخزين المنتجات والورديات.
              </p>
            </div>
          )}
        />
      </SettingsGroup>
    </SettingsSection>
  );
};
