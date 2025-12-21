---
description: Comprehensive guide to testing multi-warehouse inventory management and POS batch selection
---

# Multi-Inventory Testing Workflow

This workflow guides you through verifying the multi-warehouse inventory system, from creating warehouses and receiving stock to selling specific batches via the POS.

## Prerequisites

- access to the Admin account
- `npm run dev` running for `sales-ui`

## Step 1: Create Warehouses

1. Navigate to **Admin** > **Warehouses** (`/admin/warehouses`).
2. Click **Add Warehouse**.
3. Create **"Warehouse A"** (Main Store).
4. Click **Add Warehouse** again.
5. Create **"Warehouse B"** (Secondary Store).

## Step 2: Create a Test Product

1. Navigate to **Products** (`/products`).
2. Click **Add Product**.
3. Create a product named **"Multi-Batch Widget"** (or use an existing one).
4. Ensure it is set to "Stockable" (Monitor Stock).

## Step 3: Receive Stock (Purchases)

Simulate receiving stock into different physical locations.

1. Navigate to **Purchases** > **Add Purchase** (`/purchases/add`).

   - **Warehouse**: Select **"Warehouse A"**.
   - **Supplier**: Select any supplier.
   - **Item**: "Multi-Batch Widget".
   - **Quantity**: `10`.
   - **Unit Cost**: `100`.
   - **Status**: "Received".
   - Click **Create Purchase**.

2. Create a second purchase:
   - **Warehouse**: Select **"Warehouse B"**.
   - **Item**: "Multi-Batch Widget" (Same product).
   - **Quantity**: `5`.
   - **Unit Cost**: `110` (Different cost to verify batch tracking).
   - **Status**: "Received".
   - Click **Create Purchase**.

## Step 4: Verify Aggregate Stock

1. Go to the **Products** page (`/products`).
2. Locate "Multi-Batch Widget".
3. Verify the **Stock Quantity** column shows **15** (10 + 5).

## Step 5: Process Sale via POS

Sell stock and verify you can choose which warehouse/batch to pull from.

1. Navigate to **Sales** > **POS** (`/sales/pos`).
2. Search for "Multi-Batch Widget".
3. **Batch Selection**:
   - Since the product has multiple batches (from Warehouse A and B), a **Batch Selection Dialog** should automatically appear.
   - You should see two rows:
     - Row 1: Qty 10 (Warehouse A)
     - Row 2: Qty 5 (Warehouse B)
4. Select the batch with **Qty 10** (Warehouse A).
5. Complete the sale (Cash/Card).

## Step 6: Verify Stock Deduction

1. Navigate back to **Products**.
2. "Multi-Batch Widget" should now show **14** remaining.
3. (Optional) Check **Inventory Report** or **Inventory Log** to confirm the deduction was specifically from Warehouse A's batch.
