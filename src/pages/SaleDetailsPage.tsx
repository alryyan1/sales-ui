// src/pages/SaleDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";

// MUI Components (or shadcn/Tailwind equivalents)
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Services and Types
import saleService, { Sale } from '../services/saleService'; // Import Sale type and service
import dayjs from 'dayjs';
import { formatNumber } from '@/constants';

// Helpers (Assuming these exist and are imported)

const SaleDetailsPage: React.FC = () => {
    const { t } = useTranslation(['sales', 'common', 'products', 'clients']); // Load necessary namespaces
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); // Get the 'id' parameter

    // State
    const [sale, setSale] = useState<Sale | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSaleDetails = async (saleId: number) => {
            setIsLoading(true);
            setError(null);
            console.log(`Fetching details for sale ID: ${saleId}`);
            try {
                // Fetch the specific sale, including items and related data
                // Ensure backend's show() eager loads 'client', 'user', 'items.product'
                const data = await saleService.getSale(saleId);
                setSale(data);
            } catch (err) {
                console.error(`Failed to fetch sale ${saleId}:`, err);
                const errorMsg = saleService.getErrorMessage(err);
                setError(errorMsg);
                toast.error(t('common:error'), { description: errorMsg });
            } finally {
                setIsLoading(false);
            }
        };

        const numericId = Number(id);
        if (id && !isNaN(numericId) && numericId > 0) {
            fetchSaleDetails(numericId);
        } else {
            setError(t('sales:invalidId') || 'Invalid Sale ID.'); // Add key
            setIsLoading(false);
        }
    }, [id, t]); // Dependency array

    // --- Render Logic ---

    if (isLoading) {
        return ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', p: 3 }}> <CircularProgress /> <Typography sx={{ ml: 2 }}>{t('common:loading')}</Typography> </Box> );
    }

    if (error) {
        return ( <Box sx={{ p: 3 }}> <Alert severity="error" sx={{ my: 2 }}>{error}</Alert> <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales')}>{t('sales:backToList')}</Button> </Box> ); // Add key
    }

    if (!sale) {
        return ( <Box sx={{ p: 3 }}> <Typography>{t('sales:notFound')}</Typography> <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales')}>{t('sales:backToList')}</Button> </Box> ); // Add key
    }

    // Display Sale Details
    return (
         <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }} className="dark:bg-gray-950 pb-10">
             {/* Back Button & Title */}
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                 <IconButton onClick={() => navigate('/sales')} sx={{ mr: 1 }} aria-label={t('common:back') || 'Back'}>
                     <ArrowBackIcon className="dark:text-gray-300"/>
                 </IconButton>
                 <Typography variant="h4" component="h1" className="text-gray-800 dark:text-gray-100 font-semibold">
                     {t('sales:detailsTitle')} #{sale.id} {/* Add key */}
                 </Typography>
                  {/* Maybe add a Print button here later */}
                  {/* <Button variant="outlined" size="small" sx={{ ml: 'auto' }}>Print</Button> */}
             </Box>

             {/* Main Details Card */}
             <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }} elevation={2} className="dark:bg-gray-800">
                 <Grid container spacing={3}>
                     <Grid item xs={12} sm={6} md={4}>
                         <Typography variant="overline" color="text.secondary" className="dark:text-gray-400">{t('clients:client')}</Typography>
                         <Typography variant="body1" fontWeight="medium" className="dark:text-gray-100">{sale.client_name || t('common:n/a')}</Typography>
                     </Grid>
                     <Grid item xs={12} sm={6} md={4}>
                         <Typography variant="overline" color="text.secondary" className="dark:text-gray-400">{t('sales:saleDate')}</Typography>
                         <Typography variant="body1" fontWeight="medium" className="dark:text-gray-100">{dayjs(sale.sale_date).format('YYYY-MM-DD')}</Typography>
                     </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                         <Typography variant="overline" color="text.secondary" className="dark:text-gray-400">{t('sales:invoice')}</Typography>
                         <Typography variant="body1" fontWeight="medium" className="dark:text-gray-100">{sale.invoice_number || '---'}</Typography>
                     </Grid>
                     <Grid item xs={12} sm={6} md={4}>
                         <Typography variant="overline" color="text.secondary" className="dark:text-gray-400">{t('sales:status')}</Typography>
                         <Box sx={{ mt: 0.5 }}>
                             <Chip
                                 label={t(`sales:status_${sale.status}`)}
                                 size="small"
                                 color={sale.status === 'completed' ? 'success' : sale.status === 'pending' ? 'warning' : sale.status === 'draft' ? 'info' : 'default'}
                            />
                         </Box>
                     </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="overline" color="text.secondary" className="dark:text-gray-400">{t('common:recordedBy')}</Typography>
                          <Typography variant="body1" fontWeight="medium" className="dark:text-gray-100">{sale.user_name || t('common:n/a')}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="overline" color="text.secondary" className="dark:text-gray-400">{t('common:recordedDate')}</Typography>
                          <Typography variant="body1" fontWeight="medium" className="dark:text-gray-100">{dayjs(sale.created_at).format('YYYY-MM-DD')}</Typography>
                      </Grid>
                      {sale.notes && (
                          <Grid item xs={12}>
                              <Typography variant="overline" color="text.secondary" className="dark:text-gray-400">{t('sales:notesLabel')}</Typography>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }} className="dark:text-gray-200">{sale.notes}</Typography>
                          </Grid>
                      )}
                 </Grid>
             </Paper>

             {/* Items Table */}
             <Typography variant="h6" component="h2" sx={{ mb: 2 }} className="text-gray-800 dark:text-gray-100">
                 {t('sales:itemsSectionTitle')}
             </Typography>
             <TableContainer component={Paper} elevation={1} className="dark:bg-gray-800">
                 <Table size="small">
                     <TableHead sx={{ backgroundColor: 'action.hover' }} className="dark:bg-gray-700">
                         <TableRow>
                             <TableCell className="dark:text-gray-300">{t('sales:product')}</TableCell>
                             <TableCell className="dark:text-gray-300">{t('products:sku')}</TableCell>
                             <TableCell align="right" className="dark:text-gray-300">{t('sales:quantity')}</TableCell>
                             <TableCell align="right" className="dark:text-gray-300">{t('sales:unitPrice')}</TableCell>
                             <TableCell align="right" className="dark:text-gray-300">{t('sales:totalPrice')}</TableCell>
                         </TableRow>
                     </TableHead>
                     <TableBody>
                         {sale.items?.map((item) => (
                             <TableRow key={item.id} hover>
                                 <TableCell className="dark:text-gray-100">{item.product_name || `(${t('common:product')} ID: ${item.product_id})`}</TableCell>
                                 <TableCell className="dark:text-gray-100">{item.product_sku || '---'}</TableCell>
                                 <TableCell align="right" className="dark:text-gray-100">{item.quantity}</TableCell>
                                 <TableCell align="right" className="dark:text-gray-100">{formatNumber(item.unit_price)}</TableCell>
                                 <TableCell align="right" className="dark:text-gray-100">{formatNumber(item.total_price)}</TableCell>
                             </TableRow>
                         ))}
                     </TableBody>
                 </Table>
             </TableContainer>

              {/* Totals Section */}
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.100' }} className="dark:bg-gray-700 rounded">
                  <Grid container spacing={1} justifyContent="flex-end">
                      <Grid item xs={6} sm={4} md={3}>
                          <Typography variant="body1" align="right" className="dark:text-gray-200">{t('sales:grandTotal')}:</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3} md={2}>
                           <Typography variant="body1" align="right" fontWeight="bold" className="dark:text-gray-100">{formatNumber(sale.total_amount)}</Typography>
                      </Grid>
                  </Grid>
                   <Grid container spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                      <Grid item xs={6} sm={4} md={3}>
                          <Typography variant="body1" align="right" className="dark:text-gray-200">{t('sales:paidAmountLabel')}:</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3} md={2}>
                           <Typography variant="body1" align="right" fontWeight="medium" className="dark:text-gray-100">{formatNumber(sale.paid_amount)}</Typography>
                      </Grid>
                  </Grid>
                  <Grid container spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                      <Grid item xs={6} sm={4} md={3}>
                          <Typography variant="h6" align="right" className="dark:text-gray-100">{t('sales:dueAmount')}:</Typography>
                      </Grid>
                       <Grid item xs={6} sm={3} md={2}>
                           <Typography variant="h6" align="right" fontWeight="bold" className="dark:text-gray-100">{formatNumber(sale.due_amount)}</Typography>
                      </Grid>
                  </Grid>
              </Box>

         </Box>
    );
};

export default SaleDetailsPage;