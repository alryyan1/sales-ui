// src/components/clients/ClientsTable.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

// MUI Components for Table
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper'; // Container for the table
import Tooltip from '@mui/material/Tooltip'; // To show hints on icons
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// MUI Icons

// Import the Client type from clientService
import { Client } from '../../services/clientService'; // Adjust the path as needed
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

// Define the props the component will receive
interface ClientsTableProps {
    clients: Client[]; // Array of clients to display
    onEdit: (client: Client | null) => void | undefined; // Function to call when edit button is clicked
    onDelete: (id: number) => void | undefined; // Function to call when delete button is clicked
    isLoading?: boolean; // Optional loading state for skeleton/indicator
    canEdit?: boolean; // <-- New prop
    canDelete?: boolean; // 
}

const ClientsTable: React.FC<ClientsTableProps> = ({ clients, onEdit, onDelete, isLoading = false , canEdit = false, canDelete = false}) => {
    const { t } = useTranslation(['clients', 'common']); // Load necessary namespaces

    // Handle case where there are no clients to display
    if (!isLoading && clients.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">{t('clients:noClients')}</Typography>
            </Paper>
        );
    }

    // Basic loading indicator (optional, can be handled in parent)
    // if (isLoading) {
    //     return <Typography>Loading clients...</Typography>; // Or a skeleton loader
    // }

    return (
        <TableContainer component={Paper} elevation={3} sx={{ mt: 2 }}> {/* Add elevation for visual separation */}
            <Table sx={{ minWidth: 650 }} aria-label={t('clients:pageTitle')}>
                <TableHead sx={{ backgroundColor: 'action.hover' }}> {/* Header background color */}
                    <TableRow>
                        {/* Define table headers using translations */}
                        <TableCell align="left">{t('clients:id')}</TableCell>
                        <TableCell>{t('clients:name')}</TableCell>
                        <TableCell align="left">{t('clients:email')}</TableCell>
                        <TableCell align="left">{t('clients:phone')}</TableCell>
                        <TableCell align="left">{t('clients:address')}</TableCell>
                        <TableCell align="center">{t('common:actions')}</TableCell> {/* Actions column */}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {clients.map((client) => (
                        <TableRow
                            key={client.id}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.selected' } }} // Styling for rows
                        >
                            {/* Client Data Cells */}
                            <TableCell align="left">{client.id || '---'}</TableCell> {/* Handle null values */}
                            <TableCell component="th" scope="row">
                                {client.name}
                            </TableCell>
                            <TableCell align="left">{client.email || '---'}</TableCell> {/* Handle null values */}
                            <TableCell align="left">{client.phone || '---'}</TableCell>
                            <TableCell align="left">{client.address || '---'}</TableCell>

                            {/* Actions Cell */}
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                    {/* Edit Button */}
                                   {/* Conditionally render Edit button */}
                            {canEdit && onEdit && (
                                <Tooltip title={t('common:edit') || ''}>
                                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(client)} disabled={isLoading}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                            )}
                             {/* Conditionally render Delete button */}
                            {canDelete && onDelete && (
                                 <Tooltip title={t('common:delete') || ''}>
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => onDelete(client.id)} disabled={isLoading}>
                                         <Trash2 className="h-4 w-4" />
                                     </Button>
                                 </Tooltip>
                            )}
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ClientsTable;