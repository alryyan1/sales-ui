// src/components/inventory/StockAdjustmentsListPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { getPageNumbers } from "@/lib/pagination";

// Icons
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  X,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  PackageSearch,
} from "lucide-react";

// Services and Types
import stockAdjustmentService, {
  StockAdjustment,
} from "../../services/stockAdjustmentService";
import { formatNumber } from "@/constants";
import { ProductImage } from "@/components/products/ProductImage";
import StockAdjustmentFormModal from "./StockAdjustmentFormModal";
import { warehouseService } from "../../services/warehouseService";

const ALL_WAREHOUSES = "all";
const PER_PAGE = 15;

const REASON_STYLES: Record<string, string> = {
  damage:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
  theft:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
  loss: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900",
  expiry:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  adjustment:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
  correction:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900",
  other:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
};

// --- Component ---
const StockAdjustmentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation("inventory");
  const { t: tCommon } = useTranslation("common");

  const getReasonLabel = (reason: string): string => {
    const reasonMap: Record<string, string> = {
      damage: t("reasonDamage"),
      expiry: t("reasonExpiry"),
      theft: t("reasonTheft"),
      loss: t("reasonLoss"),
      adjustment: t("reasonAdjustment"),
      correction: t("reasonCorrection"),
      other: t("reasonOtherShort"),
    };
    return reasonMap[reason] || reason;
  };

  // --- State ---
  const [open, setOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] =
    useState<string>(ALL_WAREHOUSES);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    undefined
  );

  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;

  // --- Data Fetching ---
  const warehousesQuery = useQuery({
    queryKey: ["warehouses-all"],
    queryFn: () => warehouseService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const adjustmentsQuery = useQuery({
    queryKey: [
      "stock-adjustments",
      currentPage,
      selectedWarehouseId,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      stockAdjustmentService.getAdjustments(
        currentPage,
        PER_PAGE,
        null,
        null,
        dateFrom,
        dateTo,
        selectedWarehouseId !== ALL_WAREHOUSES
          ? Number(selectedWarehouseId)
          : null
      ),
    placeholderData: (prev) => prev,
  });

  const adjustments: StockAdjustment[] = adjustmentsQuery.data?.data ?? [];
  const totalPages = adjustmentsQuery.data?.last_page ?? 1;

  const pageIncrease = useMemo(
    () =>
      adjustments
        .filter((a) => a.quantity_change > 0)
        .reduce((sum, a) => sum + a.quantity_change, 0),
    [adjustments]
  );
  const pageDecrease = useMemo(
    () =>
      adjustments
        .filter((a) => a.quantity_change < 0)
        .reduce((sum, a) => sum + a.quantity_change, 0),
    [adjustments]
  );

  const hasActiveFilters =
    selectedWarehouseId !== ALL_WAREHOUSES || !!dateRange?.from;

  const clearFilters = () => {
    setSelectedWarehouseId(ALL_WAREHOUSES);
    setDateRange(undefined);
  };

  // --- Handlers ---
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    setSearchParams(params);
  };

  const handleWarehouseChange = (value: string) => {
    setSelectedWarehouseId(value);
    goToPage(1);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    goToPage(1);
  };

  const isInitialLoading = adjustmentsQuery.isLoading;
  const isEmpty =
    !isInitialLoading && !adjustmentsQuery.isError && adjustments.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 size-8 shrink-0"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t("adjustmentsHistoryTitle")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("adjustmentsPageSubtitle")}
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="size-4" />
            {t("addAdjustmentButton")}
          </Button>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <ClipboardList className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("totalAdjustmentsLabel")}
              </p>
              <p className="text-lg font-semibold leading-tight">
                {formatNumber(adjustmentsQuery.data?.total ?? adjustments.length)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/40">
              <TrendingUp className="size-5 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("stockIncreasesLabel")}
              </p>
              <p className="text-lg font-semibold leading-tight text-green-600 dark:text-green-500">
                +{formatNumber(pageIncrease)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
              <TrendingDown className="size-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("stockDecreasesLabel")}
              </p>
              <p className="text-lg font-semibold leading-tight text-red-600 dark:text-red-500">
                {formatNumber(pageDecrease)}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <Select
            value={selectedWarehouseId}
            onValueChange={handleWarehouseChange}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("warehouseLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_WAREHOUSES}>{tCommon("all")}</SelectItem>
              {(warehousesQuery.data ?? []).map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePickerWithRange
            date={dateRange}
            onDateChange={handleDateRangeChange}
            buttonSize="default"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5"
            >
              <X className="size-3.5" />
              {tCommon("clear")}
            </Button>
          )}
        </div>

        {/* Error state */}
        {adjustmentsQuery.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>{tCommon("error")}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>
                {stockAdjustmentService.getErrorMessage(
                  adjustmentsQuery.error
                )}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => adjustmentsQuery.refetch()}
              >
                {tCommon("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading skeleton */}
        {isInitialLoading && (
          <div className="space-y-2 rounded-xl border p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="size-9 rounded-md" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <PackageSearch className="size-10 text-muted-foreground" />
            {hasActiveFilters ? (
              <div>
                <p className="font-medium text-foreground">
                  {t("noAdjustmentsRecorded")}
                </p>
                <Button variant="link" size="sm" onClick={clearFilters}>
                  {tCommon("clear")}
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-medium text-foreground">
                  {t("noAdjustmentsRecorded")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* List */}
        {!isInitialLoading && !adjustmentsQuery.isError && !isEmpty && (
          <>
            <div className="overflow-hidden rounded-xl border divide-y">
              {adjustments.map((adj) => {
                const isIncrease = adj.quantity_change > 0;
                return (
                  <div
                    key={adj.id}
                    className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <ProductImage
                      imageUrl={adj.product?.image_url}
                      productName={adj.product?.name}
                      size={40}
                    />

                    <div className="min-w-[160px] flex-1">
                      <p className="font-medium text-sm text-foreground">
                        {adj.product?.name ?? `ID: ${adj.product_id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {adj.product?.sku ?? "—"} ·{" "}
                        {adj.warehouse?.name ?? "-"}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={REASON_STYLES[adj.reason] ?? REASON_STYLES.other}
                    >
                      {getReasonLabel(adj.reason)}
                    </Badge>

                    <div className="hidden text-xs text-muted-foreground sm:flex sm:flex-col sm:items-end sm:w-28">
                      <span>{formatNumber(adj.quantity_before)} → {formatNumber(adj.quantity_after)}</span>
                      <span>
                        {adj.purchaseItemBatch?.batch_number ??
                          (adj.purchase_item_id
                            ? `#${adj.purchase_item_id}`
                            : t("totalStockAdjustmentFallback"))}
                      </span>
                    </div>

                    <div
                      className={
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums " +
                        (isIncrease
                          ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400")
                      }
                    >
                      {isIncrease ? (
                        <TrendingUp className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
                      {isIncrease ? "+" : ""}
                      {formatNumber(adj.quantity_change)}
                    </div>

                    <div className="w-32 text-end text-xs text-muted-foreground">
                      <p>{format(new Date(adj.created_at), "yyyy-MM-dd")}</p>
                      <p>{adj.user?.name ?? "-"}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1 && !adjustmentsQuery.isFetching)
                          goToPage(currentPage - 1);
                      }}
                      className={
                        currentPage <= 1 || adjustmentsQuery.isFetching
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                  {getPageNumbers(currentPage, totalPages).map((p, i) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`e-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            if (!adjustmentsQuery.isFetching) goToPage(p);
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
                        if (
                          currentPage < totalPages &&
                          !adjustmentsQuery.isFetching
                        )
                          goToPage(currentPage + 1);
                      }}
                      className={
                        currentPage >= totalPages || adjustmentsQuery.isFetching
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>

      <StockAdjustmentFormModal
        onSaveSuccess={() => {
          toast.success(t("adjustmentSavedSuccess"));
          adjustmentsQuery.refetch();
        }}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
};

export default StockAdjustmentsListPage;
