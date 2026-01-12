// src/pages/reports/SuppliersSummaryPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Building } from "lucide-react";
import supplierService, {
  type SupplierSummary,
} from "@/services/supplierService";
import { getErrorMessage } from "@/lib/axios";
import {
  SuppliersSummaryHeader,
  SuppliersSummaryTable,
} from "@/components/reports/suppliers";

const SuppliersSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliersSummary();
  }, []);

  const fetchSuppliersSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supplierService.getSuppliersSummary();
      setSuppliers(data);
    } catch (err: any) {
      const errorMsg =
        getErrorMessage(err) || "حدث خطأ أثناء جلب بيانات الموردين";
      setError(errorMsg);
      toast.error("خطأ", { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };


  const handleRowClick = (supplier: SupplierSummary) => {
    navigate(`/reports/suppliers/${supplier.id}/purchases`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6" dir="rtl">
      <SuppliersSummaryHeader />

      <div className="mx-auto max-w-[1400px]">
        {/* Loading State */}
        {isLoading && (
          <Card className="border-0 shadow-sm ">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuppliersSummary}
              className="mr-auto border-red-200 hover:bg-red-100 text-red-700"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              إعادة المحاولة
            </Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
        //   <Card className="border-0 shadow-sm">
        //     <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden">
                {suppliers.length === 0 ? (
                  <div className="h-64 text-center flex flex-col items-center justify-center text-slate-500">
                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                      <Building className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">
                      لا يوجد موردون
                    </h3>
                    <p>لا توجد بيانات موردين لعرضها</p>
                  </div>
                ) : (
                  <>
                    <SuppliersSummaryTable
                      data={suppliers}
                      onRowClick={handleRowClick}
                    />
                    <div className="border-t">
                      {/* <SuppliersSummaryTotals
                        totalDebit={totals.totalDebit}
                        totalCredit={totals.totalCredit}
                        totalBalance={totals.totalBalance}
                      /> */}
                    </div>
                  </>
                )}
              </div>
        //     </CardContent>
        //   </Card>
        )}
      </div>
    </div>
  );
};

export default SuppliersSummaryPage;

