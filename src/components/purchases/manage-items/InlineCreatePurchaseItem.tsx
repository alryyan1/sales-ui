// src/components/purchases/manage-items/InlineCreatePurchaseItem.tsx
import React, { useState, useCallback, useEffect } from "react";
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
}

const InlineCreatePurchaseItem: React.FC<InlineCreatePurchaseItemProps> = ({
  onSave,
  onCancel,
  isLoading,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productInputValue, setProductInputValue] = useState("");
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

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
      // Auto-populate cost and price from latest purchase
      if (product.latest_cost_per_sellable_unit) {
        const unitsPerStocking = product.units_per_stocking_unit || 1;
        const costPerStocking =
          Number(product.latest_cost_per_sellable_unit) * unitsPerStocking;
        setUnitCost(costPerStocking);
        setSalePrice(costPerStocking * 1.2); // 20% profit margin
      }
    } else {
      setProductInputValue("");
    }
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!selectedProduct) {
      toast.error("خطأ", { description: "يرجى اختيار منتج أولاً" });
      return;
    }
    if (quantity <= 0 || unitCost < 0) {
      toast.error("خطأ", { description: "الكمية أو التكلفة غير صالحة" });
      return;
    }

    const data: AddPurchaseItemData = {
      product_id: selectedProduct.id,
      quantity,
      unit_cost: unitCost,
      sale_price: salePrice,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    await onSave(data);
  }, [
    selectedProduct,
    quantity,
    unitCost,
    salePrice,
    batchNumber,
    expiryDate,
    onSave,
  ]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
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
      }}
    >
      {/* Save Button */}
      <Tooltip title="حفظ">
        <IconButton
          size="small"
          onClick={handleSave}
          disabled={isLoading || !selectedProduct}
          color="primary"
        >
          <Save size={18} />
        </IconButton>
      </Tooltip>

      {/* Cancel Button */}
      <Tooltip title="إلغاء">
        <IconButton size="small" onClick={onCancel} disabled={isLoading}>
          <X size={18} />
        </IconButton>
      </Tooltip>

      {/* Product Selector */}
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
              placeholder="ابحث عن منتج أو الباركود..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  // Try to find exact SKU match
                  const barcode = productInputValue.trim();
                  if (barcode) {
                    const match = productOptions.find(
                      (p) => p.sku != null && String(p.sku).trim() === barcode,
                    );
                    if (match) {
                      handleProductSelect(match);
                    }
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
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            return (
              <li key={option.id} {...otherProps}>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}
                >
                  <Typography variant="body2">{option.name}</Typography>
                  {(option.sku || option.suggested_sale_price != null) && (
                    <Typography variant="caption" color="text.secondary">
                      {[
                        option.sku,
                        option.suggested_sale_price != null &&
                          `السعر: ${Number(option.suggested_sale_price).toFixed(2)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                  )}
                </Box>
              </li>
            );
          }}
          noOptionsText={
            productInputValue.trim() ? "لا توجد نتائج" : "اكتب للبحث"
          }
        />
      </Box>

      {/* Quantity */}
      <TextField
        size="small"
        type="number"
        placeholder="الكمية"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        onKeyDown={handleKeyDown}
        inputProps={{ min: 1, step: 1 }}
        sx={{ width: 80 }}
      />

      {/* Unit Cost */}
      <TextField
        size="small"
        type="number"
        placeholder="التكلفة"
        value={unitCost}
        onChange={(e) => setUnitCost(Number(e.target.value))}
        onKeyDown={handleKeyDown}
        inputProps={{ min: 0, step: 0.01 }}
        sx={{ width: 100 }}
      />

      {/* Sale Price */}
      <TextField
        size="small"
        type="number"
        placeholder="سعر البيع"
        value={salePrice}
        onChange={(e) => setSalePrice(Number(e.target.value))}
        onKeyDown={handleKeyDown}
        inputProps={{ min: 0, step: 0.01 }}
        sx={{ width: 100 }}
      />

      {/* Batch Number */}
      <TextField
        size="small"
        placeholder="رقم الباتش"
        value={batchNumber}
        onChange={(e) => setBatchNumber(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ width: 100 }}
      />

      {/* Expiry Date */}
      <TextField
        size="small"
        type="date"
        placeholder="تاريخ الانتهاء"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ width: 140 }}
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  );
};

export default InlineCreatePurchaseItem;
