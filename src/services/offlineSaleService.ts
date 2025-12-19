import { dbService, OfflineSale, OfflineSaleItem } from "./db";
import saleService, { CreateSaleData } from "./saleService";
import productService, { Product } from "./productService";
// import { v4 as uuidv4 } from 'uuid'; // Removed: using fallback

// Simple UUID fallback if package not available
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const offlineSaleService = {
  // --- Initialization & Sync ---

  /**
   * Initialize local DB with products from backend
   */
  initializeProducts: async () => {
    try {
      // Fetch all products (or enough for POS)
      // This might be heavy, for now we fetch page 1 with 100 limit or specialized endpoint
      // Ideally backend endpoint for "all pos products"
      const response = await productService.getProducts(
        1,
        "",
        "name",
        "asc",
        1000
      );
      // Assuming 1000 is enough for demo or MVP. Real app needs batching/sync tokens.
      if (response && response.data) {
        await dbService.saveProducts(response.data);
      }
      return true;
    } catch (error) {
      console.error("Failed to initialize products offline cache:", error);
      return false;
    }
  },

  /**
   * Process the sync queue
   */
  processSyncQueue: async (onError?: (error: any) => void) => {
    const pendingActions = await dbService.getPendingSyncActions();
    const results: { id: number; success: boolean; error?: any }[] = [];
    if (pendingActions.length === 0) return results;

    console.log(`Processing ${pendingActions.length} offline actions...`);

    for (const action of pendingActions) {
      if (!action.id) continue;

      try {
        if (action.type === "CREATE_SALE") {
          const offlineSale = action.payload as OfflineSale;

          // Convert OfflineSale to CreateSaleData for backend
          const saleData: CreateSaleData = {
            client_id: offlineSale.client_id,
            sale_date: offlineSale.sale_date,
            status: "completed", // POS sales are usually completed
            notes: offlineSale.notes,
            shift_id: offlineSale.shift_id,
            items: offlineSale.items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              purchase_item_id: item.purchase_item_id,
            })),
            payments: offlineSale.payments
              ?.filter((p) => Number(p.amount) > 0)
              .map((p) => ({
                method: p.method,
                amount: p.amount,
                payment_date: p.payment_date
                  ? p.payment_date.split("T")[0]
                  : new Date().toISOString().split("T")[0],
                notes: p.notes,
              })),
          };

          const createdSale = await saleService.createSale(saleData);

          // If successful, update local pending sale to synced
          const syncedSale: OfflineSale = {
            ...offlineSale,
            is_synced: true,
            id: createdSale.id,
            invoice_number: createdSale.invoice_number,
          };
          await dbService.savePendingSale(syncedSale);

          await dbService.removeSyncAction(action.id);
          results.push({ id: action.id, success: true });
        }
      } catch (error: any) {
        console.error("Sync action failed:", action, error);
        results.push({ id: action.id, success: false, error });
        if (onError) onError(error);
        // Implement retry logic or mark as failed
      }
    }
    return results;
  },

  // --- POS Operations (Frontend First) ---

  /**
   * Search products from local DB
   */
  searchProducts: async (query: string): Promise<Product[]> => {
    return dbService.searchProducts(query);
  },

  /**
   * Create a new temporary sale object
   */
  createDraftSale: (shiftId: number | null = null): OfflineSale => {
    return {
      tempId: generateId(),
      offline_created_at: Date.now(),
      is_synced: false,
      shift_id: shiftId,
      sale_date: new Date().toISOString().split("T")[0],
      total_amount: 0,
      paid_amount: 0,
      client_id: null,
      notes: null,
      id: 0, // Placeholder
      invoice_number: null,
      status: "draft",
      created_at: new Date().toISOString(),
      items: [],
      payments: [],
      user_id: null,
    };
  },

  /**
   * Calculate totals (simple version)
   */
  calculateTotals: (sale: OfflineSale): OfflineSale => {
    let total = 0;
    sale.items.forEach((item) => {
      // ensure numbers
      const price = Number(item.unit_price);
      const qty = Number(item.quantity);
      total += price * qty;
    });

    // Apply discount if needed (simple implementation)
    let finalTotal = total;
    if (sale.discount_amount) {
      if (sale.discount_type === "percentage") {
        finalTotal = total - total * (Number(sale.discount_amount) / 100);
      } else {
        finalTotal = total - Number(sale.discount_amount);
      }
    }

    return {
      ...sale,
      total_amount: finalTotal > 0 ? finalTotal : 0,
    };
  },

  /**
   * Complete a sale: Save to pending DB and Queue
   */
  completeSale: async (sale: OfflineSale) => {
    // 1. Save to Pending Sales (History)
    const completedSale = { ...sale, status: "completed" as const };
    await dbService.savePendingSale(completedSale);

    // 2. Add to Sync Queue
    const queueId = await dbService.addToSyncQueue({
      type: "CREATE_SALE",
      payload: completedSale,
    });

    // 3. Trigger sync immediately if online
    if (navigator.onLine) {
      const results = await offlineSaleService.processSyncQueue();
      const myResult = results.find((r) => r.id === queueId);
      if (myResult && !myResult.success) {
        // Pass the error up so UI can show it
        throw myResult.error || new Error("Sync failed");
      }
    }

    return completedSale;
  },

  /**
   * Save a draft sale without completing or syncing it
   */
  saveDraft: async (sale: OfflineSale) => {
    await dbService.savePendingSale(sale);
    return sale;
  },

  getOfflineSales: async () => {
    return await dbService.getPendingSales();
  },
};
