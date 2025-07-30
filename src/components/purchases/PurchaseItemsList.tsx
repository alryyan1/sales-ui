// src/components/purchases/PurchaseItemsList.tsx
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

// MUI Components
import { Button, Typography, Box, Alert, AlertTitle } from '@mui/material';
import { Add as AddIcon, Error as ErrorIcon } from '@mui/icons-material';

// Child Row Component
import { PurchaseItemRow } from './PurchaseItemRow';

// Types
import { Product } from '../../services/productService';

interface PurchaseItemsListProps {
    products: Product[];
    isSubmitting: boolean;
}

export const PurchaseItemsList: React.FC<PurchaseItemsListProps> = ({
    products, isSubmitting
}) => {
    const { t } = useTranslation(['purchases', 'common']);
    const { control, formState: { errors } } = useFormContext(); // Get control and errors

    const { fields, insert, remove } = useFieldArray({
        control,
        name: "items",
    });

    const addItem = () => {
        console.log('Adding new item, current fields count:', fields.length);
        
        const newItem = {
            id: null, // If editing, this would be for new items
            product_id: 0, // Or null, depending on combobox handling
            batch_number: '',
            quantity: 1,
            unit_cost: 0,
            sale_price: null,
            expiry_date: null,
            product: undefined, // For UI state
        };
        
        // Insert at the beginning (index 0) so new items appear at the top
        insert(0, newItem);
        console.log('New item added at index 0, updated fields count:', fields.length + 1);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h3" sx={{ 
                    color: 'text.primary',
                    fontWeight: 500 
                }}>
                    {t('purchases:itemsSectionTitle')} ({fields.length})
                </Typography>

                {/* Add Item Button - Fixed at top */}
                <Button
                    type="button"
                    variant="outlined"
                    onClick={addItem}
                    disabled={isSubmitting}
                    startIcon={<AddIcon />}
                    size="medium"
                    sx={{ 
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderColor: 'primary.main'
                        }
                    }}
                >
                    {t('purchases:addProduct')}
                </Button>
            </Box>

            {/* Display root error for items array (e.g., minimum length) */}
            {errors.items && !Array.isArray(errors.items) && errors.items.root && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    <ErrorIcon />
                    <AlertTitle>{t('common:error')}</AlertTitle>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {typeof errors.items.root?.message === 'string' 
                        ? errors.items.root.message 
                        : t('common:error')}
                    </Typography>
                </Alert>
             )}

            {/* Map over the fields array */}
            {fields.map((item, index) => (
                <PurchaseItemRow
                    key={item.id} // RHF provides stable id
                    index={index}
                    remove={remove}
                    products={products}
                    isSubmitting={isSubmitting}
                    itemCount={fields.length}
                    isNew={index === 0} // Mark the first item (top) as new
                    shouldFocus={index === 0} // Focus the first item (newly added)
                />
            ))}
        </Box>
    );
};