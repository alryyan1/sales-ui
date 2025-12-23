// src/components/inventory/requisitions/RequisitionItemsProcessingList.tsx
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

// Child Row Component
import { RequisitionItemProcessingRow } from './RequisitionItemProcessingRow';

// Types
import { Product } from '../../../services/productService';
import { StockRequisitionItem as OriginalRequisitionItem } from '../../../services/stockRequisitionService';
import { CardTitle } from '@/components/ui/card';
import { Card, CardHeader, CardContent, Alert } from '@mui/material';

interface RequisitionItemsProcessingListProps {
    originalRequisitionItems: OriginalRequisitionItem[]; // Pass the original items
    isSubmitting: boolean;
    // Product search props for batch selection (if product selection was part of item processing)
    // For now, assume product is fixed from original request.
}

export const RequisitionItemsProcessingList: React.FC<RequisitionItemsProcessingListProps> = ({
    originalRequisitionItems, isSubmitting
}) => {
    const { control, formState: { errors } } = useFormContext();
    console.log(originalRequisitionItems,'originalRequisitionItems');
    // 'fields' here refers to the RHF field array for items to be processed
    // It should be populated based on originalRequisitionItems in the parent form
    const { fields } = useFieldArray({
        control,
        name: "items",
    });
   console.log(fields,'fields');
    return (
        <Card className="dark:bg-gray-900 mb-6">
            <CardHeader><CardTitle>العناصر للمعالجة</CardTitle></CardHeader>
            <CardContent>
                {errors.items && !Array.isArray(errors.items) && errors.items.root && (
                    <Alert variant="outlined" className="mb-4">
                        خطأ في النموذج
                    </Alert>
                )}
                <div className="space-y-6">
                    {originalRequisitionItems.map((formItem, index) => {
                        const originalItemData = originalRequisitionItems.find(orig => orig.id === (formItem as any).id); // Find original item by ID
                        if (!originalItemData) return null; // Should not happen if form populated correctly

                        return (
                            <RequisitionItemProcessingRow
                                key={formItem.id}
                                index={index}
                                originalItem={originalItemData}
                                isSubmitting={isSubmitting}
                                // For batch selection, product info comes from originalItem.product
                                // If searching for batches globally needed different props
                                products={[]} // Not used for searching products here, only for displaying
                                loadingProducts={false}
                                productSearchInput="" // Not used for searching products here
                                onProductSearchInputChange={() => {}}
                                itemCount={fields.length} // Not used for removing here
                                remove={() => {}} // Remove function not applicable in processing view like this
                            />
                        );
                    })}
                </div>
                {fields.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">لا توجد عناصر في الطلب</p>
                )}
            </CardContent>
        </Card>
    );
};

// Helper state for loading indication in parent, not used here
// const [isLoading, setIsLoading] = useState(true);