// src/components/sales/terminal/SaleCard.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { Sale } from '@/services/saleService'; // Adjust path
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from '@/constants';

interface SaleCardProps {
    sale: Sale;
    isActive: boolean;
    onSelect: (id: number) => void;
}

export const SaleCard: React.FC<SaleCardProps> = ({ sale, isActive, onSelect }) => {
    const { t } = useTranslation(['sales', 'common']);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700';
            case 'draft': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700';
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
        }
    };

    return (
        <button
            onClick={() => onSelect(sale.id)}
            className={cn(
                "w-full text-start p-3 mb-2 rounded-lg border transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive ? "bg-primary/10 border-primary shadow-md dark:bg-primary/20" : "bg-card hover:bg-muted/50 dark:border-gray-700 dark:hover:bg-gray-800/60",
                getStatusColor(sale.status) // This will override general background, consider applying to a specific element like border or a dot
            )}
        >
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-card-foreground dark:text-gray-100">
                    {sale.invoice_number || `${t('sales:saleIdCap')} #${sale.id}`} {/* Add key */}
                </span>
                 {sale.items && sale.items.length > 0 && ( // Ensure items count is available
                    <Badge variant="secondary" className="text-xs">
                        {t('sales:itemCountBadge', { count: sale.items.reduce((sum, item) => sum + item.quantity, 0) })} {/* Add key */}
                    </Badge>
                 )}
            </div>
            <p className="text-xs text-muted-foreground dark:text-gray-400 truncate">
                {sale.client_name || t('common:walkInClient')} {/* Add key */}
            </p>
            <p className="text-sm font-medium text-card-foreground dark:text-gray-200 mt-1">
                {formatCurrency(sale.total_amount)}
            </p>
             {/* Optional: Display date or a small status text here */}
             <p className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
                 {formatDate(sale.sale_date)} - {t(`sales:status_${sale.status}`)}
             </p>
        </button>
    );
};