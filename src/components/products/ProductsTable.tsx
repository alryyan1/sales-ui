// src/components/products/ProductsTable.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { Edit, AlertTriangle, PackageSearch, Copy, Check } from 'lucide-react';

import { Product as ProductType } from '@/services/productService';
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
            <Box className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground dark:text-gray-400">
                <PackageSearch className="h-12 w-12 mb-3 text-gray-400 dark:text-gray-500" />
                <p>لا توجد منتجات حاليًا</p>
            </Box>
        );
    }

    return (
        <Card>
            <CardContent className="w-full overflow-x-auto">
                <Table className="w-full">
                    <TableHead>
                        <TableRow className="dark:border-gray-700">
                            <TableCell className="text-center px-3 py-3 w-[60px]">#</TableCell>
                            <TableCell className="hidden sm:table-cell px-3 py-3 text-center">الرمز (SKU)</TableCell>
                            <TableCell className="px-3 py-3 min-w-[200px] text-center">اسم المنتج</TableCell>
                            <TableCell className="hidden lg:table-cell px-3 py-3 text-center">الاسم العلمي</TableCell>
                            <TableCell className="hidden md:table-cell px-3 py-3 text-center">الفئة</TableCell>
                            <TableCell className="text-center px-3 py-3">المخزون الكلي</TableCell>
                            <TableCell className="hidden lg:table-cell text-right px-3 py-3">أحدث تكلفة للوحدة</TableCell>
                            <TableCell className="hidden lg:table-cell text-right px-3 py-3">آخر سعر بيع للوحدة</TableCell>
                            <TableCell className="text-center px-3 py-3 w-[80px]">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.map((product) => {
                            const stockQty = Number(
                                (product as any).current_stock_quantity ?? product.stock_quantity ?? 0
                            );
                            const isLow = product.stock_alert_level !== null && stockQty <= (product.stock_alert_level as number);
                            const isOutOfStock = stockQty <= 0;
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
                                                <Tooltip title={copiedSku === product.sku ? "تم النسخ" : "نسخ SKU"}>
                                                    <IconButton
                                                        size="small"
                                                        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        onClick={() => copyToClipboard(product.sku!)}
                                                        disabled={isLoading}
                                                    >
                                                        {copiedSku === product.sku ? (
                                                            <Check className="h-3 w-3 text-green-600" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </IconButton>
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
                                            {product.scientific_name && <p>الاسم العلمي: {product.scientific_name}</p>}
                                            {product.category_name && <p>الفئة: {product.category_name}</p>}
                                            {/* Show stock on mobile if other columns are hidden */}
                                            <p className="lg:hidden text-xs">المخزون: {formatNumber(stockQty)}</p>
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
                                                {formatNumber(stockQty)}
                                            </div>
                                            {(isLow || isOutOfStock) && (
                                                <Tooltip title={isOutOfStock ? "غير متوفر" : "مخزون منخفض"}>
                                                    <AlertTriangle className={`inline ms-1 h-4 w-4 ${isOutOfStock ? 'text-red-500' : 'text-orange-500'}`} />
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
                                        <IconButton
                                            size="small"
                                            onClick={() => onEdit(product)}
                                            disabled={isLoading}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

// No default export needed if you only export ProductsTable
// export default ProductsTable; // Uncomment if this is the only export