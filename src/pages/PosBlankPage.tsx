// src/pages/PosBlankPage.tsx
// Blank POS page: header + layout with sales column (squares) + three columns

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  Autocomplete,
  TextField,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Popover,
  Divider,
  Stack,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import SummarizeIcon from "@mui/icons-material/Summarize";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import saleService, { Sale, SaleItem, type Payment } from "@/services/saleService";
import productService, { Product } from "@/services/productService";
import { formatNumber } from "@/constants";
import { SaleItemsTable } from "@/components/sales/SaleItemsTable";
import { PosSalesColumn } from "@/components/sales/PosSalesColumn";
import ExpenseFormModal from "@/components/admin/expenses/ExpenseFormModal";
import expenseService from "@/services/expenseService";
import { PdfViewerDialog } from "@/components/common/PdfViewerDialog";

interface Shift {
  id: number;
  opened_at: string | null;
  closed_at: string | null;
  is_open: boolean;
  user_name?: string | null;
}

const PosBlankPage: React.FC = () => {
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [createSaleLoading, setCreateSaleLoading] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productInputValue, setProductInputValue] = useState("");
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [fullPaymentLoading, setFullPaymentLoading] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState<Payment["method"]>("cash");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [addPaymentLoading, setAddPaymentLoading] = useState(false);
  const [removeAllItemsLoading, setRemoveAllItemsLoading] = useState(false);
  const [deletingSaleItemId, setDeletingSaleItemId] = useState<number | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [shiftExpenseTotals, setShiftExpenseTotals] = useState({ cash: 0, bank: 0 });
  const [summaryAnchorEl, setSummaryAnchorEl] = useState<HTMLElement | null>(null);
  const summaryOpen = Boolean(summaryAnchorEl);
  const [thermalPdfLoading, setThermalPdfLoading] = useState(false);
  const [thermalPdfDialogOpen, setThermalPdfDialogOpen] = useState(false);
  const [thermalPdfUrl, setThermalPdfUrl] = useState<string | null>(null);
  const [shiftPdfDialogOpen, setShiftPdfDialogOpen] = useState(false);
  const [shiftPdfUrl, setShiftPdfUrl] = useState<string | null>(null);
  const [shiftPdfLoading, setShiftPdfLoading] = useState(false);

  // Pre-fill add-payment amount with the sale's due (remainder) when selection changes
  useEffect(() => {
    if (!selectedSale) {
      setNewPaymentAmount("");
      return;
    }
    const due =
      selectedSale.due_amount != null
        ? Number(selectedSale.due_amount)
        : Math.max(0, Number(selectedSale.total_amount ?? 0) - Number(selectedSale.paid_amount ?? 0));
    setNewPaymentAmount(due > 0 ? String(due) : "");
  }, [selectedSale]);

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

  const fetchSales = useCallback(async (): Promise<Sale[]> => {
    try {
      if (!shift) return [];
      setSalesLoading(true);
      const list = await saleService.fetchSalesByShiftOrDate(
        shift?.is_open ? shift.id ?? undefined : undefined,
      );
      const arr = Array.isArray(list) ? list : [];
      setSales(arr);
      return arr;
    } catch (e) {
      console.error("Failed to load sales:", e);
      setSales([]);
      return [];
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

  const handleAddPayment = useCallback(
    async () => {
      if (!selectedSale) return;
      const due =
        selectedSale.due_amount != null
          ? Number(selectedSale.due_amount)
          : Math.max(0, Number(selectedSale.total_amount ?? 0) - Number(selectedSale.paid_amount ?? 0));
      if (due <= 0) return;
      const amount = Number(newPaymentAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("أدخل مبلغاً صحيحاً");
        return;
      }
      if (amount > due) {
        toast.error("المبلغ أكبر من المتبقي");
        return;
      }
      try {
        setAddPaymentLoading(true);
        const today = new Date().toISOString().slice(0, 10);
        const existingPayments = (selectedSale.payments ?? []).map((p) => ({
          method: p.method,
          amount: Number(p.amount),
          payment_date: p.payment_date || today,
        }));
        await saleService.addPaymentToSale(selectedSale.id, {
          payments: [...existingPayments, { method: newPaymentMethod, amount, payment_date: today }],
        });
        const updated = await saleService.getSale(selectedSale.id);
        setSelectedSale(updated);
        setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setNewPaymentAmount("");
        toast.success("تمت إضافة الدفعة");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      } finally {
        setAddPaymentLoading(false);
      }
    },
    [selectedSale, newPaymentMethod, newPaymentAmount]
  );

  // Page-level: plus key adds payment when add-payment is available (skip when focus is in input/textarea/select)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "+") return;
      const target = e.target as Node | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          (target instanceof HTMLElement && target.isContentEditable))
      )
        return;
      if (!selectedSale?.id) return;
      const due =
        selectedSale.due_amount != null
          ? Number(selectedSale.due_amount)
          : Math.max(0, Number(selectedSale.total_amount ?? 0) - Number(selectedSale.paid_amount ?? 0));
      if (due <= 0 || !newPaymentAmount.trim() || addPaymentLoading) return;
      e.preventDefault();
      handleAddPayment();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedSale, newPaymentAmount, addPaymentLoading, handleAddPayment]);

  const handleDeletePayment = useCallback(
    async (paymentId: number) => {
      if (!selectedSale) return;
      try {
        setDeletingPaymentId(paymentId);
        await saleService.deletePayment(selectedSale.id, paymentId);
        const updated = await saleService.getSale(selectedSale.id);
        setSelectedSale(updated);
        setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success("تم حذف الدفعة");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      } finally {
        setDeletingPaymentId(null);
      }
    },
    [selectedSale]
  );

  const handleFullPayment = useCallback(
    async () => {
      if (!selectedSale) return;
      const due =
        selectedSale.due_amount != null
          ? Number(selectedSale.due_amount)
          : Math.max(0, Number(selectedSale.total_amount ?? 0) - Number(selectedSale.paid_amount ?? 0));
      if (due <= 0) {
        toast.info("البيع مدفوع بالكامل");
        return;
      }
      try {
        setFullPaymentLoading(true);
        const today = new Date().toISOString().slice(0, 10);
        const existingPayments = (selectedSale.payments ?? []).map((p) => ({
          method: p.method,
          amount: Number(p.amount),
          payment_date: typeof p.payment_date === "string" ? p.payment_date.slice(0, 10) : today,
        }));
        await saleService.addPaymentToSale(selectedSale.id, {
          payments: [...existingPayments, { method: "cash", amount: due, payment_date: today }],
        });
        const updated = await saleService.getSale(selectedSale.id);
        setSelectedSale(updated);
        setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success("تم التسديد بالكامل");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      } finally {
        setFullPaymentLoading(false);
      }
    },
    [selectedSale]
  );

  const handleQuantityChange = useCallback(
    async (item: SaleItem, newQuantity: number) => {
      if (!selectedSale || item.id == null) return;
      try {
        const updated = await saleService.updateSaleItem(selectedSale.id, item.id, {
          quantity: newQuantity,
          unit_price: Number(item.unit_price ?? 0),
          purchase_item_id: item.purchase_item_id ?? null,
        });
        setSelectedSale(updated);
        setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success("تم تحديث الكمية");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      }
    },
    [selectedSale]
  );

  const handlePriceChange = useCallback(
    async (item: SaleItem, newPrice: number) => {
      if (!selectedSale || item.id == null) return;
      try {
        const updated = await saleService.updateSaleItem(selectedSale.id, item.id, {
          quantity: Number(item.quantity),
          unit_price: newPrice,
          purchase_item_id: item.purchase_item_id ?? null,
        });
        setSelectedSale(updated);
        setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success("تم تحديث السعر");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      }
    },
    [selectedSale]
  );

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

  const handleAddProductByBarcode = useCallback(async () => {
    const barcode = productInputValue.trim();
    if (!barcode || !selectedSale) return;
    const fromOptions = productOptions.find(
      (p) => p.sku != null && String(p.sku).trim() === barcode
    );
    if (fromOptions) {
      handleAddProductToSale(fromOptions);
      return;
    }
    try {
      setAddProductLoading(true);
      const list = await productService.getProductsForAutocomplete(barcode, 20);
      const match = list.find(
        (p) => p.sku != null && String(p.sku).trim() === barcode
      );
      if (match) {
        await handleAddProductToSale(match);
      } else if (list.length === 1) {
        await handleAddProductToSale(list[0]);
      } else {
        toast.error("لم يتم العثور على منتج بهذا الباركود");
      }
    } catch {
      toast.error("لم يتم العثور على منتج بهذا الباركود");
    } finally {
      setAddProductLoading(false);
    }
  }, [
    productInputValue,
    productOptions,
    selectedSale,
    handleAddProductToSale,
  ]);

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

  // Focus product autocomplete when a sale is selected
  useEffect(() => {
    if (!selectedSale) return;
    const t = setTimeout(() => productInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [selectedSale?.id]);

  // Totals by payment method for the current shift (from loaded sales)
  const shiftPaymentTotals = useMemo(() => {
    let cash = 0;
    let bankak = 0;
    for (const sale of sales) {
      for (const p of sale.payments ?? []) {
        const amount = Number(p.amount) || 0;
        if (p.method === "cash") cash += amount;
        else if (p.method === "bankak") bankak += amount;
      }
    }
    return { cash, bankak };
  }, [sales]);

  const fetchShiftExpenseTotals = useCallback(async () => {
    if (!shift?.id) {
      setShiftExpenseTotals({ cash: 0, bank: 0 });
      return;
    }
    try {
      const res = await expenseService.getExpenses(1, 500, { shift_id: shift.id });
      const list = res.data ?? [];
      let cash = 0;
      let bank = 0;
      for (const e of list) {
        const amt = Number(e.amount) || 0;
        if (e.payment_method === "cash") cash += amt;
        else if (e.payment_method === "bank") bank += amt;
      }
      setShiftExpenseTotals({ cash, bank });
    } catch {
      setShiftExpenseTotals({ cash: 0, bank: 0 });
    }
  }, [shift?.id]);

  useEffect(() => {
    fetchShiftExpenseTotals();
  }, [fetchShiftExpenseTotals]);

  const handleCreateNewSale = useCallback(async () => {
    try {
      setCreateSaleLoading(true);
      const created = await saleService.createEmptySale({
        client_id: null,
        notes: null,
      });
      toast.success("تم إنشاء عملية بيع جديدة");
      setSelectedSale(created);
      const list = await fetchSales();
      const updated = list.find((s) => s.id === created.id) ?? created;
      setSelectedSale(updated);
    } catch (err) {
      toast.error(saleService.getErrorMessage(err));
    } finally {
      setCreateSaleLoading(false);
    }
  }, [fetchSales]);

  // Page-level: space bar creates a new empty sale (skip when focus is in input/textarea/select)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      const target = e.target as Node | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          (target instanceof HTMLElement && target.isContentEditable))
      )
        return;
      if (!isShiftOpen || createSaleLoading) return;
      e.preventDefault();
      handleCreateNewSale();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isShiftOpen, createSaleLoading, handleCreateNewSale]);

  const handleRemoveAllSaleItems = useCallback(async () => {
    if (!selectedSale?.items?.length) {
      toast.info("لا توجد عناصر في البيع");
      return;
    }
    if ((selectedSale.payments?.length ?? 0) > 0) {
      toast.error("لا يمكن إزالة الأصناف عند وجود مدفوعات");
      return;
    }
    if (!window.confirm("إزالة كل الأصناف من عملية البيع؟ سيتم إرجاع الكميات للمخزون.")) return;
    try {
      setRemoveAllItemsLoading(true);
      const itemIds = selectedSale.items.map((item) => item.id).filter((id): id is number => id != null);
      for (const id of itemIds) {
        setDeletingSaleItemId(id);
        await saleService.deleteSaleItem(selectedSale.id, id);
      }
      const updated = await saleService.getSale(selectedSale.id);
      setSelectedSale(updated);
      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success("تمت إزالة كل الأصناف");
    } catch (err) {
      toast.error(saleService.getErrorMessage(err));
    } finally {
      setRemoveAllItemsLoading(false);
      setDeletingSaleItemId(null);
    }
  }, [selectedSale]);

  const handlePrintThermalInvoice = useCallback(async () => {
    if (!selectedSale?.id) return;
    setThermalPdfLoading(true);
    try {
      const response = await apiClient.get(`/sales/${selectedSale.id}/thermal-invoice-pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setThermalPdfUrl(url);
      setThermalPdfDialogOpen(true);
    } catch (err) {
      console.error("Failed to load thermal invoice:", err);
      toast.error("فشل تحميل فاتورة الحراري");
    } finally {
      setThermalPdfLoading(false);
    }
  }, [selectedSale?.id]);

  const handleCloseThermalPdfDialog = useCallback(() => {
    setThermalPdfDialogOpen(false);
    if (thermalPdfUrl) {
      window.URL.revokeObjectURL(thermalPdfUrl);
      setThermalPdfUrl(null);
    }
  }, [thermalPdfUrl]);

  const handleCreateShiftPdfReport = useCallback(async () => {
    if (!shift?.id) return;
    setShiftPdfLoading(true);
    try {
      const response = await apiClient.get("/reports/sales-pdf", {
        params: { shift_id: shift.id },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setShiftPdfUrl(url);
      setShiftPdfDialogOpen(true);
    } catch (err) {
      console.error("Failed to load shift report PDF:", err);
      toast.error("فشل تحميل تقرير الوردية PDF");
    } finally {
      setShiftPdfLoading(false);
    }
  }, [shift?.id]);

  const handleCloseShiftPdfDialog = useCallback(() => {
    setShiftPdfDialogOpen(false);
    if (shiftPdfUrl) {
      window.URL.revokeObjectURL(shiftPdfUrl);
      setShiftPdfUrl(null);
    }
  }, [shiftPdfUrl]);

  const handleDeleteSaleItem = useCallback(
    async (item: SaleItem) => {
      if (!selectedSale || item.id == null) return;
      if ((selectedSale.payments?.length ?? 0) > 0) {
        toast.error("لا يمكن حذف الأصناف عند وجود مدفوعات");
        return;
      }
      try {
        setDeletingSaleItemId(item.id);
        await saleService.deleteSaleItem(selectedSale.id, item.id);
        const updated = await saleService.getSale(selectedSale.id);
        setSelectedSale(updated);
        setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success("تم حذف الصنف");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      } finally {
        setDeletingSaleItemId(null);
      }
    },
    [selectedSale]
  );

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

          {/* Shift summary – click to open popover with details */}
          {shift?.id != null && (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => setSummaryAnchorEl(e.currentTarget)}
                startIcon={<SummarizeIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  borderColor: "divider",
                  color: "text.secondary",
                }}
              >
                ملخص وردية #{shift.id}
              </Button>
              <Popover
                open={summaryOpen}
                anchorEl={summaryAnchorEl}
                onClose={() => setSummaryAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{
                  sx: { minWidth: 260, borderRadius: 2, mt: 1.5 },
                }}
              >
                <Stack divider={<Divider />} sx={{ py: 1 }}>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                    <ScheduleIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={600}>
                      وردية #{shift.id}
                    </Typography>
                  </Stack>
                  {shift.opened_at && (
                    <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                      <AccessTimeIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">
                        وقت الفتح:{" "}
                        {new Date(shift.opened_at).toLocaleString("ar-EG", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </Typography>
                    </Stack>
                  )}
                  {(shift.user_name != null && shift.user_name !== "") && (
                    <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                      <PersonIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">
                        فتح بواسطة: {shift.user_name}
                      </Typography>
                    </Stack>
                  )}
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                    <PaymentsIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="body2">نقدي: {formatNumber(shiftPaymentTotals.cash)}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                    <AccountBalanceIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="body2">بنكك: {formatNumber(shiftPaymentTotals.bankak)}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                    <ReceiptLongIcon sx={{ color: "error.main", fontSize: 20 }} />
                    <Typography variant="body2" color="error.main">
                      مصروف نقدي: {formatNumber(shiftExpenseTotals.cash)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                    <ReceiptLongIcon sx={{ color: "error.main", fontSize: 20 }} />
                    <Typography variant="body2" color="error.main">
                      مصروف بنك: {formatNumber(shiftExpenseTotals.bank)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                    <TrendingUpIcon sx={{ color: "success.main", fontSize: 20 }} />
                    <Typography variant="body2" color="success.main" fontWeight={700}>
                      صافي نقدي: {formatNumber(shiftPaymentTotals.cash - shiftExpenseTotals.cash)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1 }}>
                    <TrendingUpIcon sx={{ color: "success.main", fontSize: 20 }} />
                    <Typography variant="body2" color="success.main" fontWeight={700}>
                      صافي بنك: {formatNumber(shiftPaymentTotals.bankak - shiftExpenseTotals.bank)}
                    </Typography>
                  </Stack>
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      disabled={shiftPdfLoading}
                      startIcon={
                        shiftPdfLoading ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <SummarizeIcon />
                        )
                      }
                      onClick={handleCreateShiftPdfReport}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      {shiftPdfLoading ? "جاري التحميل..." : "تقرير الوردية PDF"}
                    </Button>
                  </Box>
                </Stack>
              </Popover>
            </>
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
                  inputRef={(el) => {
                    (productInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    const prev = (params as { inputRef?: React.Ref<HTMLInputElement> }).inputRef;
                    if (typeof prev === "function") prev(el);
                    else if (prev && typeof prev === "object") (prev as React.MutableRefObject<HTMLInputElement | null>).current = el;
                  }}
                  placeholder="ابحث عن منتج أو الباركود..."
                  size="small"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddProductByBarcode();
                    }
                  }}
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

          {/* Add expense */}
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setExpenseDialogOpen(true)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            إضافة مصروف
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
          <PosSalesColumn
            sales={sales}
            salesLoading={salesLoading}
            selectedSale={selectedSale}
            onSelectSale={setSelectedSale}
          />

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
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      عناصر البيع #{selectedSale.number ?? selectedSale.id}
                    </Typography>
                    {selectedSale.items && selectedSale.items.length > 0 && (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={handleRemoveAllSaleItems}
                        disabled={removeAllItemsLoading || (selectedSale.payments?.length ?? 0) > 0}
                        aria-label="إزالة كل الأصناف"
                      >
                        {removeAllItemsLoading ? "جاري..." : "إزالة كل الأصناف"}
                      </Button>
                    )}
                  </Box>
                  <SaleItemsTable
                    items={selectedSale.items}
                    maxHeight={window.innerHeight - 140}
                    onQuantityChange={handleQuantityChange}
                    onPriceChange={handlePriceChange}
                    deletingItemId={deletingSaleItemId}
                    onDeleteItem={handleDeleteSaleItem}
                    canDeleteItems={(selectedSale.payments?.length ?? 0) === 0}
                  />
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
                  {selectedSale.payments && selectedSale.payments.length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.75 }}>
                        المدفوعات
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {selectedSale.payments.map((p) => (
                          <Box
                            key={p.id ?? `${p.method}-${p.amount}-${p.payment_date}`}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              py: 0.5,
                              px: 1,
                              borderRadius: 1,
                              bgcolor: "action.hover",
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {p.method === "cash" ? "نقدي" : p.method === "bankak" ? "بنكك" : p.method === "fawry" ? "فوري" : p.method === "ocash" ? "أوكاش" : p.method}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography variant="caption" fontWeight={600}>
                                {formatNumber(Number(p.amount))}
                              </Typography>
                              {p.id != null && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeletePayment(p.id!)}
                                  disabled={deletingPaymentId === p.id}
                                  sx={{ p: 0.25 }}
                                  aria-label="حذف الدفعة"
                                >
                                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                  {(() => {
                    const due =
                      selectedSale.due_amount != null
                        ? Number(selectedSale.due_amount)
                        : Math.max(0, Number(selectedSale.total_amount ?? 0) - Number(selectedSale.paid_amount ?? 0));
                    const notFullyPaid = due > 0;
                    return notFullyPaid ? (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.75 }}>
                          إضافة دفعة
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
                          <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel id="new-payment-method-label">طريقة</InputLabel>
                            <Select
                              labelId="new-payment-method-label"
                              value={newPaymentMethod}
                              label="طريقة"
                              onChange={(e) => setNewPaymentMethod(e.target.value as Payment["method"])}
                            >
                              <MenuItem value="cash">نقدي</MenuItem>
                              <MenuItem value="bankak">بنكك</MenuItem>
                              <MenuItem value="fawry">فوري</MenuItem>
                              <MenuItem value="ocash">أوكاش</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="المبلغ"
                            value={newPaymentAmount}
                            onChange={(e) => setNewPaymentAmount(e.target.value)}
                            inputProps={{ min: 0.01, step: 0.01 }}
                            sx={{ width: 90 }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddPayment();
                              else if (e.key === "+") {
                                e.preventDefault();
                                handleAddPayment();
                              }
                            }}
                          />
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={handleAddPayment}
                            disabled={addPaymentLoading || !newPaymentAmount.trim()}
                            aria-label="إضافة دفعة"
                          >
                            {addPaymentLoading ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <AddIcon />
                            )}
                          </IconButton>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          المتبقي: {formatNumber(due)}
                        </Typography>
                      </Box>
                    ) : null;
                  })()}
                  {selectedSale.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
                      {selectedSale.notes}
                    </Typography>
                  )}
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={thermalPdfLoading}
                    startIcon={
                      thermalPdfLoading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <ReceiptLongIcon />
                      )
                    }
                    sx={{ mt: 2, textTransform: "none" }}
                    onClick={handlePrintThermalInvoice}
                  >
                    {thermalPdfLoading ? "جاري التحميل..." : "طباعة فاتورة حراري PDF"}
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    disabled={
                      fullPaymentLoading ||
                      (selectedSale.due_amount != null
                        ? Number(selectedSale.due_amount) <= 0
                        : Number(selectedSale.total_amount ?? 0) - Number(selectedSale.paid_amount ?? 0) <= 0)
                    }
                    sx={{ mt: 1, textTransform: "none" }}
                    onClick={handleFullPayment}
                  >
                    {fullPaymentLoading ? "جاري التسديد..." : "تسديد كامل"}
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

      {/* Thermal invoice PDF dialog */}
      <PdfViewerDialog
        isOpen={thermalPdfDialogOpen && !!thermalPdfUrl}
        onClose={handleCloseThermalPdfDialog}
        pdfUrl={thermalPdfUrl ?? ""}
        title={selectedSale ? `فاتورة حراري #${selectedSale.number ?? selectedSale.id}` : "فاتورة حراري"}
      />

      {/* Shift report PDF dialog */}
      <PdfViewerDialog
        isOpen={shiftPdfDialogOpen && !!shiftPdfUrl}
        onClose={handleCloseShiftPdfDialog}
        pdfUrl={shiftPdfUrl ?? ""}
        title={shift ? `تقرير الوردية #${shift.id}` : "تقرير الوردية"}
      />

      {/* Add expense dialog */}
      <ExpenseFormModal
        isOpen={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        expenseToEdit={null}
        onSaveSuccess={() => {
          toast.success("تمت إضافة المصروف");
          setExpenseDialogOpen(false);
          fetchShiftExpenseTotals();
        }}
        shiftId={shift?.id ?? null}
      />
    </Box>
  );
};

export default PosBlankPage;
