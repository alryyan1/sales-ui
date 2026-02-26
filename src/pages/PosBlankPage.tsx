// src/pages/PosBlankPage.tsx
// Blank POS page: header + layout with sales column (squares) + three columns

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Stack,
} from "@mui/material";
import { CloudUploadIcon, FileText, SearchIcon } from "lucide-react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import apiClient from "@/lib/axios";
import { toast } from "sonner";
import saleService, {
  Sale,
  SaleItem,
  type Payment,
} from "@/services/saleService";
import productService, { Product } from "@/services/productService";
import clientService, { Client } from "@/services/clientService";
import reportService from "@/services/reportService";
import { formatNumber } from "@/constants";
import { SaleItemsTable } from "@/components/sales/SaleItemsTable";
import { PosSalesColumn } from "@/components/sales/PosSalesColumn";
import ExpenseFormModal from "@/components/admin/expenses/ExpenseFormModal";

import { PdfViewerDialog } from "@/components/common/PdfViewerDialog";
import SalesReturnDialog from "@/components/sales/SalesReturnDialog";
import { useAuth } from "@/context/AuthContext";
import ExpiryProductsDialog from "@/components/pos/ExpiryProductsDialog";
import TopSellingProductsDialog from "@/components/pos/TopSellingProductsDialog";
import { uploadFileToFirebase } from "@/services/firebaseStorage";
import { saveShiftToFirestore } from "@/services/firebaseStore";
import {
  ShiftFinancialTable,
  ShiftStats,
} from "@/components/sales/ShiftFinancialTable";
import { useSettings } from "@/context/SettingsContext";

interface Shift {
  id: number;
  user_id: number;
  user_name?: string;
  opened_at: string;
  closed_at: string | null;
  is_open: boolean;
  stats?: ShiftStats;
}

const PosBlankPage: React.FC = () => {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const firebaseCollectionName = getSetting(
    "firebase_collection_name",
    "one_care",
  );
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
  const [saleSearchInput, setSaleSearchInput] = useState("");
  const [saleSearchLoading, setSaleSearchLoading] = useState(false);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [fullPaymentLoading, setFullPaymentLoading] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(
    null,
  );
  const [newPaymentMethod, setNewPaymentMethod] =
    useState<Payment["method"]>("cash");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [addPaymentLoading, setAddPaymentLoading] = useState(false);
  const [removeAllItemsLoading, setRemoveAllItemsLoading] = useState(false);
  const [deletingSaleItemId, setDeletingSaleItemId] = useState<number | null>(
    null,
  );
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  // Client Autocomplete State
  const [clientOptions, setClientOptions] = useState<Client[]>([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [clientInputValue, setClientInputValue] = useState("");

  const [summaryAnchorEl, setSummaryAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const summaryOpen = Boolean(summaryAnchorEl);
  const [thermalPdfLoading, setThermalPdfLoading] = useState(false);
  const [thermalPdfDialogOpen, setThermalPdfDialogOpen] = useState(false);
  const [thermalPdfUrl, setThermalPdfUrl] = useState<string | null>(null);

  const [a4PdfLoading, setA4PdfLoading] = useState(false);
  const [a4PdfDialogOpen, setA4PdfDialogOpen] = useState(false);
  const [a4PdfUrl, setA4PdfUrl] = useState<string | null>(null);
  const [shiftPdfDialogOpen, setShiftPdfDialogOpen] = useState(false);
  const [shiftPdfUrl, setShiftPdfUrl] = useState<string | null>(null);
  const [shiftPdfLoading, setShiftPdfLoading] = useState(false);
  const [salesReturnDialogOpen, setSalesReturnDialogOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "fixed",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  // Expiry alerts state
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [expiryDialogType, setExpiryDialogType] = useState<
    "near_expiring" | "expired" | null
  >(null);
  const [expiryItems, setExpiryItems] = useState<any[]>([]);
  const [expiryItemsLoading, setExpiryItemsLoading] = useState(false);

  // Top selling
  const [topSellingDialogOpen, setTopSellingDialogOpen] = useState(false);

  useEffect(() => {
    const handleOpenDialog = () => setTopSellingDialogOpen(true);
    window.addEventListener("open-top-selling-dialog", handleOpenDialog);
    return () =>
      window.removeEventListener("open-top-selling-dialog", handleOpenDialog);
  }, []);

  // Pre-fill add-payment amount with the sale's due (remainder) when selection changes
  useEffect(() => {
    if (!selectedSale) {
      setNewPaymentAmount("");
      return;
    }
    const due =
      selectedSale.due_amount != null
        ? Number(selectedSale.due_amount)
        : Math.max(
            0,
            Number(selectedSale.total_amount ?? 0) -
              Number(selectedSale.paid_amount ?? 0),
          );
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
          is_open:
            d.is_open === true || d.is_open === "true" || d.is_open === 1,
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
        shift?.is_open ? (shift.id ?? undefined) : undefined,
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
        .then((list) => {
          const raw = Array.isArray(list) ? list : [];
          const filtered = raw.filter((p) => {
            const stock = p.current_stock_quantity ?? p.stock_quantity ?? 0;
            if (stock <= 0) return false;

            // Check expiry if available
            if (p.earliest_expiry_date) {
              const exp = new Date(p.earliest_expiry_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (exp < today) return false;
            }
            return true;
          });
          setProductOptions(filtered);
        })
        .catch(() => setProductOptions([]))
        .finally(() => setProductSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [productInputValue]);

  // Handle Client Search
  useEffect(() => {
    const term = clientInputValue.trim();
    if (!term) {
      setClientOptions([]);
      return;
    }
    const t = setTimeout(() => {
      setClientSearchLoading(true);
      clientService
        .autocompleteClients(term)
        .then(setClientOptions)
        .catch(() => setClientOptions([]))
        .finally(() => setClientSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [clientInputValue]);

  const handleClientChange = useCallback(
    async (client: Client | null) => {
      if (!selectedSale?.id) return;

      if (!client && (selectedSale.payments?.length ?? 0) > 0) {
        toast.error("لا يمكن إزالة العميل لوجود مدفوعات مرتبطة بالبيع");
        return;
      }

      try {
        let updated;
        if (client) {
          updated = await saleService.updateSale(selectedSale.id, {
            client_id: client.id,
          });
          updated.client = client;
          updated.client_name = client.name;
        } else {
          updated = await saleService.removeClientFromSale(selectedSale.id);
          updated.client = undefined;
          updated.client_name = undefined;
        }
        setSelectedSale(updated);
        setSales((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        toast.success(client ? "تم تحديث العميل" : "تم إلغاء العميل");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      }
    },
    [selectedSale?.id, selectedSale?.payments?.length],
  );

  const handleAddPayment = useCallback(async () => {
    if (!selectedSale) return;
    const due =
      selectedSale.due_amount != null
        ? Number(selectedSale.due_amount)
        : Math.max(
            0,
            Number(selectedSale.total_amount ?? 0) -
              Number(selectedSale.paid_amount ?? 0),
          );
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
        payments: [
          ...existingPayments,
          { method: newPaymentMethod, amount, payment_date: today },
        ],
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
  }, [selectedSale, newPaymentMethod, newPaymentAmount]);

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
          : Math.max(
              0,
              Number(selectedSale.total_amount ?? 0) -
                Number(selectedSale.paid_amount ?? 0),
            );
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
        setSales((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        toast.success("تم حذف الدفعة");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      } finally {
        setDeletingPaymentId(null);
      }
    },
    [selectedSale],
  );

  const handleFullPayment = useCallback(async () => {
    if (!selectedSale) return;
    const due =
      selectedSale.due_amount != null
        ? Number(selectedSale.due_amount)
        : Math.max(
            0,
            Number(selectedSale.total_amount ?? 0) -
              Number(selectedSale.paid_amount ?? 0),
          );
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
        payment_date:
          typeof p.payment_date === "string"
            ? p.payment_date.slice(0, 10)
            : today,
      }));
      await saleService.addPaymentToSale(selectedSale.id, {
        payments: [
          ...existingPayments,
          { method: newPaymentMethod, amount: due, payment_date: today },
        ],
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
  }, [selectedSale, newPaymentMethod]);

  const handleQuantityChange = useCallback(
    async (item: SaleItem, newQuantity: number) => {
      if (!selectedSale || item.id == null) return;
      try {
        const updated = await saleService.updateSaleItem(
          selectedSale.id,
          item.id,
          {
            quantity: newQuantity,
            unit_price: Number(item.unit_price ?? 0),
            purchase_item_id: item.purchase_item_id ?? null,
          },
        );
        setSelectedSale(updated);
        setSales((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        toast.success("تم تحديث الكمية");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      }
    },
    [selectedSale],
  );

  const handlePriceChange = useCallback(
    async (item: SaleItem, newPrice: number) => {
      if (!selectedSale || item.id == null) return;
      try {
        const updated = await saleService.updateSaleItem(
          selectedSale.id,
          item.id,
          {
            quantity: Number(item.quantity ?? 0),
            unit_price: newPrice,
            purchase_item_id: item.purchase_item_id ?? null,
          },
        );
        setSelectedSale(updated);
        setSales((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        toast.success("تم تحديث السعر");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      }
    },
    [selectedSale],
  );

  const handleAddProductToSale = useCallback(
    async (product: Product) => {
      if (!selectedSale) {
        toast.error("اختر عملية بيع أولاً");
        return;
      }

      const total = Number(selectedSale.total_amount ?? 0);
      const paid = Number(selectedSale.paid_amount ?? 0);
      if (total > 0 && total === paid) {
        toast.error("لا يمكن إضافة منتجات لعملية بيع مدفوعة بالكامل");
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
            prev.map((s) => (s.id === res.sale.id ? res.sale : s)),
          );
        }
        toast.success("تمت إضافة المنتج");
        setSelectedProduct(null);
        setProductInputValue("");
        setTimeout(() => productInputRef.current?.focus(), 0);
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      } finally {
        setAddProductLoading(false);
      }
    },
    [selectedSale],
  );

  const handleAddProductByBarcode = useCallback(
    async (barcodeOverride?: string) => {
      const barcode = barcodeOverride?.trim() || productInputValue.trim();
      if (!barcode || !selectedSale) return;
      const fromOptions = productOptions.find(
        (p) => p.sku != null && String(p.sku).trim() === barcode,
      );
      if (fromOptions) {
        handleAddProductToSale(fromOptions);
        return;
      }
      try {
        setAddProductLoading(true);
        const list = await productService.getProductsForAutocomplete(
          barcode,
          20,
        );
        const match = list.find(
          (p) => p.sku != null && String(p.sku).trim() === barcode,
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
    },
    [productInputValue, productOptions, selectedSale, handleAddProductToSale],
  );

  const handleOpenShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      setSelectedSale(null);
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

  const handleSearchSaleById = useCallback(async () => {
    const id = Number(saleSearchInput.trim());
    if (!id || !Number.isFinite(id)) {
      toast.error("أدخل رقم فاتورة صحيح");
      return;
    }
    setSaleSearchLoading(true);
    try {
      const sale = await saleService.getSale(id);
      setSelectedSale(sale);
      setSaleSearchInput("");
    } catch {
      toast.error("لا توجد فاتورة بهذا الرقم");
    } finally {
      setSaleSearchLoading(false);
    }
  }, [saleSearchInput]);

  const handleCloseShift = useCallback(async () => {
    try {
      const latestSales = await fetchSales();
      const unpaidSales = latestSales.filter(
        (s) =>
          Number(s.total_amount ?? 0) - Number(s.paid_amount ?? 0) > 1e-6 &&
          (!s.client_id || s.client_id === 0),
      );
      if (unpaidSales.length > 0) {
        const saleIds = unpaidSales
          .map((s) => s.id)
          .filter((id): id is number => id != null);
        toast.custom(
          (t) => (
            <Paper
              elevation={3}
              sx={{
                p: 1.5,
                minWidth: 280,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "error.light",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 1,
                }}
              >
                <Typography fontWeight={600} sx={{ color: "black", flex: 1 }}>
                  لا يمكن إغلاق الوردية
                  <br />
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ color: "error.main" }}
                  >
                    توجد مبيعات غير مسددة
                  </Typography>
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => toast.dismiss(t)}
                  sx={{ mt: -0.5, mr: -0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                ({unpaidSales.length}) عملية: #{saleIds.join(", #")}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {unpaidSales.map((sale) => (
                  <Button
                    key={sale.id}
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setSelectedSale(sale);
                      toast.dismiss(t);
                    }}
                  >
                    بيع #{sale.id}
                  </Button>
                ))}
              </Stack>
            </Paper>
          ),
          { duration: Infinity },
        );
        return;
      }

      setShiftLoading(true);
      const res = await apiClient.post("/shifts/close");

      // Extract closed shift data (including computed stats) from the response
      const closedShiftData = res.data.data ?? res.data;
      const closedShiftStats = closedShiftData?.stats ?? undefined;

      // Check for WhatsApp status in meta (Removed from API, moved to upload step)
      toast.success("تم إغلاق الوردية");

      // Automatically generate & upload all PDFs to Firebase
      // Pass the fresh stats from the API response so Firestore doesn't get zeros
      await handleCreateShiftPdfReport(true, closedShiftStats);

      setShift(null);
      setSelectedSale(null);
      setSales([]);
    } catch (err) {
      console.error("Failed to close shift:", err);
      toast.error("فشل إغلاق الوردية");
    } finally {
      setShiftLoading(false);
    }
  }, [fetchSales]); // handleCreateShiftPdfReport intentionally omitted — defined later in file, it's a stable useCallback ref

  const isShiftOpen = shift?.is_open === true;

  // Focus product autocomplete when a sale is selected
  useEffect(() => {
    if (!selectedSale) return;
    const t = setTimeout(() => productInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [selectedSale?.id]);

  // Calculate totals for current shift (legacy local calculation - now using shift.stats from backend)
  // We can remove these if we rely solely on shift.stats
  // keeping them for now if used elsewhere, but lint says unused.
  // The popup now uses shift.stats.

  // Removing unused variables to fix lint errors:

  // Fetch expiry counts for badges
  const fetchExpiryCounts = useCallback(async () => {
    try {
      const res = await apiClient.get("/reports/expiry-counts");
      setNearExpiringCount(res.data.near_expiring_count || 0);
      setExpiredCount(res.data.expired_count || 0);
    } catch (err) {
      console.error("Failed to fetch expiry counts:", err);
    }
  }, []);

  // Fetch expiry products for dialog
  const fetchExpiryProducts = useCallback(
    async (type: "near_expiring" | "expired") => {
      try {
        setExpiryItemsLoading(true);
        const endpoint =
          type === "near_expiring"
            ? "/reports/near-expiry"
            : "/reports/expired-products";
        const res = await apiClient.get(endpoint, {
          params: { per_page: 100 },
        });
        setExpiryItems(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch expiry products:", err);
        toast.error("فشل تحميل المنتجات");
        setExpiryItems([]);
      } finally {
        setExpiryItemsLoading(false);
      }
    },
    [],
  );

  // Handle opening expiry dialog
  const handleOpenExpiryDialog = useCallback(
    (type: "near_expiring" | "expired") => {
      setExpiryDialogType(type);
      setExpiryDialogOpen(true);
      fetchExpiryProducts(type);
    },
    [fetchExpiryProducts],
  );

  // Listen for open dialog events from top app bar
  useEffect(() => {
    const handleOpenNearExpiring = () =>
      handleOpenExpiryDialog("near_expiring");
    const handleOpenExpired = () => handleOpenExpiryDialog("expired");

    window.addEventListener(
      "open-near-expiring-dialog",
      handleOpenNearExpiring,
    );
    window.addEventListener("open-expired-dialog", handleOpenExpired);

    return () => {
      window.removeEventListener(
        "open-near-expiring-dialog",
        handleOpenNearExpiring,
      );
      window.removeEventListener("open-expired-dialog", handleOpenExpired);
    };
  }, [handleOpenExpiryDialog]);

  // Handle closing expiry dialog
  const handleCloseExpiryDialog = useCallback(() => {
    setExpiryDialogOpen(false);
    setExpiryDialogType(null);
    setExpiryItems([]);
  }, []);
  const handleAddExpiryProductToCart = useCallback(
    async (productId: number, productName: string) => {
      if (!selectedSale) {
        toast.error("الرجاء اختيار عملية بيع أولاً");
        return;
      }
      try {
        const product = await productService.getProduct(productId);
        await handleAddProductToSale(product);
        toast.success(`تمت إضافة ${productName} إلى السلة`);
      } catch (err) {
        console.error("Failed to add product:", err);
        toast.error("فشل إضافة المنتج");
      }
    },
    [selectedSale, handleAddProductToSale],
  );

  const handleMoveExpiredProduct = useCallback(
    async (purchaseItemId: number) => {
      try {
        setExpiryItemsLoading(true);
        await reportService.moveExpiredProduct(purchaseItemId);
        toast.success("تم نقل المنتج بنجاح وتحديث المخزون");

        // Refresh the dialog list
        if (expiryDialogType) {
          fetchExpiryProducts(expiryDialogType);
        }
        // Refresh the counts badge
        fetchExpiryCounts();
      } catch (err: any) {
        toast.error(
          err.response?.data?.message || err.message || "فشل نقل المنتج",
        );
      } finally {
        setExpiryItemsLoading(false);
      }
    },
    [expiryDialogType, fetchExpiryProducts, fetchExpiryCounts],
  );

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
    if (
      !window.confirm(
        "إزالة كل الأصناف من عملية البيع؟ سيتم إرجاع الكميات للمخزون.",
      )
    )
      return;
    try {
      setRemoveAllItemsLoading(true);
      const itemIds = selectedSale.items
        .map((item) => item.id)
        .filter((id): id is number => id != null);
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
      const response = await apiClient.get(
        `/sales/${selectedSale.id}/thermal-invoice-pdf`,
        {
          responseType: "blob",
        },
      );
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

  const handlePrintA4Invoice = useCallback(async () => {
    if (!selectedSale?.id) return;
    setA4PdfLoading(true);
    try {
      const response = await apiClient.get(
        `/sales/${selectedSale.id}/a4-invoice-pdf/view`,
        {
          responseType: "blob",
        },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setA4PdfUrl(url);
      setA4PdfDialogOpen(true);
    } catch (err) {
      console.error("Failed to load A4 invoice:", err);
      toast.error("فشل تحميل فاتورة A4");
    } finally {
      setA4PdfLoading(false);
    }
  }, [selectedSale?.id]);

  const handleCloseA4PdfDialog = useCallback(() => {
    setA4PdfDialogOpen(false);
    if (a4PdfUrl) {
      window.URL.revokeObjectURL(a4PdfUrl);
      setA4PdfUrl(null);
    }
  }, [a4PdfUrl]);

  const handleCreateShiftPdfReport = useCallback(
    async (forceUpload = false, statsOverride?: ShiftStats) => {
      if (!shift?.id) return;
      setShiftPdfLoading(true);
      try {
        const params: { shift_id: number; user_id?: number } = {
          shift_id: shift.id,
        };
        if (user?.id) params.user_id = user.id;
        const response = await apiClient.get("/reports/sales-pdf", {
          params,
          responseType: "blob",
        });
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        setShiftPdfUrl(url);
        setShiftPdfDialogOpen(true);

        // Upload to Firebase in background only if shift is closed OR forced
        if (!shift.is_open || forceUpload) {
          const shiftId = shift.id;
          const basePath = `pharmacies/${firebaseCollectionName}/shifts/${shiftId}`;

          // Download extra PDFs in parallel
          const [costRes, soldItemsRes, returnsRes] = await Promise.allSettled([
            apiClient.get(`/reports/shift-cost-pdf?shift_id=${shiftId}`, {
              responseType: "blob",
            }),
            apiClient.get(`/reports/shift-sold-items-pdf?shift_id=${shiftId}`, {
              responseType: "blob",
            }),
            apiClient.get(`/reports/shift-returns-pdf?shift_id=${shiftId}`, {
              responseType: "blob",
            }),
          ]);

          const costBlob =
            costRes.status === "fulfilled"
              ? new Blob([costRes.value.data], { type: "application/pdf" })
              : null;
          const soldItemsBlob =
            soldItemsRes.status === "fulfilled"
              ? new Blob([soldItemsRes.value.data], { type: "application/pdf" })
              : null;
          const returnsBlob =
            returnsRes.status === "fulfilled"
              ? new Blob([returnsRes.value.data], { type: "application/pdf" })
              : null;

          // Run upload pipeline in background with step-by-step toast updates
          (async () => {
            const toastId = toast.loading("⏳ جاري تحضير تقارير الوردية...");
            const urls: {
              mainUrl?: string;
              costUrl?: string;
              soldItemsUrl?: string;
              returnsUrl?: string;
            } = {};

            // 1. Upload main shift report
            try {
              toast.loading("📊 جاري رفع تقرير المبيعات (1/4)...", {
                id: toastId,
              });
              urls.mainUrl = await uploadFileToFirebase(
                blob,
                `${basePath}/shift_report.pdf`,
              );
              toast.loading(
                "✅ تقرير المبيعات — تم | ⏳ جاري رفع تقرير المصروفات (2/4)...",
                { id: toastId },
              );
            } catch {
              toast.loading("⚠️ فشل تقرير المبيعات | جاري المتابعة...", {
                id: toastId,
              });
            }

            // 2. Upload cost/expenses PDF
            if (costBlob) {
              try {
                urls.costUrl = await uploadFileToFirebase(
                  costBlob,
                  `${basePath}/cost_report.pdf`,
                );
                toast.loading(
                  "✅ تقرير المصروفات — تم | ⏳ جاري رفع الأصناف المباعة (3/4)...",
                  { id: toastId },
                );
              } catch {
                toast.loading("⚠️ فشل تقرير المصروفات | جاري المتابعة...", {
                  id: toastId,
                });
              }
            } else {
              toast.loading(
                "⏭️ لا توجد مصروفات — تخطي | ⏳ جاري رفع الأصناف المباعة (3/4)...",
                { id: toastId },
              );
            }

            // 3. Upload sold items PDF
            if (soldItemsBlob) {
              try {
                urls.soldItemsUrl = await uploadFileToFirebase(
                  soldItemsBlob,
                  `${basePath}/sold_items_report.pdf`,
                );
                toast.loading(
                  "✅ الأصناف المباعة — تم | ⏳ جاري رفع المردودات (4/4)...",
                  { id: toastId },
                );
              } catch {
                toast.loading("⚠️ فشل الأصناف المباعة | جاري المتابعة...", {
                  id: toastId,
                });
              }
            } else {
              toast.loading(
                "⏭️ لا توجد أصناف — تخطي | ⏳ جاري رفع المردودات (4/4)...",
                { id: toastId },
              );
            }

            // 4. Upload returns PDF
            if (returnsBlob) {
              try {
                urls.returnsUrl = await uploadFileToFirebase(
                  returnsBlob,
                  `${basePath}/returns_report.pdf`,
                );
              } catch {
                toast.loading("⚠️ فشل تقرير المردودات | جاري الحفظ...", {
                  id: toastId,
                });
              }
            }

            // 5. Save to Firestore and 6. Notify
            try {
              toast.loading("☁️ جاري حفظ البيانات في Firestore...", {
                id: toastId,
              });
              await saveShiftToFirestore(
                {
                  shift_id: shiftId,
                  user_id: user?.id || 0,
                  user_name: user?.name,
                  opened_at: shift.opened_at,
                  closed_at: shift.closed_at ?? undefined,
                  pdf_url: urls.mainUrl ?? "",
                  cost_pdf_url: urls.costUrl,
                  sold_items_pdf_url: urls.soldItemsUrl,
                  returns_pdf_url: urls.returnsUrl,
                  stats: statsOverride ?? shift.stats,
                },
                firebaseCollectionName,
              );

              toast.loading("📱 جاري إرسال إشعارات الإغلاق...", {
                id: toastId,
              });
              const notifyRes = await apiClient.post(
                `/shifts/${shiftId}/notify`,
              );
              const notifyData = notifyRes.data;

              if (notifyData?.whatsapp_status === "success") {
                toast.success(
                  "✅ تم رفع التقارير، حفظ البيانات، وإرسال الواتساب بنجاح!",
                  { id: toastId, duration: 5000 },
                );
              } else if (notifyData?.whatsapp_status === "failed") {
                toast.warning("⚠️ تم رفع التقارير، لكن فشل إرسال الواتساب", {
                  id: toastId,
                  description: notifyData.whatsapp_message || "خطأ غير معروف",
                  duration: 8000,
                });
              } else {
                toast.success(
                  "✅ تم رفع جميع التقارير وحفظ بيانات الوردية بنجاح!",
                  { id: toastId, duration: 5000 },
                );
              }
            } catch (err: unknown) {
              console.error("Firestore/Notify Error:", err);
              toast.error(
                "⚠️ تم رفع الملفات لكن حدث خطأ أثناء الحفظ أو الإشعار",
                { id: toastId, duration: 5000 },
              );
            }
          })();
        }
      } catch (err) {
        console.error("Failed to load shift report PDF:", err);
        toast.error("فشل تحميل تقرير الوردية PDF");
      } finally {
        setShiftPdfLoading(false);
      }
    },
    [shift, user, firebaseCollectionName],
  );

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
        setSales((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        toast.success("تم حذف الصنف");
      } catch (err) {
        toast.error(saleService.getErrorMessage(err));
      } finally {
        setDeletingSaleItemId(null);
      }
    },
    [selectedSale],
  );

  const handleApplyDiscount = useCallback(async () => {
    if (!selectedSale?.id) return;
    const num = Number(discountValue);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("أدخل قيمة خصم صحيحة");
      return;
    }
    if (discountType === "percentage" && (num > 100 || num < 0)) {
      toast.error("النسبة المئوية بين 0 و 100");
      return;
    }
    try {
      setDiscountLoading(true);
      const updated = await saleService.updateSaleDiscount(selectedSale.id, {
        discount_type: discountType,
        discount_amount: num,
      });
      setSelectedSale(updated);
      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setDiscountValue("");
      toast.success("تم تطبيق الخصم");
    } catch (err) {
      toast.error(saleService.getErrorMessage(err));
    } finally {
      setDiscountLoading(false);
    }
  }, [selectedSale?.id, discountType, discountValue]);

  const handleRemoveDiscount = useCallback(async () => {
    if (!selectedSale?.id) return;
    try {
      setDiscountLoading(true);
      const updated = await saleService.updateSaleDiscount(selectedSale.id, {
        discount_type: "fixed",
        discount_amount: 0,
      });
      setSelectedSale(updated);
      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setDiscountValue("");
      toast.success("تم إلغاء الخصم");
    } catch (err) {
      toast.error(saleService.getErrorMessage(err));
    } finally {
      setDiscountLoading(false);
    }
  }, [selectedSale?.id]);

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
        bgcolor: "grey.100",
        userSelect: "none",
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
        <Toolbar
          sx={{ height: 64, px: { xs: 2, sm: 3 }, gap: 2, flexWrap: "wrap" }}
        >
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

          {/* Manual Sync Button */}
          <IconButton
            onClick={() => handleCreateShiftPdfReport(true)}
            size="small"
            color="primary"
            disabled={!shift?.id || shiftPdfLoading}
            title="رفع التقرير ومزامنة البيانات"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            {shiftPdfLoading ? (
              <CircularProgress size={20} />
            ) : (
              <CloudUploadIcon size={20} />
            )}
          </IconButton>

          {/* Shift summary – click to open popover with details */}
          {shift?.id != null && (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                  setSummaryAnchorEl(e.currentTarget)
                }
                startIcon={<FileText />}
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
                <Stack sx={{ py: 1, minWidth: 500 }}>
                  {/* Header Info */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 2, pb: 1, borderBottom: "1px dashed #e0e0e0" }}
                  >
                    <Stack gap={0.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        وردية #{shift.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {shift.user_name && `فتح بواسطة: ${shift.user_name}`}
                      </Typography>
                    </Stack>
                    <Stack gap={0.5} alignItems="flex-end">
                      <Typography variant="caption" color="text.secondary">
                        {shift.opened_at &&
                          new Date(shift.opened_at).toLocaleString("ar-EG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Financial Table */}
                  <ShiftFinancialTable shiftId={shift.id} />

                  <Box sx={{ px: 2, pb: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      disabled={shiftPdfLoading}
                      startIcon={
                        shiftPdfLoading ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <FileText />
                        )
                      }
                      onClick={() => handleCreateShiftPdfReport(false)}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      {shiftPdfLoading
                        ? "جاري التحميل..."
                        : "تقرير الوردية PDF"}
                    </Button>
                  </Box>
                </Stack>
              </Popover>
            </>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={() => setSalesReturnDialogOpen(true)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            إرجاع مبيعات
          </Button>

          {/* Sale ID search */}
          <Box sx={{ width: 140 }}>
            <TextField
              size="small"
              placeholder="بحث برقم "
              value={saleSearchInput}
              onChange={(e) => setSaleSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSaleById()}
              disabled={saleSearchLoading}
              InputProps={{
                startAdornment: saleSearchLoading ? (
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                ) : (
                  <SearchIcon
                    size={16}
                    style={{ marginRight: 8, opacity: 0.5 }}
                  />
                ),
              }}
              sx={{ bgcolor: "background.paper", borderRadius: 1 }}
            />
          </Box>

          {/* Product search – in header */}
          <Box sx={{ flex: 1, minWidth: 160, maxWidth: 380 }}>
            <Autocomplete
              freeSolo
              value={selectedProduct}
              inputValue={productInputValue}
              onInputChange={(_, value) => setProductInputValue(value)}
              onChange={(_, newValue: string | Product | null) => {
                if (typeof newValue === "string") {
                  // This handles the "Enter" key on free text (barcode interaction)
                  handleAddProductByBarcode(newValue);
                } else if (newValue && typeof newValue === "object") {
                  // This handles selecting an option from the list
                  handleAddProductToSale(newValue);
                  setSelectedProduct(null);
                }
              }}
              options={productOptions}
              getOptionLabel={(opt) => {
                if (typeof opt === "string") return opt;
                const option = opt as Product;
                return option?.name
                  ? `${option.name}${option.sale_price ? ` (${option.sale_price})` : ""}`
                  : "";
              }}
              loading={productSearchLoading}
              disabled={!selectedSale || addProductLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={(el) => {
                    (
                      productInputRef as React.MutableRefObject<HTMLInputElement | null>
                    ).current = el;
                    const prev = (
                      params as { inputRef?: React.Ref<HTMLInputElement> }
                    ).inputRef;
                    if (typeof prev === "function") prev(el);
                    else if (prev && typeof prev === "object")
                      (
                        prev as React.MutableRefObject<HTMLInputElement | null>
                      ).current = el;
                  }}
                  placeholder="ابحث عن منتج أو الباركود..."
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
                  helperText={
                    productInputValue.length > 0
                      ? "المنتجات المنتهية أو التي نفد مخزونها مخفية"
                      : undefined
                  }
                />
              )}
              renderOption={(props, opt) => {
                if (typeof opt === "string")
                  return (
                    <li {...props} key={opt}>
                      {opt}
                    </li>
                  );
                const option = opt as Product;
                return (
                  <li {...props} key={option.id}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {option.name}
                        </Typography>
                        {option.current_stock_quantity != null ||
                        option.stock_quantity != null ? (
                          <Typography
                            variant="caption"
                            color={
                              (option.current_stock_quantity ??
                                option.stock_quantity ??
                                0) <= 5
                                ? "error.main"
                                : "success.main"
                            }
                            fontWeight="bold"
                          >
                            {`الكمية: ${formatNumber(
                              option.current_stock_quantity ??
                                option.stock_quantity ??
                                0,
                            )}`}
                          </Typography>
                        ) : null}
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {[
                            option.last_sale_price_per_sellable_unit != null &&
                              `السعر: ${formatNumber(
                                Number(
                                  option.last_sale_price_per_sellable_unit,
                                ),
                              )}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>

                        {option.earliest_expiry_date && (
                          <Typography variant="caption" color="warning.dark">
                            {`ينتهي: ${option.earliest_expiry_date}`}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </li>
                );
              }}
              noOptionsText={
                productInputValue.trim() ? "لا توجد نتائج" : "اكتب للبحث"
              }
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
          {isShiftOpen && (
            <PosSalesColumn
              sales={sales}
              salesLoading={salesLoading}
              selectedSale={selectedSale}
              onSelectSale={setSelectedSale}
            />
          )}

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
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1.5,
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      عناصر البيع #{selectedSale.id}
                    </Typography>
                    {selectedSale.items && selectedSale.items.length > 0 && (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={handleRemoveAllSaleItems}
                        disabled={
                          removeAllItemsLoading ||
                          (selectedSale.payments?.length ?? 0) > 0
                        }
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
                    disableQuantityAndPriceEdit={
                      Math.abs(
                        Number(selectedSale.paid_amount ?? 0) -
                          Number(selectedSale.total_amount ?? 0),
                      ) < 1e-6
                    }
                  />
                </>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 2, display: "block" }}
                >
                  اختر عملية بيع من القائمة لتفعيل إضافة المنتجات (استخدم البحث
                  في الأعلى)
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
                    تفاصيل البيع #{selectedSale.id}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      alignItems: "center",
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {selectedSale.sale_date}
                    </Typography>
                  </Box>

                  <Autocomplete
                    size="small"
                    options={clientOptions}
                    getOptionLabel={(option) => option.name || ""}
                    inputValue={clientInputValue}
                    onInputChange={(_, value) => setClientInputValue(value)}
                    value={
                      selectedSale.client ||
                      (selectedSale.client_name
                        ? ({
                            id: selectedSale.client_id,
                            name: selectedSale.client_name,
                          } as Client)
                        : null)
                    }
                    onChange={(_, newValue) => handleClientChange(newValue)}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    loading={clientSearchLoading}
                    disabled={!selectedSale}
                    disableClearable={
                      (selectedSale?.payments?.length ?? 0) > 0 &&
                      !!(selectedSale?.client || selectedSale?.client_name)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="اختر عميل / زبون..."
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {clientSearchLoading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                    sx={{
                      mb:
                        selectedSale.client || selectedSale.client_name ? 1 : 2,
                    }}
                    noOptionsText={
                      clientInputValue.trim() ? "لا توجد نتائج" : "اكتب للبحث"
                    }
                  />

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        عدد العناصر
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedSale.items?.length ?? 0}
                      </Typography>
                    </Box>
                    {(() => {
                      const subtotal =
                        selectedSale.subtotal != null
                          ? Number(selectedSale.subtotal)
                          : (selectedSale.items ?? []).reduce(
                              (sum, i) => sum + Number(i.total_price ?? 0),
                              0,
                            );
                      const discountAmt = Number(
                        selectedSale.discount_amount ?? 0,
                      );
                      return (
                        <>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              المجموع الفرعي
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatNumber(subtotal)}
                            </Typography>
                          </Box>
                          {discountAmt > 0 && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                الخصم
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="error.main"
                              >
                                - {formatNumber(discountAmt)}
                              </Typography>
                            </Box>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 0.75,
                              mt: 0.5,
                            }}
                          >
                            <FormControl size="small" sx={{ minWidth: 90 }}>
                              <InputLabel id="discount-type-label">
                                نوع الخصم
                              </InputLabel>
                              <Select
                                labelId="discount-type-label"
                                value={discountType}
                                label="نوع الخصم"
                                onChange={(e) =>
                                  setDiscountType(
                                    e.target.value as "percentage" | "fixed",
                                  )
                                }
                              >
                                <MenuItem value="fixed">مبلغ ثابت</MenuItem>
                                <MenuItem value="percentage">
                                  نسبة مئوية
                                </MenuItem>
                              </Select>
                            </FormControl>
                            <TextField
                              size="small"
                              type="number"
                              placeholder={
                                discountType === "percentage" ? "٪" : "المبلغ"
                              }
                              value={discountValue}
                              onChange={(e) => setDiscountValue(e.target.value)}
                              inputProps={{
                                min: 0,
                                max:
                                  discountType === "percentage"
                                    ? 100
                                    : undefined,
                                step: discountType === "percentage" ? 1 : 0.01,
                              }}
                              sx={{ width: 80 }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={handleApplyDiscount}
                              disabled={
                                discountLoading ||
                                !discountValue.trim() ||
                                (selectedSale.items?.length ?? 0) === 0 ||
                                (selectedSale.payments?.length ?? 0) > 0
                              }
                            >
                              {discountLoading ? "..." : "تطبيق"}
                            </Button>
                            {discountAmt > 0 && (
                              <Button
                                size="small"
                                variant="text"
                                color="error"
                                onClick={handleRemoveDiscount}
                                disabled={
                                  discountLoading ||
                                  (selectedSale.payments?.length ?? 0) > 0
                                }
                              >
                                إلغاء الخصم
                              </Button>
                            )}
                          </Box>
                        </>
                      );
                    })()}
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        الإجمالي
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="success.main"
                      >
                        {formatNumber(Number(selectedSale.total_amount ?? 0))}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        المدفوع
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatNumber(Number(selectedSale.paid_amount ?? 0))}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        المتبقي
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatNumber(
                          selectedSale.due_amount != null
                            ? Number(selectedSale.due_amount)
                            : Math.max(
                                0,
                                Number(selectedSale.total_amount ?? 0) -
                                  Number(selectedSale.paid_amount ?? 0),
                              ),
                        )}
                      </Typography>
                    </Box>
                  </Box>
                  {selectedSale.payments &&
                    selectedSale.payments.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{ display: "block", mb: 0.75 }}
                        >
                          المدفوعات
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          {selectedSale.payments.map((p) => (
                            <Box
                              key={
                                p.id ??
                                `${p.method}-${p.amount}-${p.payment_date}`
                              }
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
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {p.method === "cash"
                                  ? "نقدي"
                                  : p.method === "bankak"
                                    ? "بنكك"
                                    : p.method === "fawry"
                                      ? "فوري"
                                      : p.method === "ocash"
                                        ? "أوكاش"
                                        : p.method}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
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
                        : Math.max(
                            0,
                            Number(selectedSale.total_amount ?? 0) -
                              Number(selectedSale.paid_amount ?? 0),
                          );
                    const notFullyPaid = due > 0;
                    return notFullyPaid ? (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{ display: "block", mb: 0.75 }}
                        >
                          إضافة دفعة
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel id="new-payment-method-label">
                              طريقة
                            </InputLabel>
                            <Select
                              labelId="new-payment-method-label"
                              value={newPaymentMethod}
                              label="طريقة"
                              onChange={(e) =>
                                setNewPaymentMethod(
                                  e.target.value as Payment["method"],
                                )
                              }
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
                            onChange={(e) =>
                              setNewPaymentAmount(e.target.value)
                            }
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
                            disabled={
                              addPaymentLoading || !newPaymentAmount.trim()
                            }
                            aria-label="إضافة دفعة"
                          >
                            {addPaymentLoading ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <AddIcon />
                            )}
                          </IconButton>
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          المتبقي: {formatNumber(due)}
                        </Typography>
                      </Box>
                    ) : null;
                  })()}
                  {selectedSale.notes && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1.5, display: "block" }}
                    >
                      {selectedSale.notes}
                    </Typography>
                  )}
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mt: 2, width: "100%" }}
                    gap={1}
                  >
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
                      sx={{ textTransform: "none" }}
                      onClick={handlePrintThermalInvoice}
                    >
                      {thermalPdfLoading ? "جاري التحميل..." : "طباعة فاتورة "}
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={a4PdfLoading || !selectedSale?.client_id}
                      startIcon={
                        a4PdfLoading ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <ReceiptLongIcon />
                        )
                      }
                      sx={{ textTransform: "none" }}
                      onClick={handlePrintA4Invoice}
                    >
                      {a4PdfLoading ? "جاري التحميل..." : "فاتورة A4 PDF"}
                    </Button>
                  </Stack>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    disabled={
                      fullPaymentLoading ||
                      (selectedSale.due_amount != null
                        ? Number(selectedSale.due_amount) <= 0
                        : Number(selectedSale.total_amount ?? 0) -
                            Number(selectedSale.paid_amount ?? 0) <=
                          0)
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

      {/* Sales return dialog */}
      <SalesReturnDialog
        open={salesReturnDialogOpen}
        onClose={() => setSalesReturnDialogOpen(false)}
        shiftId={shift?.id ?? null}
      />

      {/* Thermal invoice PDF dialog */}
      <PdfViewerDialog
        isOpen={thermalPdfDialogOpen && !!thermalPdfUrl}
        onClose={handleCloseThermalPdfDialog}
        pdfUrl={thermalPdfUrl ?? ""}
        title={
          selectedSale
            ? `فاتورة حراري #${selectedSale.number ?? selectedSale.id}`
            : "فاتورة حراري"
        }
      />

      {/* A4 invoice PDF dialog */}
      <PdfViewerDialog
        isOpen={a4PdfDialogOpen && !!a4PdfUrl}
        onClose={handleCloseA4PdfDialog}
        pdfUrl={a4PdfUrl ?? ""}
        title={
          selectedSale
            ? `فاتورة A4 #${selectedSale.number ?? selectedSale.id}`
            : "فاتورة A4"
        }
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
          fetchCurrentShift();
        }}
        shiftId={shift?.id ?? null}
      />

      <ExpiryProductsDialog
        open={expiryDialogOpen}
        onClose={handleCloseExpiryDialog}
        type={expiryDialogType}
        items={expiryItems}
        loading={expiryItemsLoading}
        onAddToCart={handleAddExpiryProductToCart}
        onMoveProduct={handleMoveExpiredProduct}
      />

      <TopSellingProductsDialog
        open={topSellingDialogOpen}
        onClose={() => setTopSellingDialogOpen(false)}
        onAddProduct={handleAddExpiryProductToCart}
      />
    </Box>
  );
};

export default PosBlankPage;
