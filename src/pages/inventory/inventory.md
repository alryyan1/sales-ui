# Inventory Management Enhancements



### What's Next?

**Completing the Stock Requisition Workflow, Reporting, and Polish**

We have built the core components for creating and processing stock requisitions. The next steps involve tying everything together, adding a history view for these actions, and moving toward broader system enhancements.

---

## Path 1: Complete the Stock Requisition Workflow & UI

### Implement `StockAdjustmentsListPage.tsx` (Renamed to `StockMovementLogPage.tsx` or `InventoryLogPage.tsx`?)

**Goal:**  
The `StockAdjustmentsListPage` was initially designed for manual adjustments. Now, we need a page that logs all inventory movements, including:

- **Purchases** (Stock In)
- **Sales** (Stock Out - from specific batches)
- **Stock Requisitions Issued** (Stock Out - from specific batches)
- **Manual Stock Adjustments** (Stock In/Out)
- **(Future)** Sale Returns (Stock In - to specific batches or general)

**Backend:**  
This likely requires a new `ReportController` method or a dedicated `InventoryLogController` to query across `purchase_items`, `sale_items`, `stock_requisition_items`, and `stock_adjustments` tables, presenting a unified log. Each log entry should include:

- Date
- Type (Purchase, Sale, Adjustment, Requisition Issue)
- Product
- Batch No.
- Quantity Change (+/-)
- User
- Reason/Reference

This will involve a complex query.

**Frontend:**  
A page with filters (date, product, movement type) and a table displaying the unified inventory log.

**Alternative (Simpler):**  
Keep `StockAdjustmentsListPage.tsx` for manual adjustments only, and create separate viewable histories or details within the Purchase, Sale, and Stock Requisition modules themselves.

---

### Navigation & Permissions for Stock Requisitions

- Ensure **"Request Stock"** (`RequestStockPage.tsx`) is linked and visible to users with `request-stock` permission.
- Ensure **"Manage Stock Requisitions"** (`ManageStockRequisitionsListPage.tsx`) is linked and visible to users with `process-stock-requisitions` permission (e.g., under an "Admin" or "Inventory" menu).
- The **"Process"** button on `ManageStockRequisitionsListPage.tsx` should correctly navigate to `ProcessRequisitionPage.tsx`.

---

### Refine `ProcessRequisitionPage.tsx`

- Test the batch selection and issued quantity validation within each item row.
- Ensure the auto-calculation of the overall requisition status in `onSubmit` is robust.
- Improve loading indicators within the item rows when fetching batches.

---

## Path 2: Reporting Enhancements (Leveraging Batch Data)

### Inventory Report (`InventoryReportPage.tsx`)

- Ensure the batch detail drill-down (using `<Collapsible>`) works smoothly and accurately displays:
    - `batch_number`
    - `remaining_quantity`
    - `expiry_date`
    - `unit_cost` for each batch of a product.
- Add "Inventory Value by Batch" calculation (`remaining_quantity * unit_cost`).
- Consider adding filters for expiry dates (e.g., "Expiring Soon").

---

### Profit & Loss Report (`ProfitLossReportPage.tsx`)

- Verify the COGS calculation is accurately using the `unit_cost` from the specific `PurchaseItem` batch linked to each `SaleItem`. This is the core benefit of batch tracking for P&L.

---

### New Report: Batch Traceability Report

**Goal:**  
For a given batch (or product), trace its lifecycle: when it was purchased, how much was sold (in which sales), how much was issued via requisitions, any adjustments, and current remaining stock.

**Backend:**  
Complex query joining `purchase_items` with `sale_items` (via `purchase_item_id`), `stock_requisition_items` (via `issued_from_purchase_item_id`), and `stock_adjustments` (via `purchase_item_id`).

**Frontend:**  
Page with filters (product, batch number) displaying the trace.

---

## Path 3: General Polish & Production Readiness

- **Full `shadcn/ui` Pagination:** Implement everywhere.
- **Testing:** Especially the new stock requisition and batch-aware sales flows.
- **UI/UX Consistency & Responsiveness**

---

## Recommendation

1. **Complete the Basic Stock Requisition Workflow (Path 1, Tasks 2 & 3):**  
     Ensure users can request stock, and managers can view and process these requests accurately, including batch selection for issuance. This completes a major internal inventory management feature.

2. **Enhance the Inventory Report (Path 2, Task 4):**  
     Display batch details to provide immediate visibility into more granular inventory.

3. **Next Steps:**  
     After these, creating a unified `InventoryLogPage` (Task 1 - revised) or the Batch Traceability Report (Task 6) would be excellent for advanced inventory analysis.

---

### Focus Area

Ensure the navigation and permissions for the existing Stock Requisition pages (`RequestStockPage` and `ManageStockRequisitionsListPage`) are correctly set up in `RootLayout.tsx` and `router.tsx`.

Ready to define these routes and navigation links with permission checks?