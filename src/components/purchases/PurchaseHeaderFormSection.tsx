// src/components/purchases/PurchaseHeaderFormSection.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from 'lucide-react';

// MUI Components
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

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

// Status options for the autocomplete
const statusOptions = [
    { value: "pending", label: "purchases:status_pending" },
    { value: "ordered", label: "purchases:status_ordered" },
    { value: "received", label: "purchases:status_received" },
];

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
    const { control } = useFormContext(); // Get RHF control and errors

    return (
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4"> {/* Responsive grid */}
            {/* Supplier Autocomplete */}
            <FormField
                control={control}
                name="supplier_id" // Name in your RHF schema (e.g., AddPurchaseFormValues)
                render={({ field, fieldState }) => ( // fieldState provides error
                    <FormItem className="flex flex-col md:col-span-2"> {/* Spans 2 columns on medium+ */}
                        <FormLabel>{t('purchases:selectSupplier')} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                            <Autocomplete
                                options={suppliers}
                                getOptionLabel={(option) => option.name}
                                value={selectedSupplier}
                                onChange={(event, newValue) => {
                                    field.onChange(newValue?.id || "");
                                    onSupplierSelect(newValue);
                                }}
                                onInputChange={(event, newInputValue) => {
                                    onSupplierSearchInputChange(newInputValue);
                                }}
                                inputValue={supplierSearchInput}
                                loading={loadingSuppliers}
                                disabled={isSubmitting}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder={t('purchases:selectSupplierPlaceholder')}
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message ? t(fieldState.error.message) : ""}
                                    />
                                )}
                            />
                        </FormControl>
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

            {/* Status Autocomplete */}
            <FormField
                control={control}
                name="status" // Name in your RHF schema
                render={({ field, fieldState }) => (
                    <FormItem>
                        <FormLabel>{t('purchases:statusLabel')} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                            <Autocomplete
                                options={statusOptions}
                                getOptionLabel={(option) => t(option.label)}
                                value={statusOptions.find(option => option.value === field.value) || null}
                                onChange={(event, newValue) => {
                                    field.onChange(newValue?.value || "");
                                }}
                                disabled={isSubmitting}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder={t("purchases:selectStatusPlaceholder")}
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message ? t(fieldState.error.message) : ""}
                                    />
                                )}
                            />
                        </FormControl>
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