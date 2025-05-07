// src/components/sales/SaleItemRow.tsx
import React, { useState, useEffect } from 'react';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card"; // Optional: wrap row in a card? or just Grid
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Check, ChevronsUpDown, Trash2 } from 'lucide-react';

// Types
import { Product } from '../../services/productService'; // Assuming Product type is exported
import { formatNumber } from '@/constants'; // Your formatter

interface SaleItemRowProps {
    index: number;
    remove: (index: number) => void; // Function to remove this item
    products: Product[]; // List of available products for combobox
    loadingProducts: boolean; // Loading state for product list
    productSearchInput: string; // Current search term from parent
    onProductSearchInputChange: (value: string) => void; // Handler from parent
    isSubmitting: boolean; // Form submission state
    itemCount: number; // Total number of items
}

// Define the type for a single item within the form values
// Extract from SaleFormValues if defined there
type SaleItemFormValues = {
    id?: number | null;
    product_id: number;
    product?: Product;
    quantity: number;
    unit_price: number;
    available_stock?: number;
};


export const SaleItemRow: React.FC<SaleItemRowProps> = ({
    index,
    remove,
    products,
    loadingProducts,
    productSearchInput,
    onProductSearchInputChange,
    isSubmitting,
    itemCount
}) => {
    const { t } = useTranslation(['sales', 'common', 'products', 'validation']);
    const { control, watch, setValue, getFieldState, formState } = useFormContext<any>(); // Get methods from parent Form context

    // Local state for this row's product combobox popover
    const [productPopoverOpen, setProductPopoverOpen] = useState(false);

    // Watch quantity and unit_price for this specific item row to calculate total
    const quantity = useWatch({ control, name: `items.${index}.quantity` });
    const unitPrice = useWatch({ control, name: `items.${index}.unit_price` });
    const availableStock = useWatch({ control, name: `items.${index}.available_stock` });

    const itemTotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);

    return (
         // Use Card or just divs with borders/padding
        <Card className="p-3 dark:bg-gray-800 border dark:border-gray-700 relative">
             {/* Position remove button absolutely or keep in grid */}
             <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={isSubmitting || itemCount <= 1}
                aria-label={t('sales:remove') || 'Remove'}
                className="absolute top-1 end-1 h-6 w-6 text-muted-foreground hover:text-red-500 disabled:text-gray-300 dark:disabled:text-gray-600"
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-12 gap-3 items-start pt-5"> {/* Add pt if remove button is absolute */}
                {/* Product Combobox */}
                <FormField
                    control={control}
                    name={`items.${index}.product_id`}
                    render={({ field }) => (
                        <FormItem className="col-span-12 md:col-span-5 flex flex-col">
                            {/* Hide label visually if cramped, keep for accessibility or show */}
                            <FormLabel className="sr-only md:not-sr-only">{t('sales:product')} <span className="text-red-500">*</span></FormLabel>
                            <Popover open={productPopoverOpen} onOpenChange={(open) => {
                                setProductPopoverOpen(open);
                                if (!open) onProductSearchInputChange(''); // Reset search on close
                            }}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" role="combobox" disabled={isSubmitting} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                            { watch(`items.${index}.product`)?.name ?? (field.value ? `ID: ${field.value}` : t('sales:selectProductPlaceholder')) }
                                            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder={t('products:searchPlaceholder')}
                                            value={productSearchInput} // Use shared search value
                                            onValueChange={onProductSearchInputChange} // Use shared handler
                                            disabled={loadingProducts}
                                        />
                                        <CommandList>
                                            {loadingProducts && <div className='p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2'><Loader2 className='h-4 w-4 animate-spin'/> {t('common:loading')}...</div>}
                                            {!loadingProducts && products.length === 0 && productSearchInput && <CommandEmpty>{t('common:noResults')}</CommandEmpty>}
                                            {!loadingProducts && products.length === 0 && !productSearchInput && <CommandEmpty>{t('products:typeToSearch')}</CommandEmpty>}
                                            {!loadingProducts && (
                                                <CommandGroup>
                                                     {products.map((product) => (
                                                         <CommandItem key={product.id} value={`${product.name} ${product.sku}`} onSelect={() => {
                                                             field.onChange(product.id);
                                                             setValue(`items.${index}.unit_price`, Number(product.sale_price) || 0, { shouldValidate: true });
                                                             setValue(`items.${index}.available_stock`, product.stock_quantity);
                                                             setValue(`items.${index}.product`, product); // Store full object
                                                             setProductPopoverOpen(false);
                                                             // Don't reset search here, let parent handle it or clear on close
                                                         }}>
                                                             <Check className={cn("me-2 h-4 w-4", product.id === field.value ? "opacity-100" : "opacity-0")}/>
                                                             {product.name} <span className="text-xs text-muted-foreground ml-2">({product.sku || 'No SKU'})</span> <span className='ml-auto text-xs'>{t('sales:availableStock', { count: product.stock_quantity })}</span>
                                                         </CommandItem>
                                                     ))}
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
                {/* Quantity */}
                <FormField control={control} name={`items.${index}.quantity`} render={({ field, fieldState }) => (
                     <FormItem className="col-span-6 sm:col-span-4 md:col-span-2">
                         <FormLabel className="sr-only md:not-sr-only">{t('sales:quantity')}*</FormLabel>
                         <FormControl>
                             <Input type="number" min="1" step="1" placeholder="1" {...field} disabled={isSubmitting} className={cn(Number(field.value) > (availableStock ?? Infinity) && 'border-red-500 focus-visible:ring-red-500')} />
                         </FormControl>
                          {/* Show both validation error and stock warning */}
                         <FormMessage />
                          {Number(field.value) > (availableStock ?? Infinity) && !fieldState.error && <p className='text-xs text-orange-500 mt-1'>{t('sales:insufficientStock')}</p>}
                     </FormItem>
                 )} />
                {/* Unit Price */}
                <FormField control={control} name={`items.${index}.unit_price`} render={({ field, fieldState }) => (
                    <FormItem className="col-span-6 sm:col-span-4 md:col-span-2">
                        <FormLabel className="sr-only md:not-sr-only">{t('sales:unitPrice')}*</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                {/* Total Price (Display Only) */}
                <div className="col-span-12 sm:col-span-4 md:col-span-3 flex items-end justify-end pb-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('sales:totalPrice')}: {formatNumber(itemTotal)}</p>
                </div>
                 {/* Remove button moved to absolute positioning */}
                 {/* <div className="col-span-1 flex items-end justify-end pb-1"></div> */}
            </div>
        </Card>
    );
};