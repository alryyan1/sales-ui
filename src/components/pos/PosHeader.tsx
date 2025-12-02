// src/components/pos/PosHeader.tsx
import React, { useState, useEffect } from "react";

// MUI Components
import {
  Box,
  TextField,
  Autocomplete,
  Typography,
  Button,
  Tooltip,
} from "@mui/material";

// MUI Icons
import {
    Add as AddIcon,
    Calculate as CalculateIcon,
    PictureAsPdf as PdfIcon,
    Description as InvoiceIcon,
    Print as PrintIcon,
    Description as FileTextIcon,
} from "@mui/icons-material";

// Types
import { Product } from "../../services/productService";
import { formatNumber } from "@/constants";
import apiClient from "@/lib/axios";
import clientService, { Client } from "../../services/clientService";

interface PosHeaderProps {
  onAddProduct: (product: Product) => Promise<void>;
  onAddMultipleProducts?: (products: Product[]) => Promise<void>;
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

export const PosHeader: React.FC<PosHeaderProps> = ({ 
  onAddProduct, 
  onAddMultipleProducts, 
  loading, 
  onCreateEmptySale, 
  onOpenCalculator, 
  onGeneratePdf, 
  onPreviewPdf, 
  onGenerateInvoice, 
  onPrintThermalInvoice, 
  hasSelectedSale, 
  selectedClient, 
  onClientChange, 
  filterByCurrentUser, 
  onToggleUserFilter, 
  selectedDate, 
  onDateChange 
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
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
      
      // If there are selected products, trigger the add products button
      if (selectedProducts.length > 0) {
        await handleAddProducts();
        return;
      }
      
      // If no selected products but there's search input, try to find and add a product
      if (!searchInput.trim()) return;
      
      // First try to find in search results
      const productBySku = searchResults.find(
        product => product.sku?.toLowerCase() === searchInput.toLowerCase()
      );
      
      if (productBySku) {
        // Add to selected products if not already selected
        if (!selectedProducts.find(p => p.id === productBySku.id)) {
          setSelectedProducts(prev => [...prev, productBySku]);
        }
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
          // Add to selected products if not already selected
          if (!selectedProducts.find(p => p.id === exactSkuMatch.id)) {
            setSelectedProducts(prev => [...prev, exactSkuMatch]);
          }
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
      // Ensure selected client (if any) is included in options so Autocomplete can display it
      const fetched = response.data || [];
      if (selectedClient && !fetched.find(c => c.id === selectedClient.id)) {
        setClients([selectedClient, ...fetched]);
      } else {
        setClients(fetched);
      }
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
    // We intentionally don't include loadClients in deps to avoid re-fetch loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When selectedClient changes from parent, ensure it's present in options
  useEffect(() => {
    if (selectedClient && !clients.find(c => c.id === selectedClient.id)) {
      setClients(prev => [selectedClient, ...prev]);
    }
    // We intentionally don't include clients in deps to avoid infinite loop when mutating list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient]);

  const handleAddProducts = async () => {
    if (selectedProducts.length === 0) return;

    if (selectedProducts.length === 1 && onAddProduct) {
      // Single product - use existing method
      await onAddProduct(selectedProducts[0]);
    } else if (onAddMultipleProducts) {
      // Multiple products - use new method
      await onAddMultipleProducts(selectedProducts);
    } else {
      // Fallback - add one by one
      for (const product of selectedProducts) {
        if (onAddProduct) {
          await onAddProduct(product);
        }
      }
    }
    
    setSelectedProducts([]);
    setSearchInput("");
    setSearchResults([]);
  };



  return (
      <div className="w-full bg-white rounded-lg shadow-md border border-gray-200 px-4 py-3 min-h-[80px] flex items-center justify-between">
        {/* Left side - Create Empty Sale Button and Date Selection */}
        <div className="flex items-center space-x-1">
          <Tooltip title="إنشاء بيع فارغ">
            <Button
              variant="contained"
              size="small"
              onClick={onCreateEmptySale}
              disabled={loading}
              startIcon={<AddIcon />}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              إنشاء بيع فارغ
            </Button>
          </Tooltip>

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
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, newValue) => onClientChange?.(newValue)}
                loading={loadingClients}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="اختر العميل"
                    placeholder="ابحث عن عميل..."
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
                   multiple
                   freeSolo
                   blurOnSelect={false}
                   clearOnBlur={false}
                   sx={{
                     width: '100%'
                   }}
                   fullWidth
                   options={searchResults}
                   
                   value={selectedProducts}
                   onChange={(_, newValue) => {
                     // Filter out string values (freeSolo input)
                     const products = newValue.filter(item => typeof item !== 'string') as Product[];
                     setSelectedProducts(products);
                     
                     // Keep the search input focused and don't clear it immediately
                     // This allows users to continue selecting multiple products
                   }}
                   getOptionLabel={(option) => {
                     if (typeof option === 'string') return option;
                     return `${option.name} (${option.sku || 'N/A'})`;
                   }}
                   inputValue={searchInput}
                   onInputChange={(_, newInputValue, reason) => {
                     // Only update search input if it's a user typing or clearing
                     // Don't clear when selecting an option
                     if (reason === 'input' || reason === 'clear') {
                       setSearchInput(newInputValue);
                       handleSearch(newInputValue);
                     }
                     // When selecting an option (reason === 'selectOption'), keep the current input
                   }}
                   loading={searchLoading}
                   disabled={loading}
                   renderInput={(params) => (
                     <TextField
                       {...params}
                       placeholder="ابحث عن منتج..."
                       variant="outlined"
                       size="medium"
                       onKeyDown={handleKeyDown}
                     />
                   )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <div className="font-medium">
                          {option.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {option.sku || "N/A"} | Price: {formatNumber(option.last_sale_price_per_sellable_unit || 0)}
                        </div>
                      </Box>
                    </Box>
                  )}
                  noOptionsText={searchInput ? "لا توجد نتائج" : "اكتب للبحث..."}
                />
                
                <Tooltip title={selectedProducts.length > 1 ? "إضافة المنتجات" : "إضافة منتج"}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddProducts}
                    disabled={selectedProducts.length === 0 || loading}
                    startIcon={<AddIcon />}
                  >
                    {selectedProducts.length > 1 ? "إضافة المنتجات" : "إضافة منتج"}
                  </Button>
                </Tooltip>
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                اضغط Enter للإضافة
              </Typography>
            </>
          )}
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* User Filter Button */}
        

          {/* Calculator Button */}
          <Tooltip title="الآلة الحاسبة">
            <Button
              variant="contained"
              size="small"
              onClick={onOpenCalculator}
              startIcon={<CalculateIcon />}
              sx={{ bgcolor: 'orange.main', '&:hover': { bgcolor: 'orange.dark' } }}
            >
              الآلة الحاسبة
            </Button>
          </Tooltip>

          {/* Preview PDF Button */}
          <Tooltip title="معاينة PDF">
            <Button
              variant="contained"
              size="small"
              onClick={onPreviewPdf}
              startIcon={<PdfIcon />}
              sx={{ bgcolor: 'purple.main', '&:hover': { bgcolor: 'purple.dark' } }}
            >
              معاينة PDF
            </Button>
          </Tooltip>

          {/* Invoice PDF Button - Only show when sale is selected */}
          {hasSelectedSale && (
            <Tooltip title="إنشاء فاتورة">
              <Button
                variant="contained"
                size="small"
                onClick={onGenerateInvoice}
                startIcon={<InvoiceIcon />}
                sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
              >
                إنشاء فاتورة
              </Button>
            </Tooltip>
          )}

          {/* Thermal Invoice Button - Only show when sale is selected */}
          {hasSelectedSale && (
            <Tooltip title="طباعة فاتورة حرارية">
              <Button
                variant="contained"
                size="small"
                onClick={onPrintThermalInvoice}
                startIcon={<PrintIcon />}
                sx={{ bgcolor: 'orange.main', '&:hover': { bgcolor: 'orange.dark' } }}
              >
                طباعة فاتورة حرارية
              </Button>
            </Tooltip>
          )}

          {/* PDF Report Button */}
          <Tooltip title="إنشاء PDF">
            <Button
              variant="contained"
              size="small"
              onClick={onGeneratePdf}
              startIcon={<FileTextIcon />}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              إنشاء PDF
            </Button>
          </Tooltip>
        </div>
        </div>
  );
}; 