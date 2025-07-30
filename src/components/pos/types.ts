// src/components/pos/types.ts
import { Product } from "../../services/productService";

// Cart Item Type
export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Payment Type (matching backend PaymentResource)
export interface SalePayment {
  id?: number;
  sale_id?: number;
  user_name?: string;
  method: PaymentMethod;
  amount: number;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  created_at?: string;
}

// Sale Type (updated to include payments)
export interface Sale {
  id: number;
  sale_order_number?: number;
  client_id?: number | null;
  client_name?: string;
  user_id?: number | null;
  user_name?: string;
  sale_date: string;
  invoice_number?: string | null;
  status: 'completed' | 'pending' | 'draft' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  due_amount?: number;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  items: CartItem[];
  payments?: SalePayment[];
  timestamp: Date; // For compatibility with existing code
}

// Payment Method Type
export type PaymentMethod = 'cash' | 'visa' | 'mastercard' | 'bank_transfer' | 'mada' | 'store_credit' | 'other' | 'refund';

// Payment Method Data Type (for payment objects with amount and reference)
export interface PaymentMethodData {
  method: PaymentMethod;
  amount: number;
  reference?: string;
} 