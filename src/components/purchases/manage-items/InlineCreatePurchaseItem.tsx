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
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
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
  const [quantity, setQuantity] = useState<number>();
  const [unitCost, setUnitCost] = useState<number>();
  const [salePrice, setSalePrice] = useState<number>();
  const [batchNumber, setBatchNumber] = useState("");
  // Default expiry date: 3 years from current date
  const [expiryDate, setExpiryDate] = useState(() => {
    const threeYearsFromNow = new Date();
    threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);
    return threeYearsFromNow.toISOString().split("T")[0];
  });

  // Ref for quantity input to auto-focus after product selection
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const unitCostInputRef = useRef<HTMLInputElement>(null);
  const salePriceInputRef = useRef<HTMLInputElement>(null);
  const batchNumberInputRef = useRef<HTMLInputElement>(null);
  const expiryDateInputRef = useRef<HTMLInputElement>(null);

  // Auto-adjust expiry date to last day of month whenever it changes

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
      // Auto-focus quantity field after product selection
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
    } else {
      setProductInputValue("");
    }
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
      quantity,
      unit_cost: unitCost,
      sale_price: salePrice,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    await onSave(data);
    return true;
  }, [
    selectedProduct,
    quantity,
    unitCost,
    salePrice,
    batchNumber,
    expiryDate,
    onSave,
  ]);

  // Handle Enter key - try to save, or focus next field if validation fails
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const success = await handleSave();
        // If save failed due to validation, focus is already handled in handleSave
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
                if (e.key === "Enter" && !productLoading) {
                  // If there's a selected option in the dropdown, let autocomplete handle it
                  // Otherwise, try to find exact SKU match
                  const barcode = productInputValue.trim();
                  if (barcode && productOptions.length > 0) {
                    const match = productOptions.find(
                      (p) => p.sku != null && String(p.sku).trim() === barcode,
                    );
                    if (match) {
                      e.preventDefault();
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
        inputRef={quantityInputRef}
        onFocus={(e) => {
          e.target.select();
        }}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            unitCostInputRef.current?.focus();
            unitCostInputRef.current?.select();
          }
        }}
        inputProps={{ min: 1, step: 1 }}
        sx={{ width: 80 }}
      />

      {/* Unit Cost */}
      <TextField
        size="small"
        type="number"
        placeholder="التكلفة"
        inputRef={unitCostInputRef}
        onFocus={(e) => {
          e.target.select();
        }}
        value={unitCost}
        onChange={(e) => setUnitCost(Number(e.target.value))}
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

      {/* Sale Price */}
      <TextField
        size="small"
        type="number"
        placeholder="سعر البيع"
        inputRef={salePriceInputRef}
        onFocus={(e) => {
          e.target.select();
        }}
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
        inputRef={batchNumberInputRef}
        value={batchNumber}
        onChange={(e) => setBatchNumber(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            // Focus expiry date picker - need to find the input inside DatePicker
            const expiryInput = document.querySelector(
              '[placeholder="تاريخ الانتهاء"]',
            ) as HTMLInputElement;
            expiryInput?.focus();
          }
        }}
        sx={{ width: 100 }}
      />

      {/* Expiry Date */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="تاريخ الانتهاء"
          value={expiryDate ? new Date(expiryDate) : null}
          onChange={(newValue) => {
            if (newValue) {
              const formattedDate = newValue.toISOString().split("T")[0];
              setExpiryDate(formattedDate);
            } else {
              setExpiryDate("");
            }
          }}
          format="yyyy/MM/dd"
          slots={{
            openPickerButton: () => null,
          }}
          slotProps={{
            textField: {
              size: "small",
              sx: { width: 140 },
              onKeyDown: handleKeyDown,
            },
          }}
        />
      </LocalizationProvider>
    </Box>
  );
};

export default InlineCreatePurchaseItem;
