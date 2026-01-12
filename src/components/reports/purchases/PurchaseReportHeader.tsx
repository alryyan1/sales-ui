import React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PurchaseReportHeaderProps {
  onExportPdf?: () => void;
  onExportExcel?: () => void;
}

const PurchaseReportHeader: React.FC<PurchaseReportHeaderProps> = ({
  onExportPdf,
  onExportExcel,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          تقرير المشتريات
        </h1>
        <p className="text-slate-500 mt-1">
          تقرير رسمي لمتابعة عمليات الشراء حسب الفترة، المورد والحالة.
        </p>
      </div>

      {/* Primary actions – placeholders for future export/print */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPdf}
          disabled={!onExportPdf}
          className="gap-2"
        >
          <FileText size={14} />
          تصدير PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportExcel}
          disabled={!onExportExcel}
          className="gap-2"
        >
          <FileText size={14} />
          تصدير Excel
        </Button>
      </div>
    </div>
  );
};

export default PurchaseReportHeader;
