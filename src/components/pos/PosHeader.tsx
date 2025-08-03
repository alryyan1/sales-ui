// src/components/pos/PosHeader.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Box,
  TextField,
  InputAdornment,
  Autocomplete,
  Typography,
} from "@mui/material";

// Shadcn Components
import { Button } from "@/components/ui/button";

// MUI Icons
import {
    QrCode as BarcodeIcon,
    Add as AddIcon,
    Calculate as CalculateIcon,
    PictureAsPdf as PdfIcon,
    Description as InvoiceIcon,
    Print as PrintIcon,
} from "@mui/icons-material";

// Lucide Icons
import { FileText, Users } from "lucide-react";

// Types
import { Product } from "../../services/productService";
import { formatNumber } from "@/constants";
import apiClient from "@/lib/axios";
import clientService, { Client } from "../../services/clientService";

interface PosHeaderProps {
  onAddProduct: (product: Product) => Promise<void>;
  loading: boolean;
  onCreateEmptySale?: () => void;
  onOpenCalculator?: () => void;
  onGeneratePdf?: () => void;
  onPreviewPdf?: () => void;
  onGenerateInvoice?: () => void;
  onPrintThermalInvoice?: () => void;
  hasSelectedSale?: boolean;
  selectedClient?: Client | null;
  onClientChange?: (client: Client | null) => void;
  filterByCurrentUser?: boolean;
  onToggleUserFilter?: () => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({ onAddProduct, loading, onCreateEmptySale, onOpenCalculator, onGeneratePdf, onPreviewPdf, onGenerateInvoice, onPrintThermalInvoice, hasSelectedSale, selectedClient, onClientChange, filterByCurrentUser, onToggleUserFilter, selectedDate, onDateChange }) => {
  const { t } = useTranslation(['pos', 'common']);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

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
        await onAddProduct(productBySku);
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
          await onAddProduct(exactSkuMatch);
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

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await clientService.getClients();
      setClients(response.data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  const handleAddProduct = async () => {
    if (selectedProduct) {
      await onAddProduct(selectedProduct);
      setSelectedProduct(null);
      setSearchInput("");
      setSearchResults([]);
    }
  };

  return (
      <div className="w-full px-1 py-1 min-h-[80px] flex items-center justify-between">
        {/* Left side - Create Empty Sale Button and Date Selection */}
        <div className="flex items-center space-x-1">
          <Button
            variant="default"
            size="default"
            onClick={onCreateEmptySale}
            disabled={loading}
            className="relative group px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500"
            title={t('pos:createEmptySale')}
          >
            <AddIcon className="h-4 w-4" />
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              {t('pos:createEmptySale')}
            </span>
          </Button>

          {/* Date Selection */}
          <Box sx={{ minWidth: 150 }}>
            <TextField
              type="date"
              value={selectedDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => onDateChange?.(e.target.value)}
              size="small"
              sx={{
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
              }}
            />
          </Box>
        </div>

        {/* Center - Client Selection and Product Search */}
        <div className="flex items-center space-x-4">
          {/* Client Selection - Only show when sale is selected */}
          {hasSelectedSale && (
            <Box sx={{ minWidth: 200 }}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => `${option.name} ${option.phone ? `(${option.phone})` : ''}`}
                value={selectedClient}
                onChange={(_, newValue) => onClientChange?.(newValue)}
                loading={loadingClients}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('pos:selectClient')}
                    placeholder={t('pos:searchClientPlaceholder')}
                    size="small"
                    sx={{
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
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      {option.phone && (
                        <Typography variant="body2" color="text.secondary">
                          {option.phone}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              />
            </Box>
          )}

          {/* Product Search - Only show when sale is selected */}
          {hasSelectedSale && (
            <>
              <Box sx={{ minWidth: 400, display: 'flex', gap: 2, alignItems: 'center' }}>
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
                  className="relative group min-w-auto px-2 py-1.5 bg-white text-primary hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500"
                  title={t('pos:addProduct')}
                >
                  <AddIcon className="h-4 w-4" />
                  <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    {t('pos:addProduct')}
                  </span>
                </Button>
              </Box>

              <span className="text-sm text-gray-300">
                {t('pos:pressEnterToAdd')}
              </span>
            </>
          )}
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* User Filter Button */}
          <Button
            variant="default"
            size="default"
            onClick={onToggleUserFilter}
            className={`relative group px-3 py-1.5 ${
              filterByCurrentUser 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-500 hover:bg-gray-600'
            } disabled:bg-gray-300 disabled:text-gray-500`}
            title={filterByCurrentUser ? t('pos:showAllSales') : t('pos:showMySales')}
          >
            <Users className="h-4 w-4" />
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              {filterByCurrentUser ? t('pos:showAllSales') : t('pos:showMySales')}
            </span>
          </Button>

          {/* Calculator Button */}
          <Button
            variant="default"
            size="default"
            onClick={onOpenCalculator}
            className="relative group px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500"
            title={t('pos:calculator')}
          >
            <CalculateIcon className="h-4 w-4" />
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              {t('pos:calculator')}
            </span>
          </Button>

          {/* Preview PDF Button */}
          <Button
            variant="default"
            size="default"
            onClick={onPreviewPdf}
            className="relative group px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500"
            title={t('pos:previewPdf')}
          >
            <PdfIcon className="h-4 w-4" />
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              {t('pos:previewPdf')}
            </span>
          </Button>

          {/* Invoice PDF Button - Only show when sale is selected */}
          {hasSelectedSale && (
            <Button
              variant="default"
              size="default"
              onClick={onGenerateInvoice}
              className="relative group px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500"
              title={t('pos:generateInvoice')}
            >
              <InvoiceIcon className="h-4 w-4" />
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {t('pos:generateInvoice')}
              </span>
            </Button>
          )}

          {/* Thermal Invoice Button - Only show when sale is selected */}
          {hasSelectedSale && (
            <Button
              variant="default"
              size="default"
              onClick={onPrintThermalInvoice}
              className="relative group px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500"
              title={t('pos:printThermalInvoice')}
            >
              <PrintIcon className="h-4 w-4" />
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {t('pos:printThermalInvoice')}
              </span>
            </Button>
          )}

          {/* PDF Report Button */}
          <Button
            variant="default"
            size="default"
            onClick={onGeneratePdf}
            className="relative group px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500"
            title={t('pos:generatePdf')}
          >
            <FileText className="h-4 w-4" />
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              {t('pos:generatePdf')}
            </span>
          </Button>
        </div>
        </div>
  );
}; 