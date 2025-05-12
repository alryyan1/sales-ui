// src/components/reports/inventory/InventoryReportTable.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Edit, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // For stock status

// Child Component
import { InventoryBatchDetailsTable } from './InventoryBatchDetailsTable';

// Types
import { Product as ProductType, PurchaseItem as PurchaseItemType } from '@/services/productService'; // Or from purchaseService
import { formatNumber } from '@/constants';

interface ProductWithBatches extends ProductType {
    available_batches?: PurchaseItemType[]; // Backend should provide this when 'include_batches' is true
}

interface InventoryReportTableProps {
    products: ProductWithBatches[];
    // Function to fetch batches for a specific product on demand (if not pre-loaded)
    // fetchBatchesForProduct?: (productId: number) => Promise<PurchaseItemType[] | void>;
}

export const InventoryReportTable: React.FC<InventoryReportTableProps> = ({ products /*, fetchBatchesForProduct */ }) => {
    const { t } = useTranslation(['reports', 'products', 'common']);
    const [openCollapsibles, setOpenCollapsibles] = useState<Record<number, boolean>>({});

    const toggleBatchDetails = async (productId: number) => {
        const isCurrentlyOpen = !!openCollapsibles[productId];
        setOpenCollapsibles(prev => ({ ...prev, [productId]: !isCurrentlyOpen }));

        // If opening and batches not loaded, fetch them (more advanced)
        // const product = products.find(p => p.id === productId);
        // if (!isCurrentlyOpen && product && !product.available_batches && fetchBatchesForProduct) {
        //    await fetchBatchesForProduct(productId);
        //    // Note: This requires parent page to update `products` state with fetched batches
        // }
    };

    if (products.length === 0) {
        return <div className="py-10 text-center text-muted-foreground">{t('common:noResults')}</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px] text-center"></TableHead> {/* Expand icon */}
                    <TableHead className="text-center">{t('products:sku')}</TableHead>
                    <TableHead className="text-center">{t('products:name')}</TableHead>
                    <TableHead className="text-center">{t('products:stockQuantity')}</TableHead>
                    <TableHead className="text-center">{t('products:stockAlertLevel')}</TableHead>
                    <TableHead className="text-center">{t('common:actions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {products.map((product) => {
                    const isLow = product.stock_alert_level !== null && product.stock_quantity <= product.stock_alert_level;
                    const isOutOfStock = product.stock_quantity <= 0;
                    const hasBatches = product.available_batches && product.available_batches.length > 0;

                    return (
                        <React.Fragment key={product.id}>
                            <TableRow
                                className={cn(
                                    isLow && !isOutOfStock && "bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100/80 dark:hover:bg-orange-900/50",
                                    isOutOfStock && "bg-red-50 dark:bg-red-900/30 hover:bg-red-100/80 dark:hover:bg-red-900/50"
                                )}
                            >
                                <TableCell className='text-center'>
                                    <Collapsible>   {hasBatches && (
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => toggleBatchDetails(product.id)} className="h-8 w-8">
                                                {openCollapsibles[product.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                <span className="sr-only">Toggle batches</span>
                                            </Button>
                                        </CollapsibleTrigger>
                                    )}</Collapsible>
                                 
                                </TableCell>
                                <TableCell className='text-center'>{product.sku || '---'}</TableCell>
                                <TableCell className="font-medium text-center">{product.name}</TableCell>
                                <TableCell className="text-center">
                                    {formatNumber(product.stock_quantity)}
                                    {(isLow || isOutOfStock) && <AlertTriangle className="inline ms-1 h-4 w-4 text-orange-500"/>}
                                </TableCell>
                                <TableCell className="text-center">{product.stock_alert_level !== null ? formatNumber(product.stock_alert_level) : '---'}</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="ghost" size="sm" asChild>
                                        <RouterLink to={`/products/${product.id}/edit`}>{t('common:edit')}</RouterLink>
                                    </Button>
                                </TableCell>
                            </TableRow>
                            {/* Collapsible Content for Batches */}
                            {hasBatches && (
                                <TableRow className={cn(!openCollapsibles[product.id] && "hidden")}>
                                    <TableCell colSpan={6} className="p-0">
                                        <Collapsible open={openCollapsibles[product.id]}>
                                            <CollapsibleContent className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700">
                                                <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                                                    {t('reports:batchDetailsFor', { name: product.name })}
                                                </h4>
                                                <InventoryBatchDetailsTable batches={product.available_batches!} />
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </TableCell>
                                </TableRow>
                            )}
                        </React.Fragment>
                    );
                })}
            </TableBody>
        </Table>
    );
};