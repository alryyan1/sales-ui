// src/pages/SuppliersPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  CloudUpload,
  FileDown,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import { getPageNumbers } from "@/lib/pagination";
import { formatNumber } from "@/constants";

import supplierService, { Supplier, SupplierSummary } from "@/services/supplierService";
import { useSettings } from "@/context/SettingsContext";
import exportService from "@/services/exportService";
import { uploadSuppliersToFirestore } from "@/services/firebaseStore";
import apiClient from "@/lib/axios";
import SupplierFormModal from "@/components/suppliers/SupplierFormModal";

const PER_PAGE_LABEL = "مورد";

function balanceTone(balance: number) {
  if (balance > 0) return "text-destructive";
  if (balance < 0) return "text-green-600 dark:text-green-400";
  return "text-muted-foreground";
}

const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getSetting } = useSettings();

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [detailsSupplier, setDetailsSupplier] = useState<Supplier | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", page, debouncedSearch],
    queryFn: () => supplierService.getSuppliers(page, debouncedSearch),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: ["suppliers-summary"],
    queryFn: () => supplierService.getSuppliersSummary(),
  });

  const summaryMap = useMemo(() => {
    const map = new Map<number, SupplierSummary>();
    summaryQuery.data?.forEach((s) => map.set(s.id, s));
    return map;
  }, [summaryQuery.data]);

  const overallTotals = useMemo(() => {
    if (!summaryQuery.data) return { debit: 0, credit: 0, balance: 0 };
    return summaryQuery.data.reduce(
      (acc, s) => ({
        debit: acc.debit + s.total_debit,
        credit: acc.credit + s.total_credit,
        balance: acc.balance + s.balance,
      }),
      { debit: 0, credit: 0, balance: 0 }
    );
  }, [summaryQuery.data]);

  const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;

  const handleSyncToFirebase = async () => {
    setIsSyncing(true);
    try {
      const allSuppliers: Supplier[] = [];
      let fetchPage = 1;
      let lastPage = 1;
      do {
        const res = await apiClient.get<{ data: Supplier[]; last_page: number }>(
          `/suppliers?page=${fetchPage}&per_page=500`
        );
        allSuppliers.push(...res.data.data);
        lastPage = res.data.last_page;
        fetchPage++;
      } while (fetchPage <= lastPage);

      const suppliersWithFinancials = allSuppliers.map((s) => ({
        ...s,
        total_debit: summaryMap.get(s.id)?.total_debit ?? null,
        total_credit: summaryMap.get(s.id)?.total_credit ?? null,
        balance: summaryMap.get(s.id)?.balance ?? null,
      }));

      await uploadSuppliersToFirestore(suppliersWithFinancials, firebaseCollectionName);
      toast.success(`تم رفع ${allSuppliers.length} مورد إلى Firebase`);
    } catch {
      toast.error("فشل رفع الموردين إلى Firebase");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfLoading(true);
    try {
      await exportService.exportSuppliersSummaryPdf();
    } finally {
      setIsPdfLoading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.deleteSupplier(id),
    onSuccess: () => {
      toast.success("تم حذف المورد بنجاح");
      const isLastRowOnPage = suppliersQuery.data?.data.length === 1 && page > 1;
      setSupplierToDelete(null);
      if (isLastRowOnPage) {
        setPage((p) => p - 1);
      } else {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      }
    },
    onError: (err) => {
      toast.error("تعذر حذف المورد", { description: supplierService.getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };
  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };
  const handleSaveSuccess = () => {
    closeModal();
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
  };
  const confirmDelete = () => {
    if (supplierToDelete) deleteMutation.mutate(supplierToDelete.id);
  };

  const suppliers = suppliersQuery.data?.data ?? [];
  const isInitialLoading = suppliersQuery.isLoading;
  const isEmpty = !isInitialLoading && !suppliersQuery.isError && suppliers.length === 0;

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">الموردون</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              إدارة بيانات الموردين ومتابعة أرصدتهم وكشوف حساباتهم
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="size-4" />
              مورد جديد
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">إجراءات إضافية</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  disabled={isPdfLoading || summaryQuery.isLoading || !summaryQuery.data}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleDownloadPdf();
                  }}
                >
                  {isPdfLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileDown className="size-4" />
                  )}
                  تصدير كشف الموردين PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isSyncing}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleSyncToFirebase();
                  }}
                >
                  {isSyncing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CloudUpload className="size-4" />
                  )}
                  رفع إلى Firebase
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Financial summary */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TrendingUp className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">إجمالي المدين (مشتريات)</p>
              {summaryQuery.isLoading ? (
                <Skeleton className="mt-1 h-5 w-24" />
              ) : (
                <p className="text-base font-semibold text-destructive tabular-nums">
                  {formatNumber(overallTotals.debit)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
              <TrendingDown className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">إجمالي الدائن (مدفوعات)</p>
              {summaryQuery.isLoading ? (
                <Skeleton className="mt-1 h-5 w-24" />
              ) : (
                <p className="text-base font-semibold text-green-600 tabular-nums dark:text-green-400">
                  {formatNumber(overallTotals.credit)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wallet className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">صافي الرصيد المستحق</p>
              {summaryQuery.isLoading ? (
                <Skeleton className="mt-1 h-5 w-24" />
              ) : (
                <p className={cn("text-base font-semibold tabular-nums", balanceTone(overallTotals.balance))}>
                  {formatNumber(overallTotals.balance)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، البريد أو الهاتف..."
              className="pr-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="مسح البحث"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {!isInitialLoading && !suppliersQuery.isError && (
            <p className="ms-auto text-xs text-muted-foreground">
              {suppliersQuery.data?.total ?? suppliers.length} {PER_PAGE_LABEL}
            </p>
          )}
        </div>

        {/* Error state */}
        {suppliersQuery.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>تعذر تحميل الموردين</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{supplierService.getErrorMessage(suppliersQuery.error)}</span>
              <Button size="sm" variant="outline" onClick={() => suppliersQuery.refetch()}>
                إعادة المحاولة
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading skeleton */}
        {isInitialLoading && (
          <div className="space-y-2 rounded-xl border p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Building2 className="size-10 text-muted-foreground" />
            {debouncedSearch ? (
              <div>
                <p className="font-medium text-foreground">لا توجد نتائج مطابقة لـ "{debouncedSearch}"</p>
                <Button variant="link" size="sm" onClick={() => setSearchTerm("")}>
                  مسح البحث
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-medium text-foreground">لا يوجد موردون بعد</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  أضف أول مورد لبدء تسجيل المشتريات والمدفوعات
                </p>
              </div>
            )}
            {!debouncedSearch && (
              <Button onClick={openCreateModal} className="mt-2 gap-2">
                <Plus className="size-4" />
                إضافة أول مورد
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        {!isInitialLoading && !suppliersQuery.isError && !isEmpty && (
          <>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start">المورد</TableHead>
                    <TableHead className="text-start">معلومات الاتصال</TableHead>
                    <TableHead className="text-end">المدين</TableHead>
                    <TableHead className="text-end">الدائن</TableHead>
                    <TableHead className="text-end">الرصيد</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">إجراءات</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => {
                    const summary = summaryMap.get(supplier.id);
                    const balance = summary?.balance ?? 0;
                    return (
                      <TableRow
                        key={supplier.id}
                        className={cn(
                          "cursor-pointer",
                          supplier.is_client && "bg-primary/5 hover:bg-primary/10"
                        )}
                        onClick={() => setDetailsSupplier(supplier)}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{supplier.name}</span>
                            {supplier.is_client && <Badge variant="secondary">عميل</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {supplier.phone && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="size-3 text-green-600 dark:text-green-400" />
                                <span dir="ltr">{supplier.phone}</span>
                              </span>
                            )}
                            {supplier.email && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="size-3 text-primary" />
                                <span className="max-w-[180px] truncate">{supplier.email}</span>
                              </span>
                            )}
                            {!supplier.phone && !supplier.email && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-end text-sm text-destructive tabular-nums">
                          {summaryQuery.isLoading ? (
                            <Skeleton className="ms-auto h-3.5 w-16" />
                          ) : (
                            formatNumber(summary?.total_debit ?? 0, 2)
                          )}
                        </TableCell>
                        <TableCell className="text-end text-sm text-green-600 tabular-nums dark:text-green-400">
                          {summaryQuery.isLoading ? (
                            <Skeleton className="ms-auto h-3.5 w-16" />
                          ) : (
                            formatNumber(summary?.total_credit ?? 0, 2)
                          )}
                        </TableCell>
                        <TableCell className={cn("text-end text-sm font-semibold tabular-nums", balanceTone(balance))}>
                          {summaryQuery.isLoading ? (
                            <Skeleton className="ms-auto h-3.5 w-16" />
                          ) : (
                            formatNumber(balance, 2)
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                  <span className="sr-only">إجراءات</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onSelect={() => navigate(`/suppliers/${supplier.id}/ledger`)}
                                >
                                  <FileText className="size-4" />
                                  كشف الحساب
                                </DropdownMenuItem>
                                {supplier.is_client && supplier.client_id && (
                                  <DropdownMenuItem
                                    onSelect={() => navigate(`/clients/${supplier.client_id}/ledger`)}
                                  >
                                    <ShoppingCart className="size-4" />
                                    كشف مبيعاته
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => openEditModal(supplier)}>
                                  <Pencil className="size-4" />
                                  تعديل
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => setSupplierToDelete(supplier)}
                                >
                                  <Trash2 className="size-4" />
                                  حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {suppliersQuery.data && suppliersQuery.data.last_page > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1 && !suppliersQuery.isFetching) setPage((p) => p - 1);
                      }}
                      className={
                        page <= 1 || suppliersQuery.isFetching
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                  {getPageNumbers(page, suppliersQuery.data.last_page).map((p, i) =>
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
                            if (!suppliersQuery.isFetching) setPage(p);
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
                          suppliersQuery.data &&
                          page < suppliersQuery.data.last_page &&
                          !suppliersQuery.isFetching
                        ) {
                          setPage((p) => p + 1);
                        }
                      }}
                      className={
                        (suppliersQuery.data && page >= suppliersQuery.data.last_page) ||
                        suppliersQuery.isFetching
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

      {/* Create / edit supplier */}
      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        supplierToEdit={editingSupplier}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Quick-view details */}
      <Dialog open={!!detailsSupplier} onOpenChange={(open) => !open && setDetailsSupplier(null)}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          {detailsSupplier && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Building2 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{detailsSupplier.name}</DialogTitle>
                    <DialogDescription>بيانات المورد</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-destructive/5 px-3 py-2 text-center">
                  <p className="text-[11px] text-muted-foreground">المدين</p>
                  <p className="text-xs font-bold text-destructive tabular-nums">
                    {formatNumber(summaryMap.get(detailsSupplier.id)?.total_debit ?? 0, 2)}
                  </p>
                </div>
                <div className="rounded-lg border bg-green-500/5 px-3 py-2 text-center">
                  <p className="text-[11px] text-muted-foreground">الدائن</p>
                  <p className="text-xs font-bold text-green-600 tabular-nums dark:text-green-400">
                    {formatNumber(summaryMap.get(detailsSupplier.id)?.total_credit ?? 0, 2)}
                  </p>
                </div>
                <div className="rounded-lg border bg-primary/5 px-3 py-2 text-center">
                  <p className="text-[11px] text-muted-foreground">الرصيد</p>
                  <p
                    className={cn(
                      "text-xs font-bold tabular-nums",
                      balanceTone(summaryMap.get(detailsSupplier.id)?.balance ?? 0)
                    )}
                  >
                    {formatNumber(summaryMap.get(detailsSupplier.id)?.balance ?? 0, 2)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {detailsSupplier.contact_person && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <User className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">المسؤول</p>
                      <p className="text-xs font-medium text-foreground">{detailsSupplier.contact_person}</p>
                    </div>
                  </div>
                )}
                {detailsSupplier.phone && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <Phone className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">الهاتف</p>
                      <p className="text-xs font-medium text-foreground" dir="ltr">{detailsSupplier.phone}</p>
                    </div>
                  </div>
                )}
                {detailsSupplier.email && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <Mail className="size-3.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">البريد الإلكتروني</p>
                      <p className="truncate text-xs font-medium text-foreground">{detailsSupplier.email}</p>
                    </div>
                  </div>
                )}
                {detailsSupplier.address && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">العنوان</p>
                      <p className="text-xs font-medium text-foreground">{detailsSupplier.address}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t pt-4">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    navigate(`/suppliers/${detailsSupplier.id}/ledger`);
                    setDetailsSupplier(null);
                  }}
                >
                  <FileText className="size-3.5" />
                  كشف الحساب
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    openEditModal(detailsSupplier);
                    setDetailsSupplier(null);
                  }}
                >
                  <Pencil className="size-3.5" />
                  تعديل
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!supplierToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setSupplierToDelete(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المورد "{supplierToDelete?.name}"؟</AlertDialogTitle>
            <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setSupplierToDelete(null)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
              className="gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              حذف نهائي
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuppliersPage;
