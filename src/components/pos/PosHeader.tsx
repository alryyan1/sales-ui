// src/components/pos/PosHeader.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// MUI Components
import {
  Box,
  TextField,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  InputAdornment,
  Autocomplete,
  Button,
} from "@mui/material";

// MUI Icons
import {
  ArrowBack as BackIcon,
  QrCode as BarcodeIcon,
  Add as AddIcon,
  Receipt as ReceiptIcon,
  Calculate as CalculateIcon,
} from "@mui/icons-material";

// Lucide Icons
import { FileText } from "lucide-react";

// Types
import { Product } from "../../services/productService";
import { formatNumber } from "@/constants";
import apiClient from "@/lib/axios";

interface PosHeaderProps {
  onAddProduct: (product: Product) => void;
  loading: boolean;
  onNewSale?: () => void;
  onOpenCalculator?: () => void;
  onGeneratePdf?: () => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({ onAddProduct, loading, onNewSale, onOpenCalculator, onGeneratePdf }) => {
  const { t } = useTranslation(['pos', 'common']);
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleSearch = async (input: string) => {
    if (!input.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await apiClient.get<{ data: Product[] }>(
        `/products/autocomplete?search=${encodeURIComponent(input)}&limit=10`
      );
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Failed to search products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      
      if (!searchInput.trim()) return;
      
      // First try to find in search results
      const productBySku = searchResults.find(
        product => product.sku?.toLowerCase() === searchInput.toLowerCase()
      );
      
      if (productBySku) {
        // Automatically add the product to sale
        onAddProduct(productBySku);
        setSearchInput("");
        setSearchResults([]);
        return;
      }
      
      // If not found in results, search backend specifically
      try {
        setSearchLoading(true);
        const response = await apiClient.get<{ data: Product[] }>(
          `/products/autocomplete?search=${encodeURIComponent(searchInput)}&limit=50`
        );
        const fetchedProducts = response.data.data || [];
        
        const exactSkuMatch = fetchedProducts.find(
          product => product.sku?.toLowerCase() === searchInput.toLowerCase()
        );
        
        if (exactSkuMatch) {
          // Automatically add the product to sale
          onAddProduct(exactSkuMatch);
          setSearchInput("");
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Failed to search product by SKU:', error);
      } finally {
        setSearchLoading(false);
      }
    }
  };

  const handleAddProduct = () => {
    if (selectedProduct) {
      onAddProduct(selectedProduct);
      setSelectedProduct(null);
      setSearchInput("");
      setSearchResults([]);
    }
  };

  return (
    <AppBar position="static" color="primary" elevation={2}>
      <Toolbar sx={{ minHeight: '80px' }}>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ mr: 3 }}
        >
          <BackIcon />
        </IconButton>
        
        <Typography variant="h5" component="div" sx={{ flexGrow: 0, mr: 4, fontWeight: 600 }}>
          {t('pos:title')}
        </Typography>

        <Box sx={{ flexGrow: 1, maxWidth: 600, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Autocomplete
            freeSolo
            sx={{
              width: '100%'
            }}
            fullWidth
            options={searchResults}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option;
              return `${option.name} (${option.sku || 'N/A'})`;
            }}
            inputValue={searchInput}
            onInputChange={(event, newInputValue) => {
              setSearchInput(newInputValue);
              handleSearch(newInputValue);
            }}
            onChange={(event, newValue) => {
              if (newValue && typeof newValue !== 'string') {
                setSelectedProduct(newValue);
              }
            }}
            loading={searchLoading}
            disabled={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t('pos:searchProducts')}
                variant="outlined"
                size="medium"
                onKeyDown={handleKeyDown}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <BarcodeIcon />
                    </InputAdornment>
                  ),
                  sx: {
                    backgroundColor: 'white',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'transparent',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'transparent',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'transparent',
                    },
                  }
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    SKU: {option.sku || "N/A"} | Price: {formatNumber(option.suggested_sale_price_per_sellable_unit || 0)}
                  </Typography>
                </Box>
              </Box>
            )}
            noOptionsText={searchInput ? t("common:noResults") : t("pos:typeToSearch")}
          />
          
          <Button
            variant="contained"
            size="medium"
            onClick={handleAddProduct}
            disabled={!selectedProduct || loading}
            startIcon={<AddIcon />}
            sx={{
              minWidth: 'auto',
              px: 2,
              py: 1.5,
              backgroundColor: 'white',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'grey.100',
              },
              '&:disabled': {
                backgroundColor: 'grey.300',
                color: 'grey.500',
              }
            }}
          >
            {t('pos:addProduct')}
          </Button>
        </Box>

        <Typography variant="body2" color="inherit" sx={{ ml: 3 }}>
          {t('pos:pressEnterToAdd')}
        </Typography>

        {/* Calculator Button */}
        <Button
          variant="contained"
          size="medium"
          onClick={onOpenCalculator}
          startIcon={<CalculateIcon />}
          sx={{
            ml: 3,
            px: 3,
            py: 1.5,
            backgroundColor: 'warning.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'warning.dark',
            },
            '&:disabled': {
              backgroundColor: 'grey.300',
              color: 'grey.500',
            }
          }}
        >
          {t('pos:calculator')}
        </Button>

        {/* New Sale Button */}
        <Button
          variant="contained"
          size="medium"
          onClick={onNewSale}
          startIcon={<ReceiptIcon />}
          sx={{
            ml: 3,
            px: 3,
            py: 1.5,
            backgroundColor: 'success.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'success.dark',
            },
            '&:disabled': {
              backgroundColor: 'grey.300',
              color: 'grey.500',
            }
          }}
        >
          {t('pos:newSale')}
        </Button>

        {/* PDF Report Button */}
        <Button
          variant="contained"
          size="medium"
          onClick={onGeneratePdf}
          startIcon={<FileText />}
          sx={{
            ml: 3,
            px: 3,
            py: 1.5,
            backgroundColor: 'info.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'info.dark',
            },
            '&:disabled': {
              backgroundColor: 'grey.300',
              color: 'grey.500',
            }
          }}
        >
          {t('pos:generatePdf')}
        </Button>
      </Toolbar>
    </AppBar>
  );
}; 