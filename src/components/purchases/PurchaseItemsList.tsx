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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Section Header */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                        width: 4,
                        height: 24,
                        bgcolor: 'primary.main',
                        borderRadius: 1
                    }} />
                    <Typography variant="h6" component="h3" sx={{ 
                        color: 'text.primary',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        {t('purchases:itemsSectionTitle')}
                        <Box sx={{ 
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }}>
                            {fields.length}
                        </Box>
                    </Typography>
                </Box>

                <Button
                    type="button"
                    variant="contained"
                    onClick={addItem}
                    disabled={isSubmitting || isPurchaseReceived}
                    startIcon={<AddIcon />}
                    size="medium"
                    sx={{ 
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 2.5,
                        boxShadow: 2,
                        '&:hover': {
                            boxShadow: 4
                        }
                    }}
                >
                    {t('purchases:addProduct')}
                </Button>
            </Box>

            {isPurchaseReceived && (
                <Alert 
                    severity="warning" 
                    sx={{ 
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'warning.main',
                        bgcolor: 'warning.light'
                    }}
                >
                    {t('purchases:itemsLockedReceived')}
                </Alert>
            )}

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
                    sx={{ 
                        mb: 1,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.paper',
                            '&:hover': {
                                bgcolor: 'action.hover'
                            }
                        }
                    }}
                />
            )}

            {/* Display root error for items array */}
            {errors.items && !Array.isArray(errors.items) && errors.items.root && (
                <Alert 
                    severity="error" 
                    sx={{ 
                        mb: 2,
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'error.main'
                    }}
                >
                    <AlertTitle sx={{ fontWeight: 600 }}>{t('common:error')}</AlertTitle>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {typeof errors.items.root?.message === 'string' 
                        ? errors.items.root.message 
                        : t('common:error')}
                    </Typography>
                </Alert>
             )}

            {/* Performance optimized rendering */}
            {fields.length === 0 ? (
                <Box sx={{ 
                    p: 6,
                    textAlign: 'center',
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderStyle: 'dashed'
                }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                        {t('purchases:noItemsAdded') || 'No items added yet'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('purchases:clickAddProduct') || 'Click "Add Product" to start adding items'}
                    </Typography>
                </Box>
            ) : fields.length > 50 ? (
                // Use virtualization for large datasets
                <Box sx={{ 
                    height: 600, 
                    width: '100%',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    overflow: 'hidden'
                }}>
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
                <Box sx={{ 
                    p: 1.5,
                    bgcolor: 'info.light',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'info.main'
                }}>
                    <Typography variant="body2" color="info.dark" sx={{ fontWeight: 500 }}>
                        {t('purchases:showingFilteredResults', { 
                            shown: filteredFields.length, 
                            total: fields.length 
                        }) || `Showing ${filteredFields.length} of ${fields.length} items`}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};