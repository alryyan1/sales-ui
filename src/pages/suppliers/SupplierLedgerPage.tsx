// src/pages/suppliers/SupplierLedgerPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
  AlertTitle,
} from '@mui/material';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';

import LoadingSpinner from '@/components/LoadingSpinner';
import supplierPaymentService, {
  SupplierLedger,
  SupplierPayment,
  PaymentMethod,
  PaymentType,
} from '@/services/supplierPaymentService';
import { formatCurrency } from '@/constants';
import PaymentFormModal from '@/components/suppliers/PaymentFormModal';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';

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
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<SupplierPayment | null>(null);

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
      console.error('Failed to fetch payment options:', err);
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
      console.error('Failed to delete payment:', err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'error';
      case 'payment':
        return 'success';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'شراء';
      case 'payment':
        return 'دفعة';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Box className="flex justify-center items-center py-10">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          جاري التحميل...
        </span>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" className="my-4">
        <AlertTitle>خطأ</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (!ledger) {
    return (
      <Alert className="my-4" severity="info">
        كشف حساب هذا المورد غير متوفر.
      </Alert>
    );
  }

  return (
    <Box className="p-4 md:p-6" sx={{ direction: 'rtl' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate('/suppliers')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          كشف حساب المورد - {ledger.supplier.name}
        </h1>
        <Button onClick={handleAddPayment} className="mr-auto" variant="contained">
          <Plus className="mr-2 h-4 w-4" />
          إضافة دفعة
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Table */}
        <div className="lg:col-span-2">
          {/* Ledger Table */}
          <Card>
            <CardHeader>
              <Typography variant="h6">حركات الحساب</Typography>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className="text-center">التاريخ</TableCell>
                    <TableCell className="text-center">النوع</TableCell>
                    <TableCell className="text-center">الوصف</TableCell>
                    <TableCell className="text-center">مدين</TableCell>
                    <TableCell className="text-center">دائن</TableCell>
                    <TableCell className="text-center">الرصيد</TableCell>
                    <TableCell className="text-center">المرجع</TableCell>
                    <TableCell className="text-center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledger.ledger_entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center">{format(new Date(entry.date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-center">
                        <Chip
                          label={getTypeLabel(entry.type)}
                          color={getTypeColor(entry.type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell className="text-center">{entry.description}</TableCell>
                      <TableCell className="text-center">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(entry.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{entry.reference || '-'}</TableCell>
                      <TableCell className="text-center">
                        {entry.type === 'payment' && (
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPayment(entry as unknown as SupplierPayment)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePayment(entry as unknown as SupplierPayment)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {ledger.ledger_entries.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  لا توجد حركات في كشف الحساب لهذا المورد.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cards */}
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  إجمالي المشتريات
                </h3>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(ledger.summary.total_purchases)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  إجمالي المدفوعات
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(ledger.summary.total_payments)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  الرصيد الحالي
                </h3>
                <p className={`text-3xl font-bold ${ledger.summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(ledger.summary.balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Info */}
          <Card>
            <CardHeader>
              <Typography variant="h6">بيانات المورد</Typography>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    مسؤول التواصل
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.supplier.contact_person || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    البريد الإلكتروني
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.supplier.email || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    رقم الهاتف
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.supplier.phone || '-'}
                  </p>
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
      />
    </Box>
  );
};

export default SupplierLedgerPage; 