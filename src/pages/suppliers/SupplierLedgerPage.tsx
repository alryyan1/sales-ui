// src/pages/suppliers/SupplierLedgerPage.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

// Icons
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/LoadingSpinner';

// Services
import supplierPaymentService, { 
  SupplierLedger, 
  SupplierPayment,
  PaymentMethod,
  PaymentType 
} from '@/services/supplierPaymentService';
import { formatCurrency } from '@/constants';

// Components
import PaymentFormModal from '@/components/suppliers/PaymentFormModal';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';

const SupplierLedgerPage: React.FC = () => {
  const { t } = useTranslation(['suppliers', 'common']);
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
        return 'destructive';
      case 'payment':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return t('suppliers:purchase');
      case 'payment':
        return t('suppliers:payment');
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          {t('common:loading')}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!ledger) {
    return (
      <Alert className="my-4">
        <AlertDescription>{t('suppliers:ledgerNotFound')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/suppliers')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('suppliers:ledgerTitle')} - {ledger.supplier.name}
        </h1>
        <Button onClick={handleAddPayment} className="mr-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('suppliers:addPayment')}
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Table */}
        <div className="lg:col-span-2">
          {/* Ledger Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('suppliers:ledgerEntries')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t('common:date')}</TableHead>
                    <TableHead className="text-center">{t('common:type')}</TableHead>
                    <TableHead className="text-center">{t('common:description')}</TableHead>
                    <TableHead className="text-center">{t('suppliers:debit')}</TableHead>
                    <TableHead className="text-center">{t('suppliers:credit')}</TableHead>
                    <TableHead className="text-center">{t('suppliers:balance')}</TableHead>
                    <TableHead className="text-center">{t('common:reference')}</TableHead>
                    <TableHead className="text-center">{t('common:actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.ledger_entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center">{format(new Date(entry.date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getTypeColor(entry.type)}>
                          {getTypeLabel(entry.type)}
                        </Badge>
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
                  {t('suppliers:noLedgerEntries')}
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
                  {t('suppliers:totalPurchases')}
                </h3>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(ledger.summary.total_purchases)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('suppliers:totalPayments')}
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(ledger.summary.total_payments)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('suppliers:balance')}
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
              <CardTitle>{t('suppliers:supplierInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('suppliers:contactPerson')}
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.supplier.contact_person || t('common:n/a')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('suppliers:email')}
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.supplier.email || t('common:n/a')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('suppliers:phone')}
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.supplier.phone || t('common:n/a')}
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
        title={t('common:confirmDeleteTitle')}
        message={t('suppliers:deletePaymentConfirm')}
        confirmText={t('common:delete')}
        cancelText={t('common:cancel')}
      />
    </div>
  );
};

export default SupplierLedgerPage; 