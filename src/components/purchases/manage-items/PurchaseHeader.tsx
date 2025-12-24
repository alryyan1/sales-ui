// src/components/purchases/manage-items/PurchaseHeader.tsx
import React from "react";
import {
  ArrowLeft,
  Plus,
  ListChecks,
  Trash2,
  FileText,
  Loader2,
  Receipt,
  Building2,
} from "lucide-react";
// Shadcn UI Components
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Custom Components & Utils
import PurchaseSummaryDialog from "@/components/purchases/PurchaseSummaryDialog";
import { formatCurrency } from "@/constants";
import { Purchase } from "@/services/purchaseService";
import { PurchaseSummary } from "./types";
import { cn } from "@/lib/utils";

interface PurchaseHeaderProps {
  purchase: Purchase;
  summary: PurchaseSummary;
  isReadOnly: boolean;
  onBack: () => void;
  onOpenAddDialog: () => void;
  onAddAllProducts: () => void;
  onDeleteZeroQuantity: () => void;
  onStatusChange: (status: "pending" | "ordered" | "received") => void;
  isAddAllPending: boolean;
  isDeleteZeroPending: boolean;
  isStatusPending: boolean;
  summaryDialogOpen: boolean;
  onOpenSummaryDialog: () => void;
  onCloseSummaryDialog: () => void;
}

const PurchaseHeader: React.FC<PurchaseHeaderProps> = ({
  purchase,
  summary,
  isReadOnly,
  onBack,
  onOpenAddDialog,
  onAddAllProducts,
  onDeleteZeroQuantity,
  onStatusChange,
  isAddAllPending,
  isDeleteZeroPending,
  isStatusPending,
  summaryDialogOpen,
  onOpenSummaryDialog,
  onCloseSummaryDialog,
}) => {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-4 mb-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        {/* Title & Back */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>

          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              إدارة أصناف المشتريات
              <span className="text-slate-400 font-normal">#{purchase.id}</span>
            </h1>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">
                {purchase.supplier_name || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          {/* Summary Stats */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg flex flex-col items-center min-w-[80px]">
              <span className="text-lg font-bold leading-none">
                {summary.totalItems}
              </span>
              <span className="text-[10px] opacity-80 font-medium">
                عدد الأصناف
              </span>
            </div>
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg flex flex-col items-center min-w-[100px]">
              <span className="text-lg font-bold leading-none">
                {formatCurrency(summary.totalCost)}
              </span>
              <span className="text-[10px] opacity-80 font-medium">
                إجمالي التكلفة
              </span>
            </div>
          </div>

          {/* Actions Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Select */}
            <Select
              value={purchase.status}
              onValueChange={(value) =>
                onStatusChange(value as "received" | "pending" | "ordered")
              }
              disabled={isStatusPending || purchase.status === "received"}
            >
              <SelectTrigger
                className={cn(
                  "w-[130px] h-9 transition-colors",
                  purchase.status === "received" &&
                    "bg-green-50 text-green-700 border-green-200",
                  purchase.status === "pending" &&
                    "bg-amber-50 text-amber-700 border-amber-200",
                  purchase.status === "ordered" &&
                    "bg-blue-50 text-blue-700 border-blue-200"
                )}
              >
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="ordered">تم الطلب</SelectItem>
                <SelectItem value="received">تم الاستلام</SelectItem>
              </SelectContent>
            </Select>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

            {!isReadOnly && (
              <>
                <Button
                  onClick={onOpenAddDialog}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 ml-1.5" />
                  إضافة صنف
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={onAddAllProducts}
                        disabled={isAddAllPending}
                        className="h-9 w-9 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                      >
                        {isAddAllPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ListChecks className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>إضافة كل المنتجات</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={onDeleteZeroQuantity}
                        disabled={isDeleteZeroPending}
                        className="h-9 w-9 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                      >
                        {isDeleteZeroPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>حذف الأصناف الصفرية</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenSummaryDialog}
                    className="h-9 w-9 text-slate-600"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>ملخص الفاتورة</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog
              open={summaryDialogOpen}
              onOpenChange={(open) => !open && onCloseSummaryDialog()}
            >
              <DialogContent className="max-w-2xl">
                <PurchaseSummaryDialog
                  summary={summary}
                  supplierName={purchase.supplier_name || "—"}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseHeader;
