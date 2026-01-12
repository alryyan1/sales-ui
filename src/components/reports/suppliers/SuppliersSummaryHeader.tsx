import React from "react";

const SuppliersSummaryHeader: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          ملخص الموردين
        </h1>
        <p className="text-slate-500 mt-1">
          عرض جميع الموردين مع إجمالي الديون والائتمانات والرصيد
        </p>
      </div>
    </div>
  );
};

export default SuppliersSummaryHeader;

