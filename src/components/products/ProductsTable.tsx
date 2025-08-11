// src/components/products/ProductsTable.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, AlertTriangle, PackageSearch, Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip

// Types
import { Product as ProductType } from '@/services/productService'; // Ensure ProductType is up-to-date
import { formatNumber, formatCurrency } from '@/constants';

// Interface for Product with potentially loaded batches (though not directly used for display in this table)
interface ProductWithOptionalBatches extends Omit<ProductType, 'latest_cost_per_sellable_unit' | 'suggested_sale_price_per_sellable_unit' | 'scientific_name'> {
    available_batches?: {
        batch_id: number;
        quantity: number;
        expiry_date?: string;
    }[];
    // Ensure these are part of your ProductType if coming from backend Resource
    category_name?: string | null;
    latest_cost_per_sellable_unit?: string | number | null;
    suggested_sale_price_per_sellable_unit?: string | number | null;
    sellable_unit_name?: string | null; // From product model
    stocking_unit_name?: string | null; // From product model
    units_per_stocking_unit?: number | null; // From product model
    scientific_name?: string | null; // From product model
}

interface ProductsTableProps {
    products: ProductWithOptionalBatches[];
    isLoading?: boolean; // For disabling actions during parent loading or row-specific actions
    onEdit: (product: ProductWithOptionalBatches) => void;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
    products,
    isLoading = false,
    onEdit,
}) => {
    const { t } = useTranslation(['products', 'common', 'inventory']); // Added inventory for stock adjustment
    const [copiedSku, setCopiedSku] = useState<string | null>(null);

    const copyToClipboard = async (sku: string) => {
        try {
            await navigator.clipboard.writeText(sku);
            setCopiedSku(sku);
            setTimeout(() => setCopiedSku(null), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy SKU:', err);
        }
    };

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground dark:text-gray-400">
                <PackageSearch className="h-12 w-12 mb-3 text-gray-400 dark:text-gray-500" />
                <p>{t('products:noProducts')}</p>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={100}> {/* Wrap table with TooltipProvider */}
            <div className="rounded-md border dark:border-gray-700 w-full">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow className="dark:border-gray-700">
                            <TableHead className="text-center px-3 py-3 w-[60px]">#</TableHead>
                            <TableHead className="hidden sm:table-cell px-3 py-3 text-center">{t('products:sku')}</TableHead>
                            <TableHead className="px-3 py-3 min-w-[200px] text-center">{t('products:name')}</TableHead>
                            <TableHead className="hidden lg:table-cell px-3 py-3 text-center">{t('products:scientificName')}</TableHead>
                            <TableHead className="hidden md:table-cell px-3 py-3 text-center">{t('products:category')}</TableHead>
                            <TableHead className="text-center px-3 py-3">{t('products:totalStock')}</TableHead>
                            <TableHead className="hidden lg:table-cell text-right px-3 py-3">{t('products:latestCostPerSellableUnit')}</TableHead>
                            <TableHead className="hidden lg:table-cell text-right px-3 py-3">{t('products:lastSalePricePerSellableUnit')}</TableHead>
                            <TableHead className="text-center px-3 py-3 w-[80px]">{t('common:actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => {
                            const isLow = product.stock_alert_level !== null && product.stock_quantity <= product.stock_alert_level;
                            const isOutOfStock = product.stock_quantity <= 0;
                            // Display quantities without unit label per requirements

                            return (
                                <TableRow
                                    key={product.id}
                                    className={cn(
                                        "dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-700/30",
                                        isLow && !isOutOfStock && "bg-orange-50 dark:bg-orange-900/40 hover:bg-orange-100/70 dark:hover:bg-orange-800/60",
                                        isOutOfStock && "bg-red-50 dark:bg-red-900/40 hover:bg-red-100/70 dark:hover:bg-red-800/60"
                                    )}
                                >
                                    <TableCell className="text-center px-3 py-2 dark:text-gray-300 font-medium text-sm">
                                        {product.id}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell px-3 py-2 dark:text-gray-300 text-center text-sm">
                                        {product.sku ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <span>{product.sku}</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            onClick={() => copyToClipboard(product.sku!)}
                                                            disabled={isLoading}
                                                        >
                                                            {copiedSku === product.sku ? (
                                                                <Check className="h-3 w-3 text-green-600" />
                                                            ) : (
                                                                <Copy className="h-3 w-3" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{copiedSku === product.sku ? t('common:copied') : t('common:copySku')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        ) : (
                                            '---'
                                        )}
                                    </TableCell>
                                    <TableCell className="px-3 py-2 font-semibold dark:text-gray-100 text-center text-sm">
                                        {product.name.charAt(0).toUpperCase() + product.name.slice(1)}
                                        {/* Mobile: Show SKU and Category below name */}
                                        <div className="sm:hidden text-xs text-muted-foreground dark:text-gray-400 text-center space-y-0.5 mt-1">
                                            <p>SKU: {product.sku || '---'}</p>
                                            {product.scientific_name && <p>{t('products:scientificName')}: {product.scientific_name}</p>}
                                            {product.category_name && <p>{t('products:category')}: {product.category_name}</p>}
                                            {/* Show stock on mobile if other columns are hidden */}
                                            <p className="lg:hidden text-xs">{t('products:stock')}: {formatNumber(product.stock_quantity)}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell px-3 py-2 dark:text-gray-300 text-center text-sm">
                                        {product.scientific_name || '---'}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell px-3 py-2 dark:text-gray-300 text-center text-sm">{product.category_name || '---'}</TableCell>
                                 
                                    <TableCell className="px-3 py-2 dark:text-gray-100 text-center">
                                        <div className="space-y-1">
                                            {/* Primary stock display in sellable units */}
                                            <div className="font-medium text-base">
                                                {formatNumber(product.stock_quantity)}
                                            </div>
                                            {(isLow || isOutOfStock) && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <AlertTriangle className={`inline ms-1 h-4 w-4 ${isOutOfStock ? 'text-red-500' : 'text-orange-500'}`}/>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{isOutOfStock ? t('products:outOfStock') : t('products:lowStockAlert')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell px-3 py-2 dark:text-gray-100 text-center text-sm">
                                        {product.latest_cost_per_sellable_unit ? formatCurrency(product.latest_cost_per_sellable_unit) : '---'}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-center px-3 py-2 dark:text-gray-100 text-sm">
                                        {product.last_sale_price_per_sellable_unit ? formatCurrency(product.last_sale_price_per_sellable_unit) : '---'}
                                    </TableCell>
                                    <TableCell className="text-center px-3 py-2">
                                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(product)} disabled={isLoading}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
};

// No default export needed if you only export ProductsTable
// export default ProductsTable; // Uncomment if this is the only export