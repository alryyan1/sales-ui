// src/components/products/ProductsTable.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

// MUI Components
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// MUI Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber'; // For low stock alert

// Import Product type
import { Product } from '../../services/productService'; // Adjust path
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../ui/table';
import { Card } from '../ui/card';
import { CardContent } from '@mui/material';

// Component Props
interface ProductsTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: number) => void;
    isLoading?: boolean;
}



const ProductsTable: React.FC<ProductsTableProps> = ({ products, onEdit, onDelete, isLoading = false }) => {
    const { t } = useTranslation(['products', 'common']); // Load namespaces

    if (products.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
                <Typography variant="body1">{t('products:noProducts')}</Typography> {/* Add key */}
            </Paper>
        );
    }

    return (
        <Card >
            <CardContent>
                <Table  aria-label={t('products:pageTitle')}> {/* Add key */}
                <TableHeader >
                    <TableRow>
                        {/* Add product specific keys */}
                        <TableCell>{t('products:sku')}</TableCell>
                        <TableCell>{t('products:name')}</TableCell>
                        <TableCell align="center">{t('products:stockQuantity')}</TableCell>
                        {/* <TableCell>{t('products:unit')}</TableCell> */}
                        <TableCell align="center">{t('common:actions')}</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => {
                        const isLowStock = product.stock_alert_level !== null && product.stock_quantity <= product.stock_alert_level;
                        return (
                            <TableRow key={product.id} >
                                <TableCell>{product.sku || '---'}</TableCell>
                                <TableCell  scope="row">{product.name}</TableCell>
                                <TableCell align="center">
                                     <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {product.stock_quantity}
                                        {isLowStock && (
                                            <Tooltip title={t('products:lowStockAlert') || 'Low Stock'} placement="top">
                                                <WarningAmberIcon color="warning" sx={{ fontSize: 16, ml: 0.5 }}/>
                                            </Tooltip>
                                        )}
                                     </Box>
                                </TableCell>
                                {/* <TableCell>{product.unit || '---'}</TableCell> */}
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                        <Tooltip title={t('common:edit') || ''}>
                                            <span>
                                                <IconButton aria-label={t('common:edit') || 'Edit'} color="primary" size="small" onClick={() => onEdit(product)} disabled={isLoading}>
                                                    <EditIcon fontSize="small"/>
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={t('common:delete') || ''}>
                                            <span>
                                                <IconButton aria-label={t('common:delete') || 'Delete'} color="error" size="small" onClick={() => onDelete(product.id)} disabled={isLoading}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
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

export default ProductsTable;