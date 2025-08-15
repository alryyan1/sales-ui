// src/components/purchases/PurchaseSummaryDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatNumber } from '@/constants';

export interface PurchaseSummary {
  totalItems: number;
  totalCost: number;
  totalSell: number;
  totalQuantity: number;
}

interface PurchaseSummaryDialogProps {
  summary: PurchaseSummary;
  supplierName?: string;
}

const PurchaseSummaryDialog: React.FC<PurchaseSummaryDialogProps> = ({ summary, supplierName }) => {
  const { t } = useTranslation(['purchases']);

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t('purchases:purchaseSummary')}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {summary.totalItems}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('purchases:totalItems')}
          </div>
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(summary.totalCost)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('purchases:totalCost')}
          </div>
        </div>
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(summary.totalSell)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('purchases:totalSellValue')}
          </div>
        </div>
        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {formatNumber(summary.totalQuantity, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('purchases:totalQuantity')}
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {supplierName || 'N/A'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('purchases:supplier')}
          </div>
        </div>
      </div>
    </DialogContent>
  );
};

export default PurchaseSummaryDialog;


