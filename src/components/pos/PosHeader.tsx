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
  Button,
  IconButton,
  Paper,
  CircularProgress,
} from "@mui/material";

// MUI Icons
import AddIcon from '@mui/icons-material/Add';
import CalculateIcon from '@mui/icons-material/Calculate';
import DescriptionIcon from '@mui/icons-material/Description';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CloseIcon from '@mui/icons-material/Close';

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
      
      if (selectedProducts.length > 0) {
        await handleAddProducts();
        return;
      }
      
      if (!searchInput.trim()) return;
      
      const productBySku = searchResults.find(
        product => product.sku?.toLowerCase() === searchInput.toLowerCase()
      );
      
      if (productBySku) {
        if (!selectedProducts.find(p => p.id === productBySku.id)) {
          setSelectedProducts(prev => [...prev, productBySku]);
        }
        setSearchInput("");
        setSearchResults([]);
        return;
      }
      
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

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchShift = async () => {
      try {
        setShiftLoading(true);
        const response = await apiClient.get("/shifts/current");
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

  useEffect(() => {
    if (selectedClient && !clients.find(c => c.id === selectedClient.id)) {
      setClients(prev => [selectedClient, ...prev]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient]);

  const handleAddProducts = async () => {
    if (selectedProducts.length === 0) return;

    if (selectedProducts.length === 1 && onAddProduct) {
      await onAddProduct(selectedProducts[0]);
    } else if (onAddMultipleProducts) {
      await onAddMultipleProducts(selectedProducts);
    } else {
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
    <Paper sx={{ mx: 1, mt: 1, px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      {/* Left - Create Sale + Date */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="إنشاء بيع جديد">
          <IconButton
            color="primary"
            onClick={onCreateEmptySale}
            disabled={loading}
            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            size="small"
          >
            <AddIcon />
          </IconButton>
        </Tooltip>

        <TextField
          type="date"
          value={selectedDate || new Date().toISOString().split('T')[0]}
          onChange={(e) => onDateChange?.(e.target.value)}
          size="small"
          sx={{ width: 150 }}
        />
      </Box>

      {/* Center - Client + Product Search */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
        {hasSelectedSale && (
          <>
            {/* Client Selection */}
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => `${option.name} ${option.phone ? `(${option.phone})` : ''}`}
              value={selectedClient || null}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, newValue) => onClientChange?.(newValue)}
              loading={loadingClients}
              size="small"
              sx={{ minWidth: 200 }}
              renderInput={(params) => (
                <TextField {...params} label="العميل" placeholder="ابحث عن عميل..." size="small" />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    {option.phone && (
                      <Typography variant="caption" color="text.secondary">{option.phone}</Typography>
                    )}
                  </Box>
                </Box>
              )}
            />

            {/* Product Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 350 }}>
              <Autocomplete
                multiple
                freeSolo
                blurOnSelect={false}
                clearOnBlur={false}
                fullWidth
                options={searchResults}
                value={selectedProducts}
                onChange={(_, newValue) => {
                  const products = newValue.filter(item => typeof item !== 'string') as Product[];
                  setSelectedProducts(products);
                }}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return `${option.name} (${option.sku || 'N/A'})`;
                }}
                inputValue={searchInput}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setSearchInput(newInputValue);
                    handleSearch(newInputValue);
                  }
                }}
                loading={searchLoading}
                disabled={loading}
                size="small"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="ابحث عن منتج..."
                    size="small"
                    onKeyDown={handleKeyDown}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        باركود: {option.sku || "N/A"} | السعر: {formatNumber(option.last_sale_price_per_sellable_unit || 0)}
                      </Typography>
                    </Box>
                  </Box>
                )}
                noOptionsText={searchInput ? "لا توجد نتائج" : "اكتب للبحث..."}
              />
              
              <Tooltip title={selectedProducts.length > 1 ? "إضافة المنتجات" : "إضافة منتج"}>
                <span>
                  <IconButton
                    color="primary"
                    onClick={handleAddProducts}
                    disabled={selectedProducts.length === 0 || loading}
                    size="small"
                  >
                    <AddIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <Typography variant="caption" color="text.secondary">
              اضغط Enter للإضافة
            </Typography>
          </>
        )}
      </Box>

      {/* Right - Shift + Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Shift */}
        {shift && shift.is_open ? (
          <>
            <Chip label="وردية مفتوحة" color="success" size="small" variant="outlined" />
            <Tooltip title="إغلاق الوردية">
              <IconButton
                color="error"
                onClick={handleCloseShift}
                disabled={shiftLoading}
                size="small"
              >
                {shiftLoading ? <CircularProgress size={16} /> : <CloseIcon />}
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={handleOpenShift}
            disabled={shiftLoading}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            {shiftLoading ? <CircularProgress size={16} color="inherit" /> : 'وردية'}
          </Button>
        )}

        {/* Calculator */}
        <Tooltip title="الآلة الحاسبة">
          <IconButton
            onClick={onOpenCalculator}
            sx={{ bgcolor: 'warning.main', color: 'white', '&:hover': { bgcolor: 'warning.dark' } }}
            size="small"
          >
            <CalculateIcon />
          </IconButton>
        </Tooltip>

        {/* Preview PDF */}
        <Tooltip title="معاينة PDF">
          <IconButton
            onClick={onPreviewPdf}
            sx={{ bgcolor: 'secondary.main', color: 'white', '&:hover': { bgcolor: 'secondary.dark' } }}
            size="small"
          >
            <DescriptionIcon />
          </IconButton>
        </Tooltip>

        {/* Invoice - Only when sale selected */}
        {hasSelectedSale && (
          <Tooltip title="إنشاء فاتورة">
            <IconButton
              onClick={onGenerateInvoice}
              sx={{ bgcolor: 'success.main', color: 'white', '&:hover': { bgcolor: 'success.dark' } }}
              size="small"
            >
              <ReceiptIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Thermal Print - Only when sale selected */}
        {hasSelectedSale && (
          <Tooltip title="طباعة فاتورة حرارية">
            <IconButton
              onClick={onPrintThermalInvoice}
              sx={{ bgcolor: 'warning.main', color: 'white', '&:hover': { bgcolor: 'warning.dark' } }}
              size="small"
            >
              <PrintIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Generate PDF */}
        <Tooltip title="إنشاء تقرير PDF">
          <IconButton
            onClick={onGeneratePdf}
            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            size="small"
          >
            <DescriptionIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};
