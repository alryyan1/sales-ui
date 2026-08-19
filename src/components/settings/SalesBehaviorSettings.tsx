import { useEffect, useState } from "react";
import { Controller, Control } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("adminSettings");
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
                  : t("sales.defaultCustomerNone")}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <Command shouldFilter={false}>
              <CommandInput
                value={search}
                onValueChange={setSearch}
                placeholder={t("sales.defaultCustomerSearchPlaceholder")}
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
                    {t("sales.defaultCustomerNone")}
                  </CommandItem>
                </CommandGroup>
                {debouncedSearch && (
                  <CommandGroup heading={t("sales.defaultCustomerSearchResults")}>
                    {resultsQuery.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        {t("sales.defaultCustomerSearching")}
                      </div>
                    ) : results.length === 0 ? (
                      <CommandEmpty>{t("sales.defaultCustomerNoResults")}</CommandEmpty>
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
            aria-label={t("sales.defaultCustomerRemove")}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("sales.defaultCustomerHelp")}
      </p>
    </div>
  );
}

export const SalesBehaviorSettings = ({ control }: SalesBehaviorSettingsProps) => {
  const { t } = useTranslation("adminSettings");
  return (
    <SettingsSection
      title={t("sales.title")}
      description={t("sales.description")}
    >
      <SettingsGroup title={t("sales.stockGroupTitle")}>
        <Controller
          name="sales_allow_zero_stock"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("sales.allowZeroStockLabel")}
              description={t("sales.allowZeroStockDescription")}
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
              label={t("sales.allowNegativeStockLabel")}
              description={t("sales.allowNegativeStockDescription")}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("sales.customerGroupTitle")}>
        <Controller
          name="sales_require_customer"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("sales.requireCustomerLabel")}
              description={t("sales.requireCustomerDescription")}
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

      <SettingsGroup title={t("sales.permissionsGroupTitle")}>
        <Controller
          name="sales_allow_price_edit"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("sales.allowPriceEditLabel")}
              description={t("sales.allowPriceEditDescription")}
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
              label={t("sales.allowInvoiceDateEditLabel")}
              description={t("sales.allowInvoiceDateEditDescription")}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("sales.a4InvoiceGroupTitle")}>
        <Controller
          name="sales_a4_show_unit_column"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("sales.a4ShowUnitColumnLabel")}
              description={t("sales.a4ShowUnitColumnDescription")}
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>

      <Separator />

      <SettingsGroup title={t("sales.itemsTableGroupTitle")}>
        <Controller
          name="pos_show_expiry_date_column"
          control={control}
          render={({ field }) => (
            <SwitchField
              label={t("sales.showExpiryDateColumnLabel")}
              description={t("sales.showExpiryDateColumnDescription")}
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SettingsGroup>
    </SettingsSection>
  );
};
