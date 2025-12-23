// src/components/inventory/requisitions/RequisitionHeaderDisplay.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormLabel } from "@/components/ui/form"; // For consistent label style
import { StockRequisition } from "../../../services/stockRequisitionService";
import { formatDate } from "@/constants";

interface RequisitionHeaderDisplayProps {
  requisition: StockRequisition | null;
}

export const RequisitionHeaderDisplay: React.FC<
  RequisitionHeaderDisplayProps
> = ({ requisition }) => {
  if (!requisition) return null;

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'قيد الانتظار',
      'approved': 'موافق عليه',
      'rejected': 'مرفوض',
      'processing': 'قيد المعالجة',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  };

  return (
    <Card className="mb-6 dark:bg-gray-900">
      <CardHeader>
        <CardTitle>ملخص الطلب</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <FormLabel>رقم الطلب</FormLabel>
          <p className="font-medium">
            REQ-{String(requisition.id).padStart(5, "0")}
          </p>
        </div>
        <div>
          <FormLabel>الطالب</FormLabel>
          <p className="font-medium">
            {requisition.requester_name || "غير متاح"}
          </p>
        </div>
        <div>
          <FormLabel>تاريخ الطلب</FormLabel>
          <p className="font-medium">{formatDate(requisition.request_date)}</p>
        </div>
        <div className="md:col-span-3">
          <FormLabel>القسم أو السبب</FormLabel>
          <p className="font-medium">
            {requisition.department_or_reason || "---"}
          </p>
        </div>
        {requisition.notes && (
          <div className="md:col-span-3">
            <FormLabel>ملاحظات</FormLabel>
            <p className="text-sm whitespace-pre-wrap">{requisition.notes}</p>
          </div>
        )}
        <div>
          <FormLabel>الحالة</FormLabel>
          <p className="font-medium">
            {getStatusLabel(requisition.status)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
