import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import dayjs from "dayjs";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { SegmentedControl } from "@/components/settings/shared/SegmentedControl";
import { getPageNumbers } from "@/lib/pagination";

import inventoryCountService, {
  InventoryCount,
  InventoryCountFilters,
} from "@/services/inventoryCountService";
import { warehouseService } from "@/services/warehouseService";
import InventoryCountDialog from "@/components/inventory/InventoryCountDialog";
import { useLanguage } from "@/context/LanguageContext";

const PER_PAGE = 15;

type Status = InventoryCount["status"];
type StatusFilter = "" | Status;

type PendingAction = {
  type: "delete" | "approve" | "reject" | "import";
  count: InventoryCount;
};

const InventoryCountPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { direction } = useLanguage();
  const { t } = useTranslation("inventoryCount");
  const { t: tCommon } = useTranslation("common");

  const STATUS_CONFIG: Record<Status, { label: string; badge: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
    draft: { label: t("status_draft"), badge: "secondary" },
    in_progress: { label: t("status_in_progress"), badge: "info" },
    completed: { label: t("status_completed"), badge: "warning" },
    approved: { label: t("status_approved"), badge: "success" },
    rejected: { label: t("status_rejected"), badge: "destructive" },
  };

  const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "", label: tCommon("all") },
    { value: "draft", label: STATUS_CONFIG.draft.label },
    { value: "in_progress", label: STATUS_CONFIG.in_progress.label },
    { value: "completed", label: STATUS_CONFIG.completed.label },
    { value: "approved", label: STATUS_CONFIG.approved.label },
    { value: "rejected", label: STATUS_CONFIG.rejected.label },
  ];

  const ACTION_COPY: Record<
    PendingAction["type"],
    { title: (c: InventoryCount) => string; description: string; confirmLabel: string; variant: "default" | "destructive" }
  > = {
    delete: {
      title: (c) => t("deleteTitle", { id: c.id }),
      description: t("deleteDescription"),
      confirmLabel: t("deleteConfirmLabel"),
      variant: "destructive",
    },
    approve: {
      title: (c) => t("approveTitle", { id: c.id }),
      description: t("approveDescription"),
      confirmLabel: t("approveConfirmLabel"),
      variant: "default",
    },
    reject: {
      title: (c) => t("rejectTitle", { id: c.id }),
      description: t("rejectDescription"),
      confirmLabel: t("rejectConfirmLabel"),
      variant: "destructive",
    },
    import: {
      title: (c) => t("importTitle", { id: c.id }),
      description: t("importDescription"),
      confirmLabel: t("importConfirmLabel"),
      variant: "default",
    },
  };

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [warehouseId, setWarehouseId] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCount, setEditingCount] = useState<InventoryCount | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, warehouseId, startDate, endDate]);

  const filters: InventoryCountFilters = {
    search: debouncedSearch || undefined,
    status: status || undefined,
    warehouse_id: warehouseId !== "all" ? Number(warehouseId) : undefined,
    start_date: startDate,
    end_date: endDate,
  };

  const countsQuery = useQuery({
    queryKey: ["inventory-counts", page, PER_PAGE, filters],
    queryFn: () =>
      inventoryCountService.getInventoryCounts({ ...filters, page, per_page: PER_PAGE }),
    placeholderData: (prev) => prev,
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => warehouseService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const invalidateCounts = () => queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryCountService.deleteInventoryCount(id),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      setPendingAction(null);
      invalidateCounts();
    },
    onError: (error) => toast.error(t("deleteFailed"), { description: inventoryCountService.getErrorMessage(error) }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => inventoryCountService.approveCount(id),
    onSuccess: () => {
      toast.success(t("approveSuccess"));
      setPendingAction(null);
      invalidateCounts();
    },
    onError: (error) => toast.error(t("approveFailed"), { description: inventoryCountService.getErrorMessage(error) }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => inventoryCountService.rejectCount(id),
    onSuccess: () => {
      toast.success(t("rejectSuccess"));
      setPendingAction(null);
      invalidateCounts();
    },
    onError: (error) => toast.error(t("rejectFailed"), { description: inventoryCountService.getErrorMessage(error) }),
  });

  const importAllProductsMutation = useMutation({
    mutationFn: (id: number) => inventoryCountService.importAllProducts(id),
    onSuccess: (data) => {
      toast.success(data.message);
      setPendingAction(null);
      invalidateCounts();
    },
    onError: (error) => toast.error(t("importFailed"), { description: inventoryCountService.getErrorMessage(error) }),
  });

  const isActing =
    deleteMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    importAllProductsMutation.isPending;

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    const { type, count } = pendingAction;
    if (type === "delete") deleteMutation.mutate(count.id);
    else if (type === "approve") approveMutation.mutate(count.id);
    else if (type === "reject") rejectMutation.mutate(count.id);
    else importAllProductsMutation.mutate(count.id);
  };

  const openCreateDialog = () => {
    setEditingCount(null);
    setDialogOpen(true);
  };
  const openEditDialog = (count: InventoryCount) => {
    setEditingCount(count);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCount(null);
  };

  const counts = countsQuery.data?.data ?? [];
  const hasActiveFilters =
    debouncedSearch.trim() !== "" || status !== "" || warehouseId !== "all" || !!dateRange?.from;
  const clearFilters = () => {
    setSearchTerm("");
    setStatus("");
    setWarehouseId("all");
    setDateRange(undefined);
  };

  const isInitialLoading = countsQuery.isLoading;
  const isEmpty = !isInitialLoading && !countsQuery.isError && counts.length === 0;

  const actionCopy = pendingAction ? ACTION_COPY[pendingAction.type] : null;

  return (
    <div dir={direction} className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("pageTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pageSubtitle")}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            {t("newCountButton")}
          </Button>
        </div>

        {/* Status filter */}
        <div className="mb-4 overflow-x-auto">
          <SegmentedControl value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchByNotesPlaceholder")}
              className="ps-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={t("clearSearchAria")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("allWarehouses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allWarehouses")}</SelectItem>
              {(warehousesQuery.data ?? []).map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} buttonSize="default" />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
              <X className="size-3.5" />
              {t("clearFiltersButton")}
            </Button>
          )}

          {!isInitialLoading && !countsQuery.isError && (
            <p className="ms-auto text-xs text-muted-foreground">
              {t("countOperationsLabel", { count: countsQuery.data?.total ?? counts.length })}
            </p>
          )}
        </div>

        {/* Error state */}
        {countsQuery.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>{t("loadErrorTitle")}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{inventoryCountService.getErrorMessage(countsQuery.error)}</span>
              <Button size="sm" variant="outline" onClick={() => countsQuery.refetch()}>
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
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-8 w-24 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <ClipboardList className="size-10 text-muted-foreground" />
            {hasActiveFilters ? (
              <div>
                <p className="font-medium text-foreground">{t("noResultsMatchFilters")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("tryAdjustingFilters")}
                </p>
                <Button variant="link" size="sm" onClick={clearFilters}>
                  {t("clearFiltersButton")}
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-medium text-foreground">{t("noCountsYet")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("startFirstCountHint")}
                </p>
              </div>
            )}
            {!hasActiveFilters && (
              <Button onClick={openCreateDialog} className="mt-2 gap-2">
                <Plus className="size-4" />
                {t("createFirstCountButton")}
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        {!isInitialLoading && !countsQuery.isError && !isEmpty && (
          <>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start">{t("dateColumn")}</TableHead>
                    <TableHead className="text-start">{t("warehouseColumn")}</TableHead>
                    <TableHead className="text-start">{t("statusColumn")}</TableHead>
                    <TableHead className="text-start">{t("userColumn")}</TableHead>
                    <TableHead className="text-center">{t("productsColumn")}</TableHead>
                    <TableHead className="text-start">{t("notesColumn")}</TableHead>
                    <TableHead className="w-40">
                      <span className="sr-only">{t("actionsColumn")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {counts.map((count) => {
                    const statusInfo = STATUS_CONFIG[count.status];
                    const hasSecondaryActions = count.status === "draft" || count.status === "in_progress";

                    return (
                      <TableRow
                        key={count.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/inventory/counts/${count.id}`)}
                      >
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {dayjs(count.count_date).format("YYYY-MM-DD")}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          {count.warehouse?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.badge}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {count.user?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{count.items_count ?? 0}</Badge>
                        </TableCell>
                        <TableCell className="max-w-48 text-sm text-muted-foreground">
                          {count.notes ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate">{count.notes}</span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-64 border bg-popover text-popover-foreground shadow-md [&>span]:hidden"
                              >
                                {count.notes}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => navigate(`/inventory/counts/${count.id}`)}
                                >
                                  <Eye className="size-4" />
                                  <span className="sr-only">{t("viewDetailsButton")}</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("viewDetailsButton")}</TooltipContent>
                            </Tooltip>

                            {count.status === "completed" && (
                              <>
                                <Button
                                  size="xs"
                                  variant="success"
                                  className="gap-1"
                                  onClick={() => setPendingAction({ type: "approve", count })}
                                >
                                  <Check className="size-3.5" />
                                  {t("approveButton")}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="gap-1 text-destructive hover:text-destructive"
                                  onClick={() => setPendingAction({ type: "reject", count })}
                                >
                                  <X className="size-3.5" />
                                  {t("rejectButton")}
                                </Button>
                              </>
                            )}

                            {hasSecondaryActions && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreHorizontal className="size-4" />
                                    <span className="sr-only">{t("actionsColumn")}</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {count.status === "draft" && (
                                    <DropdownMenuItem onSelect={() => openEditDialog(count)}>
                                      <Pencil className="size-4" />
                                      {tCommon("edit")}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onSelect={() => setPendingAction({ type: "import", count })}
                                  >
                                    <Upload className="size-4" />
                                    {t("importAllProductsMenuItem")}
                                  </DropdownMenuItem>
                                  {count.status === "draft" && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onSelect={() => setPendingAction({ type: "delete", count })}
                                    >
                                      <Trash2 className="size-4" />
                                      {tCommon("delete")}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                            {direction === "rtl" ? (
                              <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {countsQuery.data && countsQuery.data.last_page > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1 && !countsQuery.isFetching) setPage((p) => p - 1);
                      }}
                      className={
                        page <= 1 || countsQuery.isFetching ? "pointer-events-none opacity-50" : undefined
                      }
                    />
                  </PaginationItem>
                  {getPageNumbers(page, countsQuery.data.last_page).map((p, i) =>
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
                            if (!countsQuery.isFetching) setPage(p);
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
                          countsQuery.data &&
                          page < countsQuery.data.last_page &&
                          !countsQuery.isFetching
                        ) {
                          setPage((p) => p + 1);
                        }
                      }}
                      className={
                        (countsQuery.data && page >= countsQuery.data.last_page) ||
                        countsQuery.isFetching
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

      {/* Create / edit dialog */}
      <InventoryCountDialog
        open={dialogOpen}
        onClose={closeDialog}
        count={editingCount}
        onSuccess={() => {
          closeDialog();
          invalidateCounts();
        }}
      />

      {/* Action confirmation */}
      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open && !isActing) setPendingAction(null);
        }}
      >
        <AlertDialogContent dir={direction}>
          {pendingAction && actionCopy && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{actionCopy.title(pendingAction.count)}</AlertDialogTitle>
                <AlertDialogDescription>{actionCopy.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isActing}
                  onClick={() => setPendingAction(null)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  type="button"
                  variant={actionCopy.variant}
                  disabled={isActing}
                  onClick={confirmPendingAction}
                  className="gap-2"
                >
                  {isActing && <Loader2 className="size-4 animate-spin" />}
                  {actionCopy.confirmLabel}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryCountPage;
