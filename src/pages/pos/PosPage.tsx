// src/pages/pos/PosPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { FileText, Loader2, Plus, RotateCcw, ShieldCheck, Users, Warehouse, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PdfViewerDialog } from "@/components/common/PdfViewerDialog";
import { ShiftFinancialTable } from "@/components/sales/ShiftFinancialTable";
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useSettings } from "@/context/SettingsContext";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrentShift } from "@/hooks/useShifts";
import { useHttpActivity } from "@/hooks/useHttpActivity";
import apiClient from "@/lib/axios";

import saleService, { Sale, Payment } from "@/services/saleService";
import saleReminderService from "@/services/saleReminderService";
import { uploadFileToFirebase } from "@/services/firebaseStorage";
import { Product } from "@/services/productService";
import { Client } from "@/services/clientService";

import { ProductSearchPanel } from "@/components/pos/ProductSearchPanel";
import { PastSalesSearchDialog } from "@/components/sales/PastSalesSearchDialog";
import { DEFAULT_PAYMENT_METHOD, PRODUCT_SEARCH_INPUT_ID, resolveUnitPrice, stockOf } from "@/lib/pos";
import { parseActivePaymentMethods, resolveDefaultActiveMethod } from "@/lib/paymentMethods";
import { playAddItemSound, playErrorSound, playRemoveItemSound, playSaleCompleteSound } from "@/lib/sound";
import {
  DraftCartItem,
  DraftTicket,
  DiscountType,
  createDraftTicket,
  computeDraftTotals,
  buildCreateSaleData,
} from "@/lib/posCart";
import { CartPanel } from "@/components/pos/CartPanel";
import { CustomerPicker } from "@/components/pos/CustomerPicker";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { SaleCompleteDialog } from "@/components/pos/SaleCompleteDialog";
import { SaleActionsBar } from "@/components/pos/SaleActionsBar";
import { ShiftSalesColumn } from "@/components/pos/ShiftSalesColumn";
import { ThemeColorPicker } from "@/components/pos/ThemeColorPicker";
import {
  applyPosThemeColor,
  clearPosThemeColor,
  getPosThemeColor,
  loadPosThemeColorId,
  savePosThemeColorId,
  type PosThemeColor,
} from "@/lib/posTheme";

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function draftsStorageKey(userId: number) {
  return `pos-drafts:${userId}`;
}

interface StoredDraftsState {
  tickets: DraftTicket[];
  activeTicketId: string | null;
}

const PosPage: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = useAuthorization();
  const { getSetting } = useSettings();
  const { direction } = useLanguage();
  const { t } = useTranslation("pos");
  const { t: tCommon } = useTranslation("common");
  const queryClient = useQueryClient();

  const canPayment = hasPermission("سداد");
  const canCancelPayment = hasPermission("الغاء سداد");
  const canDiscount = hasPermission("تخفيض");
  const canOpenShift = hasPermission("فتح ورديه");
  const canCloseShift = hasPermission("اغلاق ورديه");
  const canDeleteSale = hasPermission("حذف فاتورة");
  const hasWarehouse = user?.warehouse_id != null;
  const isHttpBusy = useHttpActivity();

  const posMode = (getSetting("pos_mode", "shift") as "shift" | "days") ?? "shift";
  const showOutOfStock = Boolean(getSetting("pos_show_out_of_stock_products", false));
  const showExpired = Boolean(getSetting("pos_show_expired_products", false));
  const usdConversionEnabled = Boolean(getSetting("usd_conversion_enabled", true));
  const usdFactor = usdConversionEnabled ? Number(getSetting("usd_to_sdg_factor", 1) ?? 1) : 1;
  const defaultPaymentMethod = resolveDefaultActiveMethod(
    parseActivePaymentMethods(getSetting("pos_active_payment_methods")),
    DEFAULT_PAYMENT_METHOD
  );

  const currentShiftQuery = useCurrentShift();
  const shiftId = posMode === "shift" ? currentShiftQuery.data?.id ?? null : null;

  // List of sales for the current shift (or today, in "days" mode) — shown in the sales column.
  const shiftSalesQueryKey = useMemo(
    () => ["pos-shift-sales", posMode, posMode === "shift" ? shiftId : "today"] as const,
    [posMode, shiftId]
  );
  const shiftSalesQuery = useQuery({
    queryKey: shiftSalesQueryKey,
    queryFn: () => saleService.fetchSalesByShiftOrDate(posMode === "shift" ? shiftId ?? undefined : undefined),
    enabled: posMode !== "shift" || shiftId != null,
  });
  const shiftSales = shiftSalesQuery.data ?? [];

  const [shiftActionBusy, setShiftActionBusy] = useState(false);
  const [pastSalesOpen, setPastSalesOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const [loadingSaleId, setLoadingSaleId] = useState<number | null>(null);
  const [savingSale, setSavingSale] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const isEditingSale = editingSaleId != null;

  // ── Local-only draft cart state (no server sale exists until handleCompleteSale) ──
  const ticketSeqRef = useRef(1);
  const [tickets, setTickets] = useState<DraftTicket[]>(() => [createDraftTicket(ticketSeqRef.current)]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => tickets[0]?.id ?? null);
  const [ticketToDelete, setTicketToDelete] = useState<DraftTicket | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmResetCacheOpen, setConfirmResetCacheOpen] = useState(false);

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [createSaleError, setCreateSaleError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  // The persisted sale the sale-actions bar (print/finance/whatsapp/etc.) currently acts on —
  // whichever is set: the sale being edited, or the one just completed.
  const activeSale = editingSale ?? completedSale;

  const [isTogglingQuote, setIsTogglingQuote] = useState(false);
  const [isChangingSaleDate, setIsChangingSaleDate] = useState(false);
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [reminderDate, setReminderDate] = useState<string | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  const [printingKind, setPrintingKind] = useState<"thermal" | "a4" | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [isExportingToFinance, setIsExportingToFinance] = useState(false);

  const [shiftReportLoading, setShiftReportLoading] = useState(false);
  const [shiftReportUrl, setShiftReportUrl] = useState<string | null>(null);
  const [shiftReportDialogOpen, setShiftReportDialogOpen] = useState(false);
  const [shiftSummaryOpen, setShiftSummaryOpen] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // User-chosen accent color (persisted per-browser). Applied to <body> — not just a local
  // wrapper div — so it also reaches the global TopAppBar and Radix portals (Dialog/Popover/
  // AlertDialog render outside PosPage's own DOM subtree).
  const [themeColorId, setThemeColorId] = useState(() => loadPosThemeColorId());
  useEffect(() => {
    applyPosThemeColor(getPosThemeColor(themeColorId));
    return () => clearPosThemeColor();
  }, [themeColorId]);

  const handleSelectThemeColor = useCallback((color: PosThemeColor) => {
    setThemeColorId(color.id);
    savePosThemeColorId(color.id);
  }, []);

  // ── Restore any drafts left over from a previous session (per-user, this browser only) ──
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(draftsStorageKey(user.id));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredDraftsState>;
        if (Array.isArray(parsed.tickets) && parsed.tickets.length > 0) {
          setTickets(parsed.tickets);
          const restoredActiveId =
            parsed.activeTicketId && parsed.tickets.some((t) => t.id === parsed.activeTicketId)
              ? parsed.activeTicketId
              : parsed.tickets[parsed.tickets.length - 1].id;
          setActiveTicketId(restoredActiveId);
          const maxLabel = parsed.tickets.reduce((m, t) => Math.max(m, t.label ?? 0), 0);
          ticketSeqRef.current = Math.max(ticketSeqRef.current, maxLabel + 1);
        }
      }
    } catch {
      // Corrupt/unavailable storage — keep the fresh default ticket.
    }
    setHydrated(true);
  }, [user?.id]);

  // ── Persist drafts on every change so a refresh/crash doesn't lose the cart ──
  useEffect(() => {
    if (!hydrated || !user?.id) return;
    try {
      const state: StoredDraftsState = { tickets, activeTicketId };
      localStorage.setItem(draftsStorageKey(user.id), JSON.stringify(state));
    } catch {
      // Ignore quota/serialization errors — persistence is a safety net, not a hard requirement.
    }
  }, [tickets, activeTicketId, hydrated, user?.id]);

  const activeTicket = useMemo(
    () => tickets.find((t) => t.id === activeTicketId) ?? null,
    [tickets, activeTicketId]
  );

  // Quantity of each product already sitting in the active cart — used to show the
  // remaining sellable stock in the product search panel as items are added.
  const cartQuantities = useMemo(() => {
    const map = new Map<number, number>();
    activeTicket?.items.forEach((item) => map.set(item.product.id, item.quantity));
    return map;
  }, [activeTicket?.items]);

  const updateActiveTicket = useCallback(
    (updater: (ticket: DraftTicket) => DraftTicket) => {
      setTickets((prev) => prev.map((t) => (t.id === activeTicketId ? updater(t) : t)));
    },
    [activeTicketId]
  );

  const nextTicketLabel = useCallback(() => ticketSeqRef.current++, []);

  const clearEditing = useCallback(() => {
    const created = createDraftTicket(nextTicketLabel());
    setTickets([created]);
    setActiveTicketId(created.id);
    setSelectedLineId(null);
    setEditingSaleId(null);
    setEditingSale(null);
    setPaymentOpen(false);
  }, [nextTicketLabel]);

  // Wipes every locally-cached POS draft (all users on this browser) and starts
  // a fresh ticket — needed after a backend reset (e.g. `migrate:fresh --seed`)
  // leaves stale carts pointing at product/client/sale IDs that no longer exist.
  const handleResetLocalCache = useCallback(() => {
    try {
      const staleKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("pos-drafts:")) staleKeys.push(key);
      }
      staleKeys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore storage access errors.
    }
    clearEditing();
    setConfirmResetCacheOpen(false);
    toast.success(t("resetLocalCacheSuccess"));
  }, [clearEditing, t]);

  const ensureAtLeastOneTicket = useCallback(
    (list: DraftTicket[]): { list: DraftTicket[]; activeId: string } => {
      if (list.length > 0) return { list, activeId: list[list.length - 1].id };
      const created = createDraftTicket(nextTicketLabel());
      return { list: [created], activeId: created.id };
    },
    [nextTicketLabel]
  );

  // ── Cart mutations — purely local, no network calls ──
  const handleAddProduct = useCallback(
    (product: Product) => {
      if (!activeTicket) return;
      const unitPrice = resolveUnitPrice(product, usdFactor);
      if (unitPrice <= 0) {
        toast.error(t("zeroPriceProduct", { name: product.name }));
        playErrorSound();
        return;
      }
      const currentQty = activeTicket.items.find((i) => i.product.id === product.id)?.quantity ?? 0;
      if (currentQty >= stockOf(product)) {
        toast.error(t("insufficientStockFor", { name: product.name }));
        playErrorSound();
        return;
      }
      updateActiveTicket((ticket) => {
        const idx = ticket.items.findIndex((i) => i.product.id === product.id);
        if (idx >= 0) {
          const nextItems = [...ticket.items];
          nextItems[idx] = { ...nextItems[idx], quantity: nextItems[idx].quantity + 1 };
          return { ...ticket, items: nextItems };
        }
        const newItem: DraftCartItem = {
          localId: crypto.randomUUID(),
          product,
          quantity: 1,
          unitPrice,
        };
        return { ...ticket, items: [...ticket.items, newItem] };
      });
      playAddItemSound();
    },
    [activeTicket, usdFactor, updateActiveTicket]
  );

  const handleQuantityChange = useCallback(
    (item: DraftCartItem, quantity: number) => {
      if (quantity < 1) return;
      if (quantity > stockOf(item.product)) {
        toast.error(t("insufficientStockFor", { name: item.product.name }));
        playErrorSound();
        return;
      }
      updateActiveTicket((ticket) => ({
        ...ticket,
        items: ticket.items.map((i) => (i.localId === item.localId ? { ...i, quantity } : i)),
      }));
    },
    [updateActiveTicket]
  );

  const handleRemoveItem = useCallback(
    (item: DraftCartItem) => {
      updateActiveTicket((ticket) => ({
        ...ticket,
        items: ticket.items.filter((i) => i.localId !== item.localId),
      }));
      setSelectedLineId((prev) => (prev === item.localId ? null : prev));
      playRemoveItemSound();
    },
    [updateActiveTicket]
  );

  const handleClearCart = useCallback(() => {
    updateActiveTicket((ticket) => ({ ...ticket, items: [] }));
    setSelectedLineId(null);
    setConfirmClearOpen(false);
  }, [updateActiveTicket]);

  const handleApplyDiscount = useCallback(
    (type: DiscountType, amount: number) => {
      if (!Number.isFinite(amount) || amount < 0 || (type === "percentage" && amount > 100)) {
        toast.error(t("invalidDiscountValue"));
        return;
      }
      updateActiveTicket((ticket) => ({ ...ticket, discountType: type, discountAmount: amount }));
      toast.success(t("discountApplied"));
    },
    [updateActiveTicket]
  );

  const handleRemoveDiscount = useCallback(() => {
    updateActiveTicket((ticket) => ({ ...ticket, discountType: "fixed", discountAmount: 0 }));
  }, [updateActiveTicket]);

  const handleSelectCustomer = useCallback(
    (client: Client | null) => {
      updateActiveTicket((ticket) => ({ ...ticket, client }));
    },
    [updateActiveTicket]
  );

  // ── Tickets (hold / switch / new / delete) — purely local ──
  const handleNewTicket = useCallback(() => {
    if (editingSaleId) return;
    const created = createDraftTicket(nextTicketLabel());
    setTickets((prev) => [...prev, created]);
    setActiveTicketId(created.id);
    setSelectedLineId(null);
    setTimeout(() => document.getElementById(PRODUCT_SEARCH_INPUT_ID)?.focus(), 50);
  }, [editingSaleId, nextTicketLabel]);

  const handleDeleteTicket = useCallback(() => {
    if (!ticketToDelete) return;
    const remaining = tickets.filter((t) => t.id !== ticketToDelete.id);
    const { list, activeId } = ensureAtLeastOneTicket(remaining);
    setTickets(list);
    if (activeTicketId === ticketToDelete.id || !list.some((t) => t.id === activeTicketId)) {
      setActiveTicketId(activeId);
    }
    setTicketToDelete(null);
  }, [ticketToDelete, tickets, activeTicketId, ensureAtLeastOneTicket]);

  // ── Completion — the single network call that actually creates the sale ──
  const handleCompleteSale = useCallback(
    (paymentLines: Array<{ method: Payment["method"]; amount: number }>) => {
      if (!activeTicket || activeTicket.items.length === 0) return;
      if (!hasWarehouse) {
        toast.error(t("noWarehouseAssignedError"));
        return;
      }
      setIsCreatingSale(true);
      setCreateSaleError(null);

      const payload = buildCreateSaleData(activeTicket, paymentLines, {
        shiftId,
        saleDate: todayStr(),
      });

      saleService
        .createSale(payload)
        .then((createdSale) => {
          const remaining = tickets.filter((t) => t.id !== activeTicket.id);
          const { list, activeId } = ensureAtLeastOneTicket(remaining);
          setTickets(list);
          setActiveTicketId(activeId);
          setSelectedLineId(null);
          setPaymentOpen(false);
          setCompletedSale(createdSale);
          playSaleCompleteSound();
          // Stock just changed server-side — drop the cached product search results
          // so quantities shown in ProductSearchPanel reflect the new numbers.
          queryClient.invalidateQueries({ queryKey: ["pos-products"] });
          queryClient.invalidateQueries({ queryKey: shiftSalesQueryKey });
        })
        .catch((err) => {
          const message = saleService.getErrorMessage(err);
          setCreateSaleError(message);
          toast.error(message);
        })
        .finally(() => setIsCreatingSale(false));
    },
    [activeTicket, tickets, shiftId, ensureAtLeastOneTicket, queryClient, shiftSalesQueryKey, hasWarehouse, t]
  );

  const handleStartNewSaleAfterSuccess = useCallback(() => {
    setCompletedSale(null);
    setTimeout(() => document.getElementById(PRODUCT_SEARCH_INPUT_ID)?.focus(), 50);
  }, []);

  const handlePrint = useCallback(
    async (kind: "thermal" | "a4") => {
      const saleId = activeSale?.id;
      if (!saleId) return;
      setPrintingKind(kind);
      try {
        const path =
          kind === "thermal" ? `/sales/${saleId}/thermal-invoice-pdf` : `/sales/${saleId}/a4-invoice-pdf/view`;
        const response = await apiClient.get(`${path}?t=${Date.now()}`, { responseType: "blob" });
        const blob = new Blob([response.data], { type: "application/pdf" });
        setPdfUrl(window.URL.createObjectURL(blob));
        setPdfDialogOpen(true);
      } catch {
        toast.error(t("failedToLoadSale"));
      } finally {
        setPrintingKind(null);
      }
    },
    [activeSale]
  );

  // Applies a fresh Sale returned by a sale-action endpoint to whichever slot (editing/completed)
  // currently holds it, so the UI reflects the change without needing a full reload.
  const applyActiveSaleUpdate = useCallback(
    (updated: Sale) => {
      if (editingSale && editingSale.id === updated.id) setEditingSale(updated);
      else if (completedSale && completedSale.id === updated.id) setCompletedSale(updated);
    },
    [editingSale, completedSale]
  );

  const handleExportToFinance = useCallback(async () => {
    if (!activeSale) return;
    setIsExportingToFinance(true);
    try {
      const updated = await saleService.exportToFinance(activeSale.id);
      applyActiveSaleUpdate(updated);
      toast.success(t("journalEntrySent"));
    } catch (err) {
      toast.error(t("journalExportFailed"), {
        description: saleService.getErrorMessage(err),
      });
    } finally {
      setIsExportingToFinance(false);
    }
  }, [activeSale, applyActiveSaleUpdate]);

  const handleToggleQuote = useCallback(async () => {
    if (!activeSale) return;
    setIsTogglingQuote(true);
    try {
      const updated = await saleService.toggleQuote(activeSale.id);
      applyActiveSaleUpdate(updated);
      queryClient.invalidateQueries({ queryKey: shiftSalesQueryKey });
      toast.success(updated.is_quote ? t("convertedToQuote") : t("convertedToInvoice"));
    } catch (err) {
      toast.error(t("quoteModeChangeFailed"), { description: saleService.getErrorMessage(err) });
    } finally {
      setIsTogglingQuote(false);
    }
  }, [activeSale, applyActiveSaleUpdate, queryClient, shiftSalesQueryKey]);

  const handleSendWhatsApp = useCallback(async () => {
    if (!activeSale?.id || !activeSale.client_id) return;
    let phone = activeSale.client?.phone;
    if (!phone) {
      try {
        const res = await apiClient.get(`/clients/${activeSale.client_id}`);
        phone = res.data?.phone ?? null;
      } catch {
        // ignore — handled by the "no phone" check below
      }
    }
    if (!phone) {
      toast.error(t("noClientPhone"));
      return;
    }

    setWhatsAppLoading(true);
    const toastId = `whatsapp-${activeSale.id}`;
    try {
      const clientName = activeSale.client_name || activeSale.client?.name || "";
      const filename = `invoice_${activeSale.id}.pdf`;

      toast.loading(t("loadingInvoice"), { id: toastId });
      const pdfResponse = await apiClient.get(`/sales/${activeSale.id}/a4-invoice-pdf/view`, {
        responseType: "blob",
      });
      const pdfBlob = new Blob([pdfResponse.data], { type: "application/pdf" });

      toast.loading(t("uploadingToFirebase"), { id: toastId });
      const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;
      const downloadUrl = await uploadFileToFirebase(pdfBlob, `invoices/${firebaseCollectionName}/${filename}`);

      toast.loading(t("sendingWhatsapp"), { id: toastId });
      await apiClient.post("/admin/whatsapp-cloud/send-template", {
        to: phone,
        template_name: "invoice_ar",
        language_code: "ar",
        components: [
          { type: "header", parameters: [{ type: "document", document: { link: downloadUrl, filename } }] },
          { type: "body", parameters: [{ type: "text", text: clientName }] },
        ],
      });

      toast.success(t("invoiceSentViaWhatsapp"), { id: toastId, duration: 4000 });
    } catch (err) {
      toast.error(t("invoiceWhatsappSendFailed"), { id: toastId, description: saleService.getErrorMessage(err) });
    } finally {
      setWhatsAppLoading(false);
    }
  }, [activeSale, getSetting]);

  const handleConfirmDeleteSale = useCallback(async () => {
    if (!saleToDelete) return;
    if ((saleToDelete.payments?.length ?? 0) > 0) {
      toast.error(t("cannotDeleteSaleHasPayments"));
      setSaleToDelete(null);
      return;
    }
    setIsDeletingSale(true);
    try {
      await saleService.deleteSale(saleToDelete.id);
      toast.success(t("saleDeletedSuccessfully"));
      if (editingSale?.id === saleToDelete.id) clearEditing();
      else if (completedSale?.id === saleToDelete.id) setCompletedSale(null);
      queryClient.invalidateQueries({ queryKey: shiftSalesQueryKey });
    } catch (err) {
      toast.error(t("saleDeleteFailed"), { description: saleService.getErrorMessage(err) });
    } finally {
      setIsDeletingSale(false);
      setSaleToDelete(null);
    }
  }, [saleToDelete, editingSale?.id, completedSale?.id, clearEditing, queryClient, shiftSalesQueryKey]);

  // Load/clear the payment-due reminder whenever the active sale changes
  useEffect(() => {
    if (!activeSale?.id) {
      setReminderDate(null);
      return;
    }
    saleReminderService
      .getReminder(activeSale.id)
      .then((r) => setReminderDate(r?.remind_at ?? null))
      .catch(() => setReminderDate(null));
  }, [activeSale?.id]);

  const handleSetReminder = useCallback(
    async (days: number) => {
      if (!activeSale?.id) return;
      setReminderLoading(true);
      try {
        const r = await saleReminderService.setReminder(activeSale.id, days);
        setReminderDate(r.remind_at);
        toast.success(t("reminderSetAfterDays", { days }));
      } catch {
        toast.error(t("reminderSetFailed"));
      } finally {
        setReminderLoading(false);
      }
    },
    [activeSale?.id]
  );

  const handleRemoveReminder = useCallback(async () => {
    if (!activeSale?.id) return;
    setReminderLoading(true);
    try {
      await saleReminderService.removeReminder(activeSale.id);
      setReminderDate(null);
      toast.success(t("reminderCancelled"));
    } catch {
      toast.error(t("reminderCancelFailed"));
    } finally {
      setReminderLoading(false);
    }
  }, [activeSale?.id]);

  const handleChangeSaleDate = useCallback(
    async (date: string) => {
      if (!activeSale) return;
      setIsChangingSaleDate(true);
      try {
        const updated = await saleService.updateSale(activeSale.id, { sale_date: date });
        applyActiveSaleUpdate(updated);
        queryClient.invalidateQueries({ queryKey: shiftSalesQueryKey });
        toast.success(t("saleDateUpdated"));
      } catch (err) {
        toast.error(t("saleDateUpdateFailed"), { description: saleService.getErrorMessage(err) });
      } finally {
        setIsChangingSaleDate(false);
      }
    },
    [activeSale, applyActiveSaleUpdate, queryClient, shiftSalesQueryKey]
  );

  const handleClosePdfDialog = useCallback(() => {
    setPdfDialogOpen(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  const handleShiftReportPdf = useCallback(async () => {
    if (!shiftId) return;
    setShiftReportLoading(true);
    try {
      const response = await apiClient.get("/reports/sales-pdf", {
        params: { shift_id: shiftId, user_id: user?.id },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      setShiftReportUrl(window.URL.createObjectURL(blob));
      setShiftReportDialogOpen(true);
      setShiftSummaryOpen(false);
    } catch (err) {
      toast.error(t("shiftReportLoadFailed"), { description: saleService.getErrorMessage(err) });
    } finally {
      setShiftReportLoading(false);
    }
  }, [shiftId, user?.id]);

  const handleCloseShiftReportDialog = useCallback(() => {
    setShiftReportDialogOpen(false);
    if (shiftReportUrl) {
      window.URL.revokeObjectURL(shiftReportUrl);
      setShiftReportUrl(null);
    }
  }, [shiftReportUrl]);

  // ── Shift open/close (shift-based POS mode only) — legitimate server actions, unrelated to cart building ──
  const handleOpenShift = useCallback(async () => {
    setShiftActionBusy(true);
    try {
      await apiClient.post("/shifts/open");
      await queryClient.invalidateQueries({ queryKey: ["shifts", "current"] });
      toast.success(t("shiftOpened"));
    } catch (err) {
      toast.error(t("shiftOpenFailed"), { description: saleService.getErrorMessage(err) });
    } finally {
      setShiftActionBusy(false);
    }
  }, [queryClient]);

  const handleCloseShift = useCallback(async () => {
    setShiftActionBusy(true);
    try {
      await apiClient.post("/shifts/close");
      await queryClient.invalidateQueries({ queryKey: ["shifts", "current"] });
      toast.success(t("shiftClosed"));
    } catch (err) {
      toast.error(t("shiftCloseFailed"), { description: saleService.getErrorMessage(err) });
    } finally {
      setShiftActionBusy(false);
    }
  }, [queryClient]);

  const loadSaleForEditing = useCallback(
    async (saleId: number) => {
      setLoadingSale(true);
      setLoadingSaleId(saleId);
      try {
        const sale = await saleService.getSaleForPOS(saleId);
        const items = sale.items ?? [];
        const ticket: DraftTicket = {
          id: crypto.randomUUID(),
          label: nextTicketLabel(),
          items: items.map((item) => {
            const product: Product = item.product
              ? item.product
              : ({
                  id: item.product_id,
                  name: item.product_name ?? t("unknownProduct"),
                  scientific_name: "",
                  sku: item.product_sku ?? null,
                  description: null,
                  image_url: null,
                  stock_quantity: 0,
                  stock_alert_level: null,
                  created_at: "",
                  updated_at: "",
                } as Product);
            return {
              localId: crypto.randomUUID(),
              saleItemId: item.id ?? null,
              product,
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              purchaseItemId: item.purchase_item_id ?? null,
            };
          }),
          client: sale.client ?? null,
          discountType: sale.discount_type ?? "fixed",
          discountAmount: Number(sale.discount_amount ?? 0),
          notes: sale.notes ?? null,
          createdAt: Date.now(),
        };

        setTickets([ticket]);
        setActiveTicketId(ticket.id);
        setEditingSaleId(sale.id);
        setEditingSale(sale);
        setSelectedLineId(null);
        setPastSalesOpen(false);
      } catch (err) {
        toast.error(t("failedToLoadSaleForEdit"), { description: saleService.getErrorMessage(err) });
      } finally {
        setLoadingSale(false);
        setLoadingSaleId(null);
      }
    },
    [nextTicketLabel]
  );

  const saveEditingSale = useCallback(async (opts?: { silent?: boolean }): Promise<Sale | null> => {
    if (!editingSaleId || !editingSale || !activeTicket) return null;
    setSavingSale(true);
    try {
      const originalItems = new Map<number, NonNullable<Sale["items"]>[number]>(
        (editingSale.items ?? []).filter((item): item is NonNullable<Sale["items"]>[number] => item != null).map((item) => [item.id as number, item])
      );
      const existingSaleItemIds = new Set<number>();
      const itemOperations: Array<Promise<unknown>> = [];

      for (const item of activeTicket.items) {
        if (item.saleItemId != null) {
          existingSaleItemIds.add(item.saleItemId);
          const originalItem = originalItems.get(item.saleItemId);
          if (
            originalItem &&
            (item.quantity !== originalItem.quantity ||
              Number(item.unitPrice) !== Number(originalItem.unit_price) ||
              item.purchaseItemId !== (originalItem.purchase_item_id ?? null))
          ) {
            itemOperations.push(
              saleService.updateSaleItem(editingSaleId, item.saleItemId, {
                quantity: item.quantity,
                unit_price: item.unitPrice,
                purchase_item_id: item.purchaseItemId ?? null,
              })
            );
          }
        } else {
          itemOperations.push(
            saleService.addSaleItem(editingSaleId, {
              product_id: item.product.id,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              purchase_item_id: item.purchaseItemId ?? null,
            })
          );
        }
      }

      for (const originalItem of editingSale.items ?? []) {
        if (originalItem.id != null && !existingSaleItemIds.has(originalItem.id)) {
          itemOperations.push(saleService.deleteSaleItem(editingSaleId, originalItem.id));
        }
      }

      const newClientId = activeTicket.client?.id ?? null;
      if (newClientId !== editingSale.client_id) {
        itemOperations.push(
          newClientId == null
            ? saleService.removeClientFromSale(editingSaleId)
            : saleService.updateSale(editingSaleId, { client_id: newClientId })
        );
      }

      const discountChanged =
        activeTicket.discountType !== editingSale.discount_type ||
        activeTicket.discountAmount !== Number(editingSale.discount_amount ?? 0);
      if (discountChanged) {
        itemOperations.push(
          saleService.updateSaleDiscount(editingSaleId, {
            discount_amount: activeTicket.discountAmount,
            discount_type: activeTicket.discountType,
          })
        );
      }

      if (itemOperations.length === 0) {
        if (!opts?.silent) toast.success(t("noChangesToSave"));
        return editingSale;
      }

      for (const op of itemOperations) {
        await op;
      }

      const updatedSale = await saleService.getSaleForPOS(editingSaleId);
      setEditingSale(updatedSale);
      setEditingSaleId(updatedSale.id);
      const updatedTicket: DraftTicket = {
        id: crypto.randomUUID(),
        label: nextTicketLabel(),
        items: (updatedSale.items ?? []).map((item) => {
          const product: Product = item.product
            ? item.product
            : ({
                id: item.product_id,
                name: item.product_name ?? t("unknownProduct"),
                scientific_name: "",
                sku: item.product_sku ?? null,
                description: null,
                image_url: null,
                stock_quantity: 0,
                stock_alert_level: null,
                created_at: "",
                updated_at: "",
              } as Product);
          return {
            localId: crypto.randomUUID(),
            saleItemId: item.id ?? null,
            product,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            purchaseItemId: item.purchase_item_id ?? null,
          };
        }),
        client: updatedSale.client ?? null,
        discountType: updatedSale.discount_type ?? "fixed",
        discountAmount: Number(updatedSale.discount_amount ?? 0),
        notes: updatedSale.notes ?? null,
        createdAt: Date.now(),
      };
      setTickets([updatedTicket]);
      setActiveTicketId(updatedTicket.id);
      setSelectedLineId(null);
      queryClient.invalidateQueries({ queryKey: shiftSalesQueryKey });
      if (!opts?.silent) toast.success(t("editsSavedSuccessfully"));
      return updatedSale;
    } catch (err) {
      toast.error(t("editsSaveFailed"), { description: saleService.getErrorMessage(err) });
      return null;
    } finally {
      setSavingSale(false);
    }
  }, [activeTicket, editingSale, editingSaleId, nextTicketLabel, queryClient, shiftSalesQueryKey]);

  // ── Add a payment to a sale currently being edited (items/discount already persisted by saveEditingSale) ──
  const handleAddPaymentToEditingSale = useCallback(
    async (paymentLines: Array<{ method: Payment["method"]; amount: number }>) => {
      if (!editingSaleId || paymentLines.length === 0) return;
      setIsCreatingSale(true);
      setCreateSaleError(null);
      try {
        for (const line of paymentLines) {
          await saleService.addPayment(editingSaleId, { method: line.method, amount: line.amount });
        }
        const updatedSale = await saleService.getSaleForPOS(editingSaleId);
        setEditingSale(updatedSale);
        setPaymentOpen(false);
        queryClient.invalidateQueries({ queryKey: shiftSalesQueryKey });
        toast.success(t("paymentRecordedSuccessfully"));
      } catch (err) {
        const message = saleService.getErrorMessage(err);
        setCreateSaleError(message);
        toast.error(message);
      } finally {
        setIsCreatingSale(false);
      }
    },
    [editingSaleId, queryClient, shiftSalesQueryKey]
  );

  const handleDeleteEditingPayment = useCallback(
    async (paymentId: number) => {
      if (!editingSaleId) return;
      setDeletingPaymentId(paymentId);
      try {
        await saleService.deletePayment(editingSaleId, paymentId);
        const updatedSale = await saleService.getSaleForPOS(editingSaleId);
        setEditingSale(updatedSale);
        queryClient.invalidateQueries({ queryKey: shiftSalesQueryKey });
        toast.success(t("paymentRemoved"));
      } catch (err) {
        toast.error(t("paymentRemovalFailed"), { description: saleService.getErrorMessage(err) });
      } finally {
        setDeletingPaymentId(null);
      }
    },
    [editingSaleId, queryClient, shiftSalesQueryKey]
  );

  // ── Open the payment flow — for an existing sale, persist pending cart/discount edits first so the ──
  // ── amount due reflects the current state rather than a stale draft ──
  const handleOpenPayment = useCallback(async () => {
    if (isCreatingSale || savingSale) return;
    if (isEditingSale) {
      if (!editingSaleId) return;
      const saved = await saveEditingSale({ silent: true });
      if (!saved) return;
      setCreateSaleError(null);
      setPaymentOpen(true);
      return;
    }
    if (!activeTicket || activeTicket.items.length === 0) return;
    if (!hasWarehouse) {
      toast.error(t("noWarehouseAssignedError"));
      return;
    }
    setCreateSaleError(null);
    setPaymentOpen(true);
  }, [isCreatingSale, savingSale, isEditingSale, editingSaleId, saveEditingSale, activeTicket, hasWarehouse, t]);

  const handleQuickCashPay = useCallback(async () => {
    if (isCreatingSale || savingSale) return;
    if (isEditingSale) {
      if (!editingSaleId) return;
      const saved = await saveEditingSale({ silent: true });
      if (!saved) return;
      const due = Math.max(0, Number(saved.due_amount ?? 0));
      if (due <= 0) return;
      await handleAddPaymentToEditingSale([{ method: defaultPaymentMethod, amount: due }]);
      return;
    }
    if (!activeTicket) return;
    const { total } = computeDraftTotals(activeTicket);
    if (total <= 0) return;
    handleCompleteSale([{ method: defaultPaymentMethod, amount: total }]);
  }, [
    isCreatingSale,
    savingSale,
    isEditingSale,
    editingSaleId,
    saveEditingSale,
    handleAddPaymentToEditingSale,
    activeTicket,
    handleCompleteSale,
    defaultPaymentMethod,
  ]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        document.getElementById(PRODUCT_SEARCH_INPUT_ID)?.focus();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        setCustomerPickerOpen(true);
        return;
      }
      if (e.key === "F8") {
        e.preventDefault();
        handleOpenPayment();
        return;
      }
      if (e.key === "F10") {
        e.preventDefault();
        handleQuickCashPay();
        return;
      }
      if (e.key === "Escape" && selectedLineId != null) {
        setSelectedLineId(null);
        return;
      }
      if (isTyping) return;
      if (e.key === "Delete" && selectedLineId != null && activeTicket) {
        const item = activeTicket.items.find((i) => i.localId === selectedLineId);
        if (item) {
          e.preventDefault();
          handleRemoveItem(item);
        }
        return;
      }
      if ((e.key === "+" || e.key === "-") && selectedLineId != null && activeTicket) {
        const item = activeTicket.items.find((i) => i.localId === selectedLineId);
        if (item) {
          const nextQty = item.quantity + (e.key === "+" ? 1 : -1);
          if (nextQty > 0) {
            e.preventDefault();
            handleQuantityChange(item, nextQty);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTicket, selectedLineId, handleOpenPayment, handleQuickCashPay, handleRemoveItem, handleQuantityChange]);

  // ── Shift gate ──
  if (posMode === "shift" && currentShiftQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (posMode === "shift" && !currentShiftQuery.data) {
    return (
      <div dir={direction} className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <ShieldCheck className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{t("noOpenShift")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {canOpenShift ? t("openShiftToStart") : t("contactAdminToOpenShift")}
          </p>
        </div>
        {canOpenShift && (
          <Button size="lg" disabled={shiftActionBusy} onClick={handleOpenShift} className="gap-2">
            {shiftActionBusy && <Loader2 className="size-4 animate-spin" />}
            {t("openNewShift")}
          </Button>
        )}
      </div>
    );
  }

  const activeTotal = activeTicket ? computeDraftTotals(activeTicket).total : 0;
  // Derived from the live draft total (not the stale editingSale.due_amount), so adding/removing
  // items before saving is reflected immediately instead of showing "fully paid" from the old total.
  const editingDueAmount = isEditingSale
    ? Math.max(0, activeTotal - Number(editingSale?.paid_amount ?? 0))
    : null;
  const paymentTotal = editingDueAmount ?? activeTotal;

  return (
    <div dir={direction} className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b bg-card">
        {/* Fixed-width to match ShiftSalesColumn below, so the border-e lines up into one straight line */}
        <div className="flex h-full w-24 shrink-0 items-center justify-center border-e px-1 text-center">
          <span className="text-sm font-semibold leading-tight text-foreground">{t("title")}</span>
        </div>

        <div className="flex h-full min-w-0 flex-1 items-center gap-3 px-4">
          <span className="text-xs text-muted-foreground">
            {posMode === "shift" && currentShiftQuery.data
              ? t("shiftHashPrefix", { id: currentShiftQuery.data.id })
              : ""}
            {user?.name}
          </span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              hasWarehouse
                ? "bg-muted text-muted-foreground"
                : "bg-destructive/10 text-destructive"
            )}
          >
            <Warehouse className="size-3" />
            {user?.warehouse?.name ?? t("noWarehouseAssigned")}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {now.toLocaleTimeString(direction === "rtl" ? "ar" : "en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>

          <Separator orientation="vertical" className="h-5 shrink-0" />

          {/* Held tickets — switch between or hold multiple simultaneous draft carts */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="group relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTicketId(ticket.id);
                    setSelectedLineId(null);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    ticket.id === activeTicketId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {t("ticketLabel", { label: ticket.label })}
                  {ticket.items.length > 0 && <span className="tabular-nums">({ticket.items.length})</span>}
                  {ticket.client != null && <Users className="size-3" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTicketToDelete(ticket);
                  }}
                  className="absolute -end-1.5 -top-1.5 hidden size-4 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewTicket}
              className="shrink-0 gap-1 text-muted-foreground"
              disabled={isEditingSale}
            >
              <Plus className="size-3.5" />
              {t("newTicket")}
            </Button>
          </div>

          <div className="ms-auto flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPastSalesOpen(true)} disabled={loadingSale || isEditingSale}>
              {t("previousSales")}
            </Button>
            {editingSale && (
              <>
                <span className="text-xs text-foreground">{t("editingSaleHash", { id: editingSale.id })}</span>
                <Button variant="secondary" size="sm" disabled={savingSale} onClick={saveEditingSale} className="gap-1">
                  {savingSale ? <Loader2 className="size-3 animate-spin" /> : null}
                  {t("saveEdits")}
                </Button>
                <Button variant="outline" size="sm" disabled={loadingSale || savingSale} onClick={clearEditing}>
                  {t("cancelEdit")}
                </Button>
              </>
            )}
            {posMode === "shift" && currentShiftQuery.data && (
              <Popover open={shiftSummaryOpen} onOpenChange={setShiftSummaryOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <FileText className="size-3.5" />
                    {t("shiftSummaryHash", { id: currentShiftQuery.data.id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[520px] p-0" dir={direction}>
                  <div className="border-b px-3 py-2">
                    <p className="text-sm font-semibold text-foreground">{t("shiftHash", { id: currentShiftQuery.data.id })}</p>
                  </div>
                  <ShiftFinancialTable shiftId={currentShiftQuery.data.id} />
                  <div className="border-t p-2">
                    <Button
                      className="w-full gap-2"
                      disabled={shiftReportLoading}
                      onClick={handleShiftReportPdf}
                    >
                      {shiftReportLoading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                      {t("shiftReportPdf")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <CustomerPicker
              open={customerPickerOpen}
              onOpenChange={setCustomerPickerOpen}
              client={activeTicket?.client ?? null}
              onSelect={handleSelectCustomer}
              disabled={!activeTicket}
            />
            {posMode === "shift" && canCloseShift && (
              <Button variant="outline" size="sm" disabled={shiftActionBusy} onClick={handleCloseShift}>
                {t("closeShift")}
              </Button>
            )}
            <ThemeColorPicker selectedId={themeColorId} onSelect={handleSelectThemeColor} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label={t("resetLocalCache")}
              title={t("resetLocalCache")}
              onClick={() => setConfirmResetCacheOpen(true)}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Sale actions — print, finance export, whatsapp, quote toggle, reminder, delete */}
      <SaleActionsBar
        sale={activeSale}
        onPrintThermal={() => handlePrint("thermal")}
        onPrintA4={() => handlePrint("a4")}
        printingKind={printingKind}
        onSendWhatsApp={handleSendWhatsApp}
        whatsAppLoading={whatsAppLoading}
        onExportToFinance={handleExportToFinance}
        isExportingToFinance={isExportingToFinance}
        onToggleQuote={handleToggleQuote}
        isTogglingQuote={isTogglingQuote}
        canDeleteSale={canDeleteSale}
        onRequestDelete={() => setSaleToDelete(activeSale)}
        isDeletingSale={isDeletingSale}
        reminderDate={reminderDate}
        reminderLoading={reminderLoading}
        onSetReminder={handleSetReminder}
        onRemoveReminder={handleRemoveReminder}
        onChangeSaleDate={handleChangeSaleDate}
        isChangingSaleDate={isChangingSaleDate}
      />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        <ShiftSalesColumn
          sales={shiftSales}
          isLoading={shiftSalesQuery.isLoading}
          isFetching={shiftSalesQuery.isFetching}
          activeSaleId={activeSale?.id ?? null}
          onSelectSale={(sale) => loadSaleForEditing(sale.id)}
          canDeleteSale={canDeleteSale}
          onDeleteSale={(sale) => setSaleToDelete(sale)}
          deletingSaleId={isDeletingSale ? saleToDelete?.id ?? null : null}
          loadingSaleId={loadingSaleId}
        />
        <div className="flex-1 overflow-hidden border-e">
          <ProductSearchPanel
            warehouseId={user?.warehouse_id}
            usdFactor={usdFactor}
            showOutOfStock={showOutOfStock}
            showExpired={showExpired}
            disabled={!activeTicket || isCreatingSale}
            cartQuantities={cartQuantities}
            onAddProduct={handleAddProduct}
          />
        </div>
        <div className="w-[520px] shrink-0 overflow-hidden">
          <CartPanel
            ticket={activeTicket}
            selectedLineId={selectedLineId}
            onSelectLine={setSelectedLineId}
            onQuantityChange={handleQuantityChange}
            onRemoveItem={handleRemoveItem}
            onClearCart={() => setConfirmClearOpen(true)}
            canDiscount={canDiscount}
            onApplyDiscount={handleApplyDiscount}
            onRemoveDiscount={handleRemoveDiscount}
            canPayment={canPayment && (isEditingSale || hasWarehouse)}
            onOpenPayment={handleOpenPayment}
            onQuickCashPay={handleQuickCashPay}
            isCreatingSale={isCreatingSale || savingSale}
            dueAmount={editingDueAmount}
            payments={isEditingSale ? editingSale?.payments ?? [] : null}
            canCancelPayment={canCancelPayment}
            deletingPaymentId={deletingPaymentId}
            onDeletePayment={handleDeleteEditingPayment}
          />
        </div>
      </div>

      {/* Shortcut hints */}
      <div className="hidden shrink-0 items-center gap-4 border-t bg-muted/30 px-4 py-1.5 text-[11px] text-muted-foreground md:flex">
        <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 py-0.5 font-mono">/</kbd> {t("kbdSearch")}</span>
        <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 py-0.5 font-mono">F4</kbd> {t("kbdClient")}</span>
        <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 py-0.5 font-mono">F8</kbd> {t("kbdPayment")}</span>
        <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 py-0.5 font-mono">F10</kbd> {t("kbdQuickCash")}</span>
        <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 py-0.5 font-mono">Delete</kbd> {t("kbdDeleteItem")}</span>
        <span className="flex items-center gap-1"><kbd className="rounded border bg-background px-1 py-0.5 font-mono">+/-</kbd> {t("kbdAdjustQty")}</span>
      </div>

      {/* Payment / create sale */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (open) setCreateSaleError(null);
        }}
        total={paymentTotal}
        ticketLabel={activeTicket?.label}
        isSubmitting={isCreatingSale}
        error={createSaleError}
        mode={isEditingSale ? "addPayment" : "create"}
        onConfirm={isEditingSale ? handleAddPaymentToEditingSale : handleCompleteSale}
        hasClient={!!activeTicket?.client}
      />

      {/* Success / receipt */}
      <SaleCompleteDialog
        open={!!completedSale}
        sale={completedSale}
        onNewSale={handleStartNewSaleAfterSuccess}
        onPrint={handlePrint}
        printingKind={printingKind}
        onExportToFinance={handleExportToFinance}
        isExportingToFinance={isExportingToFinance}
      />

      {/* Clear cart confirmation */}
      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearCartTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clearCartDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmClearOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleClearCart}>
              {t("clearCartAction")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset local POS cache confirmation */}
      <AlertDialog open={confirmResetCacheOpen} onOpenChange={setConfirmResetCacheOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetLocalCacheTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("resetLocalCacheDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmResetCacheOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleResetLocalCache}>
              {t("resetLocalCacheAction")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete ticket confirmation */}
      <AlertDialog open={!!ticketToDelete} onOpenChange={(o) => !o && setTicketToDelete(null)}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTicketTitle", { label: ticketToDelete?.label })}</AlertDialogTitle>
            <AlertDialogDescription>{t("actionCannotBeUndone")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setTicketToDelete(null)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteTicket}>
              {tCommon("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete sale confirmation */}
      <AlertDialog open={!!saleToDelete} onOpenChange={(o) => !o && setSaleToDelete(null)}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSaleTitle", { id: saleToDelete?.id })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteSaleWithPaymentsWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaleToDelete(null)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="destructive" disabled={isDeletingSale} onClick={handleConfirmDeleteSale}>
              {isDeletingSale ? <Loader2 className="size-4 animate-spin" /> : null}
              {tCommon("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PastSalesSearchDialog
        open={pastSalesOpen}
        onClose={() => setPastSalesOpen(false)}
        onSelectSale={(saleId) => loadSaleForEditing(saleId)}
      />

      {/* Receipt PDF */}
      {pdfUrl && (
        <PdfViewerDialog isOpen={pdfDialogOpen} onClose={handleClosePdfDialog} pdfUrl={pdfUrl} title={t("saleInvoiceTitle")} />
      )}

      {/* Shift report PDF */}
      {shiftReportUrl && (
        <PdfViewerDialog
          isOpen={shiftReportDialogOpen}
          onClose={handleCloseShiftReportDialog}
          pdfUrl={shiftReportUrl}
          title={currentShiftQuery.data ? t("shiftHash", { id: currentShiftQuery.data.id }) : t("shiftReportTitle")}
        />
      )}

      {/* Global HTTP activity indicator — any request on the shared apiClient, from anywhere on this page */}
      {isHttpBusy && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2 shadow-lg">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PosPage;
