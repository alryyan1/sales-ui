// src/components/reports/inventory/InventoryReportFilters.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Filter, X, Search } from 'lucide-react';

// --- Zod Schema for Filter Form ---
const inventoryFilterSchema = z.object({
    search: z.string().optional(),
    lowStockOnly: z.boolean().optional().default(false),
    outOfStockOnly: z.boolean().optional().default(false),
    // categoryId: z.string().nullable().optional(),
});
export type InventoryFilterValues = z.infer<typeof inventoryFilterSchema>;

interface InventoryReportFiltersProps {
    defaultValues: InventoryFilterValues;
    onFilterSubmit: (data: InventoryFilterValues) => void;
    onClearFilters: () => void;
    isLoading: boolean;
    // categories?: Category[]; // If implementing category filter
    // loadingCategories?: boolean;
}

export const InventoryReportFilters: React.FC<InventoryReportFiltersProps> = ({
    defaultValues, onFilterSubmit, onClearFilters, isLoading, /* categories, loadingCategories */
}) => {
    const { t } = useTranslation(['reports', 'products', 'common']);
    const form = useForm<InventoryFilterValues>({
        resolver: zodResolver(inventoryFilterSchema),
        defaultValues,
    });
    const { control, handleSubmit, reset } = form;

    useEffect(() => { // Sync form if defaultValues (from URL params) change
        reset(defaultValues);
    }, [defaultValues, reset]);

    return (
        <div className="mb-4">
            <div className="pb-2">
                <h3 className="text-lg font-medium">{t('common:filters')}</h3>
            </div>
            <Form {...form}>
                <form onSubmit={handleSubmit(onFilterSubmit)}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                        <FormField control={control} name="search" render={({ field }) => (
                            <FormItem> <FormLabel>{t('common:search')}</FormLabel> <FormControl><Input placeholder={t('products:searchPlaceholder')} {...field} value={field.value ?? ''} /></FormControl> </FormItem>
                        )} />
                        {/* Category Select Placeholder */}
                        {/* <FormField control={control} name="categoryId" render={...} /> */}
                        <div className="flex flex-col space-y-2 pt-2 sm:pt-0 md:pt-6">
                            <FormField control={control} name="lowStockOnly" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> <FormLabel className="font-normal">{t('reports:showLowStockOnly')}</FormLabel> </FormItem> )} />
                            <FormField control={control} name="outOfStockOnly" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> <FormLabel className="font-normal">{t('reports:showOutOfStockOnly')}</FormLabel> </FormItem> )} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                        <Button type="button" variant="ghost" onClick={onClearFilters} disabled={isLoading}> <X className="me-2 h-4 w-4" />{t('common:clearFilters')} </Button>
                        <Button type="submit" disabled={isLoading}> {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Filter className="me-2 h-4 w-4" />} {t('common:applyFilters')} </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};