// src/components/purchases/InventoryImpactDialog.tsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { PurchaseItem } from "@/services/purchaseService";

interface InventoryImpactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: PurchaseItem[];
  previousStatus: string;
  newStatus: string;
  isLoading?: boolean;
}

const InventoryImpactDialog: React.FC<InventoryImpactDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  items,
  previousStatus,
  newStatus,
  isLoading = false,
}) => {
  // Determine the type of change
  const isAddingStock =
    previousStatus !== "received" && newStatus === "received";
  const isRemovingStock =
    previousStatus === "received" && newStatus !== "received";
  const noInventoryChange = !isAddingStock && !isRemovingStock;

  // Calculate total quantity
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Get status label in Arabic
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "قيد الانتظار";
      case "ordered":
        return "تم الطلب";
      case "received":
        return "تم الاستلام";
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isAddingStock && (
              <>
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>إضافة أصناف إلى المخزون</span>
              </>
            )}
            {isRemovingStock && (
              <>
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span>خصم أصناف من المخزون</span>
              </>
            )}
            {noInventoryChange && (
              <>
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <span>تغيير حالة المشتريات</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isAddingStock && (
              <span className="text-green-700">
                سيتم إضافة الأصناف التالية إلى المخزون عند تغيير الحالة من{" "}
                <strong>{getStatusLabel(previousStatus)}</strong> إلى{" "}
                <strong>{getStatusLabel(newStatus)}</strong>
              </span>
            )}
            {isRemovingStock && (
              <span className="text-red-700">
                سيتم خصم الأصناف التالية من المخزون عند تغيير الحالة من{" "}
                <strong>{getStatusLabel(previousStatus)}</strong> إلى{" "}
                <strong>{getStatusLabel(newStatus)}</strong>
              </span>
            )}
            {noInventoryChange && (
              <span className="text-slate-600">
                لن يتأثر المخزون عند تغيير الحالة من{" "}
                <strong>{getStatusLabel(previousStatus)}</strong> إلى{" "}
                <strong>{getStatusLabel(newStatus)}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto mt-4">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border ${
                  isAddingStock
                    ? "bg-green-50 border-green-200"
                    : isRemovingStock
                      ? "bg-red-50 border-red-200"
                      : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`p-2 rounded-lg ${
                        isAddingStock
                          ? "bg-green-100"
                          : isRemovingStock
                            ? "bg-red-100"
                            : "bg-slate-100"
                      }`}
                    >
                      <Package
                        className={`h-4 w-4 ${
                          isAddingStock
                            ? "text-green-600"
                            : isRemovingStock
                              ? "text-red-600"
                              : "text-slate-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">
                        {item.product_name || `منتج #${item.product_id}`}
                      </div>
                      {item.batch_number && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          دفعة: {item.batch_number}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <div
                      className={`text-lg font-bold ${
                        isAddingStock
                          ? "text-green-700"
                          : isRemovingStock
                            ? "text-red-700"
                            : "text-slate-700"
                      }`}
                    >
                      {isAddingStock && "+"}
                      {isRemovingStock && "-"}
                      {item.quantity}
                    </div>
                    <div className="text-xs text-slate-500">وحدة</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div
          className={`mt-4 p-4 rounded-lg border-2 ${
            isAddingStock
              ? "bg-green-50 border-green-300"
              : isRemovingStock
                ? "bg-red-50 border-red-300"
                : "bg-slate-50 border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">
              {isAddingStock && "إجمالي الإضافة:"}
              {isRemovingStock && "إجمالي الخصم:"}
              {noInventoryChange && "إجمالي الأصناف:"}
            </span>
            <span
              className={`text-2xl font-bold ${
                isAddingStock
                  ? "text-green-700"
                  : isRemovingStock
                    ? "text-red-700"
                    : "text-slate-700"
              }`}
            >
              {isAddingStock && "+"}
              {isRemovingStock && "-"}
              {totalQuantity} وحدة
            </span>
          </div>
          <div className="text-sm text-slate-600 mt-1">
            عدد الأصناف: {items.length}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 ${
              isAddingStock
                ? "bg-green-600 hover:bg-green-700"
                : isRemovingStock
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                جاري التحديث...
              </>
            ) : (
              "تأكيد التغيير"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryImpactDialog;
