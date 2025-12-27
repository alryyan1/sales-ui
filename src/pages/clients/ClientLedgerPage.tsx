// src/pages/clients/ClientLedgerPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Stack,
} from "@mui/material";
import { ArrowLeft, FileText } from "lucide-react";

import LoadingSpinner from "@/components/LoadingSpinner";
import clientLedgerService, {
  ClientLedger,
  ClientLedgerEntry,
} from "@/services/clientLedgerService";
import { formatCurrency } from "@/constants";
import { ClientLedgerPdfDialog } from "@/components/clients/ClientLedgerPdfDialog";

const ClientLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = Number(id);

  const [ledger, setLedger] = useState<ClientLedger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleDate, setSettleDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [settleMethod, setSettleMethod] = useState<string>("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

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

  const handleDownloadPdf = () => {
    setPdfDialogOpen(true);
  };

  const handleSettle = async () => {
    if (!clientId) return;
    const amountNum = parseFloat(settleAmount);
    if (!amountNum || amountNum <= 0) {
      setError("المبلغ غير صالح");
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
      setSettleAmount("");
      setReference("");
      setNotes("");
      await fetchLedger();
    } catch (e) {
      setError(clientLedgerService.getErrorMessage(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: ClientLedgerEntry["type"]) => {
    switch (type) {
      case "sale":
        return "error";
      case "payment":
        return "success";
      default:
        return "default";
    }
  };

  const getTypeLabel = (type: ClientLedgerEntry["type"]) => {
    switch (type) {
      case "sale":
        return "عملية بيع";
      case "payment":
        return "دفعة";
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
        كشف الحساب غير متوفر لهذا العميل.
      </Alert>
    );
  }

  return (
    <Box className="p-2 md:p-3 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          كشف حساب العميل - {ledger.client.name}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outlined" onClick={handleDownloadPdf}>
            <FileText className="h-4 w-4 mr-2" /> تحميل PDF
          </Button>
          <Button onClick={() => setDialogOpen(true)}>تسوية الدين</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-[calc(100vh-140px)] overflow-hidden">
        {/* Left: Ledger table */}
        <div className="lg:col-span-2 min-h-0">
          <Card>
            <CardHeader>
              <Typography variant="h6">حركات الحساب</Typography>
            </CardHeader>
            <CardContent className="h-[calc(100%-56px)] overflow-auto">
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledger.ledger_entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center">
                        {format(new Date(entry.date), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Chip
                          label={getTypeLabel(entry.type)}
                          color={getTypeColor(entry.type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`font-semibold ${
                            entry.balance > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(entry.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.reference || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {ledger.ledger_entries.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  لا توجد حركات في كشف الحساب.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary + Client info */}
        <div className="space-y-3 min-h-0 overflow-auto">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  إجمالي المبيعات
                </h3>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(ledger.summary.total_sales)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  إجمالي الدفعات
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(ledger.summary.total_payments)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  الرصيد الحالي
                </h3>
                <p
                  className={`text-3xl font-bold ${
                    ledger.summary.balance > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {formatCurrency(ledger.summary.balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3">
              <Typography variant="h6">بيانات العميل</Typography>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    البريد الإلكتروني
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.client.email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    رقم الهاتف
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.client.phone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    العنوان
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {ledger.client.address || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>تسوية دين العميل</DialogTitle>
        <DialogContent dividers>
          <Stack direction="column" spacing={2} className="space-y-4">
            <TextField
              id="amount"
              label="المبلغ"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
            />
            <TextField
              id="date"
              label="تاريخ الدفع"
              type="date"
              fullWidth
              value={settleDate}
              onChange={(e) => setSettleDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel id="method-label">طريقة الدفع</InputLabel>
              <Select
                labelId="method-label"
                value={settleMethod}
                label="طريقة الدفع"
                onChange={(e) => setSettleMethod(e.target.value)}
              >
                <MenuItem value="cash">نقدًا</MenuItem>
                <MenuItem value="bank_transfer">تحويل بنكي</MenuItem>
                <MenuItem value="visa">فيزا</MenuItem>
                <MenuItem value="mastercard">ماستركارد</MenuItem>
                <MenuItem value="mada">مدى</MenuItem>
                <MenuItem value="other">أخرى</MenuItem>
              </Select>
            </FormControl>
            <TextField
              id="reference"
              label="المرجع"
              fullWidth
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <TextField
              id="notes"
              label="ملاحظات"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions className="flex justify-between gap-1">
          <Button
            variant="outlined"
            onClick={() => setDialogOpen(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSettle}
            disabled={isSubmitting}
          >
            تأكيد التسوية
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Dialog */}
      <ClientLedgerPdfDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        ledger={ledger}
      />
    </Box>
  );
};

export default ClientLedgerPage;
