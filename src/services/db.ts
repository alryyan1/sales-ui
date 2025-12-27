import { Product } from "./productService";
import { AppSettings } from "./settingService";
import { Sale, SaleItem } from "./saleService";

// Database version
const DB_VERSION = 3;
const DB_NAME = "SalesPosOfflineDB";

// Store names
export const STORES = {
  PRODUCTS: "products",
  CLIENTS: "clients",
  PENDING_SALES: "pending_sales",
  SYNC_QUEUE: "sync_queue",
  SETTINGS: "settings",
};

export interface SyncAction {
  id?: number;
  type: "CREATE_SALE" | "UPDATE_SALE" | "DELETE_SALE" | "UPDATE_PRODUCT_STOCK";
  payload: any;
  timestamp: number;
  status: "pending" | "processing" | "failed";
  retryCount: number;
}

export interface OfflineSale
  extends Omit<Sale, "id" | "sale_order_number" | "client_name"> {
  id?: number; // ID from backend when synced
  tempId: string; // Temporary ID for offline reference
  offline_created_at: number;
  is_synced: boolean;
  shift_id?: number | null;
  client_id: number | null;
  client_name?: string | null;
  items: OfflineSaleItem[];
  sale_order_number?: number | null;
}

export interface OfflineSaleItem extends SaleItem {
  tempId?: string;
}

class IndexedDBService {
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, dbVersion: number) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        reject(
          "Database error: " + (event.target as IDBOpenDBRequest).error?.message
        );
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create Products Store (for searching offline)
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, {
            keyPath: "id",
          });
          productStore.createIndex("name", "name", { unique: false });
          productStore.createIndex("sku", "sku", { unique: false });
          productStore.createIndex("category_id", "category_id", {
            unique: false,
          });
        }

        // Create Clients Store
        if (!db.objectStoreNames.contains(STORES.CLIENTS)) {
          const clientStore = db.createObjectStore(STORES.CLIENTS, {
            keyPath: "id",
          });
          clientStore.createIndex("name", "name", { unique: false });
          clientStore.createIndex("phone", "phone", { unique: false });
        }

        // Create Pending Sales Store
        if (!db.objectStoreNames.contains(STORES.PENDING_SALES)) {
          const saleStore = db.createObjectStore(STORES.PENDING_SALES, {
            keyPath: "tempId",
          });
          saleStore.createIndex("created_at", "offline_created_at", {
            unique: false,
          });
          saleStore.createIndex("is_synced", "is_synced", { unique: false });
        }

        // Create Sync Queue Store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: "id",
            autoIncrement: true,
          });
          syncStore.createIndex("status", "status", { unique: false });
          syncStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  // Generic helper for transactions
  private async getStore(
    storeName: string,
    mode: IDBTransactionMode
  ): Promise<IDBObjectStore> {
    const db = await this.open();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- PRODUCTS ---

  async saveProducts(products: Product[]): Promise<void> {
    const store = await this.getStore(STORES.PRODUCTS, "readwrite");
    return new Promise((resolve, reject) => {
      const transaction = store.transaction;
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e);

      // Clear existing first? Maybe inefficient. For now, we put/update.
      // If we want to fully sync, we might want to clear old ones or handle deletions.
      // simpler: just put all.
      products.forEach((product) => {
        store.put(product);
      });
    });
  }

  async getAllProducts(): Promise<Product[]> {
    const store = await this.getStore(STORES.PRODUCTS, "readonly");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    const allProducts = await this.getAllProducts();
    if (!query) return allProducts;

    const lowerQuery = query.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.sku && p.sku.toLowerCase().includes(lowerQuery))
    );
  }

  // --- CLIENTS ---

  async saveClients(clients: any[]): Promise<void> {
    const store = await this.getStore(STORES.CLIENTS, "readwrite");
    return new Promise((resolve, reject) => {
      const transaction = store.transaction;
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e);

      clients.forEach((client) => {
        store.put(client);
      });
    });
  }

  async getAllClients(): Promise<any[]> {
    const store = await this.getStore(STORES.CLIENTS, "readonly");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async searchClients(query: string): Promise<any[]> {
    const allClients = await this.getAllClients();
    if (!query) return allClients;

    const lowerQuery = query.toLowerCase();
    return allClients.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        (c.phone && c.phone.includes(lowerQuery))
    );
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const store = await this.getStore(STORES.PRODUCTS, "readonly");
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- SALES ---

  async savePendingSale(sale: OfflineSale): Promise<string> {
    const store = await this.getStore(STORES.PENDING_SALES, "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.put(sale);
      request.onsuccess = () => resolve(sale.tempId);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSales(): Promise<OfflineSale[]> {
    const store = await this.getStore(STORES.PENDING_SALES, "readonly");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePendingSale(tempId: string): Promise<void> {
    const store = await this.getStore(STORES.PENDING_SALES, "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.delete(tempId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- SYNC QUEUE ---

  async addToSyncQueue(
    action: Omit<SyncAction, "id" | "timestamp" | "status" | "retryCount">
  ): Promise<number> {
    const store = await this.getStore(STORES.SYNC_QUEUE, "readwrite");
    return new Promise((resolve, reject) => {
      const fullAction: Omit<SyncAction, "id"> = {
        ...action,
        timestamp: Date.now(),
        status: "pending",
        retryCount: 0,
      };
      const request = store.add(fullAction);
      request.onsuccess = (e) => resolve((e.target as IDBRequest).result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncActions(): Promise<SyncAction[]> {
    const store = await this.getStore(STORES.SYNC_QUEUE, "readonly");

    // We want to process them in order
    return new Promise((resolve, reject) => {
      // Filter manually or use index
      const request = store.getAll(); // Get all is fine for queue size usually
      request.onsuccess = () => {
        const actions = request.result as SyncAction[];
        resolve(
          actions
            .filter((a) => a.status === "pending" || a.status === "failed")
            .sort((a, b) => a.timestamp - b.timestamp)
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncAction(id: number): Promise<void> {
    const store = await this.getStore(STORES.SYNC_QUEUE, "readwrite");

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  // --- SETTINGS ---

  async saveSettings(settings: AppSettings): Promise<void> {
    const store = await this.getStore(STORES.SETTINGS, "readwrite");
    return new Promise((resolve, reject) => {
      const transaction = store.transaction;
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e);
      store.put({ ...settings, id: "current" });
    });
  }

  async getSettings(): Promise<AppSettings | null> {
    const store = await this.getStore(STORES.SETTINGS, "readonly");
    return new Promise((resolve, reject) => {
      const request = store.get("current");
      request.onsuccess = () =>
        resolve((request.result as AppSettings) || null);
      request.onerror = () => reject(request.error);
    });
  }

  // --- UTILS (Admin) ---

  async clearStore(storeName: string): Promise<void> {
    const store = await this.getStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFromStore(storeName: string): Promise<any[]> {
    const store = await this.getStore(storeName, "readonly");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new IndexedDBService(DB_NAME, DB_VERSION);
