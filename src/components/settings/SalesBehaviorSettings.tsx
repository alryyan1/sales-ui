import { useEffect, useState } from "react";
import { Controller, Control } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User, UserCheck, UserX, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { SettingsSection } from "./shared/SettingsSection";
import { SettingsGroup } from "./shared/SettingsGroup";
import { SwitchField } from "./shared/SwitchField";
import clientService from "@/services/clientService";
import { AppSettings } from "@/services/settingService";

interface SalesBehaviorSettingsProps {
  control: Control<Partial<AppSettings>>;
}

function DefaultCustomerField({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const selectedQuery = useQuery({
    queryKey: ["client", value],
    queryFn: () => clientService.getClient(value as number),
    enabled: !!value,
  });

  const resultsQuery = useQuery({
    queryKey: ["settings-clients-search", debouncedSearch],
    queryFn: () => clientService.autocompleteClients(debouncedSearch, 20),
    enabled: debouncedSearch.length > 0,
  });

  const results = debouncedSearch ? resultsQuery.data ?? [] : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-56 justify-start gap-2 px-3"
            >
              {value ? (
                <UserCheck className="size-4 shrink-0 text-primary" />
              ) : (
                <User className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate text-sm">
                {value
                  ? selectedQuery.data?.name ?? "..."
                  : "بدون عميل افتراضي"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <Command shouldFilter={false}>
              <CommandInput
                value={search}
                onValueChange={setSearch}
                placeholder="ابحث بالاسم أو الهاتف..."
              />
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    <UserX className="size-4 text-muted-foreground" />
                    بدون عميل افتراضي
                  </CommandItem>
                </CommandGroup>
                {debouncedSearch && (
                  <CommandGroup heading="نتائج البحث">
                    {resultsQuery.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        جاري البحث...
                      </div>
                    ) : results.length === 0 ? (
                      <CommandEmpty>لا يوجد عملاء مطابقون</CommandEmpty>
                    ) : (
                      results.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={String(c.id)}
                          onSelect={() => {
                            onChange(c.id);
                            setOpen(false);
                          }}
                        >
                          <User className="size-4 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{c.name}</p>
                            {c.phone && (
                              <p className="text-xs text-muted-foreground" dir="ltr">
                                {c.phone}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(null)}
            aria-label="إزالة العميل الافتراضي"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        العميل الذي يتم اختياره تلقائياً عند فتح عملية بيع جديدة.
      </p>
    </div>
  );
}

export const SalesBehaviorSettings = ({ control }: SalesBehaviorSettingsProps) => {
  return (
    <SettingsSection
      title="سلوك المبيعات"
      description="قواعد تتحكم في المخزون والعميل والصلاحيات أثناء إنشاء وتعديل فواتير البيع."
    >
      <SettingsGroup title="المخزون">
        <Controller
          name="sales_allow_zero_stock"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="السماح ببيع منتجات رصيدها صفر"
              description="عند التعطيل، لا يمكن إضافة منتج رصيده صفر إلى فاتورة بيع."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          name="sales_allow_negative_stock"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="السماح بالرصيد السالب"
              description="عند التفعيل، يمكن أن يتجاوز البيع الكمية المتوفرة فعلياً في المخزون."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="العميل">
        <Controller
          name="sales_require_customer"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="إلزامية اختيار عميل للبيع"
              description="عند التفعيل، لا يمكن إتمام عملية بيع دون تحديد عميل مسجل."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <div className="pt-2">
          <Controller
            name="sales_default_customer_id"
            control={control}
            render={({ field }) => (
              <DefaultCustomerField value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </SettingsGroup>

      <Separator />

      <SettingsGroup title="الصلاحيات">
        <Controller
          name="sales_allow_price_edit"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="السماح بتعديل سعر البيع"
              description="عند التعطيل، يُقفل حقل سعر البيع في الفاتورة على السعر الافتراضي للمنتج."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          name="sales_allow_invoice_date_edit"
          control={control}
          render={({ field }) => (
            <SwitchField
              label="السماح بتعديل تاريخ الفاتورة"
              description="عند التعطيل، تُسجَّل كل فاتورة بتاريخ ووقت الإنشاء الفعلي دون إمكانية تغييره."
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>
    </SettingsSection>
  );
};
