// src/pages/sales/SalesListPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Filter,
  FileDown,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import { getPageNumbers } from "@/lib/pagination";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useSettings } from "@/context/SettingsContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useLanguage } from "@/context/LanguageContext";
import { webUrl } from "@/constants";

import saleService, { Sale } from "@/services/saleService";
import { getSaleStatus, translatePaymentMethod, translateSaleStatus } from "@/lib/saleStatus";
import { SaleDetailsDrawer } from "@/components/sales/SaleDetailsDrawer";
import {
  SalesAdvancedFiltersSheet,
  SalesAdvancedFilterValues,
} from "@/components/sales/SalesAdvancedFiltersSheet";

const PER_PAGE_OPTIONS = [25, 50, 100];

type DatePreset = "today" | "yesterday" | "week" | "month" | "custom" | "all";

const DATE_PRESET_KEYS: Record<DatePreset, string> = {
  today: "datePresetToday",
  yesterday: "datePresetYesterday",
  week: "datePresetWeek",
  month: "datePresetMonth",
  custom: "datePresetCustom",
  all: "datePresetAll",
};

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function resolveDateRange(preset: DatePreset, custom: DateRange | undefined) {
  const today = new Date();
  switch (preset) {
    case "today":
      return { start: fmt(today), end: fmt(today) };
    case "yesterday": {
      const y = subDays(today, 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case "week":
      return { start: fmt(startOfWeek(today)), end: fmt(today) };
    case "month":
      return { start: fmt(startOfMonth(today)), end: fmt(today) };
    case "custom":
      return {
        start: custom?.from ? fmt(custom.from) : undefined,
        end: custom?.to ? fmt(custom.to) : undefined,
      };
    case "all":
    default:
      return { start: undefined, end: undefined };
  }
}

const EMPTY_ADVANCED: SalesAdvancedFilterValues = { clientId: "", clientName: "", userId: "", shiftId: "" };

const SalesListPage: React.FC = () => {
  const navigate = useNavigate();
  const formatCurrency = useFormatCurrency();
  const { getSetting } = useSettings();
  const { hasPermission } = useAuthorization();
  const { direction } = useLanguage();
  const { t } = useTranslation("sales");
  const { t: tCommon } = useTranslation("common");
  const posMode = (getSetting("pos_mode", "shift") as "shift" | "days") ?? "shift";
  const canCreateSale = hasPermission("view-pos");

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [datePreset, setDatePreset] = useState<DatePreset>(
    (searchParams.get("preset") as DatePreset) || "today"
  );
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [advanced, setAdvanced] = useState<SalesAdvancedFilterValues>({
    clientId: searchParams.get("clientId") ?? "",
    clientName: searchParams.get("clientName") ?? "",
    userId: searchParams.get("userId") ?? "",
    shiftId: searchParams.get("shiftId") ?? "",
  });
  const [page, setPage] = useState(Number(searchParams.get("page") || "1"));
  const [perPage, setPerPage] = useState(25);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, datePreset, customRange, advanced]);

  // Keep the URL shareable/refreshable.
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set("search", debouncedSearch);
    next.set("preset", datePreset);
    if (advanced.clientId) {
      next.set("clientId", advanced.clientId);
      if (advanced.clientName) next.set("clientName", advanced.clientName);
    }
    if (advanced.userId) next.set("userId", advanced.userId);
    if (advanced.shiftId) next.set("shiftId", advanced.shiftId);
    next.set("page", String(page));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, datePreset, advanced, page]);

  const dateRange = useMemo(() => resolveDateRange(datePreset, customRange), [datePreset, customRange]);

  const salesQuery = useQuery({
    queryKey: ["sales-list", page, perPage, debouncedSearch, dateRange, advanced],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set("search", debouncedSearch);
      if (dateRange.start) qs.set("start_date", dateRange.start);
      if (dateRange.end) qs.set("end_date", dateRange.end);
      if (advanced.clientId) qs.set("client_id", advanced.clientId);
      if (advanced.userId) qs.set("user_id", advanced.userId);
      if (advanced.shiftId) qs.set("shift_id", advanced.shiftId);
      return saleService.getSales(page, qs.toString(), "", "", "", perPage);
    },
    placeholderData: keepPreviousData,
  });

  const sales = salesQuery.data?.data ?? [];
  const isInitialLoading = salesQuery.isLoading;
  const hasActiveFilters =
    debouncedSearch !== "" || datePreset !== "today" || !!advanced.clientId || !!advanced.userId || !!advanced.shiftId;
  const isEmpty = !isInitialLoading && !salesQuery.isError && sales.length === 0;

  const clearFilters = () => {
    setSearchTerm("");
    setDatePreset("today");
    setCustomRange(undefined);
    setAdvanced(EMPTY_ADVANCED);
  };

  const openSale = (id: number) => {
    setSelectedSaleId(id);
    setDrawerOpen(true);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.append("start_date", dateRange.start);
    if (dateRange.end) params.append("end_date", dateRange.end);
    if (advanced.clientId) params.append("client_id", advanced.clientId);
    if (advanced.userId) params.append("user_id", advanced.userId);
    if (advanced.shiftId) params.append("shift_id", advanced.shiftId);
    window.open(`${webUrl}/reports/sales-pdf?${params.toString()}`, "_blank");
  };

  return (
    <div dir={direction} className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("pageTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("pageSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => salesQuery.refetch()} title={tCommon("refresh")}>
              <RefreshCw className={cn("size-4", salesQuery.isFetching && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <FileDown className="size-4" />
              {t("export")}
            </Button>
            {canCreateSale && (
              <Button size="sm" onClick={() => navigate("/sales/pos")} className="gap-1.5">
                <Plus className="size-4" />
                {t("newSale")}
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="ps-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={t("clearSearch")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DATE_PRESET_KEYS) as DatePreset[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {t(DATE_PRESET_KEYS[p])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {datePreset === "custom" && (
            <DatePickerWithRange date={customRange} onDateChange={setCustomRange} buttonSize="default" />
          )}

          <Button variant="outline" size="sm" onClick={() => setAdvancedOpen(true)} className="gap-1.5">
            <SlidersHorizontal className="size-4" />
            {t("advancedFilters")}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <Filter className="size-3.5" />
              {t("clearFiltersButton")}
            </Button>
          )}

          {!isInitialLoading && !salesQuery.isError && (
            <p className="ms-auto text-xs text-muted-foreground">
              {t("salesCount", { count: salesQuery.data?.total ?? sales.length })}
            </p>
          )}
        </div>

        {/* Active filter chips */}
        {(datePreset !== "today" || advanced.clientId || advanced.userId || advanced.shiftId) && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {datePreset !== "today" && (
              <Badge variant="secondary" className="gap-1.5">
                {t(DATE_PRESET_KEYS[datePreset])}
                <button type="button" onClick={() => setDatePreset("today")} className="hover:text-destructive">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {advanced.clientId && (
              <Badge variant="secondary" className="gap-1.5">
                <User className="size-3" />
                {advanced.clientName || t("clientHash", { id: advanced.clientId })}
                <button
                  type="button"
                  onClick={() => setAdvanced((p) => ({ ...p, clientId: "", clientName: "" }))}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {advanced.userId && (
              <Badge variant="secondary" className="gap-1.5">
                {t("selectedCashierFilter")}
                <button
                  type="button"
                  onClick={() => setAdvanced((p) => ({ ...p, userId: "" }))}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {advanced.shiftId && (
              <Badge variant="secondary" className="gap-1.5">
                {t("shiftHashFilter", { id: advanced.shiftId })}
                <button
                  type="button"
                  onClick={() => setAdvanced((p) => ({ ...p, shiftId: "" }))}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Error */}
        {salesQuery.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>{t("loadErrorTitle")}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{t("loadErrorDescription")}</span>
              <Button size="sm" variant="outline" onClick={() => salesQuery.refetch()}>
                {tCommon("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading skeleton */}
        {isInitialLoading && (
          <div className="space-y-2 rounded-xl border p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="ml-auto h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Receipt className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? t("emptyDescriptionFiltered")
                  : t("emptyDescriptionNoFilter")}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  {t("clearFiltersButton")}
                </Button>
              )}
              {datePreset !== "all" && (
                <Button variant="outline" size="sm" onClick={() => setDatePreset("all")}>
                  {t("showAllDates")}
                </Button>
              )}
              {canCreateSale && (
                <Button size="sm" onClick={() => navigate("/sales/pos")} className="gap-1.5">
                  <Plus className="size-4" />
                  {t("newSale")}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {!isInitialLoading && !salesQuery.isError && !isEmpty && (
          <>
            <div className="overflow-hidden rounded-xl border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-start">{t("invoiceColumn")}</TableHead>
                      <TableHead className="text-start">{t("date")}</TableHead>
                      <TableHead className="text-start">{t("client")}</TableHead>
                      <TableHead className="text-center">{t("itemsColumn")}</TableHead>
                      <TableHead className="text-end">{t("totalColumn")}</TableHead>
                      <TableHead className="text-end">{t("paidColumn")}</TableHead>
                      <TableHead className="text-end">{t("dueColumn")}</TableHead>
                      <TableHead className="text-start">{t("paymentColumn")}</TableHead>
                      <TableHead className="text-start">{t("status")}</TableHead>
                      <TableHead className="text-start">{t("cashierColumn")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <SaleRow key={sale.id} sale={sale} onOpen={() => openSale(sale.id)} formatCurrency={formatCurrency} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {t("showingRange", {
                    from: (salesQuery.data?.from ?? 0).toLocaleString("en-US"),
                    to: (salesQuery.data?.to ?? 0).toLocaleString("en-US"),
                    total: (salesQuery.data?.total ?? 0).toLocaleString("en-US"),
                  })}
                </span>
                <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PER_PAGE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {t("perPageSuffix", { count: n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {salesQuery.data && salesQuery.data.last_page > 1 && (
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1 && !salesQuery.isFetching) setPage((p) => p - 1);
                        }}
                        className={page <= 1 || salesQuery.isFetching ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                    {getPageNumbers(page, salesQuery.data.last_page).map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`e-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => {
                              e.preventDefault();
                              if (!salesQuery.isFetching) setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (salesQuery.data && page < salesQuery.data.last_page && !salesQuery.isFetching) {
                            setPage((p) => p + 1);
                          }
                        }}
                        className={
                          (salesQuery.data && page >= salesQuery.data.last_page) || salesQuery.isFetching
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </>
        )}
      </div>

      <SaleDetailsDrawer
        saleId={selectedSaleId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onChanged={() => salesQuery.refetch()}
      />

      <SalesAdvancedFiltersSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        posMode={posMode}
        values={advanced}
        onApply={setAdvanced}
      />
    </div>
  );
};

function SaleRow({
  sale,
  onOpen,
  formatCurrency,
}: {
  sale: Sale;
  onOpen: () => void;
  formatCurrency: (v: string | number | null | undefined) => string;
}) {
  const { t } = useTranslation("sales");
  const { direction } = useLanguage();
  const status = getSaleStatus(sale);
  const total = Number(sale.total_amount ?? 0);
  const paid = Number(sale.paid_amount ?? 0);
  const due = Number(sale.due_amount ?? Math.max(0, total - paid));
  const methods = Array.from(new Set((sale.payments ?? []).map((p) => p.method)));

  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={onOpen}>
      <TableCell className="py-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="font-semibold text-primary hover:underline"
        >
          #{sale.number ?? sale.id}
        </button>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(sale.created_at).toLocaleString(direction === "rtl" ? "ar" : "en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </TableCell>
      <TableCell>
        {sale.client_id ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <User className="size-3.5 text-muted-foreground" />
            {sale.client_name ?? t("clientHash", { id: sale.client_id })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("cashClient")}</span>
        )}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">{sale.items?.length ?? 0}</TableCell>
      <TableCell className="text-end text-sm font-bold tabular-nums text-foreground">
        {formatCurrency(total)}
      </TableCell>
      <TableCell className="text-end text-sm tabular-nums text-green-600 dark:text-green-400">
        {formatCurrency(paid)}
      </TableCell>
      <TableCell className={cn("text-end text-sm tabular-nums", due > 0 ? "font-medium text-destructive" : "text-muted-foreground")}>
        {due > 0 ? formatCurrency(due) : "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {methods.length === 0
          ? "—"
          : methods.length === 1
          ? translatePaymentMethod(t, methods[0])
          : t("multiplePaymentMethods")}
      </TableCell>
      <TableCell>
        <Badge variant={status.variant}>{translateSaleStatus(t, status.kind)}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{sale.user_name ?? "—"}</TableCell>
    </TableRow>
  );
}

export default SalesListPage;
