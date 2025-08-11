// src/pages/clients/ClientLedgerPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/LoadingSpinner';

import clientLedgerService, { ClientLedger, ClientLedgerEntry } from '@/services/clientLedgerService';
import { formatCurrency } from '@/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const ClientLedgerPage: React.FC = () => {
  const { t } = useTranslation(['clients', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = Number(id);

  const [ledger, setLedger] = useState<ClientLedger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleDate, setSettleDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [settleMethod, setSettleMethod] = useState<string>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchLedger = async () => {
    if (!clientId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientLedgerService.getLedger(clientId);
      setLedger(data);
    } catch (err) {
      setError(clientLedgerService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleDownloadPdf = async () => {
    if (!clientId) return;
    setIsGeneratingPdf(true);
    try {
      await clientLedgerService.openLedgerPdfInNewTab(clientId);
    } catch (err) {
      setError(clientLedgerService.getErrorMessage(err));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSettle = async () => {
    if (!clientId) return;
    const amountNum = parseFloat(settleAmount);
    if (!amountNum || amountNum <= 0) {
      setError(t('common:invalidAmount') || 'Invalid amount');
      return;
    }
    setIsSubmitting(true);
    try {
      await clientLedgerService.settleDebt(clientId, {
        amount: amountNum,
        payment_date: settleDate,
        method: settleMethod,
        reference_number: reference || undefined,
        notes: notes || undefined,
      });
      setDialogOpen(false);
      setSettleAmount('');
      setReference('');
      setNotes('');
      await fetchLedger();
    } catch (e) {
      setError(clientLedgerService.getErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: ClientLedgerEntry['type']) => {
    switch (type) {
      case 'sale':
        return 'destructive';
      case 'payment':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getTypeLabel = (type: ClientLedgerEntry['type']) => {
    switch (type) {
      case 'sale':
        return t('clients:sale');
      case 'payment':
        return t('clients:payment');
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600 dark:text-gray-400">{t('common:loading')}</span>
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
        <AlertDescription>{t('clients:ledgerNotFound')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-2 md:p-3 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('clients:ledgerTitle')} - {ledger.client.name}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
            <FileText className="h-4 w-4 mr-2" /> {t('reports:generatePdf', 'Generate PDF')}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
          {t('clients:settleDebt')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-[calc(100vh-140px)] overflow-hidden">
        {/* Left: Ledger table */}
        <div className="lg:col-span-2 min-h-0">
          <Card>
            <CardHeader>
              <CardTitle>{t('clients:ledgerEntries')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-56px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t('common:date')}</TableHead>
                    <TableHead className="text-center">{t('common:type')}</TableHead>
                    <TableHead className="text-center">{t('common:description')}</TableHead>
                    <TableHead className="text-center">{t('clients:debit')}</TableHead>
                    <TableHead className="text-center">{t('clients:credit')}</TableHead>
                    <TableHead className="text-center">{t('clients:balance')}</TableHead>
                    <TableHead className="text-center">{t('common:reference')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.ledger_entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center">{format(new Date(entry.date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getTypeColor(entry.type)}>{getTypeLabel(entry.type)}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{entry.description}</TableCell>
                      <TableCell className="text-center">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</TableCell>
                      <TableCell className="text-center">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(entry.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{entry.reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {ledger.ledger_entries.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t('clients:noLedgerEntries')}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary + Client info */}
        <div className="space-y-3 min-h-0 overflow-auto">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('clients:totalSales')}</h3>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(ledger.summary.total_sales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('clients:totalPayments')}</h3>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(ledger.summary.total_payments)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('clients:balance')}</h3>
                <p className={`text-3xl font-bold ${ledger.summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(ledger.summary.balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3">
              <CardTitle>{t('clients:clientInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('clients:email')}</p>
                  <p className="text-gray-900 dark:text-gray-100">{ledger.client.email || t('common:n/a')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('clients:phone')}</p>
                  <p className="text-gray-900 dark:text-gray-100">{ledger.client.phone || t('common:n/a')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('clients:address')}</p>
                  <p className="text-gray-900 dark:text-gray-100">{ledger.client.address || t('common:n/a')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
            </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t('clients:settleDebt')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('clients:amount')}</Label>
              <Input id="amount" type="number" min="0" step="0.01" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t('clients:paymentDate')}</Label>
              <Input id="date" type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('clients:paymentMethod')}</Label>
              <Select value={settleMethod} onValueChange={setSettleMethod}>
                <SelectTrigger>
                  <SelectValue placeholder={t('clients:paymentMethod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('paymentMethods:cash') || 'Cash'}</SelectItem>
                  <SelectItem value="bank_transfer">{t('paymentMethods:bank_transfer') || 'Bank Transfer'}</SelectItem>
                  <SelectItem value="visa">{t('paymentMethods:visa') || 'Visa'}</SelectItem>
                  <SelectItem value="mastercard">{t('paymentMethods:mastercard') || 'MasterCard'}</SelectItem>
                  <SelectItem value="mada">{t('paymentMethods:mada') || 'Mada'}</SelectItem>
                  <SelectItem value="other">{t('paymentMethods:other') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">{t('clients:reference')}</Label>
              <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t('clients:notes')}</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleSettle} disabled={isSubmitting}>
              {t('clients:confirmSettle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientLedgerPage; 