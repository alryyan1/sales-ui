import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Autocomplete,
  IconButton,
  Tooltip,
  InputAdornment,
  Typography,
} from "@mui/material";
import { Save, X, Search } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/services/productService";
import { ProductImage } from "@/components/products/ProductImage";

interface InlineCreateInventoryCountItemProps {
  onSave: (data: { product_id: number; actual_quantity?: number }) => void;
  onCancel: () => void;
  isLoading: boolean;
  availableProducts: Product[];
}

const InlineCreateInventoryCountItem: React.FC<
  InlineCreateInventoryCountItemProps
> = ({ onSave, onCancel, isLoading, availableProducts }) => {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productInputValue, setProductInputValue] = useState("");
  const [actualQuantity, setActualQuantity] = useState<string>("");

  // Refs for focusing
  const productInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Focus product input on mount
  useEffect(() => {
    setTimeout(() => {
      productInputRef.current?.focus();
    }, 100);
  }, []);

  const handleProductSelect = useCallback((product: any | null) => {
    setSelectedProduct(product);
    if (product) {
      setProductInputValue(product.name);
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
    } else {
      setProductInputValue("");
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedProduct) {
      toast.error("خطأ", { description: "يرجى اختيار منتج أولاً" });
      productInputRef.current?.focus();
      return;
    }

    const qty = actualQuantity ? Number(actualQuantity) : undefined;
    if (
      actualQuantity &&
      (isNaN(Number(actualQuantity)) || Number(actualQuantity) < 0)
    ) {
      toast.error("خطأ", { description: "الكمية يجب أن تكون رقماً موجباً" });
      quantityInputRef.current?.focus();
      return;
    }

    onSave({
      product_id: selectedProduct.id,
      actual_quantity: qty,
    });

    // Reset form for next entry
    setSelectedProduct(null);
    setProductInputValue("");
    setActualQuantity("");
    setTimeout(() => {
      productInputRef.current?.focus();
    }, 100);
  }, [selectedProduct, actualQuantity, onSave]);

  const handleKeywords = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

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
        direction: "ltr", // Align LTR for consistency with inputs
      }}
    >
      {/* Product Selector */}
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Autocomplete
          options={availableProducts}
          getOptionLabel={(option: any) =>
            option.sku ? `${option.name} (${option.sku})` : (option.name ?? "")
          }
          inputValue={
            selectedProduct
              ? selectedProduct.sku
                ? `${selectedProduct.name} (${selectedProduct.sku})`
                : (selectedProduct.name ?? "")
              : productInputValue
          }
          onInputChange={(_, value) => setProductInputValue(value)}
          filterOptions={(options, { inputValue }) => {
            const q = (inputValue || "").trim().toLowerCase();
            if (!q) return options;
            return options.filter(
              (option: any) =>
                (option.name && option.name.toLowerCase().includes(q)) ||
                (option.sku && option.sku.toLowerCase().includes(q)) ||
                (option.barcode &&
                  String(option.barcode).toLowerCase().includes(q)),
            );
          }}
          value={selectedProduct}
          onChange={(_, newValue) => handleProductSelect(newValue)}
          noOptionsText="لا توجد نتائج"
          autoHighlight
          freeSolo // Allows typing to search
          size="small"
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="المنتج (الاسم أو الباركود)"
              inputRef={productInputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // Try to autoselect if exact match or single result
                  const q = productInputValue.trim().toLowerCase();
                  if (!q) return;

                  // Exact SKU match logic similar to reference component
                  const match = availableProducts.find(
                    (p: any) =>
                      (p.sku && String(p.sku).toLowerCase() === q) ||
                      (p.barcode && String(p.barcode).toLowerCase() === q),
                  );

                  if (match) {
                    e.preventDefault();
                    handleProductSelect(match);
                  }
                } else if (e.key === "Escape") {
                  onCancel();
                }
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
              }}
            />
          )}
          renderOption={(props, option: any) => {
            const { ...otherProps } = props;
            return (
              <li key={option.id} {...otherProps}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <ProductImage
                    imageUrl={option.image_url}
                    productName={option.name}
                    size={30}
                  />
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography variant="body2">{option.name}</Typography>
                    {(option.sku || option.barcode) && (
                      <Typography variant="caption" color="text.secondary">
                        {option.sku || option.barcode}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </li>
            );
          }}
        />
      </Box>

      {/* Quantity Input */}
      <TextField
        size="small"
        placeholder="الكمية"
        type="number"
        value={actualQuantity}
        onChange={(e) => setActualQuantity(e.target.value)}
        inputRef={quantityInputRef}
        onKeyDown={handleKeywords}
        onFocus={(e) => e.target.select()}
        inputProps={{ min: 0, step: 0.01 }}
        sx={{ width: 120 }}
      />

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 0.5 }}>
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

        <Tooltip title="إلغاء">
          <IconButton size="small" onClick={onCancel} disabled={isLoading}>
            <X size={18} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default InlineCreateInventoryCountItem;
