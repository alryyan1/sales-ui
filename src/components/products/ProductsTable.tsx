// src/components/products/ProductsTable.tsx
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import { Edit, AlertTriangle, PackageSearch, Copy, Check } from 'lucide-react';

// Types
import { Product as ProductType } from '@/services/productService';
import { formatNumber, formatCurrency } from '@/constants';

// Interface for Product with potentially loaded batches
interface ProductWithOptionalBatches extends Omit<ProductType, 'latest_cost_per_sellable_unit' | 'suggested_sale_price_per_sellable_unit' | 'scientific_name'> {
    available_batches?: {
        batch_id: number;
        quantity: number;
        expiry_date?: string;
    }[];
    category_name?: string | null;
    latest_cost_per_sellable_unit?: string | number | null;
    suggested_sale_price_per_sellable_unit?: string | number | null;
    sellable_unit_name?: string | null;
    stocking_unit_name?: string | null;
    units_per_stocking_unit?: number | null;
    scientific_name?: string | null;
}

interface ProductsTableProps {
    products: ProductWithOptionalBatches[];
    isLoading?: boolean;
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
            setTimeout(() => setCopiedSku(null), 2000);
        } catch (err) {
            console.error('Failed to copy SKU:', err);
        }
    };

    if (products.length === 0) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 300,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                }}
            >
                <PackageSearch
                    style={{
                        width: 64,
                        height: 64,
                        color: 'var(--mui-palette-text-secondary)',
                        marginBottom: 16,
                    }}
                />
                <Typography variant="body1" color="text.secondary">
                    لا توجد منتجات لعرضها
                </Typography>
            </Paper>
        );
    }

    return (
        <TableContainer
            component={Paper}
            elevation={0}
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
            }}
        >
            <Table sx={{ minWidth: 650 }}>
                <TableHead>
                    <TableRow
                        sx={{
                            bgcolor: 'action.hover',
                            '& .MuiTableCell-head': {
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: 'text.primary',
                                py: 2,
                            },
                        }}
                    >
                        <TableCell align="center" sx={{ width: 60 }}>
                            #
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            الرمز (SKU)
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 200 }}>
                            اسم المنتج
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                            الاسم العلمي
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            الفئة
                        </TableCell>
                        <TableCell align="center">
                            إجمالي المخزون
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                            أحدث تكلفة
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                            آخر سعر بيع
                        </TableCell>
                        <TableCell align="center" sx={{ width: 80 }}>
                            إجراءات
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {products.map((product) => {
                        const stockQty = Number(
                            (product as any).current_stock_quantity ?? product.stock_quantity ?? 0
                        );
                        const isLow = product.stock_alert_level !== null && stockQty <= (product.stock_alert_level as number);
                        const isOutOfStock = stockQty <= 0;

                        return (
                            <TableRow
                                key={product.id}
                                sx={{
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                    '&:last-child td': {
                                        borderBottom: 0,
                                    },
                                }}
                            >
                                <TableCell align="center" sx={{ py: 1.5 }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        {product.id}
                                    </Typography>
                                </TableCell>
                                
                                <TableCell
                                    align="center"
                                    sx={{
                                        display: { xs: 'none', sm: 'table-cell' },
                                        py: 1.5,
                                    }}
                                >
                                    {product.sku ? (
                                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                            <Typography variant="body2" component="span">
                                                {product.sku}
                                            </Typography>
                                            <Tooltip title={copiedSku === product.sku ? "تم النسخ" : "نسخ SKU"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => copyToClipboard(product.sku!)}
                                                    disabled={isLoading}
                                                    sx={{
                                                        width: 24,
                                                        height: 24,
                                                        p: 0,
                                                    }}
                                                >
                                                    {copiedSku === product.sku ? (
                                                        <Check style={{ width: 14, height: 14, color: 'var(--mui-palette-success-main)' }} />
                                                    ) : (
                                                        <Copy style={{ width: 14, height: 14 }} />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.disabled">
                                            ---
                                        </Typography>
                                    )}
                                </TableCell>
                                
                                <TableCell align="center" sx={{ py: 1.5 }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="body2" fontWeight={600}>
                                            {product.name.charAt(0).toUpperCase() + product.name.slice(1)}
                                        </Typography>
                                        {/* Mobile: Show additional info */}
                                        <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5, textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                SKU: {product.sku || '---'}
                                            </Typography>
                                            {product.scientific_name && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    الاسم العلمي: {product.scientific_name}
                                                </Typography>
                                            )}
                                            {product.category_name && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    الفئة: {product.category_name}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ display: { xs: 'block', lg: 'none' } }}>
                                                المخزون: {formatNumber(stockQty)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                
                                <TableCell
                                    align="center"
                                    sx={{
                                        display: { xs: 'none', lg: 'table-cell' },
                                        py: 1.5,
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary">
                                        {product.scientific_name || '---'}
                                    </Typography>
                                </TableCell>
                                
                                <TableCell
                                    align="center"
                                    sx={{
                                        display: { xs: 'none', md: 'table-cell' },
                                        py: 1.5,
                                    }}
                                >
                                    {product.category_name ? (
                                        <Chip
                                            label={product.category_name}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                fontSize: '0.75rem',
                                                height: 24,
                                            }}
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.disabled">
                                            ---
                                        </Typography>
                                    )}
                                </TableCell>
                                
                                <TableCell align="center" sx={{ py: 1.5 }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                        <Typography variant="body1" fontWeight={600}>
                                            {formatNumber(stockQty)}
                                        </Typography>
                                        {(isLow || isOutOfStock) && (
                                            <Tooltip title={isOutOfStock ? "نفاد المخزون" : "تنبيه: المخزون منخفض"}>
                                                <AlertTriangle
                                                    style={{
                                                        width: 16,
                                                        height: 16,
                                                        color: isOutOfStock
                                                            ? 'var(--mui-palette-error-main)'
                                                            : 'var(--mui-palette-warning-main)',
                                                    }}
                                                />
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </TableCell>
                                
                                <TableCell
                                    align="center"
                                    sx={{
                                        display: { xs: 'none', lg: 'table-cell' },
                                        py: 1.5,
                                    }}
                                >
                                    <Typography variant="body2">
                                        {product.latest_cost_per_sellable_unit
                                            ? formatCurrency(product.latest_cost_per_sellable_unit)
                                            : '---'}
                                    </Typography>
                                </TableCell>
                                
                                <TableCell
                                    align="center"
                                    sx={{
                                        display: { xs: 'none', lg: 'table-cell' },
                                        py: 1.5,
                                    }}
                                >
                                    <Typography variant="body2">
                                        {product.last_sale_price_per_sellable_unit
                                            ? formatCurrency(product.last_sale_price_per_sellable_unit)
                                            : '---'}
                                    </Typography>
                                </TableCell>
                                
                                <TableCell align="center" sx={{ py: 1.5 }}>
                                    <Tooltip title="تعديل">
                                        <IconButton
                                            size="small"
                                            onClick={() => onEdit(product)}
                                            disabled={isLoading}
                                            sx={{
                                                color: 'primary.main',
                                                '&:hover': {
                                                    bgcolor: 'primary.light',
                                                    color: 'primary.contrastText',
                                                },
                                            }}
                                        >
                                            <Edit style={{ width: 18, height: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
