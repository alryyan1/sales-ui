import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
// ... (imports)

// ... (existing code: ShiftStats, ShiftData, saveShiftToFirestore)

export const uploadProductsToFirestore = async (products: any[]) => {
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
        // Firestore structure: Collection (one_care) -> Document (products) -> Collection (products) -> Document ({id})
        const docRef = doc(
          db,
          "one_care",
          "products",
          "products", // subcollection
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
  stats?: ShiftStats;
}

export const saveShiftToFirestore = async (data: ShiftData) => {
  try {
    // Firestore structure: Collection (one_care) -> Document (shifts) -> Collection (shifts) -> Document ({shift_id})
    // Note: User manually set this path structure. Ensure it has even number of segments (4).
    const docRef = doc(
      db,
      "one_care",
      "shifts",
      "shifts", // subcollection
      `${data.shift_id}`,
    );

    // Firestore does not accept undefined values. Convert undefined to null.
    const sanitizedData = JSON.parse(JSON.stringify(data));

    await setDoc(docRef, {
      ...sanitizedData,
      // explicit check for optional fields just in case JSON.stringify misses something (though it removes undefined keys, spreading them back might be tricky if we want them as null).
      // actually JSON.stringify removes undefined keys. setDoc with { ... } will just omit them.
      // But user error says "Unsupported field value: undefined (found in field closed_at)".
      // This means the object passed HAS the key "closed_at" with value undefined.
      // Easiest fix is to manually clean the object or use a helper.
      // Let's just default optional fields to null if they are seemingly undefined/missing.
      user_name: data.user_name || null,
      opened_at: data.opened_at || null,
      closed_at: data.closed_at || null,
      stats: data.stats || null,
      created_at: serverTimestamp(),
    });
    console.log("Document written at: ", docRef.path);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};
