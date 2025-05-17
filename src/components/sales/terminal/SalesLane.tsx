// src/components/sales/terminal/SalesLane.tsx
import React from 'react';
import { Sale } from '@/services/saleService'; // Adjust path
import { SaleCard } from './SaleCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';

interface SalesLaneProps {
    sales: Sale[];
    activeSaleId: number | 'new' | null;
    onSelectSale: (id: number | 'new') => void;
}

export const SalesLane: React.FC<SalesLaneProps> = ({ sales, activeSaleId, onSelectSale }) => {
    const { t } = useTranslation('sales');
    if (sales.length === 0) {
        return <div className="p-4 text-center text-sm text-muted-foreground">{t('sales:noSalesToday')}</div>; // Add key
    }
    return (
        <div className="p-2 space-y-1"> {/* Reduced padding and spacing for tighter fit */}
            {sales.map(sale => (
                <SaleCard
                    key={sale.id}
                    sale={sale}
                    isActive={activeSaleId === sale.id}
                    onSelect={() => onSelectSale(sale.id)}
                />
            ))}
        </div>
    );
};