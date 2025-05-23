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
import { Client } from "../../services/clientService"; // Use Client type

interface SaleHeaderFormSectionProps {
  clients: Client[];
  loadingClients: boolean;
  clientSearchInput: string;
  onClientSearchInputChange: (value: string) => void;
  isSubmitting: boolean;
  selectedClient: Client | null; // For display in combobox trigger
  onClientSelect: (client: Client | null) => void; // To update parent's selectedClient
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
  const {
    control,
    formState: { errors },
  } = useFormContext(); // Get RHF control and errors
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4 mb-6">
      
      {/* mb-6 instead of mb-8 */}
      {/* Client Combobox */}
      <FormField
        control={control}
        name="client_id"
        render={({ field, fieldState }) => (
          <FormItem className="flex flex-col md:col-span-2">
            <FormLabel>
              {t("sales:selectClient")} <span className="text-red-500">*</span>
            </FormLabel>
            <Popover
              open={clientPopoverOpen}
              onOpenChange={(open) => {
                setClientPopoverOpen(open);
                if (!open) onClientSearchInputChange("");
              }}
            >
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={loadingClients || isSubmitting}
                    className={cn(
                      "w-full justify-between text-start",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {loadingClients ? (
                      <div className="flex items-center">
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        {t("common:loading")}...
                      </div>
                    ) : selectedClient ? (
                      selectedClient.name
                    ) : field.value ? (
                      t("sales:loadingClient")
                    ) : (
                      t("sales:selectClientPlaceholder")
                    )}
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
                    // disabled={loadingClients}
                  />
                  <CommandList>
                    {loadingClients && (
                      <div className="p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
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
                            
                            <Check
                              className={cn(
                                "me-2 h-4 w-4",
                                client.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage>
              {fieldState.error?.message ? t(fieldState.error.message) : null}
            </FormMessage>
          </FormItem>
        )}
      />
      {/* Sale Date Picker */}
      <FormField
        control={control}
        name="sale_date"
        render={({ field, fieldState }) => (
          <FormItem className="flex flex-col">
            
            <FormLabel>
              {t("sales:saleDate")} <span className="text-red-500">*</span>
            </FormLabel>
            <Popover>
              
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
                    
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>{t("common:pickDate")}</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value ?? undefined}
                  onSelect={field.onChange}
                  disabled={(date) =>
                    date > new Date() ||
                    date < new Date("1900-01-01") ||
                    isSubmitting
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage>
              {fieldState.error?.message ? t(fieldState.error.message) : null}
            </FormMessage>
          </FormItem>
        )}
      />
      {/* Status Select */}
      <FormField
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <FormItem>
            
            <FormLabel>
              {t("sales:statusLabel")} <span className="text-red-500">*</span>
            </FormLabel>
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
            </Select>
            <FormMessage>
              {fieldState.error?.message ? t(fieldState.error.message) : null}
            </FormMessage>
          </FormItem>
        )}
      />
      {/* Invoice Number */}
      {/* <FormField
        control={control}
        name="invoice_number"
        render={({ field, fieldState }) => (
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
            <FormMessage>
              {fieldState.error?.message ? t(fieldState.error.message) : null}
            </FormMessage>
          </FormItem>
        )}
      /> */}
      {/* Notes */}
      {/* <FormField
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
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
            <FormMessage>
              {fieldState.error?.message ? t(fieldState.error.message) : null}
            </FormMessage>
          </FormItem>
        )}
      /> */}
    </div>
  );
};
