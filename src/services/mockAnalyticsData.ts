// src/services/mockAnalyticsData.ts
// Mock data for testing the analytics page
import { AnalyticsData, DateRange } from './analyticsService';
import dayjs from 'dayjs';

const generateDateRange = (range: DateRange) => {
  const today = dayjs();
  const dates: string[] = [];
  
  let days = 30;
  switch (range) {
    case '7days':
      days = 7;
      break;
    case '30days':
      days = 30;
      break;
    case '90days':
      days = 90;
      break;
    case '1year':
      days = 365;
      break;
  }
  
  for (let i = days - 1; i >= 0; i--) {
    dates.push(today.subtract(i, 'day').format('YYYY-MM-DD'));
  }
  
  return dates;
};

export const generateMockAnalyticsData = (range: DateRange): AnalyticsData => {
  const dates = generateDateRange(range);
  
  // Generate sales trend data
  const salesTrend = dates.map(date => ({
    date,
    amount: Math.floor(Math.random() * 5000) + 1000,
    orders: Math.floor(Math.random() * 50) + 5
  }));
  
  // Generate purchase trend data
  const purchaseTrend = dates.map(date => ({
    date,
    amount: Math.floor(Math.random() * 3000) + 500,
    orders: Math.floor(Math.random() * 20) + 2
  }));
  
  // Calculate totals
  const totalSales = salesTrend.reduce((sum, item) => sum + item.amount, 0);
  const totalPurchases = purchaseTrend.reduce((sum, item) => sum + item.amount, 0);
  const totalOrders = salesTrend.reduce((sum, item) => sum + (item.orders || 0), 0);
  
  return {
    summary: {
      total_sales_amount: totalSales,
      total_purchases_amount: totalPurchases,
      total_orders: totalOrders,
      sales_growth_percentage: Math.random() * 20 - 5, // -5% to +15%
      purchases_growth_percentage: Math.random() * 15 - 3, // -3% to +12%
      orders_growth_percentage: Math.random() * 25 - 8, // -8% to +17%
    },
    sales_trend: salesTrend,
    purchase_trend: purchaseTrend,
    top_products: [
      { id: 1, name: 'Product A', total_sold: 245, revenue: 12250, category: 'Electronics' },
      { id: 2, name: 'Product B', total_sold: 189, revenue: 9450, category: 'Accessories' },
      { id: 3, name: 'Product C', total_sold: 156, revenue: 7800, category: 'Office' },
      { id: 4, name: 'Product D', total_sold: 134, revenue: 6700, category: 'Electronics' },
      { id: 5, name: 'Product E', total_sold: 98, revenue: 4900, category: 'Home' },
    ],
    top_suppliers: [
      { id: 1, name: 'Supplier A', total_amount: 45000, total_purchases: 12 },
      { id: 2, name: 'Supplier B', total_amount: 38000, total_purchases: 8 },
      { id: 3, name: 'Supplier C', total_amount: 29000, total_purchases: 15 },
      { id: 4, name: 'Supplier D', total_amount: 22000, total_purchases: 6 },
      { id: 5, name: 'Supplier E', total_amount: 18000, total_purchases: 9 },
    ],
    sales_by_category: [
      { name: 'Electronics', amount: 45000, count: 120 },
      { name: 'Accessories', amount: 28000, count: 89 },
      { name: 'Office', amount: 18000, count: 45 },
      { name: 'Home', amount: 15000, count: 34 },
      { name: 'Others', amount: 8000, count: 23 },
    ],
    purchase_by_category: [
      { name: 'Electronics', amount: 32000, count: 28 },
      { name: 'Accessories', amount: 19000, count: 15 },
      { name: 'Office', amount: 12000, count: 12 },
      { name: 'Home', amount: 9000, count: 8 },
      { name: 'Others', amount: 5000, count: 6 },
    ],
    stock_levels: [
      { id: 1, name: 'Product A', current_stock: 245, minimum_stock: 50, status: 'good' },
      { id: 2, name: 'Product B', current_stock: 23, minimum_stock: 30, status: 'low' },
      { id: 3, name: 'Product C', current_stock: 0, minimum_stock: 20, status: 'out' },
      { id: 4, name: 'Product D', current_stock: 89, minimum_stock: 40, status: 'good' },
      { id: 5, name: 'Product E', current_stock: 12, minimum_stock: 25, status: 'low' },
    ],
    expiring_items: [
      {
        id: 1,
        product_name: 'Medicine ABC',
        batch_number: 'BATCH001',
        expiry_date: dayjs().add(5, 'day').format('YYYY-MM-DD'),
        remaining_quantity: 45,
        days_until_expiry: 5
      },
      {
        id: 2,
        product_name: 'Food Item XYZ',
        batch_number: 'BATCH002',
        expiry_date: dayjs().add(12, 'day').format('YYYY-MM-DD'),
        remaining_quantity: 23,
        days_until_expiry: 12
      },
      {
        id: 3,
        product_name: 'Cosmetic Product',
        batch_number: 'BATCH003',
        expiry_date: dayjs().add(25, 'day').format('YYYY-MM-DD'),
        remaining_quantity: 67,
        days_until_expiry: 25
      },
      {
        id: 4,
        product_name: 'Supplement DEF',
        batch_number: 'BATCH004',
        expiry_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
        remaining_quantity: 8,
        days_until_expiry: -2
      },
    ]
  };
};