import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { FileText, Loader2, Eye } from "lucide-react";
import { formatNumber } from "@/constants";
import type { SupplierSummary } from "@/services/supplierService";
import { cn } from "@/lib/utils";
import { downloadPdf } from "@/utils/pdfDownload";
import { SupplierLedgerPdf } from "@/components/suppliers/SupplierLedgerPdf";
import { useSettings } from "@/context/SettingsContext";
import supplierPaymentService from "@/services/supplierPaymentService";
import { toast } from "sonner";

interface SuppliersSummaryTableProps {
  data: SupplierSummary[];
  onRowClick: (supplier: SupplierSummary) => void;
}

const SuppliersSummaryTable: React.FC<SuppliersSummaryTableProps> = ({
  data,
  onRowClick,
}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [loadingPdfId, setLoadingPdfId] = useState<number | null>(null);

  const handleDownloadPdf = async (
    e: React.MouseEvent,
    supplier: SupplierSummary
  ) => {
    e.stopPropagation(); // Prevent row click
    
    setLoadingPdfId(supplier.id);
    try {
      // Fetch full ledger with all transactions
      const ledger = await supplierPaymentService.getLedger(supplier.id);
      
      const pdfDocument = (
        <SupplierLedgerPdf ledger={ledger} settings={settings} />
      );
      
      await downloadPdf(
        pdfDocument,
        `كشف_حساب_${supplier.name}_${new Date().toISOString().split("T")[0]}.pdf`
      );
    } catch (error: any) {
      console.error("Error fetching ledger:", error);
      toast.error("خطأ", {
        description: supplierPaymentService.getErrorMessage(error) || "فشل في جلب بيانات كشف الحساب",
      });
    } finally {
      setLoadingPdfId(null);
    }
  };

  const handleNavigateToLedger = (
    e: React.MouseEvent,
    supplier: SupplierSummary
  ) => {
    e.stopPropagation(); // Prevent row click
    navigate(`/suppliers/${supplier.id}/ledger`);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableHead className="text-right font-semibold">
            اسم المورد
          </TableHead>
          <TableHead className="text-right font-semibold">
            إجمالي المدين
          </TableHead>
          <TableHead className="text-right font-semibold">
            إجمالي الدائن
          </TableHead>
          <TableHead className="text-right font-semibold">
            الرصيد
          </TableHead>
          <TableHead className="text-center font-semibold w-[140px]">
            الإجراءات
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((supplier) => (
          <TableRow
            key={supplier.id}
            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
            onClick={() => onRowClick(supplier)}
          >
            <TableCell className="py-4 font-medium">{supplier.name}</TableCell>
            <TableCell className="py-4 text-right">
              {formatNumber(supplier.total_debit)}
            </TableCell>
            <TableCell className="py-4 text-right">
              {formatNumber(supplier.total_credit)}
            </TableCell>
            <TableCell className="py-4 text-right">
              <Badge
                variant={supplier.balance > 0 ? "destructive" : "default"}
                className={cn(
                  "font-semibold",
                  supplier.balance < 0 && "bg-green-600 hover:bg-green-700"
                )}
              >
                {formatNumber(supplier.balance)}
              </Badge>
            </TableCell>
            <TableCell className="py-4 text-center">
              <div className="flex justify-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => handleNavigateToLedger(e, supplier)}
                  className="h-8 w-8 text-slate-500 hover:text-blue-600"
                  title="عرض كشف الحساب"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => handleDownloadPdf(e, supplier)}
                  disabled={loadingPdfId === supplier.id}
                  className="h-8 w-8 text-slate-500 hover:text-blue-600"
                  title="تحميل PDF"
                >
                  {loadingPdfId === supplier.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default SuppliersSummaryTable;

