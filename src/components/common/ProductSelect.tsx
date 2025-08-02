// src/components/common/ProductSelect.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Search, Copy } from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Utils
import { cn } from "@/lib/utils";

// Types
import { Product } from "../../services/productService";
import apiClient from "@/lib/axios";

interface ProductSelectProps {
  value: Product | null;
  onChange: (product: Product | null) => void;
  onInputChange?: (inputValue: string) => void;
  inputValue?: string;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  showSku?: boolean;
  className?: string;
  id?: string;
}

export const ProductSelect: React.FC<ProductSelectProps> = React.memo(({
  value,
  onChange,
  onInputChange,
  inputValue: externalInputValue,
  label,
  error = false,
  helperText,
  disabled = false,
  placeholder,
  required = false,
  showSku = true,
  className,
  id,
}) => {
  const { t } = useTranslation(["common", "products"]);
  
  // State
  const [open, setOpen] = useState(false);
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastProductSearchRef = useRef<string>("");

  // Use external input value if provided, otherwise use internal state
  const currentInputValue = externalInputValue !== undefined ? externalInputValue : productSearchInput;

  // Debounced product search effect
  useEffect(() => {
    if (productDebounceRef.current) {
      clearTimeout(productDebounceRef.current);
    }
    
    productDebounceRef.current = setTimeout(() => {
      setDebouncedProductSearch(productSearchInput);
    }, 300);
    
    return () => {
      if (productDebounceRef.current) {
        clearTimeout(productDebounceRef.current);
      }
    };
  }, [productSearchInput]);

  // Product search effect
  useEffect(() => {
    if (debouncedProductSearch !== lastProductSearchRef.current) {
      lastProductSearchRef.current = debouncedProductSearch;
      
      const searchProducts = async () => {
        setLoadingProducts(true);
        try {
          const params = new URLSearchParams();
          if (debouncedProductSearch) {
            params.append("search", debouncedProductSearch);
          } else {
            params.append("show_all_for_empty_search", "true");
          }
          params.append("limit", "15");

          const response = await apiClient.get<{ data: Product[] }>(
            `/products/autocomplete?${params.toString()}`
          );
          const products = response.data.data ?? response.data;
          setLocalProducts(products);
        } catch (error) {
          console.error('Error searching products:', error);
          setLocalProducts([]);
        } finally {
          setLoadingProducts(false);
        }
      };
      
      searchProducts();
    }
  }, [debouncedProductSearch]);

  // Initial search when component mounts
  useEffect(() => {
    const initialSearch = async () => {
      setLoadingProducts(true);
      try {
        const params = new URLSearchParams();
        params.append("show_all_for_empty_search", "true");
        params.append("limit", "15");

        const response = await apiClient.get<{ data: Product[] }>(
          `/products/autocomplete?${params.toString()}`
        );
        const products = response.data.data ?? response.data;
        setLocalProducts(products);
      } catch (error) {
        console.error('Error loading initial products:', error);
        setLocalProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    initialSearch();
  }, []);

  // Handlers
  const handleProductSelect = useCallback((product: Product) => {
    onChange(product);
    setOpen(false);
    if (onInputChange) {
      onInputChange(product.name);
    }
  }, [onChange, onInputChange]);

  const handleClearSelection = useCallback(() => {
    onChange(null);
    setProductSearchInput("");
    if (onInputChange) {
      onInputChange("");
    }
  }, [onChange, onInputChange]);

  const handleCopySku = useCallback(async (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(sku);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy SKU:', err);
    }
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setProductSearchInput(search);
    if (onInputChange) {
      onInputChange(search);
    }
  }, [onInputChange]);

  // Memoized display value
  const displayValue = useMemo(() => {
    if (value) {
      return value.name;
    }
    return placeholder || t('products:selectProduct');
  }, [value, placeholder, t]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label 
          htmlFor={id}
          className={cn(
            required && "after:content-['*'] after:ml-0.5 after:text-red-500",
            error && "text-red-500"
          )}
        >
          {label}
        </Label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              error && "border-red-500 focus:ring-red-500",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <span className="truncate text-left">
              {displayValue}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder={t('products:searchProducts')}
                value={productSearchInput}
                onValueChange={handleSearchChange}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              {loadingProducts && (
                <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
              )}
            </div>
            
            <CommandList>
              <CommandEmpty>
                {loadingProducts ? t('common:loading') : t('common:noResults')}
              </CommandEmpty>
              
              {localProducts.length > 0 && (
                <CommandGroup>
                  {localProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => handleProductSelect(product)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value?.id === product.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          {product.sku && (
                            <div className="text-sm text-muted-foreground">
                              SKU: {product.sku}
                            </div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            
            {value && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="w-full text-left justify-start"
                >
                  {t('common:clear')}
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {/* SKU Display */}
      {showSku && value?.sku && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            SKU: {value.sku}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleCopySku(value.sku!, e)}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && helperText && (
        <p className="text-sm text-red-500">{helperText}</p>
      )}
    </div>
  );
});

ProductSelect.displayName = 'ProductSelect';