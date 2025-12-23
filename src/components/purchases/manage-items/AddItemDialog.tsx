// src/components/purchases/manage-items/AddItemDialog.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Stack,
  TextField,
  Autocomplete,
  Chip,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  Fade,
} from "@mui/material";
import {
  Plus,
  X,
  Package,
  Search,
  Hash,
  Calendar,
  DollarSign,
  Layers,
  Tag,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import apiClient from "@/lib/axios";
import purchaseService from "@/services/purchaseService";
import { Product } from "@/services/productService";
import { useSettings } from "@/context/SettingsContext";
import { AddPurchaseItemData } from "./types";

// Helper: round to exactly 3 decimal places
const roundToThreeDecimals = (value: number): number => {
  return Number(Number(value).toFixed(3));
};

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onAddItem: (data: AddPurchaseItemData) => void;
  isLoading: boolean;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  open,
  onClose,
  onAddItem,
  isLoading,
}) => {
  const { settings } = useSettings();

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productInputValue, setProductInputValue] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number | undefined>(undefined);
  const [salePriceStockingUnit, setSalePriceStockingUnit] = useState<
    number | undefined
  >(undefined);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedProduct(null);
    setProductInputValue("");
    setQuantity(1);
    setUnitCost(0);
    setSalePrice(undefined);
    setSalePriceStockingUnit(undefined);
    setBatchNumber("");
    setExpiryDate("");
  }, []);

  // Fetch ALL products for client-side filtering/scanning
  const fetchAllProducts = useCallback(async () => {
    setProductLoading(true);
    try {
      // Fetch a large number of products to act as a cache
      // 2000 limit should cover most small-medium inventories; adjust if needed
      const response = await apiClient.get<{ data: Product[] }>(
        `/products/autocomplete?limit=2000&show_all_for_empty_search=true`
      );
      const products = response.data.data ?? response.data;

      // Deduplicate products by ID to prevent key collisions
      const uniqueProducts = Array.from(
        new Map(products.map((p) => [p.id, p])).values()
      );

      setAllProducts(uniqueProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("خطأ", { description: "فشل تحميل قائمة المنتجات" });
    } finally {
      setProductLoading(false);
    }
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback(
    (product: Product | null) => {
      setSelectedProduct(product);
      if (product) {
        setProductInputValue(product.name);
        if (product.latest_cost_per_sellable_unit) {
          const costPerSellable = Number(product.latest_cost_per_sellable_unit);
          const unitsPerStocking =
            product.units_per_stocking_unit &&
            product.units_per_stocking_unit > 0
              ? product.units_per_stocking_unit
              : 1;
          const costPerStocking = costPerSellable * unitsPerStocking;
          setUnitCost(costPerStocking);
          const globalProfitRate = settings?.default_profit_rate ?? 20;
          const profitFactor = globalProfitRate / 100;
          const sellablePrice =
            (costPerStocking * profitFactor) / unitsPerStocking;
          setSalePrice(roundToThreeDecimals(sellablePrice));
          const stockingPrice = costPerStocking * profitFactor;
          setSalePriceStockingUnit(roundToThreeDecimals(stockingPrice));
        }
      } else {
        setProductInputValue("");
      }
    },
    [settings?.default_profit_rate]
  );

  // Handle unit cost change
  const handleUnitCostChange = useCallback(
    (newCost: number) => {
      setUnitCost(newCost);
      const globalProfitRate = settings?.default_profit_rate ?? 20;
      const profitFactor = globalProfitRate / 100;
      const unitsPerStocking =
        selectedProduct?.units_per_stocking_unit &&
        selectedProduct.units_per_stocking_unit > 0
          ? selectedProduct.units_per_stocking_unit
          : 1;
      const costPerSellable = newCost / unitsPerStocking;
      const profitablePricePerSellable = costPerSellable * profitFactor;
      const sellablePrice = costPerSellable + profitablePricePerSellable;
      setSalePrice(roundToThreeDecimals(sellablePrice));
      setSalePriceStockingUnit(
        roundToThreeDecimals(sellablePrice * unitsPerStocking)
      );
    },
    [settings?.default_profit_rate, selectedProduct?.units_per_stocking_unit]
  );

  // Handle autocomplete Enter key (Scanner support)
  const handleAutocompleteKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // If Enter is pressed, try to find an exact SKU or Name match locally
      if (e.key === "Enter") {
        const val = productInputValue.trim().toLowerCase();
        if (val) {
          // Prioritize SKU match
          const exactSkuMatch = allProducts.find(
            (p) => p.sku && p.sku.toLowerCase() === val
          );

          if (exactSkuMatch) {
            e.preventDefault();
            e.stopPropagation();
            handleProductSelect(exactSkuMatch);
            // Optionally clear the input if you want, but Autocomplete usually handles value display
            return;
          }

          // Then Name match
          const exactNameMatch = allProducts.find(
            (p) => p.name.toLowerCase() === val
          );

          if (exactNameMatch) {
            e.preventDefault();
            e.stopPropagation();
            handleProductSelect(exactNameMatch);
            return;
          }
        }
      }
    },
    [productInputValue, allProducts, handleProductSelect]
  );

  // Handle add item
  const handleAddItem = useCallback(() => {
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
      sale_price: salePrice !== undefined ? roundToThreeDecimals(salePrice) : 0,
      sale_price_stocking_unit:
        salePriceStockingUnit !== undefined
          ? roundToThreeDecimals(salePriceStockingUnit)
          : undefined,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    onAddItem(data);
  }, [
    selectedProduct,
    quantity,
    unitCost,
    salePrice,
    salePriceStockingUnit,
    batchNumber,
    expiryDate,
    onAddItem,
  ]);

  // Handle generic form input key down (submit on Enter)
  const handleFormInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddItem();
      }
    },
    [handleAddItem]
  );

  // Fetch products once when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllProducts();
    }
  }, [open, fetchAllProducts]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 3,
          pb: 2,
          borderBottom: "1px solid",
          borderColor: "grey.100",
          background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            }}
          >
            <Plus size={22} color="white" />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "grey.800" }}
            >
              إضافة صنف جديد
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500" }}>
              أضف منتجًا إلى عملية الشراء
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            bgcolor: "grey.100",
            "&:hover": { bgcolor: "grey.200" },
          }}
        >
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Product Selection */}
          <Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "grey.700",
                mb: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Package size={16} />
              اسم المنتج
            </Typography>
            <Autocomplete
              options={allProducts}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.name
              }
              value={selectedProduct}
              onChange={(_, newValue) =>
                handleProductSelect(
                  typeof newValue === "string" ? null : newValue
                )
              }
              inputValue={productInputValue}
              onInputChange={(_, newInputValue) =>
                setProductInputValue(newInputValue)
              }
              loading={productLoading}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="لا توجد نتائج"
              autoHighlight // Automatically highlight keys for better Enter selection
              // Custom filter to match Name OR SKU
              filterOptions={(options, state) => {
                const input = state.inputValue.toLowerCase();
                return options.filter(
                  (opt) =>
                    opt.name.toLowerCase().includes(input) ||
                    (opt.sku && opt.sku.toLowerCase().includes(input))
                );
              }}
              freeSolo
              clearOnBlur
              selectOnFocus
              blurOnSelect
              size="small"
              onKeyDown={handleAutocompleteKeyDown}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="ابحث بالاسم أو الباركود..."
                  fullWidth
                  autoFocus
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={18} color="#9ca3af" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {productLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "grey.50",
                      "&:hover": { bgcolor: "grey.100" },
                      "&.Mui-focused": { bgcolor: "white" },
                    },
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={option.id} {...otherProps}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        py: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: "primary.50",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Package size={18} color="#3b82f6" />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {option.name}
                        </Typography>
                        {option.sku && (
                          <Typography
                            variant="caption"
                            sx={{ color: "grey.500" }}
                          >
                            باركود: {option.sku}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </li>
                );
              }}
            />
          </Box>

          {/* Product Details (shown when product is selected) */}
          {selectedProduct && (
            <Fade in>
              <Box>
                {/* Unit Info Chip */}
                <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                  <Chip
                    icon={<Layers size={16} />}
                    label={`1 ${
                      selectedProduct.stocking_unit_name || "وحدة تخزين"
                    } = ${selectedProduct.units_per_stocking_unit || 1} ${
                      selectedProduct.sellable_unit_name || "وحدة بيع"
                    }`}
                    sx={{
                      bgcolor: "info.50",
                      color: "info.700",
                      fontWeight: 600,
                      border: "1px solid",
                      borderColor: "info.200",
                      px: 1,
                    }}
                  />
                </Box>

                {/* First Row: Quantity & Cost */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "grey.700",
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Hash size={16} />
                      الكمية{" "}
                      {selectedProduct?.stocking_unit_name && (
                        <Chip
                          label={selectedProduct.stocking_unit_name}
                          size="small"
                          sx={{ height: 20 }}
                        />
                      )}
                    </Typography>
                    <TextField
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      inputProps={{ min: 1, step: 1 }}
                      size="small"
                      fullWidth
                      onFocus={(e) => e.target.select()}
                      onKeyDown={handleFormInputKeyDown}
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "grey.700",
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <DollarSign size={16} />
                      سعر التكلفة{" "}
                      {selectedProduct?.stocking_unit_name && (
                        <Chip
                          label={selectedProduct.stocking_unit_name}
                          size="small"
                          sx={{ height: 20 }}
                        />
                      )}
                    </Typography>
                    <TextField
                      type="number"
                      onFocus={(e) => e.target.select()}
                      value={unitCost}
                      onChange={(e) =>
                        handleUnitCostChange(Number(e.target.value))
                      }
                      inputProps={{ min: 0, step: 0.01 }}
                      size="small"
                      fullWidth
                      onKeyDown={handleFormInputKeyDown}
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  </Box>
                </Box>

                {/* Second Row: Sale Prices */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "grey.700",
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Tag size={16} />
                      سعر البيع (
                      {selectedProduct?.sellable_unit_name || "وحدة بيع"})
                      <span style={{ color: "#ef4444" }}>*</span>
                    </Typography>
                    <TextField
                      type="number"
                      value={salePrice || ""}
                      onChange={(e) =>
                        setSalePrice(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      inputProps={{ min: 0, step: 0.001 }}
                      size="small"
                      fullWidth
                      error={salePrice === undefined}
                      onKeyDown={handleFormInputKeyDown}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          bgcolor:
                            salePrice === undefined
                              ? "error.50"
                              : "transparent",
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "grey.700",
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Tag size={16} />
                      سعر البيع (
                      {selectedProduct?.stocking_unit_name || "وحدة تخزين"})
                    </Typography>
                    <TextField
                      type="number"
                      value={salePriceStockingUnit || ""}
                      onChange={(e) =>
                        setSalePriceStockingUnit(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      inputProps={{ min: 0, step: 0.001 }}
                      size="small"
                      fullWidth
                      onKeyDown={handleFormInputKeyDown}
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  </Box>
                </Box>

                {/* Third Row: Batch & Expiry */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "grey.700",
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Hash size={16} />
                      رقم الدفعة
                    </Typography>
                    <TextField
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      size="small"
                      fullWidth
                      placeholder="اختياري"
                      onKeyDown={handleFormInputKeyDown}
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "grey.700",
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Calendar size={16} />
                      تاريخ الانتهاء
                    </Typography>
                    <TextField
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      onKeyDown={handleFormInputKeyDown}
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Fade>
          )}
        </Stack>
      </DialogContent>

      {/* Action Buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          p: 3,
          pt: 2,
          borderTop: "1px solid",
          borderColor: "grey.100",
          bgcolor: "grey.50",
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          startIcon={<X size={18} />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            borderColor: "grey.300",
            color: "grey.600",
            px: 3,
            "&:hover": { borderColor: "grey.400", bgcolor: "grey.100" },
          }}
        >
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleAddItem}
          disabled={!selectedProduct || salePrice === undefined || isLoading}
          startIcon={
            isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )
          }
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              boxShadow: "0 6px 16px rgba(16, 185, 129, 0.4)",
            },
            "&:disabled": {
              background: "grey.300",
              boxShadow: "none",
            },
          }}
        >
          إضافة الصنف
        </Button>
      </Box>
    </Dialog>
  );
};

export default AddItemDialog;
