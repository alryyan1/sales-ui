// src/pages/PosPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// MUI Components
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  AppBar,
  Toolbar,
  Drawer,
  Badge,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Avatar,
  Tooltip,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";

// MUI Icons
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  LocalOffer as DiscountIcon,
  Calculate as CalculateIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  Email as EmailIcon,
} from "@mui/icons-material";

// Types
import { Product } from "../services/productService";
import { formatNumber } from "@/constants";
import apiClient from "@/lib/axios";

// Cart Item Type
interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Payment Method Type
type PaymentMethod = 'cash' | 'card' | 'mobile';

// POS Page Component
const PosPage: React.FC = () => {
  const { t } = useTranslation(['pos', 'common', 'products']);
  const navigate = useNavigate();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.15; // 15% tax
  const total = subtotal + tax;
  const change = cashAmount - total;

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Auto-focus search on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: Product[] }>('/products?limit=100');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      showSnackbar('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Update quantity
        return prevCart.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice
              }
            : item
        );
      } else {
        // Add new item
        const newItem: CartItem = {
          product,
          quantity: 1,
          unitPrice: product.suggested_sale_price_per_sellable_unit || 0,
          total: product.suggested_sale_price_per_sellable_unit || 0
        };
        return [...prevCart, newItem];
      }
    });
    
    showSnackbar(`${product.name} added to cart`, 'success');
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.unitPrice
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCartOpen(false);
  };

  const handlePayment = () => {
    setPaymentDialogOpen(true);
    setActiveStep(0);
  };

  const handlePaymentComplete = () => {
    // Here you would typically send the sale to your backend
    console.log('Processing sale:', {
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod,
      cashAmount,
      change
    });

    showSnackbar('Sale completed successfully!', 'success');
    clearCart();
    setPaymentDialogOpen(false);
    setCashAmount(0);
    setActiveStep(0);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('pos:title')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="inherit">
              {t('pos:totalItems')}: {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </Typography>
            
            <Tooltip title={t('pos:viewCart')}>
              <IconButton
                color="inherit"
                onClick={() => setCartOpen(true)}
                sx={{ position: 'relative' }}
              >
                <Badge badgeContent={cart.length} color="error">
                  <CartIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Products Section */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
          {/* Search Bar */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              ref={searchInputRef}
              fullWidth
              variant="outlined"
              placeholder={t('pos:searchProducts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>

          {/* Products Grid */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3
                        }
                      }}
                      onClick={() => addToCart(product)}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        <Avatar
                          sx={{ 
                            width: 60, 
                            height: 60, 
                            mx: 'auto', 
                            mb: 1,
                            bgcolor: 'primary.main'
                          }}
                        >
                          {product.name.charAt(0).toUpperCase()}
                        </Avatar>
                        
                        <Typography variant="h6" component="div" sx={{ mb: 1, fontSize: '0.9rem' }}>
                          {product.name}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          SKU: {product.sku || 'N/A'}
                        </Typography>
                        
                        <Chip
                          label={formatNumber(product.suggested_sale_price_per_sellable_unit || 0)}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>

        {/* Cart Drawer */}
        <Drawer
          anchor="right"
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 400,
              boxSizing: 'border-box',
            },
          }}
        >
          <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Cart Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('pos:cart')} ({cart.length})
              </Typography>
              <IconButton onClick={() => setCartOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Cart Items */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {cart.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    {t('pos:emptyCart')}
                  </Typography>
                </Box>
              ) : (
                <List>
                  {cart.map((item) => (
                    <ListItem key={item.product.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={item.product.name}
                        secondary={`${formatNumber(item.unitPrice)} × ${item.quantity}`}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          
                          <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <AddIcon />
                          </IconButton>
                          
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Cart Totals */}
            {cart.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{t('pos:subtotal')}</Typography>
                    <Typography variant="body2">{formatNumber(subtotal)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{t('pos:tax')} (15%)</Typography>
                    <Typography variant="body2">{formatNumber(tax)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">{t('pos:total')}</Typography>
                    <Typography variant="h6" color="primary">
                      {formatNumber(total)}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handlePayment}
                  startIcon={<PaymentIcon />}
                  disabled={cart.length === 0}
                >
                  {t('pos:proceedToPayment')}
                </Button>
              </>
            )}
          </Box>
        </Drawer>
      </Box>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{t('pos:payment')}</Typography>
            <IconButton onClick={() => setPaymentDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>{t('pos:selectPaymentMethod')}</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button
                    variant={paymentMethod === 'cash' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMethod('cash')}
                    startIcon={<PaymentIcon />}
                  >
                    {t('pos:cash')}
                  </Button>
                  <Button
                    variant={paymentMethod === 'card' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMethod('card')}
                    startIcon={<PaymentIcon />}
                  >
                    {t('pos:card')}
                  </Button>
                  <Button
                    variant={paymentMethod === 'mobile' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMethod('mobile')}
                    startIcon={<PaymentIcon />}
                  >
                    {t('pos:mobile')}
                  </Button>
                </Box>
                
                {paymentMethod === 'cash' && (
                  <TextField
                    fullWidth
                    label={t('pos:cashAmount')}
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                )}
                
                {paymentMethod === 'cash' && cashAmount > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="body2">
                      {t('pos:change')}: {formatNumber(change)}
                    </Typography>
                  </Box>
                )}
                
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(1)}
                  disabled={paymentMethod === 'cash' && cashAmount < total}
                >
                  {t('pos:continue')}
                </Button>
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>{t('pos:confirmSale')}</StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {t('pos:saleSummary')}
                  </Typography>
                  <Typography variant="body2">
                    {t('pos:totalAmount')}: {formatNumber(total)}
                  </Typography>
                  <Typography variant="body2">
                    {t('pos:paymentMethod')}: {t(`pos:${paymentMethod}`)}
                  </Typography>
                  {paymentMethod === 'cash' && (
                    <>
                      <Typography variant="body2">
                        {t('pos:cashReceived')}: {formatNumber(cashAmount)}
                      </Typography>
                      <Typography variant="body2">
                        {t('pos:change')}: {formatNumber(change)}
                      </Typography>
                    </>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setActiveStep(0)}
                  >
                    {t('pos:back')}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePaymentComplete}
                    startIcon={<CheckIcon />}
                  >
                    {t('pos:completeSale')}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PosPage; 