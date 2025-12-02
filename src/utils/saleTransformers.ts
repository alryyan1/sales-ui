// src/utils/saleTransformers.ts
// Utility functions to transform backend Sale data to POS format
// This centralizes all transformation logic in one place

import { Sale as BackendSale, SaleItem, Payment } from '../services/saleService';
import { Product } from '../services/productService';
import { CartItem, Sale as POSSale } from '../components/pos/types';

/**
 * Transform a backend SaleItem to CartItem format
 */
export const transformSaleItemToCartItem = (item: SaleItem): CartItem => {
  return {
    id: item.id,
    product: item.product || {
      id: item.product_id,
      name: item.product_name || 'Unknown Product',
      sku: item.product_sku || 'N/A',
      suggested_sale_price_per_sellable_unit: Number(item.unit_price),
      last_sale_price_per_sellable_unit: Number(item.unit_price),
      stock_quantity: item.current_stock_quantity || 0,
      stock_alert_level: item.stock_alert_level,
      earliest_expiry_date: item.earliest_expiry_date,
      current_stock_quantity: item.current_stock_quantity || 0,
      sellable_unit_name: item.sellable_unit_name || 'Piece'
    } as Product,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    total: Number(item.total_price || item.quantity * Number(item.unit_price)),
    selectedBatchId: item.purchase_item_id || null,
    selectedBatchNumber: item.batch_number_sold || null,
    selectedBatchExpiryDate: item.purchaseItemBatch?.expiry_date || null
  };
};

/**
 * Transform a backend Sale to POS Sale format
 */
export const transformBackendSaleToPOS = (dbSale: BackendSale): POSSale => {
  return {
    id: dbSale.id,
    sale_order_number: dbSale.sale_order_number,
    client_id: dbSale.client_id ?? null,
    client_name: dbSale.client_name,
    user_id: dbSale.user_id ?? null,
    user_name: dbSale.user_name,
    sale_date: dbSale.sale_date,
    invoice_number: dbSale.invoice_number ?? null,
    status: dbSale.status,
    total_amount: Number(dbSale.total_amount),
    paid_amount: Number(dbSale.paid_amount),
    due_amount: dbSale.due_amount ? Number(dbSale.due_amount) : undefined,
    notes: dbSale.notes ?? null,
    created_at: dbSale.created_at,
    updated_at: dbSale.updated_at,
    items: dbSale.items?.map(transformSaleItemToCartItem) || [],
    payments: dbSale.payments?.map((payment: Payment) => ({
      id: payment.id,
      sale_id: payment.sale_id,
      user_name: payment.user_name,
      method: payment.method as POSSale['payments'][0]['method'],
      amount: Number(payment.amount),
      payment_date: payment.payment_date,
      reference_number: payment.reference_number || undefined,
      notes: payment.notes || undefined,
      created_at: payment.created_at
    })) || []
  };
};

/**
 * Transform multiple backend Sales to POS format
 */
export const transformBackendSalesToPOS = (dbSales: BackendSale[]): POSSale[] => {
  return dbSales.map(transformBackendSaleToPOS);
};

/**
 * Extract CartItems from a Sale
 */
export const extractCartItemsFromSale = (sale: POSSale): CartItem[] => {
  return sale.items?.map(transformSaleItemToCartItem) || [];
};

