// src/components/reports/inventory/InventoryReportTable.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Edit, AlertTriangle } from "lucide-react";
// Removed Badge as not used in this specific version, but can be added back if needed

// Child Component for batch details
import { InventoryBatchDetailsTable } from "./InventoryBatchDetailsTable"; // Ensure this path is correct

// Types
import {
  Product as ProductType,
  PurchaseItem as PurchaseItemType,
} from "@/services/productService"; // Ensure ProductType includes available_batches
import { formatNumber, formatCurrency } from "@/constants";

// Interface for Product with potentially loaded batches
// This should match the structure of data coming from the API for this report
interface ProductWithBatches extends ProductType {
  available_batches?: PurchaseItemType[]; // Backend should provide this when 'include_batches' is true
  // Ensure ProductType itself has:
  // sku, name, stock_quantity, stock_alert_level,
  // latest_cost_per_sellable_unit, suggested_sale_price_per_sellable_unit,
  // sellable_unit_name
}

interface InventoryReportTableProps {
  products: ProductWithBatches[];
  isLoading?: boolean; // To disable actions if parent is still loading something else (e.g., filters)
  // fetchBatchesForProduct?: (productId: number) => Promise<void>; // For on-demand batch loading (more advanced)
}

export const InventoryReportTable: React.FC<InventoryReportTableProps> = ({
  products,
  isLoading = false, // Default to false
  // fetchBatchesForProduct
}) => {
  const { t } = useTranslation(["reports", "products", "common", "purchases"]);
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({}); // Tracks expanded rows by productId

  const toggleRow = (productId: number) => {
    setOpenRows((prev) => ({ ...prev, [productId]: !prev[productId] }));
    // If implementing on-demand batch loading:
    // const product = products.find(p => p.id === productId);
    // if (!prev[productId] && fetchBatchesForProduct && product && (!product.available_batches || product.available_batches.length === 0)) {
    //     fetchBatchesForProduct(productId);
    // }
  };

  if (products.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground dark:text-gray-400">
        {t("common:noResultsFound", { term: t("products:products") })}{" "}
        {/* Add key */}
      </div>
    );
  }

  return (
    <Table className="min-w-full">
      {" "}
      {/* Ensure table can take full width */}
      <TableHeader>
        <TableRow className="dark:border-gray-700">
          <TableHead className="w-[40px] px-2"></TableHead>{" "}
          {/* For expand icon */}
          <TableHead className="px-2 py-3">{t("products:sku")}</TableHead>
          <TableHead className="px-2 py-3 min-w-[200px]">
            {t("products:name")}
          </TableHead>{" "}
          {/* Give name more space */}
          <TableHead className="text-center px-2 py-3">
            {t("products:totalStock")} ({t("products:sellableUnits")})
          </TableHead>
          <TableHead className="text-center px-2 py-3">
            {t("products:stockAlertLevel")}
          </TableHead>
          <TableHead className="text-right px-2 py-3">
            {t("products:latestCostPerSellableUnit")}
          </TableHead>
          <TableHead className="text-right px-2 py-3">
            {t("products:suggestedSalePricePerSellableUnit")}
          </TableHead>
          
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const isLow =
            product.stock_alert_level !== null &&
            product.stock_quantity <= product.stock_alert_level;
          const isOutOfStock = product.stock_quantity <= 0;
          const hasBatches =
            product.available_batches && product.available_batches.length > 0;
          const isOpen = !!openRows[product.id];
          const sellableUnitName =
            product.sellable_unit_name || t("products:defaultSellableUnit");

          return (
            <React.Fragment key={product.id}>
              <TableRow
                data-state={isOpen ? "open" : "closed"}
                className={cn(
                  "dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-700/30",
                  isLow &&
                    !isOutOfStock &&
                    "bg-orange-50 dark:bg-orange-900/40 hover:bg-orange-100/80 dark:hover:bg-orange-800/60",
                  isOutOfStock &&
                    "bg-red-50 dark:bg-red-900/40 hover:bg-red-100/80 dark:hover:bg-red-800/60"
                )}
              >
                <TableCell className="px-2 py-2">
                  {hasBatches ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRow(product.id)}
                      className="h-8 w-8 data-[state=open]:bg-accent"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {isOpen ? t("common:collapse") : t("common:expand")}
                      </span>{" "}
                      {/* Add keys */}
                    </Button>
                  ) : (
                    <div className="w-8"></div> // Placeholder for alignment
                  )}
                </TableCell>
                <TableCell className="px-2 py-3 dark:text-gray-300">
                  {product.sku || "---"}
                </TableCell>
                <TableCell className="px-2 py-3 font-medium dark:text-gray-100">
                  {product.name}
                </TableCell>
                <TableCell className="text-center px-2 py-3 dark:text-gray-100">
                  {formatNumber(product.stock_quantity)} {sellableUnitName}
                  {(isLow || isOutOfStock) && (
                    <AlertTriangle className="inline ms-1 h-4 w-4 text-orange-500" />
                  )}
                </TableCell>
                <TableCell className="text-center px-2 py-3 dark:text-gray-300">
                  {product.stock_alert_level !== null
                    ? `${formatNumber(
                        product.stock_alert_level
                      )} ${sellableUnitName}`
                    : "---"}
                </TableCell>
                <TableCell className="text-right px-2 py-3 dark:text-gray-100">
                  {product.latest_cost_per_sellable_unit
                    ? formatCurrency(product.latest_cost_per_sellable_unit)
                    : "---"}
                </TableCell>
                <TableCell className="text-right px-2 py-3 dark:text-gray-100">
                  {product.suggested_sale_price_per_sellable_unit
                    ? formatCurrency(
                        product.suggested_sale_price_per_sellable_unit
                      )
                    : "---"}
                </TableCell>
             
              </TableRow>
              {/* Collapsible Content for Batches */}
              {hasBatches && ( // Render Collapsible only if there are batches
                <TableRow
                  data-state={isOpen ? "open" : "closed"}
                  className={cn(
                    !isOpen && "hidden",
                    "bg-slate-50 dark:bg-gray-800/50 dark:border-gray-700"
                  )}
                >
                  <TableCell colSpan={8} className="p-0">
                    {" "}
                    {/* Adjusted colSpan to match new number of columns */}
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleRow(product.id)}
                      className="w-full"
                    >
                      {/* CollapsibleTrigger is handled by the button in the main row */}
                      <CollapsibleContent className="p-4 border-t dark:border-gray-700">
                        {" "}
                        {/* Added border-t for separation */}
                        <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                          {t("reports:batchDetailsFor", { name: product.name })}
                        </h4>
                        <InventoryBatchDetailsTable
                          batches={product.available_batches!} // Assert as batches exist
                          sellableUnitName={product.sellable_unit_name}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};
