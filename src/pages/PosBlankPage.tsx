// src/pages/PosBlankPage.tsx
// Blank POS page: header + layout with sales column (squares) + three columns

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Autocomplete,
  TextField,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import saleService, { Sale } from "@/services/saleService";
import productService, { Product } from "@/services/productService";
import { formatNumber } from "@/constants";
import { PosSaleItemsTable } from "@/components/pos/PosSaleItemsTable";

interface Shift {
  id: number;
  opened_at: string | null;
  closed_at: string | null;
  is_open: boolean;
}

const PosBlankPage: React.FC = () => {
  const navigate = useNavigate();
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [createSaleLoading, setCreateSaleLoading] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productInputValue, setProductInputValue] = useState("");
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchCurrentShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      const res = await apiClient.get("/shifts/current");
      if (res.status === 200) {
        const d = res.data.data ?? res.data;
        setShift({
          ...d,
          is_open: d.is_open === true || d.is_open === "true" || d.is_open === 1,
        });
      } else {
        setShift(null);
      }
    } catch (e: unknown) {
      if (e && typeof e === "object" && "response" in e) {
        const err = e as { response?: { status?: number } };
        if (err.response?.status === 204) setShift(null);
      } else {
        console.error("Failed to load current shift:", e);
      }
    } finally {
      setShiftLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const fetchSales = useCallback(async () => {
    try {
      if(!shift) return;
      setSalesLoading(true);
      const list = await saleService.fetchSalesByShiftOrDate(
        shift?.is_open ? shift.id ?? undefined : undefined,
      );
      setSales(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load sales:", e);
      setSales([]);
    } finally {
      setSalesLoading(false);
    }
  }, [shift?.id, shift?.is_open]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    if (!productInputValue.trim()) {
      setProductOptions([]);
      return;
    }
    const t = setTimeout(() => {
      setProductSearchLoading(true);
      productService
        .getProductsForAutocomplete(productInputValue.trim(), 25)
        .then((list) => setProductOptions(Array.isArray(list) ? list : []))
        .catch(() => setProductOptions([]))
        .finally(() => setProductSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [productInputValue]);

  const handleAddProductToSale = useCallback(
    async (product: Product) => {
      if (!selectedSale) {
        toast.error("اختر عملية بيع أولاً");
        return;
      }
      const unitPrice = Number(product.last_sale_price_per_sellable_unit) || 0;
      try {
        setAddProductLoading(true);
        const res = await saleService.addSaleItem(selectedSale.id, {
          product_id: product.id,
          quantity: 1,
          unit_price: unitPrice,
        });
        if (res.sale) {
          setSelectedSale(res.sale);
          setSales((prev) =>
            prev.map((s) => (s.id === res.sale.id ? res.sale : s))
          );
        }
        toast.success("تمت إضافة المنتج");
        setSelectedProduct(null);
        setProductInputValue("");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      } finally {
        setAddProductLoading(false);
      }
    },
    [selectedSale]
  );

  const handleOpenShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      const res = await apiClient.post("/shifts/open");
      const d = res.data.data ?? res.data;
      setShift({ ...d, is_open: true });
      toast.success("تم فتح الوردية");
    } catch (err) {
      console.error("Failed to open shift:", err);
      toast.error("فشل فتح الوردية");
    } finally {
      setShiftLoading(false);
    }
  }, []);

  const handleCloseShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      await apiClient.post("/shifts/close");
      setShift(null);
      toast.success("تم إغلاق الوردية");
    } catch (err) {
      console.error("Failed to close shift:", err);
      toast.error("فشل إغلاق الوردية");
    } finally {
      setShiftLoading(false);
    }
  }, []);

  const isShiftOpen = shift?.is_open === true;

  const handleCreateNewSale = useCallback(async () => {
    try {
      setCreateSaleLoading(true);
      await saleService.createEmptySale({
        client_id: null,
        notes: null,
      });
      toast.success("تم إنشاء عملية بيع جديدة");
      fetchSales();
    } catch (err) {
      toast.error(saleService.getErrorMessage(err));
    } finally {
      setCreateSaleLoading(false);
    }
  }, [fetchSales]);

  return (
    <Box
      sx={{
        height: "calc(100vh - 10px)",
        display: "flex",
        flexDirection: "column",
        bgcolor: "grey.100",
      }}
    >
      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "white",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <Toolbar sx={{ height: 64, px: { xs: 2, sm: 3 }, gap: 2, flexWrap: "wrap" }}>
          <Typography
            variant="h6"
            fontWeight="700"
            sx={{
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            POS
          </Typography>

          {/* Shift ID */}
          {shift?.id != null && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              وردية #{shift.id}
            </Typography>
          )}

          {/* Product search – in header */}
          <Box sx={{ flex: 1, minWidth: 160, maxWidth: 380 }}>
            <Autocomplete
              value={selectedProduct}
              inputValue={productInputValue}
              onInputChange={(_, value) => setProductInputValue(value)}
              onChange={(_, newValue: Product | null) => {
                if (newValue) {
                  handleAddProductToSale(newValue);
                }
                setSelectedProduct(null);
              }}
              options={productOptions}
              getOptionLabel={(option) =>
                typeof option === "object" && option?.name
                  ? `${option.name}${option.sku ? ` (${option.sku})` : ""}`
                  : ""
              }
              loading={productSearchLoading}
              disabled={!selectedSale || addProductLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="ابحث عن منتج..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {addProductLoading ? (
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Typography variant="body2">{option.name}</Typography>
                    {(option.sku || option.suggested_sale_price != null) && (
                      <Typography variant="caption" color="text.secondary">
                        {[option.sku, option.suggested_sale_price != null && `السعر: ${formatNumber(Number(option.suggested_sale_price))}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    )}
                  </Box>
                </li>
              )}
              noOptionsText={productInputValue.trim() ? "لا توجد نتائج" : "اكتب للبحث"}
              sx={{ width: "100%" }}
            />
          </Box>

          {/* Create new sale */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateNewSale}
            disabled={createSaleLoading || !isShiftOpen}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {createSaleLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "بيع جديد"
            )}
          </Button>

          {/* Open / Close shift button */}
          <Button
            variant={isShiftOpen ? "outlined" : "contained"}
            color={isShiftOpen ? "error" : "primary"}
            onClick={isShiftOpen ? handleCloseShift : handleOpenShift}
            disabled={shiftLoading}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {shiftLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : isShiftOpen ? (
              "إغلاق وردية"
            ) : (
              "فتح وردية"
            )}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Layout: sales column (squares) + three columns */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          px: { xs: 1, sm: 2, lg: 3 },
          py: 1.5,
        }}
      >
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
          }}
        >
          {/* Sales column – each sale as a square */}
          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              flexDirection: "column",
              width: 220,
              flexShrink: 0,
            }}
          >
            <Paper
              sx={{
                height: "100%",
                overflow: "auto",
                p: 1.5,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1, px: 0.5, fontWeight: 600 }}
              >
                المبيعات
              </Typography>
              {salesLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <Stack justifyContent="center" alignItems="center" direction="column" gap={1} >
                  {sales.map((sale) => {
                    const isActive = selectedSale?.id === sale.id;
                    const itemsCount = sale.items?.length ?? 0;
                    const hasClient = sale.client_id != null && sale.client_id > 0;
                    return (
                      <Stack direction="row" gap={1} key={sale.id}>
                        <Paper
                          elevation={0}
                          sx={{
                            width: 70,
                            height: 70,
                            borderRadius: 1.5,
                            border: "2px solid",
                            borderColor: isActive ? "primary.main" : "divider",
                            bgcolor: isActive ? "primary.main" : "transparent",
                            color: isActive ? "primary.contrastText" : "text.primary",
                            p: 1,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            position: "relative",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        onClick={() => setSelectedSale(sale)}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            bgcolor: isActive ? "secondary.main" : "primary.main",
                            color: "primary.contrastText",
                            fontSize: 10,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {itemsCount}
                        </Box>
                        {hasClient && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 4,
                              left: 4,
                              color: isActive ? "primary.contrastText" : "text.secondary",
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 14 }} />
                          </Box>
                        )}
                     

                        <div>{sale.number}</div>
                     
                      </Paper>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Box>

       

          {/* Center column – sale items table */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper
              sx={{
                height: "100%",
                overflow: "auto",
                p: 2,
                borderRadius: 2,
              }}
            >
              {selectedSale ? (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                    عناصر البيع #{selectedSale.number ?? selectedSale.id}
                  </Typography>
                  <PosSaleItemsTable items={selectedSale.items} maxHeight={360} />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, display: "block" }}>
                  اختر عملية بيع من القائمة لتفعيل إضافة المنتجات (استخدم البحث في الأعلى)
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Right column – sale details when selected */}
          <Box
            sx={{
              width: { xs: "100%", md: 320 },
              flexShrink: 0,
            }}
          >
            <Paper
              sx={{
                height: "100%",
                overflow: "auto",
                p: 2,
                borderRadius: 2,
              }}
            >
              {selectedSale ? (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    تفاصيل البيع #{selectedSale.number ?? selectedSale.id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {selectedSale.sale_date}
                    {selectedSale.client_name && (
                      <> · {selectedSale.client_name}</>
                    )}
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">عدد العناصر</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedSale.items?.length ?? 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">الإجمالي</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {formatNumber(Number(selectedSale.total_amount ?? 0))}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">المدفوع</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatNumber(Number(selectedSale.paid_amount ?? 0))}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">المتبقي</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatNumber(
                          selectedSale.due_amount != null
                            ? Number(selectedSale.due_amount)
                            : Math.max(0, Number(selectedSale.total_amount ?? 0) - Number(selectedSale.paid_amount ?? 0))
                        )}
                      </Typography>
                    </Box>
                  </Box>
                  {selectedSale.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
                      {selectedSale.notes}
                    </Typography>
                  )}
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    sx={{ mt: 2, textTransform: "none" }}
                    onClick={() =>
                      navigate("/pos-new", { state: { saleId: selectedSale.id } })
                    }
                  >
                    فتح في نقطة البيع
                  </Button>
                </Box>
              ) : (
                <Typography variant="subtitle2" color="text.secondary">
                  Column 3
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PosBlankPage;
