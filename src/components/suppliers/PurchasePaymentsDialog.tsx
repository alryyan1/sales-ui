import React, { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { SupplierPayment } from "@/services/supplierPaymentService";
import { Wallet, Calendar, User, Plus } from "lucide-react";
import PaymentFormModal from "./PaymentFormModal";
import { useSettings } from "@/context/SettingsContext";
import { formatNumber } from "@/constants";

interface PurchasePaymentsDialogProps {
  open: boolean;
  onClose: () => void;
  purchaseId: string | number;
  payments: SupplierPayment[];
  purchaseAmount: number;
  currency?: "SDG" | "USD";
  supplierId: number;
  onSuccess: () => void;
}

export const PurchasePaymentsDialog: React.FC<PurchasePaymentsDialogProps> = ({
  open,
  onClose,
  purchaseId,
  payments,
  purchaseAmount,
  currency = "SDG",
  supplierId,
  onSuccess,
}) => {
  const formatCurrency = useFormatCurrency();
  const { getSetting } = useSettings();
  const usdFactor = getSetting("usd_to_sdg_factor", 1) as number;
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  const isUSD = currency === "USD";
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const purchaseInSDG = isUSD ? Number(purchaseAmount) * usdFactor : Number(purchaseAmount);
  const remaining = purchaseInSDG - totalPaid;

  const getMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: "نقداً",
      bankak: "بنكك",
      fawry: "فوري",
      ocash: "أو كاش",
      other: "أخرى",
    };
    return methods[method] || method;
  };

  const handleAddPaymentSuccess = () => {
    setIsAddPaymentOpen(false);
    onSuccess();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6 text-blue-600" />
                  فاتوره رقم #{purchaseId}
              </DialogTitle>
      
            </div>
            <Button 
              onClick={() => setIsAddPaymentOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              <Plus className="ml-2 h-4 w-4" />
              إضافة دفعة
            </Button>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm font-medium text-slate-500 mb-1">إجمالي الفاتورة</p>
              {isUSD ? (
                <>
                  <p className="text-xl font-bold text-slate-900">
                    {formatNumber(Number(purchaseAmount).toFixed(2))}
                    <span className="ml-1 text-sm font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">USD</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">≈ {formatNumber((Number(purchaseAmount) * usdFactor).toFixed(2))} SDG</p>
                </>
              ) : (
                <p className="text-xl font-bold text-slate-900">{formatCurrency(purchaseAmount)}</p>
              )}
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-sm font-medium text-emerald-600 mb-1">إجمالي المدفوع</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm font-medium text-blue-600 mb-1">المتبقي</p>
              <p className={`text-xl font-bold ${remaining > 0 ? "text-blue-700" : "text-emerald-700"}`}>
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">المرجع</TableHead>
                  <TableHead className="text-right">بواسطة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      لا توجد مدفوعات مسجلة لهذه الفاتورة بعد.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {format(new Date(payment.payment_date), "yyyy-MM-dd")}
                        </div>
                      </TableCell>
                      <TableCell className="text-blue-600 font-bold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal bg-white">
                          {getMethodLabel(payment.method)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {payment.reference_number || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {typeof payment.user === 'string' ? payment.user : payment.user?.name || "-"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentFormModal
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
        onSuccess={handleAddPaymentSuccess}
        supplierId={supplierId}
        paymentToEdit={null}
        purchaseId={purchaseId}
      />
    </>
  );
};
