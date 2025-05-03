// src/components/suppliers/SuppliersTable.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

// MUI Components
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography'; // For empty state message

// MUI Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Import Supplier type
import { Supplier } from '../../services/supplierService'; // Adjust path

// Component Props
interface SuppliersTableProps {
    suppliers: Supplier[];
    onEdit: (supplier: Supplier) => void;
    onDelete: (id: number) => void;
    isLoading?: boolean; // For potential row disabling during delete
}

const SuppliersTable: React.FC<SuppliersTableProps> = ({ suppliers, onEdit, onDelete, isLoading = false }) => {
    const { t } = useTranslation(['suppliers', 'common']); // Load namespaces

    if (suppliers.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
                <Typography variant="body1">{t('suppliers:noSuppliers')}</Typography> {/* Add noSuppliers key */}
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}> {/* Use subtle elevation */}
            <Table sx={{ minWidth: 650 }} aria-label={t('suppliers:pageTitle')}> {/* Add pageTitle key */}
                <TableHead sx={{ backgroundColor: 'action.hover' }}>
                    <TableRow>
                        <TableCell>{t('suppliers:name')}</TableCell> {/* Add name key */}
                        <TableCell>{t('suppliers:contactPerson')}</TableCell> {/* Add contactPerson key */}
                        <TableCell>{t('suppliers:email')}</TableCell>
                        <TableCell>{t('suppliers:phone')}</TableCell>
                        <TableCell align="center">{t('common:actions')}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {suppliers.map((supplier) => (
                        <TableRow
                            key={supplier.id}
                            hover // Add hover effect
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell component="th" scope="row">
                                {supplier.name}
                            </TableCell>
                            <TableCell>{supplier.contact_person || '---'}</TableCell>
                            <TableCell>{supplier.email || '---'}</TableCell>
                            <TableCell>{supplier.phone || '---'}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}> {/* Reduce gap */}
                                    <Tooltip title={t('common:edit') || ''}>
                                        <span> {/* Span needed for tooltip when button is disabled */}
                                            <IconButton
                                                aria-label={t('common:edit') || 'Edit'}
                                                color="primary"
                                                size="small"
                                                onClick={() => onEdit(supplier)}
                                                disabled={isLoading} // Disable if parent is processing delete
                                            >
                                                <EditIcon fontSize="small"/>
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title={t('common:delete') || ''}>
                                         <span>
                                            <IconButton
                                                aria-label={t('common:delete') || 'Delete'}
                                                color="error"
                                                size="small"
                                                onClick={() => onDelete(supplier.id)}
                                                disabled={isLoading}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default SuppliersTable;