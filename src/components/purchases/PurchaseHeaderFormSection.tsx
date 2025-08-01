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
import { Card, CardContent } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Building2, FileText, MessageSquare } from 'lucide-react';

// MUI Components
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";

// Types
import { Supplier } from '../../services/supplierService';

interface PurchaseHeaderFormSectionProps {
    suppliers: Supplier[];
    loadingSuppliers: boolean;
    supplierSearchInput: string;
    onSupplierSearchInputChange: (value: string) => void;
    isSubmitting: boolean;
    selectedSupplier: Supplier | null;
    onSupplierSelect: (supplier: Supplier | null) => void;
    isPurchaseReceived?: boolean;
}

// Status options for the autocomplete
const statusOptions = [
    { value: "pending", label: "purchases:status_pending", color: "warning" },
    { value: "ordered", label: "purchases:status_ordered", color: "info" },
    { value: "received", label: "purchases:status_received", color: "success" },
];

export const PurchaseHeaderFormSection: React.FC<PurchaseHeaderFormSectionProps> = ({
    suppliers,
    loadingSuppliers,
    supplierSearchInput,
    onSupplierSearchInputChange,
    isSubmitting,
    selectedSupplier,
    onSupplierSelect,
    isPurchaseReceived = false
}) => {
    const { t } = useTranslation(['purchases', 'common', 'suppliers', 'validation']);
    const { control } = useFormContext();

    return (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
            <CardContent className="p-1">
                {/* All fields in one row */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                    {/* Supplier Selection */}
                    <FormField
                        control={control}
                        name="supplier_id"
                        render={({ field, fieldState }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                    {t('purchases:selectSupplier')} <span className="text-red-500">*</span>
                                </FormLabel>
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
                                        size="small"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                placeholder={t('purchases:selectSupplierPlaceholder')}
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message ? t(fieldState.error.message) : ""}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {loadingSuppliers ? (
                                                                <CircularProgress color="inherit" size={16} />
                                                            ) : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    ),
                                                }}
                                            />
                                        )}
                                        renderOption={(props, option) => (
                                            <li {...props}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{option.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {option.email || t('common:n/a')}
                                                    </span>
                                                </div>
                                            </li>
                                        )}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Purchase Date */}
                    <FormField
                        control={control}
                        name="purchase_date"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3 text-green-600 dark:text-green-400" />
                                    {t('purchases:purchaseDate')} <span className="text-red-500">*</span>
                                </FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                disabled={isSubmitting}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal h-9 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="me-1 h-3 w-3 text-green-600 dark:text-green-400" />
                                                {field.value ? format(field.value, "MM/dd/yy") : <span>{t('common:pickDate')}</span>}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value ?? undefined}
                                            onSelect={field.onChange}
                                            disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSubmitting}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Status */}
                    <FormField
                        control={control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {t('purchases:statusLabel')} <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Autocomplete
                                        options={statusOptions}
                                        getOptionLabel={(option) => t(option.label)}
                                        value={statusOptions.find(option => option.value === field.value) || null}
                                        onChange={(event, newValue) => {
                                            field.onChange(newValue?.value || "");
                                        }}
                                        disabled={isSubmitting || isPurchaseReceived}
                                        size="small"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                placeholder={t("purchases:selectStatusPlaceholder")}
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message ? t(fieldState.error.message) : ""}
                                            />
                                        )}
                                        renderOption={(props, option) => (
                                            <li {...props}>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${option.color}-100 text-${option.color}-800 dark:bg-${option.color}-900 dark:text-${option.color}-200`}>
                                                    {t(option.label)}
                                                </span>
                                            </li>
                                        )}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Reference Number */}
                    <FormField
                        control={control}
                        name="reference_number"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <FileText className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                    {t('purchases:referenceLabel')}
                                </FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder={t('purchases:referencePlaceholder')} 
                                        {...field} 
                                        value={field.value ?? ''} 
                                        disabled={isSubmitting}
                                        className="h-9 text-xs border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400"
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
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                    {t('purchases:notesLabel')}
                                </FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder={t('purchases:notesPlaceholder')} 
                                        className="resize-none h-9 text-xs border-gray-200 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-400" 
                                        {...field} 
                                        value={field.value ?? ''} 
                                        disabled={isSubmitting} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );
};