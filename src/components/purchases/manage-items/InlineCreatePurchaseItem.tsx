// src/components/purchases/manage-items/InlineCreatePurchaseItem.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Autocomplete,
  IconButton,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Save, X, Search } from "lucide-react";
import { toast } from "sonner";

import { Product } from "@/services/productService";
import { AddPurchaseItemData } from "./types";
import apiClient from "@/lib/axios";

interface InlineCreatePurchaseItemProps {
  onSave: (data: AddPurchaseItemData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  markupPercentage?: number;
}

const InlineCreatePurchaseItem: React.FC<InlineCreatePurchaseItemProps> = ({
  onSave,
  onCancel,
  isLoading,
  markupPercentage = 20,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productInputValue, setProductInputValue] = useState("");
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [quantity, setQuantity] = useState<number>();
  const [unitCost, setUnitCost] = useState<number>();
  const [salePrice, setSalePrice] = useState<number>();
  const [batchNumber, setBatchNumber] = useState("");

  // Ref for inputs to handle focus navigation
  const productInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const unitCostInputRef = useRef<HTMLInputElement>(null);
  const salePriceInputRef = useRef<HTMLInputElement>(null);
  const batchNumberInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculate Sale Price when Markup Percentage changes
  useEffect(() => {
    if (unitCost !== undefined && unitCost >= 0) {
      const calculatedPrice = unitCost * (1 + markupPercentage / 100);
      setSalePrice(Number(calculatedPrice.toFixed(2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markupPercentage]);

  const handleUnitCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newCost = val === "" ? undefined : Number(val);
    setUnitCost(newCost);

    if (newCost !== undefined && newCost >= 0) {
      const calculatedPrice = newCost * (1 + markupPercentage / 100);
      setSalePrice(Number(calculatedPrice.toFixed(2)));
    }
  };

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newPrice = val === "" ? undefined : Number(val);
    setSalePrice(newPrice);

    if (newPrice !== undefined && newPrice >= 0) {
      const calculatedCost = newPrice / (1 + markupPercentage / 100);
      setUnitCost(Number(calculatedCost.toFixed(2)));
    }
  };

  // Fetch products based on search query (debounced)
  useEffect(() => {
    const searchQuery = productInputValue.trim();

    // Don't search if input is empty or too short
    if (!searchQuery || searchQuery.length < 2) {
      setProductOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setProductLoading(true);
      try {
        const response = await apiClient.get<{ data: Product[] }>(
          `/products/autocomplete?search=${encodeURIComponent(searchQuery)}&limit=50`,
        );
        const products = response.data.data ?? response.data;
        setProductOptions(products);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProductOptions([]);
      } finally {
        setProductLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [productInputValue]);

  // Handle product selection
  const handleProductSelect = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      setProductInputValue(product.name);
      // Auto-focus batch number field after product selection
      setTimeout(() => {
        batchNumberInputRef.current?.focus();
        batchNumberInputRef.current?.select();
      }, 100);
    } else {
      setProductInputValue("");
    }
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setSelectedProduct(null);
    setProductInputValue("");
    setQuantity(undefined);
    setUnitCost(undefined);
    setSalePrice(undefined);
    setBatchNumber("");
    // Focus back to product autocomplete for next entry
    setTimeout(() => {
      productInputRef.current?.focus();
    }, 100);
  }, []);

  // Handle save with return value to indicate success
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!selectedProduct) {
      toast.error("خطأ", { description: "يرجى اختيار منتج أولاً" });
      return false;
    }
    if (!quantity || quantity <= 0) {
      toast.error("خطأ", { description: "يرجى إدخال كمية صحيحة" });
      quantityInputRef.current?.focus();
      return false;
    }
    if (!unitCost || unitCost < 0) {
      toast.error("خطأ", { description: "يرجى إدخال تكلفة صحيحة" });
      unitCostInputRef.current?.focus();
      return false;
    }

    const data: AddPurchaseItemData = {
      product_id: selectedProduct.id,
      quantity: quantity!,
      unit_cost: unitCost!,
      sale_price: salePrice,
      batch_number: batchNumber || undefined,
    };

    await onSave(data);
    resetForm();
    return true;
  }, [
    selectedProduct,
    quantity,
    unitCost,
    salePrice,
    batchNumber,
    onSave,
    resetForm,
  ]);

  // Handle Enter key for final submission
  const handleSubmissionKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await handleSave();
      }
    },
    [handleSave],
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 2,
        bgcolor: "action.hover",
        borderRadius: 1,
        mb: 2,
        direction: "ltr",
      }}
    >
      {/* Product Selector - 1 */}
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Autocomplete
          options={productOptions}
          getOptionLabel={(option) =>
            typeof option === "string" ? option : option.name
          }
          value={selectedProduct}
          onChange={(_, newValue) =>
            handleProductSelect(typeof newValue === "string" ? null : newValue)
          }
          inputValue={productInputValue}
          onInputChange={(_, newInputValue) =>
            setProductInputValue(newInputValue)
          }
          loading={productLoading}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText="لا توجد نتائج"
          autoHighlight
          freeSolo
          size="small"
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Product or Barcode..."
              autoFocus
              inputRef={productInputRef}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  // If autocomplete is loading, prevent default to avoid selecting incomplete results
                  // except if we are forcing a scan

                  // Use ref value to get the most current input without waiting for React state updates
                  // This is critical for barcode scanners which type very fast
                  const barcode = productInputRef.current?.value?.trim();

                  if (!barcode) return;

                  // If an option is highlighted by the autocomplete (standard behavior), let it be selected.
                  // However, if the user scanned a barcode rapidly, the dropdown might not even be open or highlighted yet.

                  // Check if we already have an exact match in the *currently loaded* options
                  // This saves an API call if options are fresh
                  const exactMatchInOptions = productOptions.find(
                    (p) =>
                      p.sku != null &&
                      String(p.sku).trim().toLowerCase() ===
                        barcode.toLowerCase(),
                  );

                  if (exactMatchInOptions) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleProductSelect(exactMatchInOptions);
                    return;
                  }

                  // If no exact match locally, force an immediate API call
                  // This handles the "scan before debounce" scenario
                  e.preventDefault();
                  e.stopPropagation();
                  setProductLoading(true);

                  try {
                    // Force exact search or close match from backend
                    const response = await apiClient.get<{ data: Product[] }>(
                      `/products/autocomplete?search=${encodeURIComponent(barcode)}&limit=1`,
                    );
                    const products = response.data.data ?? response.data;

                    // Check for exact SKU match in the fresh results
                    const match = products.find(
                      (p) =>
                        p.sku != null &&
                        String(p.sku).trim().toLowerCase() ===
                          barcode.toLowerCase(),
                    );

                    if (match) {
                      handleProductSelect(match);
                    } else if (products.length > 0) {
                      // If found but not exact SKU match (maybe partial name), update options to show user
                      setProductOptions(products);
                    } else {
                      // Optional: play error sound or strict notification
                      toast.error("Not found", {
                        description: `No product found with barcode: ${barcode}`,
                      });
                    }
                  } catch (error) {
                    console.error("Error scanning barcode:", error);
                  } finally {
                    setProductLoading(false);
                  }
                }
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <>
                    {productLoading ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                <Typography variant="body2">{option.name}</Typography>
                {(option.sku || option.suggested_sale_price != null) && (
                  <Typography variant="caption" color="text.secondary">
                    {[
                      option.sku,
                      option.suggested_sale_price != null &&
                        `Price: ${Number(option.suggested_sale_price).toFixed(2)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                )}
              </Box>
            </li>
          )}
          noOptionsText={
            productInputValue.trim() ? "No results" : "Type to search"
          }
        />
      </Box>

      {/* Batch Number - 2 */}
      <TextField
        size="small"
        placeholder="Batch No"
        inputRef={batchNumberInputRef}
        value={batchNumber}
        onChange={(e) => setBatchNumber(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            unitCostInputRef.current?.focus();
            unitCostInputRef.current?.select();
          }
        }}
        sx={{ width: 120 }}
      />

      {/* Unit Cost - 4 */}
      <TextField
        size="small"
        type="number"
        placeholder="Cost"
        inputRef={unitCostInputRef}
        onFocus={(e) => {
          e.target.select();
        }}
        value={unitCost || ""}
        onChange={handleUnitCostChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            salePriceInputRef.current?.focus();
            salePriceInputRef.current?.select();
          }
        }}
        inputProps={{ min: 0, step: 0.01 }}
        sx={{ width: 100 }}
      />

      {/* Sale Price (Retail) - 5 */}
      <TextField
        size="small"
        type="number"
        placeholder="Retail"
        inputRef={salePriceInputRef}
        onFocus={(e) => {
          e.target.select();
        }}
        value={salePrice || ""}
        onChange={handleSalePriceChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            quantityInputRef.current?.focus();
            quantityInputRef.current?.select();
          }
        }}
        inputProps={{ min: 0, step: 0.01 }}
        sx={{ width: 100 }}
      />

      {/* Quantity - 6 */}
      <TextField
        size="small"
        type="number"
        placeholder="Qty"
        inputRef={quantityInputRef}
        onFocus={(e) => {
          e.target.select();
        }}
        value={quantity || ""}
        onChange={(e) => setQuantity(Number(e.target.value))}
        onKeyDown={handleSubmissionKeyDown}
        inputProps={{ min: 1, step: 1 }}
        sx={{ width: 80 }}
      />

      {/* Total Cost - 7 */}
      <Box sx={{ width: 100, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {(quantity || 0) * (unitCost || 0) > 0
            ? ((quantity || 0) * (unitCost || 0)).toFixed(2)
            : "—"}
        </Typography>
      </Box>

      {/* Total Retail - 8 */}
      <Box sx={{ width: 100, textAlign: "center" }}>
        <Typography variant="body2" color="success.main" fontWeight="bold">
          {(quantity || 0) * (salePrice || 0) > 0
            ? ((quantity || 0) * (salePrice || 0)).toFixed(2)
            : "—"}
        </Typography>
      </Box>

      {/* Actions - 9 */}
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="Save">
          <IconButton
            size="small"
            onClick={handleSave}
            disabled={isLoading || !selectedProduct}
            color="primary"
          >
            <Save size={18} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Cancel">
          <IconButton size="small" onClick={onCancel} disabled={isLoading}>
            <X size={18} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default InlineCreatePurchaseItem;
