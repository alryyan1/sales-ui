import { dbService, OfflineSale, OfflineSaleItem } from "./db";
import saleService, { CreateSaleData } from "./saleService";
import productService, { Product } from "./productService";
import clientService from "./clientService";
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
  initializeProducts: async (warehouseId?: number) => {
    try {
      // Fetch all products (or enough for POS)
      // This might be heavy, for now we fetch page 1 with 100 limit or specialized endpoint
      // Ideally backend endpoint for "all pos products"
      const response = await productService.getProducts(
        1,
        "",
        "name",
        "asc",
        1000,
        warehouseId
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
   * Initialize local DB with clients from backend
   */
  initializeClients: async () => {
    try {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await clientService.getClients(page);
        if (response && response.data) {
          await dbService.saveClients(response.data);
          if (response.current_page < response.last_page) {
            page++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to initialize clients offline cache:", error);
      return false;
    }
  },

  /**
   * Process the sync queue
   */
  processSyncQueue: async (onError?: (error: any) => void) => {
    const pendingActions = await dbService.getPendingSyncActions();
    const results: { id: number; success: boolean; error?: any }[] = [];
    if (pendingActions.length === 0) return { results, updatedProducts: [] };

    console.log(`Processing ${pendingActions.length} offline actions...`);

    const productsToUpdate = new Set<number>();

    for (const action of pendingActions) {
      if (!action.id) continue;

      try {
        if (action.type === "CREATE_SALE") {
          const offlineSale = action.payload as OfflineSale;

          // Convert OfflineSale to CreateSaleData for backend
          // Backend expects quantities in sellable units, so convert if needed
          const saleData: CreateSaleData = {
            client_id: offlineSale.client_id,
            sale_date: offlineSale.sale_date,
            status: "completed", // POS sales are usually completed
            notes: offlineSale.notes,
            shift_id: offlineSale.shift_id,
            items: offlineSale.items.map((item) => {
              const product = item.product as Product;
              const unitType = (item as any).unitType || "sellable";
              const unitsPerStocking = product?.units_per_stocking_unit || 1;

              // Convert quantity to sellable units if needed
              let quantityInSellable = item.quantity;
              let unitPriceInSellable = Number(item.unit_price);

              if (unitType === "stocking") {
                // Convert from stocking units to sellable units
                quantityInSellable = item.quantity * unitsPerStocking;
                // Price is per stocking unit, convert to per sellable unit
                unitPriceInSellable =
                  Number(item.unit_price) / unitsPerStocking;
              }

              return {
                product_id: item.product_id,
                quantity: quantityInSellable,
                unit_price: unitPriceInSellable,
                purchase_item_id: item.purchase_item_id,
              };
            }),
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
            sale_order_number: createdSale.sale_order_number ?? null,
          };
          await dbService.savePendingSale(syncedSale);

          await dbService.removeSyncAction(action.id);
          results.push({ id: action.id, success: true });

          // Collect product IDs to update cache
          if (offlineSale.items && offlineSale.items.length > 0) {
            offlineSale.items.forEach((item) =>
              productsToUpdate.add(item.product_id)
            );
          }
        }
      } catch (error: any) {
        console.error("Sync action failed:", action, error);
        results.push({ id: action.id, success: false, error });
        if (onError) onError(error);
        // Implement retry logic or mark as failed
      }
    }

    // Batch update cached products for synced items
    let updatedProductsList: Product[] = [];
    if (productsToUpdate.size > 0) {
      try {
        const idsToFetch = Array.from(productsToUpdate);
        console.log("Updating local cache for synced products:", idsToFetch);
        // Fetch fresh data for these products
        const updatedProducts = await productService.getProductsByIds(
          idsToFetch
        );

        if (updatedProducts && updatedProducts.length > 0) {
          await dbService.saveProducts(updatedProducts);
          console.log(
            `Successfully updated ${updatedProducts.length} products in local cache.`
          );
          updatedProductsList = updatedProducts;
        }
      } catch (updateError) {
        console.error(
          "Failed to update product cache after sync:",
          updateError
        );
        // Don't fail the sync result just because cache update failed, but log it
      }
    }

    return { results, updatedProducts: updatedProductsList };
  },

  // --- POS Operations (Frontend First) ---

  /**
   * Search products from local DB
   */
  searchProducts: async (query: string): Promise<Product[]> => {
    return dbService.searchProducts(query);
  },

  getProductById: async (id: number): Promise<Product | undefined> => {
    // Small optimization: dbService likely has a direct get method or we can implement it
    // For now, if dbService doesn't expose it, we might need to add it there.
    // But let's assume we can add it to dbService or use search for now if we can't edit db.ts easily.
    // Actually, I can edit db.ts.
    return dbService.getProduct(id);
  },

  searchClients: async (query: string) => {
    return dbService.searchClients(query);
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
      const { results } = await offlineSaleService.processSyncQueue();
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

  /**
   * Delete a pending sale and remove its sync action if it exists
   */
  deletePendingSale: async (tempId: string) => {
    // 1. Delete from Pending Sales Store
    await dbService.deletePendingSale(tempId);

    // 2. Remove from Sync Queue if present
    // We need to check both pending and processing/failed actions
    const allActions = await dbService.getPendingSyncActions();
    const actionToRemove = allActions.find(
      (a) =>
        a.type === "CREATE_SALE" && (a.payload as OfflineSale).tempId === tempId
    );

    if (actionToRemove && actionToRemove.id) {
      console.log("Removing associated sync action:", actionToRemove.id);
      await dbService.removeSyncAction(actionToRemove.id);
    }
  },
};
