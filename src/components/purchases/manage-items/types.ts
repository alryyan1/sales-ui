// src/components/purchases/manage-items/types.ts

export interface AddPurchaseItemData {
  product_id: number;
  quantity: number;
  unit_cost: number;
  sale_price: number;
  sale_price_stocking_unit?: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface PurchaseSummary {
  totalCost: number;
  totalSell: number;
  totalItems: number;
  totalQuantity: number;
}

export interface ProductUnitsMap {
  [productId: number]: {
    stocking_unit_name?: string | null;
    sellable_unit_name?: string | null;
  };
}
