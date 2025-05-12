// src/components/inventory/requisitions/RequisitionHeaderDisplay.tsx
import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["inventory", "common"]);

  if (!requisition) return null;

  return (
    <Card className="mb-6 dark:bg-gray-900">
      <CardHeader>
        <CardTitle>{t("inventory:requisitionSummary")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <FormLabel>{t("inventory:requestId")}</FormLabel>
          <p className="font-medium">
            REQ-{String(requisition.id).padStart(5, "0")}
          </p>
        </div>
        <div>
          <FormLabel>{t("inventory:requester")}</FormLabel>
          <p className="font-medium">
            {requisition.requester_name || t("common:n/a")}
          </p>
        </div>
        <div>
          <FormLabel>{t("inventory:requestDate")}</FormLabel>
          <p className="font-medium">{formatDate(requisition.request_date)}</p>
        </div>
        <div className="md:col-span-3">
          <FormLabel>{t("inventory:departmentOrReason")}</FormLabel>
          <p className="font-medium">
            {requisition.department_or_reason || "---"}
          </p>
        </div>
        {requisition.notes && (
          <div className="md:col-span-3">
            <FormLabel>{t("common:notes")}</FormLabel>
            <p className="text-sm whitespace-pre-wrap">{requisition.notes}</p>
          </div>
        )}
        <div>
          <FormLabel>{t("common:status")}</FormLabel>
          <p className="font-medium">
            {t(`inventory:status_${requisition.status}`)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
