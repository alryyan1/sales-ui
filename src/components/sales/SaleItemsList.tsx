// src/components/sales/SaleItemsList.tsx
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

// Child Row Component
import { SaleItemRow } from './SaleItemRow';

// Types
import { Product } from '../../services/productService';

interface SaleItemsListProps {
    products: Product[]; // Available products for dropdowns
    loadingProducts: boolean; // Loading state for product search
    productSearchInput: string; // Current search term
    onProductSearchInputChange: (value: string) => void; // Handler for search input
    isSubmitting: boolean; // Form submission state
}

export const SaleItemsList: React.FC<SaleItemsListProps> = ({
    products,
    loadingProducts,
    productSearchInput,
    onProductSearchInputChange,
    isSubmitting
}) => {
    const { t } = useTranslation(['sales', 'common']);
    const { control, formState: { errors } } = useFormContext(); // Get control and errors

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const addItem = () => {
        append({
            id: null, // Important for new items
            product_id: 0,
            quantity: 1,
            unit_price: 0,
            product: undefined,
            available_stock: undefined,
        });
    };

    return (
        <div className="space-y-4">
             <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('sales:itemsSectionTitle')}</h3>

             {/* Display root error for items array (e.g., minimum length) */}
             {errors.items?.root && (
                 <Alert variant="destructive" className="mb-4">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>{t('common:error')}</AlertTitle>
                     <AlertDescription>{typeof errors.items.root.message === 'string' ? errors.items.root.message : t('common:unknownError')}</AlertDescription>
                 </Alert>
              )}

            {/* Map over the fields array */}
            {fields.map((item, index) => (
                <SaleItemRow
                    key={item.id} // RHF provides stable id
                    index={index}
                    loadingAllProducts={loadingProducts}
                    remove={remove}
                    allProducts={products}
                    productSearchInputForRow={productSearchInput}   
                    onProductSearchInputChangeForRow={onProductSearchInputChange}
                    isSubmitting={isSubmitting}
                    itemCount={fields.length}
                />
            ))}

            {/* Add Item Button */}
            <div className="mt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={addItem}
                    disabled={isSubmitting}
                    className="text-sm"
                >
                    <PlusCircle className="me-2 h-4 w-4" /> {t('sales:addProduct')}
                </Button>
            </div>
        </div>
    );
};