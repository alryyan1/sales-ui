// src/components/inventory/InlineCreateInventoryCountItem.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Product } from "@/services/productService";
import { ProductImage } from "@/components/products/ProductImage";

interface InlineCreateInventoryCountItemProps {
  onSave: (data: { product_id: number; actual_quantity?: number }) => void;
  onCancel: () => void;
  isLoading: boolean;
  availableProducts: Product[];
}

const InlineCreateInventoryCountItem: React.FC<InlineCreateInventoryCountItemProps> = ({
  onSave,
  onCancel,
  isLoading,
  availableProducts,
}) => {
  const { t } = useTranslation("inventory");
  const { t: tManage } = useTranslation("inventoryCountManage");
  const { t: tCommon } = useTranslation("common");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [actualQuantity, setActualQuantity] = useState<string>("");

  const productTriggerRef = useRef<HTMLButtonElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Open the product picker on mount — Radix auto-focuses the first focusable element
  // inside (the search input) once the popover opens, so it's ready to type/scan right away.
  useEffect(() => {
    setTimeout(() => setProductPopoverOpen(true), 100);
  }, []);

  const filteredProducts = React.useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return availableProducts;
    return availableProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [availableProducts, productSearch]);

  const handleProductSelect = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    setProductPopoverOpen(false);
    setProductSearch("");
    if (product) {
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedProduct) {
      toast.error(tCommon("error"), { description: tManage("selectProductFirstError") });
      setProductPopoverOpen(true);
      return;
    }

    const qty = actualQuantity ? Number(actualQuantity) : undefined;
    if (actualQuantity && (isNaN(Number(actualQuantity)) || Number(actualQuantity) < 0)) {
      toast.error(tCommon("error"), { description: tManage("quantityMustBePositiveError") });
      quantityInputRef.current?.focus();
      return;
    }

    onSave({ product_id: selectedProduct.id, actual_quantity: qty });

    // Reset form and reopen the product picker so the next SKU can be scanned/typed
    // immediately — closes the loop for rapid, repeated add-one-item-at-a-time entry.
    setSelectedProduct(null);
    setProductSearch("");
    setActualQuantity("");
    setTimeout(() => setProductPopoverOpen(true), 100);
  }, [selectedProduct, actualQuantity, onSave, tCommon, tManage]);

  return (
    <div dir="ltr" className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-3">
      {/* Product picker */}
      <div className="min-w-0 flex-1">
        <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen} modal>
          <PopoverTrigger asChild>
            <Button
              ref={productTriggerRef}
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
              onKeyDown={(e) => e.key === "Escape" && onCancel()}
            >
              <span className="flex min-w-0 items-center gap-2 truncate">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-left">
                  {selectedProduct
                    ? `${selectedProduct.name}${selectedProduct.sku ? ` (${selectedProduct.sku})` : ""}`
                    : tManage("productNameOrBarcodePlaceholder")}
                </span>
              </span>
              <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={tManage("productNameOrBarcodePlaceholder")}
                value={productSearch}
                onValueChange={setProductSearch}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const q = productSearch.trim().toLowerCase();
                  if (!q) return;
                  // Prioritize an exact SKU match regardless of what's highlighted. Stopping
                  // propagation matters here: without it, this Enter keypress also bubbles to
                  // cmdk's own handling, which can select whatever is highlighted right after
                  // we've just selected the correct exact match, clobbering it.
                  const exact = availableProducts.find((p) => p.sku && p.sku.toLowerCase() === q);
                  if (exact) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleProductSelect(exact);
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>{t("noResultsFound")}</CommandEmpty>
                <CommandGroup>
                  {filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={String(product.id)}
                      onSelect={() => handleProductSelect(product)}
                      className="gap-2"
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <ProductImage imageUrl={product.image_url} productName={product.name} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{product.name}</p>
                        {product.sku && (
                          <p className="truncate text-xs text-muted-foreground">{product.sku}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quantity */}
      <Input
        type="number"
        min={0}
        step={0.01}
        placeholder={t("quantityLabel")}
        value={actualQuantity}
        onChange={(e) => setActualQuantity(e.target.value)}
        onFocus={(e) => e.target.select()}
        ref={quantityInputRef}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        className="w-28 shrink-0"
      />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="default"
              className="size-8"
              onClick={handleSave}
              disabled={isLoading || !selectedProduct}
            >
              <Save className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tCommon("save")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tCommon("cancel")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default InlineCreateInventoryCountItem;
