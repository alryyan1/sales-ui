// src/components/products/ProductsTable.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, AlertTriangle, PackageSearch, PackageCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip

// Types
import { Product as ProductType } from '@/services/productService'; // Ensure ProductType is up-to-date
import { formatNumber, formatCurrency } from '@/constants';
import { useAuthorization } from '@/hooks/useAuthorization';

// Interface for Product with potentially loaded batches (though not directly used for display in this table)
interface ProductWithOptionalBatches extends Omit<ProductType, 'latest_cost_per_sellable_unit' | 'suggested_sale_price_per_sellable_unit'> {
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
}

interface ProductsTableProps {
    products: ProductWithOptionalBatches[];
    isLoading?: boolean; // For disabling actions during parent loading or row-specific actions
    onEdit: (product: ProductWithOptionalBatches) => void;
    onDelete: (id: number) => void;
    onAdjustStock?: (product: ProductWithOptionalBatches) => void; // Optional
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
    products,
    isLoading = false,
    onEdit,
    onDelete,
    onAdjustStock
}) => {
    const { t } = useTranslation(['products', 'common', 'inventory']); // Added inventory for stock adjustment
    const { can } = useAuthorization();

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
            <div className="rounded-md border dark:border-gray-700">
                <Table>
                    <TableHeader>
                        <TableRow className="dark:border-gray-700">
                            <TableHead className="hidden sm:table-cell px-3 py-3 text-center">{t('products:sku')}</TableHead>
                            <TableHead className="px-3 py-3 min-w-[200px] text-center">{t('products:name')}</TableHead>
                            <TableHead className="hidden md:table-cell px-3 py-3 text-center">{t('products:category')}</TableHead>
                            <TableHead className="text-center px-3 py-3">{t('products:totalStock')}</TableHead>
                            <TableHead className="hidden lg:table-cell text-center px-3 py-3">{t('products:stockAlertLevel')}</TableHead>
                            <TableHead className="hidden lg:table-cell text-right px-3 py-3">{t('products:latestCostPerSellableUnit')}</TableHead>
                            <TableHead className="hidden lg:table-cell text-right px-3 py-3">{t('products:suggestedSalePricePerSellableUnit')}</TableHead>
                            <TableHead className="text-center px-3 py-3 w-[100px]">{t('common:actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => {
                            const isLow = product.stock_alert_level !== null && product.stock_quantity <= product.stock_alert_level;
                            const isOutOfStock = product.stock_quantity <= 0;
                            const sellableUnit = product.sellable_unit_name || t('products:defaultSellableUnit');

                            return (
                                <TableRow
                                    key={product.id}
                                    className={cn(
                                        "dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-700/30",
                                        isLow && !isOutOfStock && "bg-orange-50 dark:bg-orange-900/40 hover:bg-orange-100/70 dark:hover:bg-orange-800/60",
                                        isOutOfStock && "bg-red-50 dark:bg-red-900/40 hover:bg-red-100/70 dark:hover:bg-red-800/60"
                                    )}
                                >
                                    <TableCell className="hidden sm:table-cell px-3 py-2 dark:text-gray-300 text-center">{product.sku || '---'}</TableCell>
                                    <TableCell className="px-3 py-2 font-medium dark:text-gray-100 text-center">
                                        {product.name}
                                        {/* Mobile: Show SKU and Category below name */}
                                        <div className="sm:hidden text-xs text-muted-foreground dark:text-gray-400 text-center space-y-0.5 mt-1">
                                            <p>SKU: {product.sku || '---'}</p>
                                            {product.category_name && <p>{t('products:category')}: {product.category_name}</p>}
                                            {/* Show stock on mobile if other columns are hidden */}
                                            <p className="lg:hidden">{t('products:stock')}: {formatNumber(product.stock_quantity)} {sellableUnit}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell px-3 py-2 dark:text-gray-300 text-center ">{product.category_name || '---'}</TableCell>
                                    <TableCell className=" px-3 py-2 dark:text-gray-100 text-center">
                                        {formatNumber(product.stock_quantity)} {sellableUnit}
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
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell px-3 py-2 dark:text-gray-300 text-center">
                                        {product.stock_alert_level !== null ? `${formatNumber(product.stock_alert_level)} ${sellableUnit}` : '---'}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell px-3 py-2 dark:text-gray-100 text-center">
                                        {product.latest_cost_per_sellable_unit ? formatCurrency(product.latest_cost_per_sellable_unit) : '---'}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-center px-3 py-2 dark:text-gray-100">
                                        {product.suggested_sale_price_per_sellable_unit ? formatCurrency(product.suggested_sale_price_per_sellable_unit) : '---'}
                                    </TableCell>
                                    <TableCell className="text-center px-3 py-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                                                    <span className="sr-only">{t('common:openMenu')}</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {/* <DropdownMenuItem onClick={() => navigate(`/products/${product.id}`)}>{t('common:viewDetails')}</DropdownMenuItem> */}
                                                {can('edit products') && (
                                                    <DropdownMenuItem onClick={() => onEdit(product)}>
                                                        <Edit className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t('common:edit')}
                                                    </DropdownMenuItem>
                                                )}
                                                {can('adjust stock') && onAdjustStock && (
                                                    <DropdownMenuItem onClick={() => onAdjustStock(product)}>
                                                        <PackageCheck className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t('inventory:adjustStock')}
                                                    </DropdownMenuItem>
                                                )}
                                                {can('delete products') && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50">
                                                            <Trash2 className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t('common:delete')}
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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