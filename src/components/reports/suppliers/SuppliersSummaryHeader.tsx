import React from "react";
import { useTranslation } from "react-i18next";

const SuppliersSummaryHeader: React.FC = () => {
  const { t } = useTranslation(["reports"]);
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("reports:suppliersSummary.title")}
        </h1>
        <p className="text-slate-500 mt-1">
          {t("reports:suppliersSummary.subtitle")}
        </p>
      </div>
    </div>
  );
};

export default SuppliersSummaryHeader;

