// src/components/pos/ProductSearchPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, ScanLine } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn, getLocalizedName } from "@/lib/utils";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

import productService, { Product } from "@/services/productService";
import categoryService, { Category } from "@/services/CategoryService";
import { ProductImage } from "@/components/products/ProductImage";
import { PRODUCT_SEARCH_INPUT_ID, resolveUnitPrice, stockOf } from "@/lib/pos";

interface ProductSearchPanelProps {
  warehouseId?: number | null;
  usdFactor: number;
  showOutOfStock: boolean;
  showExpired: boolean;
  disabled?: boolean;
  /** Quantity of each product already in the active cart — subtracted from stock shown here. */
  cartQuantities?: Map<number, number>;
  onAddProduct: (product: Product) => void;
}

function isExpired(p: Product) {
  if (!p.earliest_expiry_date) return false;
  const d = new Date(p.earliest_expiry_date);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function ProductSearchPanel({
  warehouseId,
  usdFactor,
  showOutOfStock,
  showExpired,
  disabled,
  cartQuantities,
  onAddProduct,
}: ProductSearchPanelProps) {
  const formatCurrency = useFormatCurrency();
  const { t, i18n } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const { t: tProductSearch } = useTranslation("productSearchPanel");
  const { t: tProducts } = useTranslation("products");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  // cmdk keeps the highlighted row "sticky" after the mouse leaves it (by design, it tracks
  // what Enter would activate). Controlling it ourselves lets us clear the highlight once the
  // cursor leaves the list entirely, instead of leaving a stale row highlighted.
  const [highlightedProductId, setHighlightedProductId] = useState("");
  const trimmedSearch = search.trim();

  useEffect(() => {
    setCategoryId(null);
  }, [trimmedSearch]);

  // Full category list, same source as the Products page filter — independent of which
  // products currently match the search, so a category with no visible results still shows.
  const categoriesQuery = useQuery({
    queryKey: ["pos-categories-source"],
    queryFn: () => categoryService.getCategories(1, 9999, "", false, true),
    staleTime: 10 * 60 * 1000,
  });

  const categories = (categoriesQuery.data as Category[] | undefined) ?? [];

  const productsQuery = useQuery({
    queryKey: ["pos-products", trimmedSearch, categoryId, warehouseId ?? null],
    queryFn: () =>
      productService.getProducts(
        1,
        trimmedSearch,
        "name",
        "asc",
        60,
        categoryId ?? undefined,
        undefined,
        undefined,
        undefined,
        warehouseId ?? undefined
      ),
    placeholderData: keepPreviousData,
  });

  const visibleProducts = useMemo(() => {
    const list = productsQuery.data?.data ?? [];
    return list.filter((p) => {
      if (!showOutOfStock && stockOf(p) <= 0) return false;
      if (!showExpired && isExpired(p)) return false;
      return true;
    });
  }, [productsQuery.data, showOutOfStock, showExpired]);

  const handleAdd = (product: Product) => {
    if (disabled) return;
    onAddProduct(product);
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || disabled) return;
    const term = search.trim();
    if (!term) return;

    const exact = visibleProducts.find((p) => p.sku != null && String(p.sku).trim() === term);
    if (exact) {
      e.preventDefault();
      handleAdd(exact);
      setSearch("");
      return;
    }

    // Nothing loaded matches yet (typical right after a fast barcode scan) — look it up directly.
    if (visibleProducts.length === 0) {
      e.preventDefault();
      setLookupBusy(true);
      try {
        const list = await productService.getProductsForAutocomplete(term, 5, warehouseId ?? undefined);
        const match =
          list.find((p) => p.sku != null && String(p.sku).trim() === term) ??
          (list.length === 1 ? list[0] : null);
        if (match) {
          handleAdd(match);
          setSearch("");
        } else {
          toast.error(tProductSearch("productNotFoundBySku"));
        }
      } catch {
        toast.error(tProductSearch("productSearchFailed"));
      } finally {
        setLookupBusy(false);
      }
    }
    // Otherwise let cmdk handle Enter natively (adds the currently highlighted row).
  };

  return (
    <Command
      shouldFilter={false}
      className="flex h-full flex-col rounded-none bg-transparent"
      value={highlightedProductId}
      onValueChange={setHighlightedProductId}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <ScanLine className="size-4 shrink-0 text-muted-foreground" />
        <CommandInput
          id={PRODUCT_SEARCH_INPUT_ID}
          value={search}
          onValueChange={setSearch}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          placeholder={tProductSearch("searchOrScanPlaceholder")}
          className="h-11 text-base"
        />
        
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              categoryId === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {tCommon("all")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId((prev) => (prev === c.id ? null : c.id))}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                categoryId === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {getLocalizedName(c, i18n.language)}
            </button>
          ))}
        </div>
      )}
      </div>


      <CommandList
        className="max-h-none flex-1 overflow-y-auto p-2"
        onMouseLeave={() => setHighlightedProductId("")}
      >
        {productsQuery.isError ? (
          <Alert variant="destructive" className="m-2">
            <AlertCircle className="size-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{t("failedToLoadProducts")}</span>
              <Button size="sm" variant="outline" onClick={() => productsQuery.refetch()}>
                {tCommon("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : productsQuery.isLoading || lookupBusy ? (
          <div className="space-y-1.5 p-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-10 shrink-0 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <CommandEmpty className="py-12 text-sm text-muted-foreground">
            {tProductSearch("noMatchingProducts")}
          </CommandEmpty>
        ) : (
          visibleProducts.map((product) => {
            const cartQty = cartQuantities?.get(product.id) ?? 0;
            // Remaining sellable stock after what's already sitting in the current cart.
            const stock = Math.max(0, stockOf(product) - cartQty);
            const outOfStock = stock <= 0;
            const lowStock = !outOfStock && product.stock_alert_level != null && stock <= product.stock_alert_level;
            const price = resolveUnitPrice(product, usdFactor);
            const isAdded = cartQty > 0;
            const zeroPrice = price <= 0;
            return (
              <CommandItem
                key={product.id}
                value={String(product.id)}
                onSelect={() => handleAdd(product)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-3 data-[selected=true]:ring-1 data-[selected=true]:ring-primary/40",
                  isAdded && "border border-emerald-500/30 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-950/20",
                  zeroPrice && "opacity-50"
                )}
              >
                <ProductImage
                  imageUrl={product.image_url}
                  productName={product.name}
                  size={44}
                  variant="rounded"
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-base font-medium",
                      zeroPrice ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {product.name}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                    {product.sku && <span className="font-mono">{product.sku}</span>}
                    {product.category?.name && <span>· {product.category.name}</span>}
                  </p>
                </div>

                {product.is_service ? (
                  <Badge variant="secondary" className="shrink-0 text-sm">
                    {tProducts("serviceStockLabel")}
                  </Badge>
                ) : outOfStock ? (
                  <Badge variant="destructive" className="shrink-0 text-sm">
                    {tProductSearch("outOfStockBadge")}
                  </Badge>
                ) : lowStock ? (
                  <Badge variant="warning" className="shrink-0 text-sm">
                    {tProductSearch("stockRemaining", { count: stock })}
                  </Badge>
                ) : (
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {tProductSearch("stockAvailable", { count: stock })}
                  </span>
                )}

                <span
                  className={cn(
                    "w-25 shrink-0 text-end text-base font-semibold tabular-nums",
                    zeroPrice ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {formatCurrency(price)}
                </span>
              </CommandItem>
            );
          })
        )}
      </CommandList>
    </Command>
  );
}
