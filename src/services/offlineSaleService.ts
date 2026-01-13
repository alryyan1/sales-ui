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
      // Fetch all products by looping through all pages
      let page = 1;
      let hasMore = true;
      const allProducts: Product[] = [];

      while (hasMore) {
        const response = await productService.getProducts(
          page,
          "",
          "name",
          "asc",
          1000, // Fetch 1000 products per page
          undefined, // categoryId
          undefined, // inStockOnly
          undefined, // lowStockOnly
          undefined, // outOfStockOnly
          warehouseId
        );

        if (response && response.data) {
          allProducts.push(...response.data);

          // Check if there are more pages
          if (response.meta && response.meta.current_page < response.meta.last_page) {
            page++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Save all products to IndexedDB
      if (allProducts.length > 0) {
        await dbService.saveProducts(allProducts);
        console.log(`Successfully cached ${allProducts.length} products`);
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
            shift_id: offlineSale.shift_id ?? null, // Explicitly send null for days mode
            discount_amount: offlineSale.discount_amount ? Number(offlineSale.discount_amount) : undefined,
            discount_type: offlineSale.discount_type || undefined,
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

          console.log("[Discount] Syncing sale to backend with discount:", {
            discount_amount: saleData.discount_amount,
            discount_type: saleData.discount_type,
            tempId: offlineSale.tempId,
          });

          const createdSale = await saleService.createSale(saleData);
          
          console.log("[Discount] Sale synced successfully, response:", {
            id: createdSale.id,
            discount_amount: createdSale.discount_amount,
            discount_type: createdSale.discount_type,
          });

          // If successful, update local pending sale to synced
          // Merge payments: prefer backend payments but ensure method field is preserved
          // Match payments by amount and date to preserve method from offline payments if backend is missing it
          const backendPayments = createdSale.payments || [];
          const offlinePayments = offlineSale.payments || [];
          
          const mergedPayments = backendPayments.map((backendPayment: any) => {
            // Try to find matching offline payment by amount and date
            const matchingOfflinePayment = offlinePayments.find(
              (offlinePayment: any) =>
                Number(offlinePayment.amount) === Number(backendPayment.amount) &&
                offlinePayment.payment_date === backendPayment.payment_date
            );
            
            return {
              ...backendPayment,
              method: backendPayment.method || matchingOfflinePayment?.method || 'cash', // Ensure method is always present
            };
          });
          
          // If backend didn't return payments but we have offline payments, use offline payments
          const finalPayments = mergedPayments.length > 0 ? mergedPayments : offlinePayments.map((p: any) => ({
            ...p,
            method: p.method || 'cash', // Ensure method is always present
          }));
          
          const syncedSale: OfflineSale = {
            ...offlineSale,
            is_synced: true,
            id: createdSale.id,
            invoice_number: createdSale.invoice_number,
            sale_order_number: createdSale.sale_order_number ?? null,
            payments: finalPayments,
            paid_amount: createdSale.paid_amount || offlineSale.paid_amount || 0, // Update paid_amount from server
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
  createDraftSale: (shiftId: number | null = null, userId: number | null = null): OfflineSale => {
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
      user_id: userId ?? null,
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

    const result = {
      ...sale,
      total_amount: finalTotal > 0 ? finalTotal : 0,
      // Explicitly preserve discount fields to ensure they're not lost
      discount_amount: sale.discount_amount,
      discount_type: sale.discount_type,
    };
    
    console.log("[Discount] calculateTotals result:", {
      discount_amount: result.discount_amount,
      discount_type: result.discount_type,
      total_amount: result.total_amount,
    });
    
    return result;
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

    // 3. Trigger sync immediately if backend is accessible
    // Import backendHealthService dynamically to avoid circular dependency
    const { backendHealthService } = await import("./backendHealthService");
    const backendAccessible = await backendHealthService.checkBackendAccessible();
    
    if (backendAccessible) {
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

  /**
   * Delete all pending (unsynced) sales from IndexedDB
   * This is typically called when opening a new shift to start fresh
   */
  deleteAllPendingSales: async () => {
    try {
      // 1. Get all sales from IndexedDB
      const allSales = await offlineSaleService.getOfflineSales();

      // 2. Filter for unsynced sales only
      const unsyncedSales = allSales.filter((sale) => !sale.is_synced);

      console.log(`Deleting ${unsyncedSales.length} unsynced sales...`);

      // 3. Delete each unsynced sale and its sync actions
      for (const sale of unsyncedSales) {
        if (sale.tempId) {
          await offlineSaleService.deletePendingSale(sale.tempId);
        }
      }

      console.log(`Successfully deleted ${unsyncedSales.length} unsynced sales`);
      return unsyncedSales.length;
    } catch (error) {
      console.error("Failed to delete all pending sales:", error);
      throw error;
    }
  },
};
