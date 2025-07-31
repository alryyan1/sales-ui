// src/components/pos/PosHeader.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  TextField,
  InputAdornment,
  Autocomplete,
} from "@mui/material";

// Shadcn Components
import { Button } from "@/components/ui/button";

// MUI Icons
import {
  QrCode as BarcodeIcon,
  Add as AddIcon,
  Receipt as ReceiptIcon,
  Calculate as CalculateIcon,
  PictureAsPdf as PdfIcon,
  Description as InvoiceIcon,
  Print as PrintIcon,
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
  onPreviewPdf?: () => void;
  onGenerateInvoice?: () => void;
  onPrintThermalInvoice?: () => void;
  hasSelectedSale?: boolean;
}

export const PosHeader: React.FC<PosHeaderProps> = ({ onAddProduct, loading, onNewSale, onOpenCalculator, onGeneratePdf, onPreviewPdf, onGenerateInvoice, onPrintThermalInvoice, hasSelectedSale }) => {
  const { t } = useTranslation(['pos', 'common']);
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
    <div className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 min-h-[80px] flex items-center justify-between">
        <h1 className="text-2xl font-semibold mr-4">
          {t('pos:title')}
        </h1>

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
                  <div className="font-medium">
                    {option.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    SKU: {option.sku || "N/A"} | Price: {formatNumber(option.suggested_sale_price_per_sellable_unit || 0)}
                  </div>
                </Box>
              </Box>
            )}
            noOptionsText={searchInput ? t("common:noResults") : t("pos:typeToSearch")}
          />
          
          <Button
            variant="outline"
            size="default"
            onClick={handleAddProduct}
            disabled={!selectedProduct || loading}
            className="min-w-auto px-2 py-1.5 bg-white text-primary hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500"
          >
            <AddIcon className="mr-2 h-4 w-4" />
            {t('pos:addProduct')}
          </Button>
        </Box>

        <span className="text-sm ml-3">
          {t('pos:pressEnterToAdd')}
        </span>

        {/* Calculator Button */}
        <Button
          variant="default"
          size="default"
          onClick={onOpenCalculator}
          className="ml-3 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500"
        >
          <CalculateIcon className="mr-2 h-4 w-4" />
          {t('pos:calculator')}
        </Button>

        {/* New Sale Button */}
        <Button
          variant="default"
          size="default"
          onClick={onNewSale}
          className="ml-3 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500"
        >
          <ReceiptIcon className="mr-2 h-4 w-4" />
          {t('pos:newSale')}
        </Button>

        {/* Preview PDF Button */}
        <Button
          variant="default"
          size="default"
          onClick={onPreviewPdf}
          className="ml-3 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500"
        >
          <PdfIcon className="mr-2 h-4 w-4" />
          {t('pos:previewPdf')}
        </Button>

        {/* Invoice PDF Button - Only show when sale is selected */}
        {hasSelectedSale && (
          <Button
            variant="default"
            size="default"
            onClick={onGenerateInvoice}
            className="ml-3 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500"
          >
            <InvoiceIcon className="mr-2 h-4 w-4" />
            {t('pos:generateInvoice')}
          </Button>
        )}

        {/* Thermal Invoice Button - Only show when sale is selected */}
        {hasSelectedSale && (
          <Button
            variant="default"
            size="default"
            onClick={onPrintThermalInvoice}
            className="ml-3 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500"
          >
            <PrintIcon className="mr-2 h-4 w-4" />
            {t('pos:printThermalInvoice')}
          </Button>
        )}

        {/* PDF Report Button */}
        <Button
          variant="default"
          size="default"
          onClick={onGeneratePdf}
          className="ml-3 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500"
        >
          <FileText className="mr-2 h-4 w-4" />
          {t('pos:generatePdf')}
        </Button>
      </div>
    </div>
  );
}; 