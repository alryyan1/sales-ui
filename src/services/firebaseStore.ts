import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
// ... (imports)

// ... (existing code: ShiftStats, ShiftData, saveShiftToFirestore)

export const uploadSuppliersToFirestore = async (
  suppliers: Array<{
    id: number;
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    total_debit?: number | null;
    total_credit?: number | null;
    balance?: number | null;
  }>,
  collectionName: string = "one_care",
) => {
  try {
    const BATCH_SIZE = 450;
    const chunks = [];
    for (let i = 0; i < suppliers.length; i += BATCH_SIZE) {
      chunks.push(suppliers.slice(i, i + BATCH_SIZE));
    }

    let totalUploaded = 0;

    for (const chunk of chunks) {
      const batch = writeBatch(db);

      chunk.forEach((supplier) => {
        const docRef = doc(
          db,
          "pharmacies",
          collectionName,
          "suppliers",
          `${supplier.id}`,
        );

        batch.set(
          docRef,
          {
            id: supplier.id,
            name: supplier.name,
            contact_person: supplier.contact_person ?? null,
            phone: supplier.phone ?? null,
            email: supplier.email ?? null,
            address: supplier.address ?? null,
            total_debit: supplier.total_debit ?? null,
            total_credit: supplier.total_credit ?? null,
            balance: supplier.balance ?? null,
            synced_at: serverTimestamp(),
          },
          { merge: true },
        );
      });

      await batch.commit();
      totalUploaded += chunk.length;
    }

    return totalUploaded;
  } catch (e) {
    console.error("Error uploading suppliers batch:", e);
    throw e;
  }
};

export const uploadClientsToFirestore = async (
  clients: Array<{
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    balance?: number | null;
    total_debit?: number | null;
    total_credit?: number | null;
  }>,
  collectionName: string = "one_care",
) => {
  try {
    const BATCH_SIZE = 450;
    const chunks = [];
    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      chunks.push(clients.slice(i, i + BATCH_SIZE));
    }

    let totalUploaded = 0;

    for (const chunk of chunks) {
      const batch = writeBatch(db);

      chunk.forEach((client) => {
        const docRef = doc(
          db,
          "pharmacies",
          collectionName,
          "clients",
          `${client.id}`,
        );

        batch.set(
          docRef,
          {
            id: client.id,
            name: client.name,
            phone: client.phone ?? null,
            email: client.email ?? null,
            address: client.address ?? null,
            balance: client.balance ?? null,
            total_debit: client.total_debit ?? null,
            total_credit: client.total_credit ?? null,
            synced_at: serverTimestamp(),
          },
          { merge: true },
        );
      });

      await batch.commit();
      totalUploaded += chunk.length;
    }

    return totalUploaded;
  } catch (e) {
    console.error("Error uploading clients batch:", e);
    throw e;
  }
};

export const uploadProductsToFirestore = async (
  products: any[],
  collectionName: string = "one_care",
) => {
  try {
    const BATCH_SIZE = 450; // Firestore limit is 500, keep margin
    const chunks = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      chunks.push(products.slice(i, i + BATCH_SIZE));
    }

    console.log(
      `Starting upload of ${products.length} products in ${chunks.length} batches...`,
    );

    let totalUploaded = 0;

    for (const chunk of chunks) {
      const batch = writeBatch(db);

      chunk.forEach((product: any) => {
        // Firestore structure: pharmacies -> {collectionName} -> products -> {id}
        const docRef = doc(
          db,
          "pharmacies",
          collectionName,
          "products",
          `${product.id}`,
        );

        // Map relevant fields and sanitize
        // Ensure undefined values become null
        const data = {
          id: product.id,
          name: product.name,
          scientific_name: product.scientific_name || null,
          sku: product.sku || null,
          description: product.description || null,
          category_name:
            product.category?.name || product.category_name || null,

          // Prices & Stock
          stock_quantity: Number(
            product.current_stock_quantity ?? product.stock_quantity ?? 0,
          ),
          sale_price: Number(product.suggested_sale_price ?? 0),
          cost: Number(product.latest_purchase_cost ?? 0),

          // Dates
          expiry_date: product.earliest_expiry_date || null,

          // Metadata
          updated_at: serverTimestamp(),
          synced_at: new Date().toISOString(),
        };

        // Add to batch
        batch.set(docRef, data, { merge: true });
      });

      await batch.commit();
      totalUploaded += chunk.length;
      console.log(`Uploaded batch: ${totalUploaded}/${products.length}`);
    }

    return totalUploaded;
  } catch (e) {
    console.error("Error uploading products batch: ", e);
    throw e;
  }
};

import { db } from "../firebase";

interface StatBreakdown {
  cash: number;
  bankak: number;
  fawry: number;
  ocash: number;
  total: number;
}

export interface ShiftStats {
  sales: StatBreakdown;
  expenses: StatBreakdown;
  returns: StatBreakdown;
  net: StatBreakdown;
}

export interface ShiftData {
  shift_id: number;
  user_id: number;
  user_name?: string;
  opened_at?: string;
  closed_at?: string;
  pdf_url: string;
  cost_pdf_url?: string;
  sold_items_pdf_url?: string;
  returns_pdf_url?: string;
  stats?: ShiftStats;
}

export const saveShiftToFirestore = async (
  data: ShiftData,
  collectionName: string = "one_care",
) => {
  try {
    // Firestore structure: pharmacies -> {collectionName} -> shifts -> {shift_id}
    const docRef = doc(
      db,
      "pharmacies",
      collectionName,
      "shifts",
      `${data.shift_id}`,
    );

    // Firestore does not accept undefined values. Convert undefined to null.
    const sanitizedData = JSON.parse(JSON.stringify(data));

    await setDoc(docRef, {
      ...sanitizedData,
      user_name: data.user_name || null,
      opened_at: data.opened_at || null,
      closed_at: data.closed_at || null,
      stats: data.stats || null,
      cost_pdf_url: data.cost_pdf_url || null,
      sold_items_pdf_url: data.sold_items_pdf_url || null,
      returns_pdf_url: data.returns_pdf_url || null,
      created_at: serverTimestamp(),
    });
    console.log("Document written at: ", docRef.path);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export interface SaleData {
  id: number;
  number?: number | null;
  client_id: number | null;
  client_name?: string | null;
  user_id: number | null;
  user_name?: string | null;
  shift_id?: number | null;
  sale_date: string;
  invoice_number: string | null;
  status?: string | null;
  total_amount: number | string;
  subtotal?: number | string | null;
  paid_amount: number | string;
  due_amount?: number | string | null;
  discount_amount?: number | string | null;
  discount_type?: string | null;
  is_returned?: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
  items?: Array<{
    id?: number | null;
    product_id: number;
    product_name?: string | null;
    quantity: number;
    unit_price: number | string;
    total_price?: number | string | null;
    cost_price_at_sale?: number | string | null;
    returned_quantity?: number | null;
  }> | null;
  payments?: Array<{
    id?: number | null;
    method: string;
    amount: number | string;
    payment_date?: string | null;
    reference_number?: string | null;
    notes?: string | null;
  }> | null;
}

export const saveSaleToFirestore = async (
  data: SaleData,
  collectionName: string = "one_care",
): Promise<string> => {
  try {
    // Firestore structure: pharmacies -> {collectionName} -> sales -> {sale_id}
    const docRef = doc(db, "pharmacies", collectionName, "sales", `${data.id}`);

    // Firestore does not accept undefined values. Convert undefined to null.
    const sanitized = JSON.parse(JSON.stringify(data));

    await setDoc(
      docRef,
      {
        ...sanitized,
        client_name:    data.client_name    ?? null,
        user_name:      data.user_name      ?? null,
        shift_id:       data.shift_id       ?? null,
        invoice_number: data.invoice_number ?? null,
        status:         data.status         ?? null,
        notes:          data.notes          ?? null,
        updated_at:     data.updated_at     ?? null,
        items:          sanitized.items     ?? null,
        payments:       sanitized.payments  ?? null,
        synced_at: serverTimestamp(),
      },
      { merge: true },
    );

    console.log("Sale synced to Firestore:", docRef.path);
    return docRef.id;
  } catch (e) {
    console.warn("saveSaleToFirestore failed:", e);
    throw e;
  }
};
