// src/components/common/ProductAutocomplete.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import { 
  TextField, 
  Typography, 
  Box,
  Tooltip,
  IconButton
} from "@mui/material";
import { 
  ContentCopy as CopyIcon
} from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";

// Types
import { Product } from "../../services/productService";
import apiClient from "@/lib/axios";

interface ProductAutocompleteProps {
  value: Product | null;
  onChange: (product: Product | null) => void;
  onInputChange?: (inputValue: string) => void;
  inputValue?: string;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  size?: "small" | "medium";
  placeholder?: string;
  required?: boolean;
  showSku?: boolean;
  className?: string;
  id?: string;
}

// Memoized product option component for better performance
const ProductOption = React.memo(({ option }: { option: Product }) => (
  <Box>
    <Typography variant="body2" component="span">
      {option.name}
    </Typography>
    {option.sku && (
      <Typography variant="caption" color="text.secondary" display="block">
        SKU: {option.sku}
      </Typography>
    )}
  </Box>
));

ProductOption.displayName = 'ProductOption';

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = React.memo(({
  value,
  onChange,
  onInputChange,
  inputValue: externalInputValue,
  label,
  error = false,
  helperText,
  disabled = false,
  size = "small",
  placeholder,
  required = false,
  showSku = true,
  className,
  id,
}) => {
  const { t } = useTranslation(["common", "products"]);
  
  // Internal state for this component
  const [productSearchInput, setProductSearchInput] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastProductSearchRef = useRef<string>("");
  const autocompleteRef = useRef<HTMLInputElement>(null);

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

  // Sync input value when product is selected from external value
  useEffect(() => {
    if (value && value.name !== productSearchInput) {
      setProductSearchInput(value.name);
    } else if (!value && productSearchInput !== '') {
      setProductSearchInput('');
    }
  }, [value, productSearchInput]);

  // Initial search when component mounts
  useEffect(() => {
    setDebouncedProductSearch('');
  }, []);

  // Memoized handlers
  const handleProductChange = useCallback((event: React.SyntheticEvent, newValue: Product | null) => {
    if (newValue) {
      onChange(newValue);
      setProductSearchInput(newValue.name);
    } else {
      onChange(null);
      setProductSearchInput("");
    }
  }, [onChange]);

  const handleInputChange = useCallback((event: React.SyntheticEvent, newInputValue: string) => {
    setProductSearchInput(newInputValue);
    if (onInputChange) {
      onInputChange(newInputValue);
    }
  }, [onInputChange]);

  const handleCopySku = useCallback(async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy SKU:', err);
    }
  }, []);

  // Memoized product options
  const productOptions = useMemo(() => {
    return localProducts;
  }, [localProducts]);

  return (
    <Box>
      <Autocomplete
        id={id}
        ref={autocompleteRef}
        options={productOptions}
        getOptionLabel={(option) => option.name}
        value={value}
        onChange={handleProductChange}
        onInputChange={handleInputChange}
        inputValue={currentInputValue}
        loading={loadingProducts}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        noOptionsText={t('common:noResults')}
        disabled={disabled}
        freeSolo={false}
        clearOnBlur={true}
        selectOnFocus={true}
        blurOnSelect={true}
        filterOptions={(x) => x} // Disable client-side filtering since we're doing server-side search
        className={className}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label || t('products:productName')}
            error={error}
            helperText={helperText}
            size={size}
            required={required}
            placeholder={placeholder}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          return (
            <li key={key} {...otherProps}>
              <ProductOption option={option} />
            </li>
          );
        }}
      />
      
      {showSku && value?.sku && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            SKU: {value.sku}
          </Typography>
          <Tooltip title={t('common:copy')}>
            <IconButton
              size="small"
              onClick={() => handleCopySku(value.sku!)}
              sx={{ p: 0.5 }}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
});

ProductAutocomplete.displayName = 'ProductAutocomplete'; 