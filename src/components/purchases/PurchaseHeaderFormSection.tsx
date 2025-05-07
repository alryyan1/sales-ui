// src/components/purchases/PurchaseHeaderFormSection.tsx
import React, { useState } from 'react'; // Removed useEffect if not directly needed here
import { useFormContext, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react';

// Types
import { Supplier } from '../../services/supplierService'; // Assuming this path is correct

interface PurchaseHeaderFormSectionProps {
    suppliers: Supplier[];
    loadingSuppliers: boolean;
    supplierSearchInput: string;
    onSupplierSearchInputChange: (value: string) => void; // Callback to update search term in parent
    isSubmitting: boolean;
    selectedSupplier: Supplier | null; // Selected supplier object for display
    onSupplierSelect: (supplier: Supplier | null) => void; // Callback to update selected supplier in parent
}

export const PurchaseHeaderFormSection: React.FC<PurchaseHeaderFormSectionProps> = ({
    suppliers,
    loadingSuppliers,
    supplierSearchInput,
    onSupplierSearchInputChange,
    isSubmitting,
    selectedSupplier,
    onSupplierSelect
}) => {
    const { t } = useTranslation(['purchases', 'common', 'suppliers', 'validation']);
    const { control, formState: { errors } } = useFormContext(); // Get RHF control and errors

    // Local state for managing the visibility of the supplier combobox popover
    const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);

    return (
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4"> {/* Responsive grid */}
            {/* Supplier Combobox */}
            <FormField
                control={control}
                name="supplier_id" // Name in your RHF schema (e.g., AddPurchaseFormValues)
                render={({ field, fieldState }) => ( // fieldState provides error
                    <FormItem className="flex flex-col md:col-span-2"> {/* Spans 2 columns on medium+ */}
                        <FormLabel>{t('purchases:selectSupplier')} <span className="text-red-500">*</span></FormLabel>
                        <Popover open={supplierPopoverOpen} onOpenChange={(open) => {
                            setSupplierPopoverOpen(open);
                            // Reset search input when popover closes
                            if (!open) onSupplierSearchInputChange('');
                        }}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={supplierPopoverOpen}
                                        disabled={loadingSuppliers || isSubmitting}
                                        className={cn(
                                            "w-full justify-between",
                                            !field.value && "text-muted-foreground" // Style if no value selected
                                        )}
                                    >
                                        {loadingSuppliers
                                            ? <div className="flex items-center"><Loader2 className="me-2 h-4 w-4 animate-spin" /> {t('common:loading')}...</div>
                                            : selectedSupplier // Use parent-managed selectedSupplier for display
                                                ? selectedSupplier.name
                                                : (field.value ? t('purchases:loadingSupplier') : t('purchases:selectSupplierPlaceholder')) // Fallback or placeholder
                                        }
                                        <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command shouldFilter={false}> {/* Server-side search */}
                                    <CommandInput
                                        placeholder={t('suppliers:searchPlaceholder') || 'Search supplier...'}
                                        value={supplierSearchInput} // Controlled by parent state
                                        onValueChange={onSupplierSearchInputChange} // Call parent handler
                                        disabled={loadingSuppliers}
                                    />
                                    <CommandList>
                                        {loadingSuppliers && <div className='p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2'><Loader2 className='h-4 w-4 animate-spin'/> {t('common:loading')}...</div>}
                                        {!loadingSuppliers && suppliers.length === 0 && supplierSearchInput && <CommandEmpty>{t('common:noResults')}</CommandEmpty>}
                                        {!loadingSuppliers && suppliers.length === 0 && !supplierSearchInput && <CommandEmpty>{t('suppliers:typeToSearch')}</CommandEmpty>}
                                        {!loadingSuppliers && (
                                            <CommandGroup>
                                                {suppliers.map((supplier) => (
                                                    <CommandItem
                                                        key={supplier.id}
                                                        value={supplier.name} // Value for accessibility/Command filtering (if enabled)
                                                        onSelect={() => {
                                                            field.onChange(supplier.id); // Update RHF with ID
                                                            onSupplierSelect(supplier); // Update parent's selectedSupplier object
                                                            setSupplierPopoverOpen(false); // Close popover
                                                            onSupplierSearchInputChange(''); // Clear search input
                                                        }}
                                                    >
                                                        <Check className={cn("me-2 h-4 w-4", supplier.id === field.value ? "opacity-100" : "opacity-0")} />
                                                        {supplier.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage>{fieldState.error?.message ? t(fieldState.error.message) : null}</FormMessage>
                    </FormItem>
                )}
            />

            {/* Purchase Date Picker */}
            <FormField
                control={control}
                name="purchase_date" // Name in your RHF schema
                render={({ field, fieldState }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>{t('purchases:purchaseDate')} <span className="text-red-500">*</span></FormLabel>
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
                                        {field.value ? format(field.value, "PPP") : <span>{t('common:pickDate')}</span>}
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={field.value ?? undefined} // Calendar expects Date | undefined
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSubmitting}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage>{fieldState.error?.message ? t(fieldState.error.message) : null}</FormMessage>
                    </FormItem>
                )}
            />

            {/* Status Select */}
            <FormField
                control={control}
                name="status" // Name in your RHF schema
                render={({ field, fieldState }) => (
                    <FormItem>
                        <FormLabel>{t('purchases:statusLabel')} <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('purchases:selectStatusPlaceholder') || "Select status"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="pending">{t('purchases:status_pending')}</SelectItem>
                                <SelectItem value="ordered">{t('purchases:status_ordered')}</SelectItem>
                                <SelectItem value="received">{t('purchases:status_received')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage>{fieldState.error?.message ? t(fieldState.error.message) : null}</FormMessage>
                    </FormItem>
                )}
            />

            {/* Reference Number */}
            <FormField
                control={control}
                name="reference_number" // Name in your RHF schema
                render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2"> {/* Spans 2 columns on medium+ */}
                        <FormLabel>{t('purchases:referenceLabel')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('purchases:referencePlaceholder')} {...field} value={field.value ?? ''} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message ? t(fieldState.error.message) : null}</FormMessage>
                    </FormItem>
                )}
            />

            {/* Notes */}
            <FormField
                control={control}
                name="notes" // Name in your RHF schema
                render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-4"> {/* Spans full width on medium+ */}
                        <FormLabel>{t('purchases:notesLabel')}</FormLabel>
                        <FormControl>
                            <Textarea placeholder={t('purchases:notesPlaceholder')} className="resize-y min-h-[60px]" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message ? t(fieldState.error.message) : null}</FormMessage>
                    </FormItem>
                )}
            />
        </div>
    );
};