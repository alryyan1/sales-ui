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
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip'; // To show hints on icons
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// MUI Icons
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Import the Client type from clientService
import { Client } from '../../services/clientService'; // Adjust the path as needed

// Define the props the component will receive
interface ClientsTableProps {
    clients: Client[]; // Array of clients to display
    onEdit: (client: Client) => void; // Function to call when edit button is clicked
    onDelete: (id: number) => void; // Function to call when delete button is clicked
    isLoading?: boolean; // Optional loading state for skeleton/indicator
}

const ClientsTable: React.FC<ClientsTableProps> = ({ clients, onEdit, onDelete, isLoading = false }) => {
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
                                    <Tooltip title={t('common:edit') || ''}> {/* Ensure title is not undefined */}
                                        <IconButton
                                            aria-label={t('common:edit') || 'Edit'}
                                            color="primary"
                                            size="small" // Make icons slightly smaller
                                            onClick={() => onEdit(client)} // Call onEdit prop with client data
                                        >
                                            <EditIcon fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>

                                    {/* Delete Button */}
                                     <Tooltip title={t('common:delete') || ''}>
                                        <IconButton
                                            aria-label={t('common:delete') || 'Delete'}
                                            color="error" // Use error color for delete
                                            size="small"
                                            onClick={() => onDelete(client.id)} // Call onDelete prop with client id
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
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

export default ClientsTable;