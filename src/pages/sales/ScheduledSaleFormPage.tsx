// src/pages/sales/ScheduledSaleFormPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, User, X } from "lucide-react";
import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import ClientFormModal from "@/components/clients/ClientFormModal";

import { useAuth } from "@/context/AuthContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useSettings } from "@/context/SettingsContext";

import clientService, { Client } from "@/services/clientService";
import productService, { Product } from "@/services/productService";
import scheduledSaleService from "@/services/scheduledSaleService";
import {
  createDraftTicket,
  DraftCartItem,
  DraftTicket,
} from "@/lib/posCart";
import { buildCreateScheduledSaleData } from "@/lib/scheduledSaleCart";
import { ProductSearchPanel } from "@/components/pos/ProductSearchPanel";
import { CartPanel } from "@/components/pos/CartPanel";
import { stockOf, resolveUnitPrice } from "@/lib/pos";

function CustomerField({
  value,
  onChange,
}: {
  value: Client | null;
  onChange: (client: Client | null) => void;
}) {
  const { t } = useTranslation("scheduledSales");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const resultsQuery = useQuery({
    queryKey: ["scheduled-sale-clients-search", debouncedSearch],
    queryFn: () => clientService.autocompleteClients(debouncedSearch, 20),
    enabled: debouncedSearch.length > 0,
  });

  const results = debouncedSearch ? (resultsQuery.data ?? []) : [];

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 min-w-64 justify-start gap-2 px-3"
          >
            <User className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">
              {value ? value.name : t("form.selectCustomer")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={t("form.searchCustomerPlaceholder")}
            />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  value="create-new"
                  onSelect={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="size-4 text-primary" />
                  {t("form.createNewCustomer")}
                </CommandItem>
              </CommandGroup>

              {debouncedSearch && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {resultsQuery.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        {t("form.searching")}
                      </div>
                    ) : results.length === 0 ? (
                      <CommandEmpty>{t("form.noResults")}</CommandEmpty>
                    ) : (
                      results.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={String(c.id)}
                          onSelect={() => {
                            onChange(c);
                            setOpen(false);
                          }}
                        >
                          <User className="size-4 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{c.name}</p>
                            {c.phone && (
                              <p className="text-xs text-muted-foreground" dir="ltr">
                                {c.phone}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onChange(null)}
        >
          <X className="size-4" />
        </Button>
      )}
      {value && !value.phone && (
        <span className="text-xs text-destructive">{t("form.noPhoneWarning")}</span>
      )}

      <ClientFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        clientToEdit={null}
        onSaveSuccess={(newClient) => {
          setCreateOpen(false);
          if (newClient) onChange(newClient);
        }}
      />
    </div>
  );
}

export default function ScheduledSaleFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { hasPermission } = useAuthorization();
  const { getSetting } = useSettings();
  const { t } = useTranslation("scheduledSales");

  const showOutOfStock = Boolean(getSetting("pos_show_out_of_stock_products", false));
  const showExpired = Boolean(getSetting("pos_show_expired_products", false));
  const usdConversionEnabled = Boolean(getSetting("usd_conversion_enabled", true));
  const usdFactor = usdConversionEnabled
    ? Number(getSetting("usd_to_sdg_factor", 1) ?? 1)
    : 1;
  const canDiscount = hasPermission("تخفيض");

  const [ticket, setTicket] = useState<DraftTicket>(() => createDraftTicket(1));
  const [scheduledAt, setScheduledAt] = useState<Date | null>(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(!isEdit);

  const { data: existing, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["scheduled-sale", id],
    queryFn: () => scheduledSaleService.getScheduledSale(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing || hydrated) return;

    let cancelled = false;

    (async () => {
      const items: DraftCartItem[] = [];
      for (const item of existing.items ?? []) {
        try {
          const product = await productService.getProduct(item.product_id);
          items.push({
            localId: crypto.randomUUID(),
            product,
            quantity: item.quantity,
            unitPrice: item.unit_price,
          });
        } catch {
          // Product may have been deleted since scheduling — skip it silently.
        }
      }

      if (cancelled) return;

      setScheduledAt(new Date(existing.scheduled_at));
      setTicket((prev) => ({
        ...prev,
        client: existing.client
          ? {
              id: existing.client.id,
              name: existing.client.name,
              phone: existing.client.phone,
              email: null,
              address: null,
              created_at: "",
              updated_at: "",
            }
          : null,
        discountType: existing.discount_type ?? "fixed",
        discountAmount: existing.discount_amount ?? 0,
        notes: existing.notes,
        items,
      }));
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [existing, hydrated]);

  const handleAddProduct = (product: Product) => {
    const unitPrice = resolveUnitPrice(product, usdFactor);
    if (unitPrice <= 0) {
      toast.error(t("form.zeroPriceProduct", { name: product.name }));
      return;
    }
    const currentQty = ticket.items.find((i) => i.product.id === product.id)?.quantity ?? 0;
    if (currentQty >= stockOf(product)) {
      toast.error(t("form.insufficientStockFor", { name: product.name }));
      return;
    }
    setTicket((prev) => {
      const idx = prev.items.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const nextItems = [...prev.items];
        nextItems[idx] = { ...nextItems[idx], quantity: nextItems[idx].quantity + 1 };
        return { ...prev, items: nextItems };
      }
      const newItem: DraftCartItem = {
        localId: crypto.randomUUID(),
        product,
        quantity: 1,
        unitPrice,
      };
      return { ...prev, items: [...prev.items, newItem] };
    });
  };

  const handleQuantityChange = (item: DraftCartItem, quantity: number) => {
    if (quantity < 1) return;
    if (quantity > stockOf(item.product)) {
      toast.error(t("form.insufficientStockFor", { name: item.product.name }));
      return;
    }
    setTicket((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.localId === item.localId ? { ...i, quantity } : i)),
    }));
  };

  const handleRemoveItem = (item: DraftCartItem) => {
    setTicket((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.localId !== item.localId),
    }));
    setSelectedLineId((prevId) => (prevId === item.localId ? null : prevId));
  };

  const createMutation = useMutation({
    mutationFn: scheduledSaleService.createScheduledSale,
    onSuccess: () => {
      toast.success(t("form.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["scheduled-sales"] });
      navigate("/sales/scheduled");
    },
    onError: (error: unknown) => {
      toast.error(scheduledSaleService.getErrorMessage(error, t("form.saveError")));
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof scheduledSaleService.updateScheduledSale>[1]) =>
      scheduledSaleService.updateScheduledSale(Number(id), payload),
    onSuccess: (updated) => {
      toast.success(t("form.updateSuccess"));
      queryClient.invalidateQueries({ queryKey: ["scheduled-sales"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-sale", id] });
      queryClient.setQueryData(["scheduled-sale", id], updated);
      navigate("/sales/scheduled");
    },
    onError: (error: unknown) => {
      toast.error(scheduledSaleService.getErrorMessage(error, t("form.saveError")));
      console.error(error);
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!ticket.client) {
      toast.error(t("form.customerRequired"));
      return;
    }
    if (ticket.items.length === 0) {
      toast.error(t("form.itemsRequired"));
      return;
    }
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      toast.error(t("form.scheduledAtRequired"));
      return;
    }
    if (scheduledAt.getTime() < Date.now()) {
      toast.error(t("form.scheduledAtMustBeFuture"));
      return;
    }

    const payload = buildCreateScheduledSaleData(ticket, scheduledAt.toISOString());

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEdit && (isLoadingExisting || !hydrated)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/sales/scheduled")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit ? t("form.editTitle") : t("form.createTitle")}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("form.detailsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("form.customerLabel")}</Label>
                <CustomerField
                  value={ticket.client}
                  onChange={(client) => setTicket((prev) => ({ ...prev, client }))}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("form.scheduledAtLabel")}</Label>
                <MobileDateTimePicker
                  value={scheduledAt}
                  onChange={(value) => setScheduledAt(value)}
                  onAccept={(value) => setScheduledAt(value)}
                  slotProps={{ textField: { size: "small", fullWidth: true, readOnly: true } }}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("form.notesLabel")}</Label>
                <Textarea
                  value={ticket.notes ?? ""}
                  onChange={(e) =>
                    setTicket((prev) => ({ ...prev, notes: e.target.value || null }))
                  }
                  placeholder={t("form.notesPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("form.itemsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[480px] overflow-hidden rounded-b-lg border-t">
                <ProductSearchPanel
                  warehouseId={user?.warehouse_id}
                  usdFactor={usdFactor}
                  showOutOfStock={showOutOfStock}
                  showExpired={showExpired}
                  cartQuantities={
                    new Map(ticket.items.map((i) => [i.product.id, i.quantity]))
                  }
                  onAddProduct={handleAddProduct}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <CartPanel
            ticket={ticket}
            selectedLineId={selectedLineId}
            onSelectLine={setSelectedLineId}
            onQuantityChange={handleQuantityChange}
            onRemoveItem={handleRemoveItem}
            onClearCart={() => setTicket((prev) => ({ ...prev, items: [] }))}
            canDiscount={canDiscount}
            onApplyDiscount={(type, amount) =>
              setTicket((prev) => ({ ...prev, discountType: type, discountAmount: amount }))
            }
            onRemoveDiscount={() =>
              setTicket((prev) => ({ ...prev, discountAmount: 0 }))
            }
            canPayment={false}
            onOpenPayment={() => {}}
            onQuickCashPay={() => {}}
            isCreatingSale={isSaving}
            dueAmount={null}
            payments={null}
          />

          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={isSaving}
            onClick={handleSubmit}
          >
            {isSaving && <Loader2 className="me-2 size-4 animate-spin" />}
            {isEdit ? t("form.saveButton") : t("form.scheduleButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
