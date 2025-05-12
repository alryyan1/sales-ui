// src/pages/inventory/StockAdjustmentsListPage.tsx (example path)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination } from '@/components/ui/pagination';
import { Loader2, AlertCircle, ArrowLeft, SlidersHorizontal, History, Plus } from 'lucide-react'; // Filter icon

// Services and Types
import stockAdjustmentService, { StockAdjustment } from '../../services/stockAdjustmentService'; // Adjust path
import { formatNumber } from '@/constants'; // Helpers
import { PaginatedResponse } from '@/services/clientService';
import dayjs from 'dayjs';
import StockAdjustmentFormModal from './StockAdjustmentFormModal';

// --- Component ---
const StockAdjustmentsListPage: React.FC = () => {
    const { t } = useTranslation(['inventory', 'common', 'products', 'users']);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams(); // Read params for filtering/pagination

    // --- State ---
    const [adjustmentsResponse, setAdjustmentsResponse] = useState<PaginatedResponse<StockAdjustment> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open,setOpen] = useState(false); // Modal state for adding adjustments
    // Add filter states here if needed (e.g., productId, userId, dateRange)

    // --- Memoized values from URL ---
    const currentPage = useMemo(() => Number(searchParams.get('page') || '1'), [searchParams]);
    // const currentProductId = useMemo(() => searchParams.get('productId') || null, [searchParams]); // Example filter

    // --- Data Fetching ---
    const fetchAdjustments = useCallback(async (page: number /*, filters */) => {
        setIsLoading(true); setError(null);
        try {
            const data = await stockAdjustmentService.getAdjustments(page /*, filters */);
            setAdjustmentsResponse(data);
        } catch (err) { setError(stockAdjustmentService.getErrorMessage(err)); }
        finally { setIsLoading(false); }
    }, []);

    // Fetch on page load or when relevant search params change
    useEffect(() => { fetchAdjustments(currentPage /*, currentProductId, etc. */); }, [fetchAdjustments, currentPage /*, currentProductId */]);

    // --- Handlers ---
    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        navigate({ search: params.toString() });
    };
    // Add filter handlers if implementing filters


    return (
        <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
            {/* Header */}
            <div className="flex items-center mb-6 gap-2">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
                    {t('inventory:adjustmentsHistoryTitle')} {/* Add key */}
                </h1>
                 {/* Optional: Button to open filter panel */}
                 <Button variant="outline" size="sm" className="ms-auto"><SlidersHorizontal className=""/> {t('common:filters')}</Button>
                 <Button onClick={()=>{
                    setOpen(true);
                 }} variant="outline" size="sm" className="ms-auto"><Plus className=""/> </Button>
            </div>

            {/* Add Filter Card Here if needed */}

            {/* Loading / Error States */}
            {isLoading && (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
                </div>
            )}
            {!isLoading && error && ( <Alert variant={'destructive'} >{error}</Alert> )}

            {/* Adjustments Table */}
            {!isLoading && !error && adjustmentsResponse && (
                <>
                <Card className="dark:bg-gray-900">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('common:date')}</TableHead>
                                    <TableHead>{t('products:product')}</TableHead>
                                    <TableHead>{t('purchases:batchNumber')}</TableHead>
                                    <TableHead className="text-center">{t('inventory:quantityChange')}</TableHead>
                                    <TableHead className="text-center">{t('inventory:quantityBefore')}</TableHead>
                                    <TableHead className="text-center">{t('inventory:quantityAfter')}</TableHead>
                                    <TableHead>{t('inventory:reasonLabel')}</TableHead>
                                    <TableHead>{t('common:recordedBy')}</TableHead>
                                    {/* Maybe Notes column? */}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 {adjustmentsResponse.data.length === 0 && ( <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">{t('inventory:noAdjustments')}</TableCell></TableRow> )} {/* Add key */}
                                {adjustmentsResponse.data.map((adj) => (
                                    <TableRow key={adj.id}>
                                        <TableCell>{dayjs(adj.created_at).format('YYYY-MM-DD')}</TableCell>
                                        <TableCell>
                                            <span className="font-medium">{adj.product?.name ?? `ID: ${adj.product_id}`}</span>
                                            <br/><span className="text-xs text-muted-foreground">{adj.product?.sku}</span>
                                        </TableCell>
                                        <TableCell>{adj.purchaseItemBatch?.batch_number ?? (adj.purchase_item_id ? `Batch ID: ${adj.purchase_item_id}`: t('inventory:totalStockAdjusted'))}</TableCell> {/* Add key */}
                                        <TableCell className={`text-center font-medium ${adj.quantity_change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                             {adj.quantity_change > 0 ? '+' : ''}{formatNumber(adj.quantity_change)}
                                         </TableCell>
                                        <TableCell className="text-center">{formatNumber(adj.quantity_before)}</TableCell>
                                        <TableCell className="text-center">{formatNumber(adj.quantity_after)}</TableCell>
                                        <TableCell>{t(`inventory:reason_${adj.reason}`, { defaultValue: adj.reason })}</TableCell> {/* Translate reason key */}
                                        <TableCell>{adj.user?.name ?? t('common:n/a')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 {/* Pagination */}
                 {adjustmentsResponse.last_page > 1 && ( '/* ... Pagination Component ... */' )}
                </>
            )}

            <StockAdjustmentFormModal onSaveSuccess={()=>{
                toast.success(t('inventory:adjustmentSaved')); // Show success message
                fetchAdjustments(currentPage); // Refresh adjustments list
            }} isOpen={open} onClose={()=>{
                setOpen(false);
            }}/> {/* Modal for adding adjustments */}
        </div>
    );
};

export default StockAdjustmentsListPage;