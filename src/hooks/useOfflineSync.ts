import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { offlineSaleService } from '../services/offlineSaleService';

export const useOfflineSync = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            triggerSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial sync on mount if online
        if (navigator.onLine) {
            triggerSync();
        }

        // Periodic sync every minute
        const interval = setInterval(() => {
            if (navigator.onLine) {
                triggerSync();
            }
        }, 60000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const triggerSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            await offlineSaleService.processSyncQueue((error) => {
                const msg = error?.response?.data?.message || error?.message || "Sync failed";
                toast.error(`Sync Error: ${msg}`);
            });
            // Also refresh products occasionally
            await offlineSaleService.initializeProducts();
        } catch (error: any) {
            console.error("Sync failed:", error);
            const msg = error?.response?.data?.message || error?.message || "Sync failed";
            toast.error(msg);
        } finally {
            setIsSyncing(false);
        }
    };

    return { isOnline, isSyncing, triggerSync };
};
