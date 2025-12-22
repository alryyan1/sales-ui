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

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// Lucide Icons
import {
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  MoreHorizontal,
  Pen,
  Trash,
  FileText,
  RefreshCw,
  User,
  MapPin,
  AlertCircle,
  X,
} from "lucide-react";

// Services and Types
import supplierService, { Supplier } from "../services/supplierService";

// Custom Components (reusing existing MUI modals for now)
import SupplierFormModal from "../components/suppliers/SupplierFormModal";
import ConfirmationDialog from "../components/common/ConfirmationDialog";

const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- State Management ---
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal & Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({
    isOpen: false,
    id: null,
  });

  // Details Dialog State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSupplierDetails, setSelectedSupplierDetails] =
    useState<Supplier | null>(null);

  // --- Debounce Search Term ---
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // --- Queries ---
  const {
    data: suppliersResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["suppliers", currentPage, debouncedSearchTerm],
    queryFn: () =>
      supplierService.getSuppliers(currentPage, debouncedSearchTerm),
    placeholderData: keepPreviousData,
  });

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: supplierService.deleteSupplier,
    onSuccess: () => {
      toast.success("تم حذف المورد بنجاح");
      setDeleteConfirmation({ isOpen: false, id: null });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });

      // Adjust page if needed
      if (
        suppliersResponse &&
        suppliersResponse.data.length === 1 &&
        currentPage > 1
      ) {
        setCurrentPage((prev) => prev - 1);
      }
    },
    onError: (err: any) => {
      toast.error(supplierService.getErrorMessage(err));
      setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
    },
  });

  // --- Handlers ---
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

  const handleOpenDelete = (id: number) => {
    setDeleteConfirmation({ isOpen: true, id });
  };

  const handleRowClick = (supplier: Supplier) => {
    setSelectedSupplierDetails(supplier);
    setDetailsOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.id) {
      deleteMutation.mutate(deleteConfirmation.id);
    }
  };

  const handleViewLedger = (supplier: Supplier) => {
    navigate(`/suppliers/${supplier.id}/ledger`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            الموردون
          </h1>
          <p className="text-slate-500 mt-1">
            إدارة قائمة الموردين والمشتريات والديون
          </p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
        >
          <Plus className="h-5 w-5 ml-2" />
          إضافة مورد جديد
        </Button>
      </div>

      {/* Main Content Card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-500" />
              قائمة الموردين
            </CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث بالاسم، البريد أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 border-slate-200 focus-visible:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error State */}
          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700 mb-6">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{supplierService.getErrorMessage(error)}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mr-auto border-red-200 hover:bg-red-100 text-red-700"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          {!isLoading && !isError && suppliersResponse && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-right font-semibold">
                      الاسم
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      المسؤول
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      معلومات الاتصال
                    </TableHead>
                    <TableHead className="text-right font-semibold hidden md:table-cell">
                      العنوان
                    </TableHead>
                    <TableHead className="text-center font-semibold w-[100px]">
                      إجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersResponse.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <div className="bg-slate-100 p-4 rounded-full mb-4">
                            <Building className="h-8 w-8 text-slate-400" />
                          </div>
                          <h3 className="text-lg font-medium text-slate-900 mb-1">
                            لا يوجد موردين
                          </h3>
                          <p>لم يتم العثور على موردين يطابقون بحثك</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliersResponse.data.map((supplier) => (
                      <TableRow
                        key={supplier.id}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(supplier)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {supplier.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              ID: {supplier.id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {supplier.contact_person ? (
                            <div className="flex items-center gap-2 text-slate-700">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm">
                                {supplier.contact_person}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm italic">
                              غير محدد
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {supplier.phone && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="h-3.5 w-3.5 text-green-500" />
                                <span dir="ltr" className="text-right">
                                  {supplier.phone}
                                </span>
                              </div>
                            )}
                            {supplier.email && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="h-3.5 w-3.5 text-blue-500" />
                                <span>{supplier.email}</span>
                              </div>
                            )}
                            {!supplier.phone && !supplier.email && (
                              <span className="text-slate-400 text-sm italic">
                                لا توجد معلومات
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {supplier.address ? (
                            <div
                              className="flex items-center gap-2 text-sm text-slate-600 max-w-[200px] truncate"
                              title={supplier.address}
                            >
                              <MapPin className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                              <span className="truncate">
                                {supplier.address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm italic">
                              غير محدد
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-[160px]"
                              >
                                <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleViewLedger(supplier)}
                                >
                                  <FileText className="h-4 w-4 ml-2 text-blue-500" />
                                  كشف الحساب
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenModal(supplier)}
                                >
                                  <Pen className="h-4 w-4 ml-2 text-amber-500" />
                                  تعديل
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleOpenDelete(supplier.id)}
                                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                >
                                  <Trash className="h-4 w-4 ml-2" />
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
            </div>
          )}

          {/* Pagination */}
          {suppliersResponse && suppliersResponse.last_page > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="h-8 w-8 p-0"
                >
                  &rarr;
                </Button>
                <div className="px-3 py-1 text-sm font-medium text-slate-600">
                  صفحة {currentPage} من {suppliersResponse.last_page}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(suppliersResponse.last_page, p + 1)
                    )
                  }
                  disabled={
                    currentPage === suppliersResponse.last_page || isLoading
                  }
                  className="h-8 w-8 p-0"
                >
                  &larr;
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Details & Actions Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              {selectedSupplierDetails?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-slate-500 block">المسؤول</span>
                <div className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  {selectedSupplierDetails?.contact_person || "—"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">رقم الهاتف</span>
                <div className="font-medium flex items-center gap-2" dir="ltr">
                  <span className="flex-1 text-right">
                    {selectedSupplierDetails?.phone || "—"}
                  </span>
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-slate-500 block">البريد الإلكتروني</span>
                <div className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {selectedSupplierDetails?.email || "—"}
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-slate-500 block">العنوان</span>
                <div className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {selectedSupplierDetails?.address || "—"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <Button
                onClick={() => {
                  if (selectedSupplierDetails)
                    handleViewLedger(selectedSupplierDetails);
                  setDetailsOpen(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="h-4 w-4 ml-2" />
                عرض كشف الحساب
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedSupplierDetails)
                      handleOpenModal(selectedSupplierDetails);
                    setDetailsOpen(false);
                  }}
                  className="w-full"
                >
                  <Pen className="h-4 w-4 ml-2 text-amber-600" />
                  تعديل البيانات
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedSupplierDetails)
                      handleOpenDelete(selectedSupplierDetails.id);
                    setDetailsOpen(false);
                  }}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash className="h-4 w-4 ml-2" />
                  حذف المورد
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reused Modals from components */}
      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplierToEdit={editingSupplier}
        onSaveSuccess={handleSaveSuccess}
      />

      <ConfirmationDialog
        open={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })
        }
        onConfirm={handleConfirmDelete}
        title="حذف المورد"
        message="هل أنت متأكد تمامًا من رغبتك في حذف هذا المورد؟ سيؤدي ذلك إلى فقدان بياناته نهائيًا."
        confirmText={deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
        cancelText="إلغاء"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default SuppliersPage;
