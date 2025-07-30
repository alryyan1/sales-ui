// src/components/pos/types.ts
import { Product } from "../../services/productService";

// Cart Item Type
export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Sale Type
export interface Sale {
  id: number;
  items: CartItem[];
  total: number;
  timestamp: Date;
  transactionNumber: number;
}

// Payment Method Type
export type PaymentMethod = 'cash' | 'visa' | 'mastercard' | 'bank_transfer' | 'mada' | 'store_credit' | 'other'; 