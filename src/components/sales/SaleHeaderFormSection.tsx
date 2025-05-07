// src/components/sales/SaleHeaderFormSection.tsx
import React, { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Calendar as CalendarIcon,
} from "lucide-react";

// Types
import { Client } from "../../services/clientService";

interface SaleHeaderFormSectionProps {
  clients: Client[];
  loadingClients: boolean;
  clientSearchInput: string;
  onClientSearchInputChange: (value: string) => void;
  isSubmitting: boolean;
  selectedClient: Client | null; // Pass selected client for display
  onClientSelect: (client: Client | null) => void; // Callback to update selectedClient state in parent
}

export const SaleHeaderFormSection: React.FC<SaleHeaderFormSectionProps> = ({
  clients,
  loadingClients,
  clientSearchInput,
  onClientSearchInputChange,
  isSubmitting,
  selectedClient,
  onClientSelect,
}) => {
  const { t } = useTranslation(["sales", "common", "clients", "validation"]);
  const { control } = useFormContext(); // Get RHF control

  // Local state for popover visibility
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4 mb-8">
      {/* Client Combobox */}
      <FormField
        control={control}
        name="client_id"
        render={({ field }) => (
          <FormItem className="flex flex-col md:col-span-2">
            <FormLabel>
              {t("sales:selectClient")} <span className="text-red-500">*</span>
            </FormLabel>
            <Popover
              open={clientPopoverOpen}
              onOpenChange={(open) => {
                setClientPopoverOpen(open);
                if (!open) onClientSearchInputChange(""); // Reset search on close
              }}
            >
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={loadingClients || isSubmitting}
                    className={cn(
                      "w-full justify-between",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {loadingClients
                      ? t("common:loading") + "..."
                      : selectedClient
                      ? selectedClient.name
                      : t("sales:selectClientPlaceholder")}
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t("clients:searchPlaceholder")}
                    value={clientSearchInput}
                    onValueChange={onClientSearchInputChange}
                  />
                  <CommandList>
                    {loadingClients && (
                      <div className="p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />{" "}
                        {t("common:loading")}...
                      </div>
                    )}
                    {!loadingClients &&
                      clients.length === 0 &&
                      clientSearchInput && (
                        <CommandEmpty>{t("common:noResults")}</CommandEmpty>
                      )}
                    {!loadingClients &&
                      clients.length === 0 &&
                      !clientSearchInput && (
                        <CommandEmpty>{t("clients:typeToSearch")}</CommandEmpty>
                      )}
                    {!loadingClients && (
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              field.onChange(client.id);
                              onClientSelect(client);
                              setClientPopoverOpen(false);
                              onClientSearchInputChange("");
                            }}
                          >
                            {" "}
                            <Check
                              className={cn(
                                "me-2 h-4 w-4",
                                client.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />{" "}
                            {client.name}{" "}
                          </CommandItem>
                        ))}{" "}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Sale Date Picker */}
      <FormField
        control={control}
        name="sale_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            {" "}
            <FormLabel>
              {t("sales:saleDate")} <span className="text-red-500">*</span>
            </FormLabel>{" "}
            <Popover>
              {" "}
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    disabled={isSubmitting}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {" "}
                    <CalendarIcon className="me-2 h-4 w-4" />{" "}
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>{t("common:pickDate")}</span>
                    )}{" "}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) =>
                    date > new Date() ||
                    date < new Date("1900-01-01") ||
                    isSubmitting
                  }
                  initialFocus
                />
              </PopoverContent>{" "}
            </Popover>{" "}
            <FormMessage />{" "}
          </FormItem>
        )}
      />
      {/* Status Select */}
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            {" "}
            <FormLabel>
              {t("sales:statusLabel")} <span className="text-red-500">*</span>
            </FormLabel>{" "}
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={isSubmitting}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("sales:selectStatusPlaceholder")}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="completed">
                  {t("sales:status_completed")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("sales:status_pending")}
                </SelectItem>
                <SelectItem value="draft">{t("sales:status_draft")}</SelectItem>
                <SelectItem value="cancelled">
                  {t("sales:status_cancelled")}
                </SelectItem>
              </SelectContent>
            </Select>{" "}
            <FormMessage />{" "}
          </FormItem>
        )}
      />
      {/* Invoice Number */}
      <FormField
        control={control}
        name="invoice_number"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>{t("sales:invoiceLabel")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t("sales:invoicePlaceholder")}
                {...field}
                value={field.value ?? ""}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Paid Amount */}
      <FormField
        control={control}
        name="paid_amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("sales:paidAmountLabel")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={t("sales:paidAmountPlaceholder")}
                {...field}
                value={field.value ?? ""}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Notes */}
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>{t("sales:notesLabel")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("sales:notesPlaceholder")}
                className="resize-y min-h-[60px]"
                {...field}
                value={field.value ?? ""}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
