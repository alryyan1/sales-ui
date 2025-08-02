// src/components/purchases/PurchaseItemsList.tsx
import React, { useMemo, useCallback, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

// MUI Components
import { Button, Typography, Box, Alert, AlertTitle, TextField, InputAdornment } from '@mui/material';
import { Add as AddIcon, Error as ErrorIcon, Search as SearchIcon } from '@mui/icons-material';

// Virtualization for performance
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Child Row Component
import { PurchaseItemRow } from './PurchaseItemRow';

// Types
import { Product } from '../../services/productService';

interface PurchaseItemsListProps {
    isSubmitting: boolean;
    isPurchaseReceived?: boolean;
}

// Virtualized row component for better performance
const VirtualizedRow = React.memo(({ 
    index, 
    style, 
    data 
}: {
    index: number;
    style: React.CSSProperties;
    data: {
        fields: any[];
        remove: (index: number) => void;
        isSubmitting: boolean;
        itemCount: number;
        searchTerm: string;
        isPurchaseReceived: boolean;
    };
}) => {
    const { fields, remove, isSubmitting, itemCount, searchTerm, isPurchaseReceived } = data;
    const field = fields[index];
    
    // Skip rendering if item doesn't match search
    if (searchTerm && field) {
        const productName = field.product?.name || '';
        const productSku = field.product?.sku || '';
        const batchNumber = field.batch_number || '';
        
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            productName.toLowerCase().includes(searchLower) ||
            productSku.toLowerCase().includes(searchLower) ||
            batchNumber.toLowerCase().includes(searchLower);
            
        if (!matchesSearch) {
            return null;
        }
    }
    
    return (
        <div style={style}>
                         <PurchaseItemRow
                 key={field.id}
                 index={index}
                 remove={remove}
                 isSubmitting={isSubmitting}
                 itemCount={itemCount}
                 isNew={index === 0}
                 isPurchaseReceived={isPurchaseReceived}
             />
        </div>
    );
});

VirtualizedRow.displayName = 'VirtualizedRow';

export const PurchaseItemsList: React.FC<PurchaseItemsListProps> = ({
    isSubmitting, isPurchaseReceived = false
}) => {
    const { t } = useTranslation(['purchases', 'common']);
    const { control, formState: { errors } } = useFormContext();
    const [searchTerm, setSearchTerm] = useState('');

    const { fields, insert, remove } = useFieldArray({
        control,
        name: "items",
    });

    // Memoize the add item function to prevent unnecessary re-renders
    const addItem = useCallback(() => {
        if (isPurchaseReceived) return; // Prevent adding items if purchase is received
        
        const newItem = {
            id: null,
            product_id: 0,
            batch_number: '',
            quantity: 1,
            unit_cost: 0,
            sale_price: null,
            expiry_date: null,
            product: undefined,
        };
        
        insert(0, newItem);
    }, [insert, isPurchaseReceived]);

    // Memoize the remove function
    const handleRemove = useCallback((index: number) => {
        if (isPurchaseReceived) return; // Prevent removing items if purchase is received
        remove(index);
    }, [remove, isPurchaseReceived]);

    // Filter fields based on search term
    const filteredFields = useMemo(() => {
        if (!searchTerm) return fields;
        
        return fields.filter((field) => {
            const productName = field.product?.name || '';
            const productSku = field.product?.sku || '';
            const batchNumber = field.batch_number || '';
            
            const searchLower = searchTerm.toLowerCase();
            return (
                productName.toLowerCase().includes(searchLower) ||
                productSku.toLowerCase().includes(searchLower) ||
                batchNumber.toLowerCase().includes(searchLower)
            );
        });
    }, [fields, searchTerm]);

    // Memoize the list data to prevent unnecessary re-renders
    const listData = useMemo(() => ({
        fields,
        remove: handleRemove,
        isSubmitting,
        itemCount: fields.length,
        searchTerm,
        isPurchaseReceived,
    }), [fields, handleRemove, isSubmitting, searchTerm, isPurchaseReceived]);

    // Calculate row height based on content
    const getRowHeight = useCallback((index: number) => {
        // Base height for each row, adjust as needed
        return 120; // Adjust based on your PurchaseItemRow height
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isPurchaseReceived && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t('purchases:itemsLockedReceived')}
                </Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h3" sx={{ 
                    color: 'text.primary',
                    fontWeight: 500 
                }}>
                    {t('purchases:itemsSectionTitle')} ({fields.length})
                </Typography>

                <Button
                    type="button"
                    variant="outlined"
                    onClick={addItem}
                    disabled={isSubmitting || isPurchaseReceived}
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

            {/* Search functionality for large datasets */}
            {fields.length > 10 && (
                <TextField
                    fullWidth
                    size="small"
                    placeholder={t('purchases:searchItems') || 'Search items...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 2 }}
                />
            )}

            {/* Display root error for items array */}
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

            {/* Performance optimized rendering */}
            {fields.length > 50 ? (
                // Use virtualization for large datasets
                <Box sx={{ height: 600, width: '100%' }}>
                    <AutoSizer>
                        {({ height, width }) => (
                            <List
                                height={height}
                                itemCount={fields.length}
                                itemSize={getRowHeight(0)}
                                width={width}
                                itemData={listData}
                            >
                                {VirtualizedRow}
                            </List>
                        )}
                    </AutoSizer>
                </Box>
            ) : (
                                 // Regular rendering for smaller datasets
                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                     {fields.map((item, index) => (
                         <PurchaseItemRow
                             key={item.id}
                             index={index}
                             remove={handleRemove}
                             isSubmitting={isSubmitting}
                             itemCount={fields.length}
                             isNew={index === 0}
                             isPurchaseReceived={isPurchaseReceived}
                         />
                     ))}
                 </Box>
            )}

            {/* Show filtered count if searching */}
            {searchTerm && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t('purchases:showingFilteredResults', { 
                        shown: filteredFields.length, 
                        total: fields.length 
                    }) || `Showing ${filteredFields.length} of ${fields.length} items`}
                </Typography>
            )}
        </Box>
    );
};