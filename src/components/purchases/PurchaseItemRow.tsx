// src/components/purchases/PurchaseItemRow.tsx
import React, { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

// MUI Components
import { 
  Card, 
  CardContent, 
  IconButton, 
  TextField, 
  Typography, 
  Chip,
  Box,
  Tooltip
} from "@mui/material";
import { 
  Delete as DeleteIcon,
  ContentCopy as CopyIcon
} from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";

// Types
import { Product } from "../../services/productService";
import { formatNumber, preciseCalculation } from "@/constants";
import { PurchaseFormValues } from "@/pages/PurchaseFormPage";
import apiClient from "@/lib/axios";

interface PurchaseItemRowProps {
  index: number;
  remove: (index: number) => void;
  products: Product[];
  isSubmitting: boolean;
  itemCount: number;
  isNew?: boolean; // Optional prop to mark new items
  shouldFocus?: boolean; // New prop to trigger auto-focus
}

// Type for a single item in the PurchaseFormValues
export type PurchaseItemFormValues = {
  id?: number | null;
  product_id: number;
  product?: Product; // Full selected product object (includes UOM info)
  batch_number?: string | null;
  quantity: number; // Quantity of STOCKING UNITS (e.g., boxes)
  unit_cost: number; // Cost per STOCKING UNIT (e.g., per box)
  sale_price?: number | null; // Intended sale price PER SELLABLE UNIT
  expiry_date?: Date | null;
  // Display only, calculated:
  total_sellable_units_display?: number;
  cost_per_sellable_unit_display?: number;
};

export const PurchaseItemRow: React.FC<PurchaseItemRowProps> = ({
  index,
  remove,
  products,
  isSubmitting,
  itemCount,
  isNew = false,
  shouldFocus = false,
}) => {
  const { t } = useTranslation([
    "purchases",
    "common",
    "products",
    "validation",
  ]);
  const { watch, setValue, formState: { errors } } = useFormContext<PurchaseFormValues>();

  // Ref for the autocomplete input to focus
  const autocompleteRef = useRef<HTMLInputElement>(null);

  // Local state for this row's product search
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [localLoadingProducts, setLocalLoadingProducts] = useState(false);
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastProductSearchRef = useRef<string>("");

  // Watch fields for this item row
  const selectedProduct = watch(`items.${index}.product`) as Product | undefined;
  const quantityOfStockingUnits = watch(`items.${index}.quantity`);
  const costPerStockingUnit = watch(`items.${index}.unit_cost`);

  // Calculate display values
  const unitsPerStocking = selectedProduct?.units_per_stocking_unit || 1;
  const totalSellableUnitsDisplay =
    preciseCalculation(Number(quantityOfStockingUnits) || 0, unitsPerStocking, 'multiply', 2);
  const itemTotalCost =
    preciseCalculation(Number(quantityOfStockingUnits) || 0, Number(costPerStockingUnit) || 0, 'multiply', 2);

  // Auto-focus effect for new items
  useEffect(() => {
    if (shouldFocus && autocompleteRef.current) {
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        autocompleteRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldFocus]);

  // Debounce effect for product search
  useEffect(() => {
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    productDebounceRef.current = setTimeout(() => {
      setDebouncedProductSearch(productSearchInput);
    }, 300);
    return () => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    };
  }, [productSearchInput]);

  // Effect to fetch products when search changes
  useEffect(() => {
    if (debouncedProductSearch !== '' && debouncedProductSearch !== lastProductSearchRef.current && debouncedProductSearch.length >= 2) {
      lastProductSearchRef.current = debouncedProductSearch;
      const searchProducts = async () => {
        setLocalLoadingProducts(true);
        try {
          const response = await apiClient.get<{ data: Product[] }>(
            `/products/autocomplete?search=${encodeURIComponent(debouncedProductSearch)}&limit=15`
          );
          setLocalProducts(response.data.data ?? response.data);
        } catch (error) {
          console.error('Failed to fetch products:', error);
          setLocalProducts([]);
        } finally {
          setLocalLoadingProducts(false);
        }
      };
      searchProducts();
    } else if (debouncedProductSearch === '') {
      setLocalProducts([]);
    }
  }, [debouncedProductSearch]);

  // Use local products if available, otherwise fall back to passed products
  const availableProducts = localProducts.length > 0 ? localProducts : products;

  const handleProductSelect = (product: Product) => {
    setValue(`items.${index}.product_id`, product.id, { shouldValidate: true });
    setValue(`items.${index}.product`, product);
    setValue(`items.${index}.unit_cost`, product.latest_cost_per_sellable_unit || 0, { shouldValidate: true });
    setValue(
      `items.${index}.sale_price`,
      product.suggested_sale_price_per_sellable_unit || null,
      { shouldValidate: true }
    );
    // Clear search input after selection
    setProductSearchInput("");
  };

  const handleKeyDown = async (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      
      if (!productSearchInput.trim()) return;
      
      // First try to find in available products
      const productBySku = availableProducts.find(
        product => product.sku?.toLowerCase() === productSearchInput.toLowerCase()
      );
      
      if (productBySku) {
        handleProductSelect(productBySku);
        return;
      }
      
      // If not found locally, fetch from backend
      try {
        setLocalLoadingProducts(true);
        const response = await apiClient.get<{ data: Product[] }>(
          `/products/autocomplete?search=${encodeURIComponent(productSearchInput)}&limit=50`
        );
        const fetchedProducts = response.data.data ?? response.data;
        
        // Find product by exact SKU match
        const exactSkuMatch = fetchedProducts.find(
          product => product.sku?.toLowerCase() === productSearchInput.toLowerCase()
        );
        
        if (exactSkuMatch) {
          handleProductSelect(exactSkuMatch);
        } else {
          // If no exact SKU match, show the fetched products in dropdown
          setLocalProducts(fetchedProducts);
        }
      } catch (error) {
        console.error('Failed to fetch product by SKU:', error);
        // Optionally show a toast error here
      } finally {
        setLocalLoadingProducts(false);
      }
    }
  };

  const getFieldError = (fieldName: string) => {
    const fieldPath = `items.${index}.${fieldName}` as keyof PurchaseFormValues;
    return errors[fieldPath]?.message;
  };

  const handleCopySku = async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku);
      // You could add a toast notification here if you have a toast system
      console.log('SKU copied to clipboard:', sku);
    } catch (err) {
      console.error('Failed to copy SKU:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = sku;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
         <Card sx={{ 
       p: 0.375, 
       bgcolor: isNew ? 'primary.50' : 'background.paper',
       border: 1,
       borderColor: isNew ? 'primary.main' : 'divider',
       position: 'relative',
       animation: isNew ? 'fadeIn 0.5s ease-in' : 'none',
       '@keyframes fadeIn': {
         '0%': {
           opacity: 0,
           transform: 'translateY(-10px)'
         },
         '100%': {
           opacity: 1,
           transform: 'translateY(0)'
         }
       }
     }}>
      <IconButton
        type="button"
        onClick={() => remove(index)}
        disabled={isSubmitting || itemCount <= 1}
        aria-label={t("purchases:remove") || "Remove"}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'text.secondary',
          '&:hover': {
            color: 'error.main'
          },
          '&.Mui-disabled': {
            color: 'action.disabled'
          }
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>

      <CardContent sx={{ pt: 4, pb: '8px !important' }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(8, 1fr)' },
          gap: 1,
          alignItems: 'start'
        }}>
          {/* Product Autocomplete */}
          <Box sx={{ gridColumn: { sm: 'span 2', lg: 'span 2' } }}>
            <Autocomplete
              options={availableProducts}
              getOptionLabel={(option) => option.name}
              value={selectedProduct || null}
              onChange={(event, newValue) => {
                if (newValue) {
                  handleProductSelect(newValue);
                } else {
                  setValue(`items.${index}.product_id`, 0, { shouldValidate: true });
                  setValue(`items.${index}.product`, undefined, { shouldValidate: true });
                }
              }}
              inputValue={productSearchInput}
              onInputChange={(event, newInputValue) => {
                setProductSearchInput(newInputValue);
              }}
              loading={localLoadingProducts}
              disabled={isSubmitting}
              size="small"
                             renderInput={(params) => (
                 <TextField
                   {...params}
                   inputRef={autocompleteRef}
                   label={`${t("purchases:product")} *`}
                   placeholder={t("purchases:selectProductPlaceholder")}
                   error={!!getFieldError('product_id')}
                   helperText={getFieldError('product_id')}
                   onKeyDown={handleKeyDown}
                   InputProps={{
                     ...params.InputProps,
                     endAdornment: (
                       <>
                         {localLoadingProducts ? (
                           <CircularProgress color="inherit" size={16} />
                         ) : null}
                         {params.InputProps.endAdornment}
                       </>
                     ),
                   }}
                 />
               )}
              renderOption={(props, option) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={`${option.id}-${option.name}`} {...otherProps}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        SKU: {option.sku || "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={productSearchInput ? t("common:noResults") : t("products:typeToSearch")}
            />
            
            {/* SKU Display with Copy Button */}
            {selectedProduct && selectedProduct.sku && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mt: 1,
                p: 1,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200'
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  SKU:
                </Typography>
                <Typography variant="caption" sx={{ 
                  fontFamily: 'monospace',
                  bgcolor: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 0.5,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  flex: 1
                }}>
                  {selectedProduct.sku}
                </Typography>
                <Tooltip title={t("common:copy") || "Copy SKU"}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopySku(selectedProduct.sku!)}
                    sx={{ 
                      p: 0.5,
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.50'
                      }
                    }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>

          {/* Batch Number */}
          <Box>
            <TextField
              className="w-[150px]"
              label={t("purchases:batchNumber")}
              placeholder={t("purchases:batchNumberPlaceholder")}
              value={watch(`items.${index}.batch_number`) || ""}
              onChange={(e) => setValue(`items.${index}.batch_number`, e.target.value)}
              disabled={isSubmitting}
              size="small"
              
              error={!!getFieldError('batch_number')}
              helperText={getFieldError('batch_number')}
            />
          </Box>

          {/* Quantity */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                sx={{
                  width: '150px'
                }}
                label={`${t("purchases:quantityStocking", {
                  unit: selectedProduct?.stocking_unit_name || t("common:unit"),
                })} *`}
                type="number"
                inputProps={{ min: 1, step: 1 }}
                placeholder="1"
                value={watch(`items.${index}.quantity`) || ""}
                onChange={(e) => setValue(`items.${index}.quantity`, Number(e.target.value))}
                disabled={isSubmitting}
                size="small"
                error={!!getFieldError('quantity')}
                helperText={getFieldError('quantity')}
              />
              <Chip
                label={selectedProduct 
                  ? `${formatNumber(totalSellableUnitsDisplay)} ${selectedProduct.sellable_unit_name || t("common:items")}`
                  : t("purchases:selectProductFirst")
                }
                size="small"
                color={selectedProduct ? "primary" : "default"}
                variant={selectedProduct ? "filled" : "outlined"}
                sx={{ 
                  fontSize: '0.75rem',
                  minWidth: '80px',
                  height: '24px',
                  '& .MuiChip-label': {
                    px: 1,
                    textAlign: 'center'
                  }
                }}
              />
            </Box>
          </Box>

          {/* Unit Cost */}
          <Box>
            <TextField
              label={`${t("purchases:unitCostStocking", {
                unit: selectedProduct?.stocking_unit_name || t("common:unit"),
              })} *`}
              sx={{
                width: '150px'
              }}
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              placeholder="0.00"
              value={watch(`items.${index}.unit_cost`) || ""}
              onChange={(e) => setValue(`items.${index}.unit_cost`, Number(e.target.value))}
              disabled={isSubmitting}
              size="small"
              
              error={!!getFieldError('unit_cost')}
              helperText={getFieldError('unit_cost')}
            />
          </Box>

          {/* Sale Price */}
          <Box>
            <TextField
              label={t("purchases:intendedSalePricePerSellable", {
                unit: selectedProduct?.sellable_unit_name || t("common:item"),
              })}
              sx={{
                width: '150px'
              }}
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              placeholder="0.00"
              value={watch(`items.${index}.sale_price`) || ""}
              onChange={(e) => setValue(`items.${index}.sale_price`, e.target.value ? Number(e.target.value) : null)}
              disabled={isSubmitting}
              size="small"
              
              error={!!getFieldError('sale_price')}
              helperText={getFieldError('sale_price')}
            />
          </Box>

          {/* Expiry Date */}
          <Box>
            <TextField
              label={t("purchases:expiryDate")}
              type="date"
              value={watch(`items.${index}.expiry_date`) ? 
                (watch(`items.${index}.expiry_date`) as Date).toISOString().split('T')[0] : 
                ""
              }
              sx={{
                width: '150px'
              }}
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  setValue(`items.${index}.expiry_date`, new Date(dateValue));
                } else {
                  setValue(`items.${index}.expiry_date`, null);
                }
              }}
              disabled={isSubmitting}
              size="small"
              fullWidth
              error={!!getFieldError('expiry_date')}
              helperText={getFieldError('expiry_date')}
              inputProps={{
                min: new Date().toISOString().split('T')[0]
              }}
            />
          </Box>

          {/* Item Total Cost */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            height: '100%',
            pt: 1
          }}>
            <Typography variant="caption" color="text.secondary">
              {t("purchases:itemTotalCost")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatNumber(itemTotalCost)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
