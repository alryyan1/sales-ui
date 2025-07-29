// src/components/purchases/PurchaseItemsList.tsx
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Child Row Component
import { PurchaseItemRow } from './PurchaseItemRow';

// Types
import { Product } from '../../services/productService';

interface PurchaseItemsListProps {
    products: Product[];
    loadingProducts: boolean;
    productSearchInput: string;
    onProductSearchInputChange: (value: string) => void;
    isSubmitting: boolean;
}

export const PurchaseItemsList: React.FC<PurchaseItemsListProps> = ({
    products, loadingProducts, productSearchInput, onProductSearchInputChange, isSubmitting
}) => {
    const { t } = useTranslation(['purchases', 'common']);
    const { control, formState: { errors } } = useFormContext(); // Get control and errors

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const addItem = () => {
        append({
            id: null, // If editing, this would be for new items
            product_id: 0, // Or null, depending on combobox handling
            batch_number: '',
            quantity: 1,
            unit_cost: 0,
            sale_price: null,
            expiry_date: null,
            product: undefined, // For UI state
        });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{t('purchases:itemsSectionTitle')}</h3>

            {/* Display root error for items array (e.g., minimum length) */}
            {errors.items && !Array.isArray(errors.items) && errors.items.root && ( // Check for root specifically
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('common:error')}</AlertTitle>
                    <AlertDescription>
                      {typeof errors.items.root?.message === 'string' 
                        ? errors.items.root.message 
                        : t('common:error')}
                    </AlertDescription>
                </Alert>
             )}

            {/* Map over the fields array */}
            {fields.map((item, index) => (
                <PurchaseItemRow
                    key={item.id} // RHF provides stable id
                    index={index}
                    remove={remove}
                    products={products}
                    loadingProducts={loadingProducts}
                    productSearchInput={productSearchInput}
                    onProductSearchInputChange={onProductSearchInputChange}
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
                    <PlusCircle className="me-2 h-4 w-4" /> {t('purchases:addProduct')}
                </Button>
            </div>
        </div>
    );
};