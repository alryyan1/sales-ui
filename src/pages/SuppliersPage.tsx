// src/pages/SuppliersPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  RefreshCw,
  User,
  MapPin,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileDown,
  CloudUpload,
  ShoppingCart,
} from "lucide-react";

import supplierService, { Supplier, SupplierSummary } from "../services/supplierService";
import { useSettings } from "@/context/SettingsContext";
import { uploadSuppliersToFirestore } from "../services/firebaseStore";
import apiClient from "../lib/axios";
import { SupplierSummaryLedgerPdf } from "@/components/reports/suppliers/SupplierSummaryLedgerPdf";
import { downloadPdf } from "@/utils/pdfDownload";
import { registerPdfFonts } from "@/utils/pdfFontRegistry";
import SupplierFormModal from "../components/suppliers/SupplierFormModal";
import ConfirmationDialog from "../components/common/ConfirmationDialog";
import { formatNumber } from "@/constants";

const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings, getSetting } = useSettings();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSupplierDetails, setSelectedSupplierDetails] = useState<Supplier | null>(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const { data: suppliersResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["suppliers", currentPage, debouncedSearchTerm],
    queryFn: () => supplierService.getSuppliers(currentPage, debouncedSearchTerm),
    placeholderData: keepPreviousData,
  });

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["suppliers-summary"],
    queryFn: () => supplierService.getSuppliersSummary(),
  });

  const summaryMap = React.useMemo(() => {
    const map = new Map<number, SupplierSummary>();
    summaryData?.forEach((s) => map.set(s.id, s));
    return map;
  }, [summaryData]);

  const overallTotals = React.useMemo(() => {
    if (!summaryData) return { debit: 0, credit: 0, balance: 0 };
    return summaryData.reduce(
      (acc, s) => ({ debit: acc.debit + s.total_debit, credit: acc.credit + s.total_credit, balance: acc.balance + s.balance }),
      { debit: 0, credit: 0, balance: 0 }
    );
  }, [summaryData]);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToFirebase = async () => {
    setIsSyncing(true);
    try {
      // Fetch all suppliers by looping pages
      const allSuppliers: Supplier[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const res = await apiClient.get<{ data: Supplier[]; last_page: number }>(
          `/suppliers?page=${page}&per_page=500`,
        );
        allSuppliers.push(...res.data.data);
        lastPage = res.data.last_page;
        page++;
      } while (page <= lastPage);

      // Merge financial summary (already loaded) into each supplier
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

  const [isPdfLoading, setIsPdfLoading] = React.useState(false);
  const handleDownloadPdf = async () => {
    if (!summaryData) return;
    setIsPdfLoading(true);
    try {
      registerPdfFonts();
      await downloadPdf(
        <SupplierSummaryLedgerPdf suppliers={summaryData} settings={settings} />,
        `suppliers-summary-${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } finally {
      setIsPdfLoading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: supplierService.deleteSupplier,
    onSuccess: () => {
      toast.success("تم حذف المورد بنجاح");
      setDeleteConfirmation({ isOpen: false, id: null });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (suppliersResponse && suppliersResponse.data.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    },
    onError: (err: any) => {
      toast.error(supplierService.getErrorMessage(err));
      setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const handleOpenModal = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingSupplier(null), 150);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  };

  const handleRowClick = (supplier: Supplier) => {
    setSelectedSupplierDetails(supplier);
    setDetailsOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.id) deleteMutation.mutate(deleteConfirmation.id);
  };

  const suppliers = suppliersResponse?.data ?? [];
  const totalPages = suppliersResponse?.last_page ?? 1;

  return (
    <div className="min-h-screen bg-slate-50/50" dir="rtl">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">الموردون</h1>
              <p className="text-xs text-slate-500 mt-0.5">إدارة الموردين والمشتريات</p>
            </div>
            {suppliersResponse && (
              <Badge variant="secondary" className="text-xs font-normal">
                {suppliersResponse.total ?? suppliers.length}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="بحث بالاسم، البريد أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8 h-8 text-sm border-slate-200 focus-visible:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              onClick={handleDownloadPdf}
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-slate-200"
              disabled={isPdfLoading || isSummaryLoading || !summaryData}
            >
              <FileDown className="h-4 w-4" />
              {isPdfLoading ? "جاري التصدير..." : "تصدير PDF"}
            </Button>
            <Button
              onClick={handleSyncToFirebase}
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
              )}
              {isSyncing ? "جاري الرفع..." : "رفع إلى Firebase"}
            </Button>
            <Button
              onClick={() => handleOpenModal()}
              size="sm"
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Plus className="h-4 w-4" />
              مورد جديد
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-3 bg-white border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg justify-center px-4 py-2.5">
            <div>
              <p className="text-[11px] text-red-500 font-medium">إجمالي المدين</p>
              {isSummaryLoading ? (
                <Skeleton className="h-4 w-24 mt-0.5" />
              ) : (
                <p className="text-sm font-semibold text-red-700">{formatNumber(overallTotals.debit)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center bg-emerald-50 border border-emerald-100 rounded-lg justify-center px-4 py-2.5 gap-3">
            <div>
              <p className="text-[11px] text-emerald-500 font-medium">إجمالي الدائن</p>
              {isSummaryLoading ? (
                <Skeleton className="h-4 w-24 mt-0.5" />
              ) : (
                <p className="text-sm font-semibold text-emerald-700">{formatNumber(overallTotals.credit)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
            <div>
              <p className="text-[11px] text-blue-500 font-medium">صافي الرصيد</p>
              {isSummaryLoading ? (
                <Skeleton className="h-4 w-24 mt-0.5" />
              ) : (
                <p className={`text-sm font-semibold ${overallTotals.balance > 0 ? "text-red-700" : overallTotals.balance < 0 ? "text-emerald-700" : "text-blue-700"}`}>
                  {formatNumber(overallTotals.balance)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="p-4">
        {/* Error State */}
        {isError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="flex-1">{supplierService.getErrorMessage(error)}</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2 text-red-600 hover:bg-red-100">
              <RefreshCw className="h-3.5 w-3.5 ml-1" />
              إعادة
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-9 px-4">المورد</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600 h-9 px-4">معلومات الاتصال</TableHead>
                <TableHead className="text-right text-xs font-semibold text-red-500 h-9 px-4">المدين</TableHead>
                <TableHead className="text-right text-xs font-semibold text-emerald-600 h-9 px-4">الدائن</TableHead>
                <TableHead className="text-right text-xs font-semibold text-blue-600 h-9 px-4">الرصيد</TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-600 h-9 px-4 w-12">⋯</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-slate-100">
                    <TableCell className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-7 rounded-md flex-shrink-0" />
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-2.5 w-16" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-24" /></TableCell>
                    <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-32" /></TableCell>
                    <TableCell className="px-4 py-2.5 hidden md:table-cell"><Skeleton className="h-3 w-28" /></TableCell>
                    <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell className="px-4 py-2.5"><Skeleton className="h-6 w-6 rounded mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !isError && suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Building2 className="h-8 w-8" />
                      <p className="text-sm font-medium text-slate-500">لا يوجد موردين</p>
                      {debouncedSearchTerm && (
                        <p className="text-xs">لا توجد نتائج لـ "{debouncedSearchTerm}"</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className={`cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${supplier.is_client ? "bg-blue-50/40 hover:bg-blue-50/70" : "hover:bg-blue-50/30"}`}
                    onClick={() => handleRowClick(supplier)}
                  >
                    <TableCell className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium leading-tight">{supplier.name}</p>
                            {supplier.is_client && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 ring-1 ring-inset ring-blue-200">
                                عميل
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
    
                    <TableCell className="px-4 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone className="h-3 w-3 text-emerald-500" />
                            <span dir="ltr">{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="h-3 w-3 text-blue-400" />
                            <span className="truncate max-w-[160px]">{supplier.email}</span>
                          </div>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </TableCell>
                   
                    <TableCell className="px-4 py-2.5">
                      {isSummaryLoading ? (
                        <Skeleton className="h-3 w-16" />
                      ) : (
                        <span className="text-xs font-medium text-red-600 tabular-nums">
                          {fmt(summaryMap.get(supplier.id)?.total_debit ?? 0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      {isSummaryLoading ? (
                        <Skeleton className="h-3 w-16" />
                      ) : (
                        <span className="text-xs font-medium text-emerald-600 tabular-nums">
                          {fmt(summaryMap.get(supplier.id)?.total_credit ?? 0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      {isSummaryLoading ? (
                        <Skeleton className="h-3 w-16" />
                      ) : (() => {
                        const bal = summaryMap.get(supplier.id)?.balance ?? 0;
                        return (
                          <span className={`text-xs font-semibold tabular-nums ${bal > 0 ? "text-red-600" : bal < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                            {fmt(bal)}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-sm">
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${supplier.id}/ledger`); }}
                              className="gap-2"
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-500" />
                              كشف الحساب
                            </DropdownMenuItem>
                            {supplier.is_client && supplier.client_id && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); navigate(`/clients/${supplier.client_id}/ledger`); }}
                                className="gap-2"
                              >
                                <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
                                كشف مبيعاته
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                              className="gap-2"
                            >
                              <Pencil className="h-3.5 w-3.5 text-amber-500" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ isOpen: true, id: supplier.id }); }}
                              className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                صفحة {currentPage} من {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      className={`h-7 w-7 text-xs ${currentPage === page ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Colored top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 to-blue-400" />

          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-start gap-3 border-b border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-800 leading-tight truncate">
                  {selectedSupplierDetails?.name}
                </DialogTitle>
              </DialogHeader>
              <p className="text-[11px] text-slate-400 mt-0.5">بيانات المورد</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Financial summary strip */}
            {selectedSupplierDetails && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-center">
                  <p className="text-[10px] text-red-400 font-medium mb-0.5">المدين</p>
                  <p className="text-xs font-bold text-red-600 tabular-nums">
                    {fmt(summaryMap.get(selectedSupplierDetails.id)?.total_debit ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-center">
                  <p className="text-[10px] text-emerald-500 font-medium mb-0.5">الدائن</p>
                  <p className="text-xs font-bold text-emerald-600 tabular-nums">
                    {fmt(summaryMap.get(selectedSupplierDetails.id)?.total_credit ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-center">
                  <p className="text-[10px] text-blue-400 font-medium mb-0.5">الرصيد</p>
                  {(() => {
                    const bal = summaryMap.get(selectedSupplierDetails.id)?.balance ?? 0;
                    return (
                      <p className={`text-xs font-bold tabular-nums ${bal > 0 ? "text-red-600" : bal < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                        {fmt(bal)}
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Contact info */}
            <div className="space-y-2">
              {selectedSupplierDetails?.contact_person && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">المسؤول</p>
                    <p className="text-xs font-medium text-slate-700">{selectedSupplierDetails.contact_person}</p>
                  </div>
                </div>
              )}
              {selectedSupplierDetails?.phone && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <Phone className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">الهاتف</p>
                    <p className="text-xs font-medium text-slate-700" dir="ltr">{selectedSupplierDetails.phone}</p>
                  </div>
                </div>
              )}
              {selectedSupplierDetails?.email && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <Mail className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400">البريد الإلكتروني</p>
                    <p className="text-xs font-medium text-slate-700 truncate">{selectedSupplierDetails.email}</p>
                  </div>
                </div>
              )}
              {selectedSupplierDetails?.address && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <MapPin className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">العنوان</p>
                    <p className="text-xs font-medium text-slate-700">{selectedSupplierDetails.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <Button
                size="sm"
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs font-medium"
                onClick={() => { if (selectedSupplierDetails) navigate(`/suppliers/${selectedSupplierDetails.id}/ledger`); setDetailsOpen(false); }}
              >
                <FileText className="h-3.5 w-3.5" />
                كشف الحساب
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 gap-1.5 text-xs font-medium border-slate-200"
                onClick={() => { if (selectedSupplierDetails) handleOpenModal(selectedSupplierDetails); setDetailsOpen(false); }}
              >
                <Pencil className="h-3.5 w-3.5 text-amber-500" />
                تعديل
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplierToEdit={editingSupplier}
        onSaveSuccess={handleSaveSuccess}
      />

      <ConfirmationDialog
        open={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="حذف المورد"
        message="هل أنت متأكد من حذف هذا المورد؟ لا يمكن التراجع عن هذه العملية."
        confirmText={deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
        cancelText="إلغاء"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default SuppliersPage;
