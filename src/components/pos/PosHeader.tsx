// src/components/pos/PosHeader.tsx
import React, { useState, useEffect } from "react";

// MUI Components
import {
  Box,
  TextField,
  Autocomplete,
  Typography,
  Tooltip,
  Chip,
} from "@mui/material";

// shadcn UI
import { Button } from "@/components/ui/button";

// Icons
import {
  Plus,
  Calculator,
  FileText,
  Printer,
  FilePenLine,
} from "lucide-react";

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
  selectedDate, 
  onDateChange 
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Shift state
  const [shift, setShift] = useState<{
    id: number;
    opened_at: string | null;
    closed_at: string | null;
    is_open: boolean;
  } | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);

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

  // Load current shift on mount
  useEffect(() => {
    const fetchShift = async () => {
      try {
        setShiftLoading(true);
        const response = await apiClient.get("/shifts/current");
        // 204 means no content / no active shift
        if (response.status === 200) {
          setShift(response.data.data || response.data);
        } else {
          setShift(null);
        }
      } catch (error) {
        // @ts-expect-error axios error narrow
        if (error?.response?.status === 204) {
          setShift(null);
        } else {
          console.error("Failed to load current shift:", error);
        }
      } finally {
        setShiftLoading(false);
      }
    };
    fetchShift();
  }, []);

  const handleOpenShift = async () => {
    try {
      setShiftLoading(true);
      const response = await apiClient.post("/shifts/open");
      setShift(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to open shift:", error);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleCloseShift = async () => {
    try {
      setShiftLoading(true);
      const response = await apiClient.post("/shifts/close");
      setShift(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to close shift:", error);
    } finally {
      setShiftLoading(false);
    }
  };

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
            <div>
              <Button
                type="button"
                size="icon"
                disabled={loading}
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={onCreateEmptySale}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
                  <div>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={selectedProducts.length === 0 || loading}
                      className="h-8 w-8 rounded-full"
                      onClick={handleAddProducts}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Tooltip>
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                اضغط Enter للإضافة
              </Typography>
            </>
          )}
        </div>

        {/* Right side - Shift + Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Shift status / actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
            {shift && shift.is_open ? (
              <>
                <Chip
                  label="وردية مفتوحة"
                  color="success"
                  size="small"
                  variant="outlined"
                />
                <Tooltip title="إغلاق الوردية">
                  <div>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      disabled={shiftLoading}
                      className="h-7 w-7 rounded-full"
                      onClick={handleCloseShift}
                    >
                      <span className="text-xs font-bold">×</span>
                    </Button>
                  </div>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="فتح وردية جديدة">
                <div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={shiftLoading}
                    className="h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-semibold text-white"
                    onClick={handleOpenShift}
                  >
                    وردية
                  </Button>
                </div>
              </Tooltip>
            )}
          </Box>

          {/* Calculator Button */}
          <Tooltip title="الآلة الحاسبة">
            <div>
              <Button
                type="button"
                size="icon"
                className="h-8 w-8 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                onClick={onOpenCalculator}
              >
                <Calculator className="h-4 w-4" />
              </Button>
            </div>
          </Tooltip>

          {/* Preview PDF Button */}
          <Tooltip title="معاينة PDF">
            <div>
              <Button
                type="button"
                size="icon"
                className="h-8 w-8 rounded-full bg-purple-600 text-white hover:bg-purple-700"
                onClick={onPreviewPdf}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </Tooltip>

          {/* Invoice PDF Button - Only show when sale is selected */}
          {hasSelectedSale && (
            <Tooltip title="إنشاء فاتورة">
              <div>
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={onGenerateInvoice}
                >
                  <FilePenLine className="h-4 w-4" />
                </Button>
              </div>
            </Tooltip>
          )}

          {/* Thermal Invoice Button - Only show when sale is selected */}
          {hasSelectedSale && (
            <Tooltip title="طباعة فاتورة حرارية">
              <div>
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                  onClick={onPrintThermalInvoice}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </Tooltip>
          )}

          {/* PDF Report Button */}
          <Tooltip title="إنشاء PDF">
            <div>
              <Button
                type="button"
                size="icon"
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={onGeneratePdf}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </Tooltip>
        </div>
        </div>
  );
}; 