// src/components/sales/SaleTotalsDisplay.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/constants'; // Your formatter

interface SaleTotalsDisplayProps {
    grandTotal: number;
    totalPaid: number;
    amountDue: number;
}

export const SaleTotalsDisplay: React.FC<SaleTotalsDisplayProps> = ({
    grandTotal, totalPaid, amountDue
}) => {
    const { t } = useTranslation(['sales']);

    return (
        <div className="space-y-2 text-end text-gray-800 dark:text-gray-100">
            <div className="flex justify-end items-center gap-4">
                <p className="text-md text-muted-foreground">{t('sales:grandTotal')}:</p>
                <p className="text-lg font-semibold w-32 text-right">{formatNumber(grandTotal)}</p>
            </div>
            <div className="flex justify-end items-center gap-4">
                <p className="text-md text-muted-foreground">{t('sales:totalPaid')}:</p> {/* Add key */}
                <p className="text-lg font-medium w-32 text-right">{formatNumber(totalPaid)}</p>
            </div>
            <div className="flex justify-end items-center gap-4 border-t dark:border-gray-700 pt-2 mt-2">
                <p className="text-lg font-bold">{t('sales:amountDue')}:</p>
                <p className="text-xl font-bold w-32 text-right">{formatNumber(amountDue)}</p>
            </div>
        </div>
    );
};