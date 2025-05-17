# Next Steps: Finalizing Core Workflows & Polishing

After thoroughly refactoring the **Product** and **Purchase** frontend components to align with the new inventory model (tracking stock in sellable units, managing costs per batch, and handling unit conversions), here’s what’s next:

---

## Path 1: Solidify Sales Flow with New Inventory Model

### Refine `SaleFormPage.tsx` / `SaleItemRow.tsx` for Unit Awareness

**Goal**: Ensure the sales process correctly uses and displays information based on sellable units and the new batch-level costing.

#### Tasks:
- **Display Units:**  
  When a product (and then a batch) is selected in `SaleItemRow`, clearly display the product’s `sellable_unit_name` next to the quantity and unit price fields.

- **Stock Display:**  
  The "Available Stock" for a batch in the product/batch combobox should show `purchase_items.remaining_quantity` (in sellable units).

- **Unit Price:**  
  The `unit_price` entered/suggested is per sellable unit. The suggestion logic (when a batch is selected) should use `selectedBatch.sale_price` (intended sale price per sellable unit for that batch) or `selectedProduct.suggested_sale_price`.

- **Quantity Input:**  
  The user enters quantity in sellable units. Validation ensures it does not exceed the selected batch’s `remaining_quantity` (sellable units).

- **COGS:**  
  Confirm the backend `SaleController@store` correctly records `sale_items.cost_price_at_sale` using `purchase_items.cost_per_sellable_unit` from the selected batch (vital for P&L).

- **Test Cases:**  
  Test adding sales with products that have different `units_per_stocking_unit` values.

---

## Path 2: Polish and Complete UI/UX (High Impact)

- **Full shadcn/ui Pagination:**  
  Implement complete pagination logic (with page numbers, ellipsis, disabled states) using shadcn’s `<Pagination>` components on all list pages:
  - Clients
  - Suppliers
  - Products
  - Purchases
  - Sales
  - Users
  - Roles
  - Categories
  - Reports
  - Stock Adjustment History

- **Refine All Asynchronous Comboboxes:**
  - Standardize behavior, loading indicators (within CommandList), "no results," and "type to search" messages for all client, supplier, and product selection comboboxes across all forms.
  - Ensure the selected item's name (not just ID) is reliably displayed in the combobox trigger after selection, especially in "edit" modes.

- **Table Enhancements:**
  - **Sorting:** Add column sorting to all main list tables.
  - **Responsiveness:** Review table display on smaller screens; implement horizontal scrolling or card views for mobile as appropriate.
  - **Consistent Error/Loading/Empty States:** Ensure user-friendly feedback for all data operations.
  - **Accessibility (a11y) Review:** Address accessibility issues.

---

## Path 3: Reporting & Dashboard Enhancements

- **Inventory Report with Batch Details:**  
  Ensure drill-down to batch details (including `cost_per_sellable_unit`, `remaining_quantity` in sellable units, expiry) is functional and clear. Add inventory valuation if not already present.

- **Profit & Loss Report Accuracy:**  
  With `sale_items.cost_price_at_sale` now reflecting the cost per sellable unit from the specific batch, verify P&L report COGS calculation accuracy.

- **Dashboard:**  
  Ensure dashboard stats (like "Low Stock Count") use `products.stock_quantity` (total sellable units) and `stock_alert_level`.

---

## **Recommendation & Immediate Next Steps**

1. **Solidify `SaleFormPage.tsx` / `SaleItemRow.tsx` (Path 1, Task 1):**  
   *Critical to ensure the core sales transaction works correctly with the new inventory unit logic and batch costing.*

2. **Implement Full shadcn/ui Pagination (Path 2, Task 2):**  
   *A fundamental UX improvement across all list pages.*

> **Start with solidifying the SaleFormPage to ensure the most important transaction that consumes your detailed inventory is accurate.**

---

**Ready to refine `SaleFormPage.tsx` and `SaleItemRow.tsx` to fully align with selling in “sellable units” and utilizing the batch-specific `cost_per_sellable_unit` and `sale_price`?**