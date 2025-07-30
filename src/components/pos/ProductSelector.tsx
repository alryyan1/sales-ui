// src/components/pos/ProductSelector.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  InputAdornment,
  CircularProgress,
} from "@mui/material";

// MUI Icons
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from "@mui/icons-material";

// Types
import { Product } from "../../services/productService";
import { formatNumber } from "@/constants";
import apiClient from "@/lib/axios";

interface ProductSelectorProps {
  open: boolean;
  onClose: () => void;
  onProductSelected: (product: Product) => void;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  open,
  onClose,
  onProductSelected,
}) => {
  const { t } = useTranslation(['pos', 'common']);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ data: Product[] }>(
        `/products/autocomplete?search=${encodeURIComponent(term)}&limit=20`
      );
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to search products:', error);
      setError(t('pos:failedToLoadProducts'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleProductSelect = (product: Product) => {
    onProductSelected(product);
    onClose();
    setSearchTerm("");
    setProducts([]);
  };

  const handleClose = () => {
    onClose();
    setSearchTerm("");
    setProducts([]);
    setError(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {t('pos:selectProduct')}
          </Typography>
          <Button onClick={handleClose} startIcon={<CloseIcon />}>
            {t('common:close')}
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <TextField
          fullWidth
          placeholder={t('pos:searchProducts')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : products.length === 0 && searchTerm ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {t('common:noResults')}
          </Typography>
        ) : (
          <List>
            {products.map((product) => (
              <ListItem
                key={product.id}
                button
                onClick={() => handleProductSelect(product)}
                sx={{
                  border: 1,
                  borderColor: 'grey.200',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'grey.50',
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {product.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={product.name}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        SKU: {product.sku || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                        {formatNumber(product.suggested_sale_price_per_sellable_unit || 0)}
                      </Typography>
                    </Box>
                  }
                />
                <AddIcon color="primary" />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}; 