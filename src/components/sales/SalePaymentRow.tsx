// src/components/sales/SalePaymentRow.tsx
import React from 'react';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { preciseCalculation } from "@/constants";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // For payment notes
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';

// Your predefined payment methods (could also come from settings/API)
export const paymentMethodOptions = [
    { value: 'cash', labelKey: 'paymentMethods:cash' },
    { value: 'visa', labelKey: 'paymentMethods:visa' },
    { value: 'mastercard', labelKey: 'paymentMethods:mastercard' },
    { value: 'bank_transfer', labelKey: 'paymentMethods:bank_transfer' },
    { value: 'mada', labelKey: 'paymentMethods:mada' },
    { value: 'store_credit', labelKey: 'paymentMethods:store_credit' },
    { value: 'other', labelKey: 'paymentMethods:other' },
];


interface SalePaymentRowProps {
    index: number;
    remove: (index: number) => void;
    isSubmitting: boolean;
    grandTotal: number; // To help with auto-fill or validation
    totalPaidSoFar: number; // Sum of other payment lines
}

export const SalePaymentRow: React.FC<SalePaymentRowProps> = ({
    index, remove, isSubmitting, grandTotal, totalPaidSoFar
}) => {
    const { t } = useTranslation(['sales', 'common', 'validation', 'paymentMethods']); // Add paymentMethods namespace
    const { control, watch, setValue, formState: { errors } } = useFormContext<any>();

    const currentAmount = watch(`payments.${index}.amount`);
    const amountDueExcludingThisPayment = preciseCalculation(grandTotal, preciseCalculation(totalPaidSoFar, Number(currentAmount) || 0, 'subtract', 2), 'subtract', 2);


    return (
        <Card className="p-3 dark:bg-gray-800 border dark:border-gray-700 relative shadow-sm">
             <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isSubmitting} aria-label={t('common:remove')} className="absolute top-2 end-2 h-7 w-7 text-muted-foreground hover:text-red-500 z-10">
                <Trash2 className="h-4 w-4" />
            </Button>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-3 items-start pt-6 md:pt-2">
                {/* Payment Method */}
                <FormField control={control} name={`payments.${index}.method`} render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-3">
                        <FormLabel>{t('sales:paymentMethod')}*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t('sales:selectPaymentMethodPlaceholder')} /></SelectTrigger></FormControl>
                            <SelectContent>
                                {paymentMethodOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage>{fieldState.error?.message ? t(fieldState.error.message) : null}</FormMessage>
                    </FormItem>
                )} />
                {/* Payment Amount */}
                <FormField control={control} name={`payments.${index}.amount`} render={({ field, fieldState }) => (
                     <FormItem className="md:col-span-2">
                         <FormLabel>{t('sales:paymentAmount')}*</FormLabel> {/* Add key */}
                         <FormControl><Input type="number" min="0.01" step="0.01" placeholder="0.00" {...field} disabled={isSubmitting}
                            // Try to set max based on remaining due
                            max={amountDueExcludingThisPayment > 0 ? amountDueExcludingThisPayment.toFixed(2) : undefined}
                         /></FormControl>
                         <FormMessage>{fieldState.error?.message ? t(fieldState.error.message) : null}</FormMessage>
                     </FormItem>
                 )} />
                {/* Payment Date */}
                <FormField control={control} name={`payments.${index}.payment_date`} render={({ field, fieldState }) => (
                     <FormItem className="flex flex-col md:col-span-3">
                         <FormLabel>{t('sales:paymentDate')}*</FormLabel> {/* Add key */}
                         <Popover> <PopoverTrigger asChild><FormControl><Button variant={"outline"} disabled={isSubmitting} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="me-2 h-4 w-4" /> {field.value ? format(field.value, "PPP") : <span>{t('common:pickDate')}</span>} </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => date > new Date() || isSubmitting} initialFocus /></PopoverContent> </Popover>
                         <FormMessage>{fieldState.error?.message ? t(fieldState.error.message) : null}</FormMessage>
                     </FormItem>
                 )} />
                 {/* Reference Number */}
                 <FormField control={control} name={`payments.${index}.reference_number`} render={({ field, fieldState }) => (
                     <FormItem className="md:col-span-4"> {/* Adjusted span */}
                         <FormLabel>{t('sales:paymentReference')}</FormLabel> {/* Add key */}
                         <FormControl><Input placeholder={t('sales:paymentReferencePlaceholder')} {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                         <FormMessage />
                     </FormItem>
                 )} />
                 {/* Payment Notes (Optional - could be md:col-span-12 if needed) */}
                 {/* <FormField control={control} name={`payments.${index}.notes`} render={... Textarea ...} /> */}
            </div>
        </Card>
    );
};