import { useEffect, useState } from "react";
import { toast } from "sonner";
import { offlineSaleService } from "../services/offlineSaleService";

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedProducts, setLastSyncedProducts] = useState<any[]>([]); // Product[] but avoiding circular dep issue if types not perfect

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

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
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // processSyncQueue now returns { results, updatedProducts }
      const { results, updatedProducts } =
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
  };

  return { isOnline, isSyncing, triggerSync, lastSyncedProducts };
};
