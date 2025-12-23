# Comprehensive Inventory & Multi-Warehouse Test Plan

This guide outlines the step-by-step process to test and verify the complete inventory management lifecycle, including multi-warehouse operations, purchases, sales, and stock transfers.

## Prerequisites

- Ensure the Backend API is running (`php artisan serve`).
- Ensure the Frontend UI is running (`npm run dev`).
- Log in as an **Admin** user.

---

## Phase 1: Warehouse Setup

**Goal:** Ensure multiple storage locations exist.

1.  **Navigate to Warehouses**:
    - Go to **Settings** > **Warehouses** (or the dedicated Warehouses page if available).
2.  **Verify/Create Warehouses**:
    - Ensure at least two warehouses exist (e.g., "Main Warehouse" and "Showroom" or "Store 2").
    - _Action_: If needed, use the "Add Warehouse" button to create a new one.
    - _Verification_: Note down the names of your warehouses.

## Phase 2: Product Creation

**Goal:** Create a product to track through the system.

1.  **Navigate to Products**:
    - Go to **Inventory** > **Products**.
2.  **Create New Product**:
    - Click **"Add Product"**.
    - **Name**: `Test Item [Date]` (e.g., `Test Phone 2024`).
    - **SKU**: `TEST-001` (Ensure it is unique).
    - **Units**:
      - Stocking Unit: `Box`
      - Sellable Unit: `Piece`
      - Conversion: `1` (Keep it simple for first test) OR `10` (if testing packs).
    - **Initial Stock**: Set to `0` (We will add stock via Purchase).
    - _Action_: Save the product.

## Phase 3: Purchasing Stock (Inbound Inventory)

**Goal:** Add stock to a specific warehouse via a Purchase.

1.  **Navigate to Purchases**:
    - Go to **Inventory** > **Purchases** (or Purchases section).
2.  **Create Purchase**:
    - Click **"New Purchase"**.
    - **Supplier**: Select any supplier.
    - **Warehouse**: **CRITICAL** - Select "Main Warehouse" (or Warehouse A).
    - **Status**: `Received` (To update stock immediately).
3.  **Add Items**:
    - Find your `Test Item`.
    - **Quantity**: `100`.
    - **Unit Cost**: `10`.
    - **Sale Price**: `20`.
    - **Expiry Date**: (Optional) Pick a date next year.
4.  **Complete Purchase**:
    - Save/Submit the purchase.
5.  **Verify Stock (Phase 3 Check)**:
    - Go back to **Products**.
    - Find `Test Item`.
    - **Total Stock Column**: Should show `100`.
    - **Warehouse Info**: Click the **(i)** button in the "Warehouses" column.
    - _Result_: Should show "Main Warehouse: 100".

## Phase 4: Selling Stock (Outbound Inventory)

**Goal:** Deduct stock from a specific warehouse via a Sale.

1.  **Navigate to POS / Sales**:
    - Go to **Sales** > **New Sale** (or POS terminal).
2.  **Configure Sale**:
    - **Warehouse**: Select "Main Warehouse" (The one with stock).
    - **Customer**: Walk-in Client.
3.  **Add Item**:
    - Search for `Test Item`.
    - **Quantity**: `10`.
4.  **Complete Sale**:
    - Process payment and complete the order.
5.  **Verify Stock (Phase 4 Check)**:
    - Go to **Products**.
    - **Total Stock**: Should now be `90` (100 - 10).
    - **Warehouse Info**: Click **(i)**.
    - _Result_: "Main Warehouse: 90".
6.  **Verify History**:
    - Click the **History Icon** (Clock) on the product row.
    - **Sales Tab**: You should see the recent sale of 10 items.

## Phase 5: Stock Transfer

**Goal:** Move stock from one warehouse to another.

1.  **Navigate to Stock Transfers**:
    - Go to **Inventory** > **Stock Transfers**.
2.  **Create Transfer**:
    - Click **"New Transfer"** (تحويل جديد).
    - **From Warehouse**: "Main Warehouse" (Currently has 90).
    - **To Warehouse**: "Showroom" (Currently has 0).
    - **Product**: Select `Test Item`.
    - **Quantity**: `20`.
    - **Date**: Today.
    - **Notes**: "Testing transfer".
3.  **Submit**:
    - Click "Transfer Stock".
4.  **Verify Stock (Phase 5 Check)**:
    - Go to **Products**.
    - **Total Stock**: Should still be `90` (Total assets haven't changed, just location).
    - **Warehouse Info**: Click **(i)**.
    - _Result_:
      - "Main Warehouse: 70" (90 - 20)
      - "Showroom: 20" (+20)

## Phase 6: Selling from Second Warehouse

**Goal:** Verify the second warehouse can now sell stock.

1.  **New Sale**:
    - Go to **Sales**.
    - **Warehouse**: Select **"Showroom"**.
2.  **Add Item**:
    - **Quantity**: `5`.
3.  **Complete Sale**.
4.  **Verify Stock (Phase 6 Check)**:
    - Go to **Products**.
    - **Total Stock**: `85` (70 + 15).
    - **Warehouse Info**:
      - "Main Warehouse: 70"
      - "Showroom: 15" (20 - 5)

## Phase 7: History & Reporting

**Goal:** Ensure all actions are logged.

1.  **Product History**:
    - Go to product list, click **History** icon.
    - **Purchases Tab**: Shows the initial 100 qty purchase.
    - **Sales Tab**: Should show TWO entries:
      1.  Sale of 10 from Main Warehouse.
      2.  Sale of 5 from Showroom.
2.  **Reports (:Optional)**:
    - Go to **Reports** > **Inventory Report**.
    - Verify the current stock value and quantities match your manual checks.

---

## Troubleshooting List

- **"Product not found in this warehouse"**: Ensure you switched the warehouse dropdown in the POS/Sale screen before searching for the product.
- **"Insufficient Stock"**: You cannot transfer 50 items if the source warehouse only has 20.
- **DataGrid Error**: If the table crashes, ensure you are not using `pageSize > 100`.
