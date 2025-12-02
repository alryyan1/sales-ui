// src/components/inventory/StockAdjustmentsListPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from "sonner";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Pagination from "@mui/material/Pagination";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";

// Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterListIcon from "@mui/icons-material/FilterList";
import AddIcon from "@mui/icons-material/Add";

// Services and Types
import stockAdjustmentService, { StockAdjustment } from '../../services/stockAdjustmentService';
import { formatNumber } from '@/constants';
import { PaginatedResponse } from '@/services/clientService';
import dayjs from 'dayjs';
import StockAdjustmentFormModal from './StockAdjustmentFormModal';

// Helper function to get reason label in Arabic
const getReasonLabel = (reason: string): string => {
  const reasonMap: Record<string, string> = {
    'damage': 'تلف',
    'expiry': 'انتهاء صلاحية',
    'theft': 'سرقة',
    'loss': 'فقدان',
    'adjustment': 'تعديل',
    'correction': 'تصحيح',
    'other': 'أخرى',
  };
  return reasonMap[reason] || reason;
};

// --- Component ---
const StockAdjustmentsListPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // --- State ---
    const [adjustmentsResponse, setAdjustmentsResponse] = useState<PaginatedResponse<StockAdjustment> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    // --- Memoized values from URL ---
    const currentPage = useMemo(() => Number(searchParams.get('page') || '1'), [searchParams]);

    // --- Data Fetching ---
    const fetchAdjustments = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await stockAdjustmentService.getAdjustments(page);
            setAdjustmentsResponse(data);
        } catch (err) {
            setError(stockAdjustmentService.getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch on page load or when relevant search params change
    useEffect(() => {
        fetchAdjustments(currentPage);
    }, [fetchAdjustments, currentPage]);

    // --- Handlers ---
    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', value.toString());
        navigate({ search: params.toString() });
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, direction: "rtl" }} className="dark:bg-gray-950 min-h-screen">
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
                <IconButton onClick={() => navigate(-1)} size="small">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" className="text-gray-800 dark:text-gray-100 font-semibold">
                    سجل تعديلات المخزون
                </Typography>
                <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
                    <Button variant="outlined" size="small" startIcon={<FilterListIcon />}>
                        الفلاتر
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setOpen(true)}
                    >
                        إضافة تعديل
                    </Button>
                </Box>
            </Box>

            {/* Loading / Error States */}
            {isLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 5 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }} className="text-gray-600 dark:text-gray-400">
                        جاري التحميل...
                    </Typography>
                </Box>
            )}
            {!isLoading && error && (
                <Alert severity="error" sx={{ my: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Adjustments Table */}
            {!isLoading && !error && adjustmentsResponse && (
                <>
                    <Card className="dark:bg-gray-900">
                        <CardContent sx={{ p: 0 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>التاريخ</TableCell>
                                        <TableCell>المنتج</TableCell>
                                        <TableCell>رقم الدفعة</TableCell>
                                        <TableCell align="center">التغيير في الكمية</TableCell>
                                        <TableCell align="center">الكمية قبل التعديل</TableCell>
                                        <TableCell align="center">الكمية بعد التعديل</TableCell>
                                        <TableCell>السبب</TableCell>
                                        <TableCell>سجل بواسطة</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {adjustmentsResponse.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                                <Typography color="text.secondary">
                                                    لا توجد تعديلات مخزون مسجلة.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {adjustmentsResponse.data.map((adj) => (
                                        <TableRow key={adj.id}>
                                            <TableCell>{dayjs(adj.created_at).format('YYYY-MM-DD')}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {adj.product?.name ?? `ID: ${adj.product_id}`}
                                                </Typography>
                                                {adj.product?.sku && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {adj.product.sku}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {adj.purchaseItemBatch?.batch_number ?? 
                                                 (adj.purchase_item_id ? `Batch ID: ${adj.purchase_item_id}` : 'تعديل المخزون الإجمالي')}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 500,
                                                        color: adj.quantity_change > 0 ? 'success.main' : 'error.main'
                                                    }}
                                                >
                                                    {adj.quantity_change > 0 ? '+' : ''}{formatNumber(adj.quantity_change)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">{formatNumber(adj.quantity_before)}</TableCell>
                                            <TableCell align="center">{formatNumber(adj.quantity_after)}</TableCell>
                                            <TableCell>{getReasonLabel(adj.reason)}</TableCell>
                                            <TableCell>{adj.user?.name ?? '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    {/* Pagination */}
                    {adjustmentsResponse.last_page > 1 && (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 2, mt: 3 }}>
                            <Pagination
                                count={adjustmentsResponse.last_page}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                shape="rounded"
                                showFirstButton
                                showLastButton
                                disabled={isLoading}
                            />
                        </Box>
                    )}
                </>
            )}

            <StockAdjustmentFormModal
                onSaveSuccess={() => {
                    toast.success("تم حفظ التعديل بنجاح");
                    fetchAdjustments(currentPage);
                }}
                isOpen={open}
                onClose={() => setOpen(false)}
            />
        </Box>
    );
};

export default StockAdjustmentsListPage;
