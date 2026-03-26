# Inventory Management Enhancements

### What's Next?

**Reporting, and Polish**

---

## Path 1: Reporting Enhancements (Leveraging Batch Data)

### Inventory Report (`InventoryReportPage.tsx`)

- Ensure the batch detail drill-down (using `<Collapsible>`) works smoothly and accurately displays:
    - `batch_number`
    - `remaining_quantity`
    - `expiry_date`
    - `unit_cost` for each batch of a product.
- Add "Inventory Value by Batch" calculation (`remaining_quantity * unit_cost`).
- Consider adding filters for expiry dates (e.g., "Expiring Soon").

---

## Path 2: Profit & Loss Report (`ProfitLossReportPage.tsx`)

- Verify the COGS calculation is accurately using the `unit_cost` from the specific `PurchaseItem` batch linked to each `SaleItem`. This is the core benefit of batch tracking for P&L.

---

## Path 3: New Report: Batch Traceability Report

**Goal:**  
For a given batch (or product), trace its lifecycle: when it was purchased, how much was sold (in which sales), any adjustments, and current remaining stock.

**Backend:**  
Complex query joining `purchase_items` with `sale_items` (via `purchase_item_id`) and `stock_adjustments` (via `purchase_item_id`).

**Frontend:**  
Page with filters (product, batch number) displaying the trace.

---

## Path 4: General Polish & Production Readiness

- **Full `shadcn/ui` Pagination:** Implement everywhere.
- **Testing:** Especially the batch-aware sales flows.
- **UI/UX Consistency & Responsiveness**

---

## Recommendation

1. **Enhance the Inventory Report (Path 1, Task 1):**  
     Display batch details to provide immediate visibility into more granular inventory.

2. **Next Steps:**  
     Creating a unified `InventoryLogPage` or the Batch Traceability Report (Task 3) would be excellent for advanced inventory analysis.

---

Ready to define these routes and navigation links with permission checks?