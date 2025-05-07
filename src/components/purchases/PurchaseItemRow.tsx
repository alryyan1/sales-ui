// src/components/purchases/PurchaseItemRow.tsx
import React, { useState, useEffect } from 'react';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Check, ChevronsUpDown, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

// Types
import { Product } from '../../services/productService'; // Assuming Product type is exported
import { formatNumber } from '@/constants'; // Your formatter

interface PurchaseItemRowProps {
    index: number;
    remove: (index: number) => void;
    products: Product[];
    loadingProducts: boolean;
    productSearchInput: string;
    onProductSearchInputChange: (value: string) => void;
    isSubmitting: boolean;
    itemCount: number;
}

// Type for a single item (should match item part of AddPurchaseFormValues)
type PurchaseItemFormValues = {
    id?: number | null;
    product_id: number;
    product?: Product; // For UI display
    batch_number?: string | null;
    quantity: number;
    unit_cost: number;
    sale_price?: number | null;
    expiry_date?: Date | null;
};

export const PurchaseItemRow: React.FC<PurchaseItemRowProps> = ({
    index, remove, products, loadingProducts, productSearchInput,
    onProductSearchInputChange, isSubmitting, itemCount
}) => {
    const { t } = useTranslation(['purchases', 'common', 'products', 'validation']);
    const { control, watch, setValue, getFieldState, formState } = useFormContext<any>(); // Get methods from parent Form context

    const [productPopoverOpen, setProductPopoverOpen] = useState(false);

    const quantity = watch(`items.${index}.quantity`);
    const unitCost = watch(`items.${index}.unit_cost`);
    const itemTotal = (Number(quantity) || 0) * (Number(unitCost) || 0);

    return (
        <Card className="p-4 dark:bg-gray-800 border dark:border-gray-700 relative">
            <Button
                type="button" variant="ghost" size="icon"
                onClick={() => remove(index)}
                disabled={isSubmitting || itemCount <= 1}
                aria-label={t('purchases:remove') || 'Remove'}
                className="absolute top-2 end-2 h-7 w-7 text-muted-foreground hover:text-red-500 disabled:text-gray-300 dark:disabled:text-gray-600"
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-6"> {/* Added pt for remove button */}
                {/* Product Combobox */}
                <FormField control={control} name={`items.${index}.product_id`} render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-3 flex flex-col">
                        <FormLabel>{t('purchases:product')} <span className="text-red-500">*</span></FormLabel>
                        <Popover open={productPopoverOpen} onOpenChange={(open) => {
                            setProductPopoverOpen(open);
                            if (!open) onProductSearchInputChange(''); // Reset parent search on close
                        }}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" disabled={isSubmitting} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                        {watch(`items.${index}.product`)?.name ?? (field.value ? `ID: ${field.value}` : t('purchases:selectProductPlaceholder'))}
                                        <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command shouldFilter={false}>
                                    <CommandInput placeholder={t('products:searchPlaceholder')} value={productSearchInput} onValueChange={onProductSearchInputChange}/>
                                    <CommandList>
                                        {loadingProducts && <div className='p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2'><Loader2 className='h-4 w-4 animate-spin'/> {t('common:loading')}...</div>}
                                        {!loadingProducts && products.length === 0 && productSearchInput && <CommandEmpty>{t('common:noResults')}</CommandEmpty>}
                                        {!loadingProducts && products.length === 0 && !productSearchInput && <CommandEmpty>{t('products:typeToSearch')}</CommandEmpty>}
                                        {!loadingProducts && ( <CommandGroup>{products.map((product) => ( <CommandItem key={product.id} value={`${product.name} ${product.sku}`} onSelect={() => {
                                            field.onChange(product.id);
                                            setValue(`items.${index}.unit_cost`, Number(product.latest_purchase_cost) || 0, { shouldValidate: true }); // Use latest_purchase_cost from Product model
                                            setValue(`items.${index}.product`, product);
                                            setProductPopoverOpen(false);
                                            // onProductSearchInputChange(''); // Optionally clear search on select
                                        }}> <Check className={cn("me-2 h-4 w-4", product.id === field.value ? "opacity-100" : "opacity-0")}/> {product.name} <span className="text-xs text-muted-foreground ml-2">({product.sku || 'No SKU'})</span> </CommandItem> ))} </CommandGroup> )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Batch Number */}
                <FormField control={control} name={`items.${index}.batch_number`} render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>{t('purchases:batchNumber')}</FormLabel>
                        <FormControl><Input placeholder={t('purchases:batchNumberPlaceholder')} {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Quantity */}
                <FormField control={control} name={`items.${index}.quantity`} render={({ field, fieldState }) => (
                     <FormItem className="md:col-span-1">
                         <FormLabel>{t('purchases:quantity')}*</FormLabel>
                         <FormControl><Input type="number" min="1" step="1" placeholder="1" {...field} disabled={isSubmitting} /></FormControl>
                         <FormMessage />
                     </FormItem>
                 )} />

                {/* Unit Cost */}
                <FormField control={control} name={`items.${index}.unit_cost`} render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>{t('purchases:unitCost')}*</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Intended Sale Price */}
                <FormField control={control} name={`items.${index}.sale_price`} render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>{t('purchases:intendedSalePrice')}</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Expiry Date */}
                <FormField control={control} name={`items.${index}.expiry_date`} render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2 flex flex-col">
                        <FormLabel>{t('purchases:expiryDate')}</FormLabel>
                         <Popover> <PopoverTrigger asChild><FormControl><Button variant={"outline"} disabled={isSubmitting} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="me-2 h-4 w-4" /> {field.value ? format(field.value, "PPP") : <span>{t('common:pickDate')}</span>} </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) || isSubmitting} initialFocus /></PopoverContent> </Popover>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Total Cost (Display Only) */}
                <div className="md:col-span-2 flex items-end justify-end pb-1 text-gray-700 dark:text-gray-300">
                    <div className="w-full text-right">
                         <p className="text-xs text-muted-foreground">{t('purchases:totalCost')}</p>
                         <p className="text-sm font-medium">{formatNumber(itemTotal)}</p>
                    </div>
                </div>
                 {/* Empty div for remove button alignment (or adjust grid spans) */}
                {/* <div className="md:col-span-1"></div> */}
            </div>
        </Card>
    );
};