// src/pages/suppliers/SupplierLedgerPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertCircle,
  Building,
  Mail,
  Phone,
  User,
  MoreHorizontal,
} from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Services and Types
import supplierPaymentService, {
  SupplierLedger,
  SupplierPayment,
  PaymentMethod,
  PaymentType,
} from "@/services/supplierPaymentService";
import { formatCurrency } from "@/constants";
import PaymentFormModal from "@/components/suppliers/PaymentFormModal";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";

const SupplierLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supplierId = Number(id);

  // State
  const [ledger, setLedger] = useState<SupplierLedger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);

  // Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(
    null
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] =
    useState<SupplierPayment | null>(null);

  // Fetch ledger data
  const fetchLedger = async () => {
    if (!supplierId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await supplierPaymentService.getLedger(supplierId);
      setLedger(data);
    } catch (err) {
      setError(supplierPaymentService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch payment options
  const fetchPaymentOptions = async () => {
    try {
      const [methods, types] = await Promise.all([
        supplierPaymentService.getPaymentMethods(),
        supplierPaymentService.getPaymentTypes(),
      ]);
      setPaymentMethods(methods);
      setPaymentTypes(types);
    } catch (err) {
      console.error("Failed to fetch payment options:", err);
    }
  };

  useEffect(() => {
    fetchLedger();
    fetchPaymentOptions();
  }, [supplierId]);

  // Payment handlers
  const handleAddPayment = () => {
    setEditingPayment(null);
    setIsPaymentModalOpen(true);
  };

  const handleEditPayment = (payment: SupplierPayment) => {
    setEditingPayment(payment);
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = (payment: SupplierPayment) => {
    setPaymentToDelete(payment);
    setIsConfirmOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    fetchLedger(); // Refresh ledger
  };

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;

    try {
      await supplierPaymentService.deletePayment(paymentToDelete.id);
      setIsConfirmOpen(false);
      setPaymentToDelete(null);
      fetchLedger(); // Refresh ledger
    } catch (err) {
      console.error("Failed to delete payment:", err);
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "purchase":
        return "destructive"; // Shadcn variant for red
      case "payment":
        return "default"; // Shadcn variant for primary/blue (or utilize a custom class)
      default:
        return "secondary";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "purchase":
        return "شراء";
      case "payment":
        return "دفعة";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="p-6" dir="rtl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>تنبيه</AlertTitle>
          <AlertDescription>كشف حساب هذا المورد غير متوفر.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate("/suppliers")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              كشف حساب المورد
            </h1>
          </div>
          <p className="text-slate-500 mr-11">{ledger.supplier.name}</p>
        </div>

        <Button
          onClick={handleAddPayment}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
        >
          <Plus className="ml-2 h-4 w-4" />
          إضافة دفعة
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1 h-full bg-red-500" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  إجمالي المشتريات
                </p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {formatCurrency(ledger.summary.total_purchases)}
                </h3>
              </div>
              <div className="bg-red-50 p-3 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  إجمالي المدفوعات
                </p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {formatCurrency(ledger.summary.total_payments)}
                </h3>
              </div>
              <div className="bg-emerald-50 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white overflow-hidden relative">
          <div
            className={`absolute top-0 right-0 w-1 h-full ${
              ledger.summary.balance > 0 ? "bg-red-500" : "bg-green-500"
            }`}
          />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  الرصيد الحالي
                </p>
                <h3
                  className={`text-2xl font-bold ${
                    ledger.summary.balance > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {formatCurrency(ledger.summary.balance)}
                </h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <Wallet className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Table */}
        <div className="lg:col-span-2">
          {/* Ledger Table */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-500" />
                حركات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-center font-semibold">
                        التاريخ
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        النوع
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        الوصف
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        مدين
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        دائن
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        الرصيد
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        المرجع
                      </TableHead>
                      <TableHead className="text-center font-semibold text-muted-foreground w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.ledger_entries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-48 text-center text-slate-500"
                        >
                          لا توجد حركات في كشف الحساب لهذا المورد.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledger.ledger_entries.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className="hover:bg-slate-50/50"
                        >
                          <TableCell className="text-center font-medium text-slate-700">
                            {format(new Date(entry.date), "yyyy-MM-dd")}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={getTypeBadgeVariant(entry.type)}
                              className={
                                entry.type === "payment"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
                                  : ""
                              }
                            >
                              {getTypeLabel(entry.type)}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="text-center text-slate-600 max-w-[200px] truncate"
                            title={entry.description}
                          >
                            {entry.description}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-medium">
                            {entry.debit > 0
                              ? formatCurrency(entry.debit)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center text-emerald-600 font-medium">
                            {entry.credit > 0
                              ? formatCurrency(entry.credit)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`font-bold ${
                                entry.balance > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {formatCurrency(entry.balance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-slate-500 text-sm">
                            {entry.reference || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.type === "payment" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleEditPayment(
                                        entry as unknown as SupplierPayment
                                      )
                                    }
                                  >
                                    <Edit className="h-4 w-4 ml-2 text-amber-500" />
                                    تعديل
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeletePayment(
                                        entry as unknown as SupplierPayment
                                      )
                                    }
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 ml-2" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cards */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                بيانات المورد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  <User className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      مسؤول التواصل
                    </p>
                    <p className="font-medium text-slate-900">
                      {ledger.supplier.contact_person || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      البريد الإلكتروني
                    </p>
                    <p className="font-medium text-slate-900 break-all">
                      {ledger.supplier.email || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      رقم الهاتف
                    </p>
                    <p className="font-medium text-slate-900" dir="ltr">
                      {ledger.supplier.phone || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Form Modal */}
      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        supplierId={supplierId}
        paymentToEdit={editingPayment}
        paymentMethods={paymentMethods}
        paymentTypes={paymentTypes}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع عن هذه العملية."
        confirmText="حذف"
        cancelText="إلغاء"
        confirmVariant="destructive"
      />
    </div>
  );
};

export default SupplierLedgerPage;
