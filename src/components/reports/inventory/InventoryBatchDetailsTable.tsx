// src/components/reports/inventory/InventoryBatchDetailsTable.tsx
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from '@/constants';
import { PurchaseItemType } from '@/services/purchaseService';
import { useSettings } from '@/context/SettingsContext';

interface InventoryBatchDetailsTableProps {
    batches: PurchaseItemType[];
}

export const InventoryBatchDetailsTable: React.FC<InventoryBatchDetailsTableProps> = ({ batches }) => {
    const { t } = useTranslation(['reports', 'purchases', 'common']);
    const {fetchSettings,settings} = useSettings()
    useEffect(() => {
        const fetchData = async () => {
            await fetchSettings();
        };
        fetchData();
    },[])
    console.log(settings,'settings')
    
    if (!batches || batches.length === 0) {
        return <p className="px-4 py-2 text-xs text-muted-foreground">{t('reports:noBatchesAvailableForProduct')}</p>; // Add key
    }

    return (
        <Table className="my-2"> {/* Using shadcn table */}
            <TableHeader>
                <TableRow className="text-xs">
                    <TableHead className='text-center'>{t('purchases:batchNumber')}</TableHead>
                    <TableHead className="text-center">{t('reports:purchasedQuantity')}</TableHead>
                    <TableHead className="text-center">{t('reports:remainingQty')}</TableHead>
                    <TableHead className="text-center">{t('purchases:expiryDate')}</TableHead>
                    <TableHead className="text-center">{t('purchases:unitCost')}</TableHead>
                    <TableHead className="text-center">{t('purchases:intendedSalePrice')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {batches.map(batch => (
                    <TableRow key={batch.id} className="text-xs">
                        <TableCell className='text-center'>{batch.batch_number || '---'}</TableCell>
                        <TableCell className="text-center">{formatNumber(batch.quantity)}</TableCell>
                        <TableCell className="text-center">{formatNumber(batch.remaining_quantity)}</TableCell>
                        <TableCell className='text-center'>{batch.expiry_date ? formatDate(batch.expiry_date) : '---'}</TableCell>
                        <TableCell className="text-center text-lg">{formatCurrency(batch.unit_cost,'en-US',settings?.currency_symbol)}</TableCell>
                        <TableCell className="text-center">{batch.sale_price ? formatCurrency(batch.sale_price,'en-US',settings?.currency_symbol) : '---'}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};