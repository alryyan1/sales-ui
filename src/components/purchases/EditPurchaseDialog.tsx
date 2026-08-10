import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CalendarIcon, Loader2, Check, ChevronsUpDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import purchaseService, { Purchase } from "../../services/purchaseService";
import { Supplier } from "../../services/supplierService";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface EditPurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  suppliers: Supplier[];
  onUpdate: () => void;
}

function createFormSchema(tEdit: (key: string) => string) {
  return z.object({
    supplier_id: z.number({
      required_error: tEdit("supplierRequired"),
    }),
    purchase_date: z.date({
      required_error: tEdit("purchaseDateRequired"),
    }),
    status: z.enum(["pending", "ordered", "received"], {
      required_error: tEdit("statusRequired"),
    }),
    reference_number: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    currency: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export const EditPurchaseDialog: React.FC<EditPurchaseDialogProps> = ({
  open,
  onClose,
  purchase,
  suppliers,
  onUpdate,
}) => {
  const { direction } = useLanguage();
  const { t } = useTranslation("purchases");
  const { t: tEdit } = useTranslation("editPurchaseDialog");
  const { t: tCommon } = useTranslation("common");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierSearchInput, setSupplierSearchInput] = useState("");
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);

  const formSchema = useMemo(() => createFormSchema(tEdit), [tEdit]);

  const statusOptions = useMemo(
    () => [
      { value: "pending", label: t("status_pending") },
      { value: "ordered", label: t("status_ordered") },
      { value: "received", label: t("status_received") },
    ],
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: undefined,
      purchase_date: new Date(),
      status: "pending",
      reference_number: "",
      notes: "",
      currency: "SDG",
    },
  });

  useEffect(() => {
    if (purchase && open) {
      form.reset({
        supplier_id: purchase.supplier_id || undefined,
        purchase_date: purchase.purchase_date
          ? new Date(purchase.purchase_date)
          : new Date(),
        status: purchase.status,
        reference_number: purchase.reference_number || "",
        notes: purchase.notes || "",
        currency: purchase.currency || "SDG",
      });
      setSupplierSearchInput("");
    }
  }, [purchase, open, form]);

  const selectedSupplierId = form.watch("supplier_id");
  const selectedSupplier =
    suppliers.find((s) => s.id === selectedSupplierId) || null;

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearchInput.toLowerCase()),
  );

  const onSubmit = async (values: FormValues) => {
    if (!purchase) return;
    setIsSubmitting(true);
    try {
      await purchaseService.updatePurchase(purchase.id, {
        supplier_id: values.supplier_id,
        purchase_date: format(values.purchase_date, "yyyy-MM-dd"),
        status: values.status,
        reference_number: values.reference_number || null,
        notes: values.notes || null,
        currency: values.currency,
        items: [], // passing empty items as backend doesn't require updating items during header update
      });
      toast.success(tEdit("updateSuccess"));
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to update purchase", error);
      toast.error(tEdit("updateFailed"), {
        description: purchaseService.getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl" dir={direction}>
        <DialogHeader>
          <DialogTitle>{tEdit("title")}</DialogTitle>
          <DialogDescription>{tEdit("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier Combobox */}
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      {t("selectSupplier")}{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover
                      open={supplierPopoverOpen}
                      onOpenChange={(open) => {
                        setSupplierPopoverOpen(open);
                        if (!open) setSupplierSearchInput(""); // Reset search on close
                      }}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={isSubmitting}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {selectedSupplier
                              ? selectedSupplier.name
                              : tEdit("chooseSupplierPlaceholder")}
                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder={tEdit("searchSupplierPlaceholder")}
                            value={supplierSearchInput}
                            onValueChange={setSupplierSearchInput}
                          />
                          <CommandList>
                            {filteredSuppliers.length === 0 &&
                              supplierSearchInput && (
                                <CommandEmpty>
                                  {tEdit("noResults")}
                                </CommandEmpty>
                              )}
                            <CommandGroup>
                              {filteredSuppliers.map((supplier) => (
                                <CommandItem
                                  key={supplier.id}
                                  value={supplier.name}
                                  onSelect={() => {
                                    field.onChange(supplier.id);
                                    setSupplierPopoverOpen(false);
                                    setSupplierSearchInput("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "me-2 h-4 w-4",
                                      supplier.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {supplier.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Purchase Date Picker */}
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end gap-2 pb-[1px]">
                    <FormLabel>
                      {t("purchaseDate")}{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            disabled={isSubmitting}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="me-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{tEdit("selectDatePlaceholder")}</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reference Number */}
              <FormField
                control={form.control}
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tEdit("referenceNumberLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={tEdit("referenceNumberPlaceholder")}
                        {...field}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status Autocomplete */}
              <FormField
                control={form.control}
                name="status"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      {t("status")} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Autocomplete
                        options={statusOptions}
                        getOptionLabel={(option) => option.label}
                        value={
                          statusOptions.find((o) => o.value === field.value) ||
                          null
                        }
                        onChange={(_, newValue) => {
                          field.onChange(newValue?.value || "");
                        }}
                        disabled={isSubmitting}
                        size="small"
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={t("selectStatus")}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message || ""}
                          />
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tEdit("currencyLabel")}</FormLabel>
                    <Select
                      value={field.value ?? "SDG"}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={tEdit("selectCurrencyPlaceholder")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SDG">
                          {tEdit("currencySDG")}
                        </SelectItem>
                        <SelectItem value="USD">
                          {tEdit("currencyUSD")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{tEdit("notesLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={tEdit("notesPlaceholder")}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tCommon("saving")}
                  </>
                ) : (
                  tEdit("saveChanges")
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
