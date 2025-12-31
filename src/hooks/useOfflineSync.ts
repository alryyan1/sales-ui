import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { offlineSaleService } from "../services/offlineSaleService";
import { backendHealthService } from "../services/backendHealthService";

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(false);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedProducts, setLastSyncedProducts] = useState<any[]>([]); // Product[] but avoiding circular dep issue if types not perfect

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    
    // Don't check backend accessibility here - rely on isOnline state instead
    // This avoids making health check requests before every sync
    if (!isOnline) {
      // Backend not accessible (based on last health check), don't sync
      return;
    }
    
    setIsSyncing(true);
    try {
    
      // processSyncQueue now returns { results, updatedProducts }
      const { updatedProducts } =
        await offlineSaleService.processSyncQueue((error) => {
          const msg =
            error?.response?.data?.message || error?.message || "Sync failed";
          toast.error(`Sync Error: ${msg}`);
        });

      if (updatedProducts && updatedProducts.length > 0) {
        setLastSyncedProducts(updatedProducts);
      }

      // Also refresh products occasionally - maybe we skip this now if we rely on partial updates
      // await offlineSaleService.initializeClients();
    } catch (error: any) {
      console.error("Sync failed:", error);
      const msg =
        error?.response?.data?.message || error?.message || "Sync failed";
      toast.error(msg);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline]);

  const checkBackend = useCallback(async () => {
    const accessible = await backendHealthService.checkBackendAccessible();
    setIsOnline(accessible);
    return accessible;
  }, []);

  useEffect(() => {
    // Initial check on mount
    checkBackend().then((accessible) => {
      if (accessible) {
        triggerSync();
      }
    });

    // Periodic health checks every 30 seconds (reduced frequency)
    // Only check health, don't trigger sync automatically
    const healthCheckInterval = setInterval(async () => {
      await checkBackend();
      // Don't auto-trigger sync - let user actions or other events trigger sync
    }, 30000); // Increased to 30 seconds

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [checkBackend]); // Removed triggerSync from dependencies to prevent loops

  return { isOnline, isSyncing, triggerSync, lastSyncedProducts };
};
