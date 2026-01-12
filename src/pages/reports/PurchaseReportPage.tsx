// src/pages/reports/PurchaseReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth } from "date-fns";

// Services and Types
import purchaseService from "../../services/purchaseService";
import type { Purchase } from "../../services/purchaseService";
import { getErrorMessage } from "../../lib/axios";
import supplierService, { Supplier } from "../../services/supplierService";

// Sub-components
import {
  PurchaseReportHeader,
  PurchaseReportFilters,
  PurchaseReportSummaryStats,
  PurchaseReportLoadingState,
  PurchaseReportErrorState,
  PurchaseReportTable,
  type ReportFilterValues,
} from "../../components/reports/purchases";

// --- Zod Schema for Filter Form ---
const reportFilterSchema = z
  .object({
    startDate: z.date().nullable().optional(),
    endDate: z.date().nullable().optional(),
    supplierId: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      !data.endDate || !data.startDate || data.endDate >= data.startDate,
    {
      message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
      path: ["endDate"],
    }
  );

// --- Component ---
const PurchaseReportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // --- Form ---
  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : startOfMonth(new Date()),
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : new Date(),
      supplierId: searchParams.get("supplierId") || null,
      status: searchParams.get("status") || null,
    },
  });
  const { control, handleSubmit, reset } = form;

  // --- Fetch Data for Filters (Suppliers) ---
  const fetchSuppliersForFilter = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const response = await supplierService.getSuppliers(1, "");
      setSuppliers(response.data || []);
    } catch (err) {
      toast.error("خطأ", {
        description: supplierService.getErrorMessage(err),
      });
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliersForFilter();
  }, [fetchSuppliersForFilter]);

  // --- Fetch Report Data ---
  const fetchReport = useCallback(
    async (filters: ReportFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("per_page", "15");

        // Backend supports date range filter
        if (filters.startDate) {
          params.append("start_date", format(filters.startDate, "yyyy-MM-dd"));
        }

        if (filters.endDate) {
          params.append("end_date", format(filters.endDate, "yyyy-MM-dd"));
        }

        if (filters.supplierId) {
          params.append("supplier_id", filters.supplierId);
        }

        if (filters.status) {
          params.append("status", filters.status);
        }

        const data = await purchaseService.getPurchases(
          page,
          params.toString()
        );
        setReportData(data);
      } catch (err: any) {
        const errorMsg = getErrorMessage(err) || "حدث خطأ أثناء جلب البيانات";
        setError(errorMsg);
        toast.error("خطأ", { description: errorMsg });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // --- Effect to Fetch Report When Filters/Page Change ---
  const currentFilters = useMemo(
    () => ({
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : null,
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : null,
      supplierId: searchParams.get("supplierId") || null,
      status: searchParams.get("status") || null,
    }),
    [searchParams]
  );
  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  useEffect(() => {
    reset({
      startDate: currentFilters.startDate ?? null,
      endDate: currentFilters.endDate ?? null,
      supplierId: currentFilters.supplierId,
      status: currentFilters.status,
    });
    fetchReport(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchReport, reset]);

  // --- Filter Form Submit Handler ---
  const onFilterSubmit: SubmitHandler<ReportFilterValues> = (data) => {
    const newParams = new URLSearchParams();
    if (data.startDate)
      newParams.set("startDate", format(data.startDate, "yyyy-MM-dd"));
    if (data.endDate)
      newParams.set("endDate", format(data.endDate, "yyyy-MM-dd"));
    if (data.supplierId) newParams.set("supplierId", data.supplierId);
    if (data.status) newParams.set("status", data.status);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  // --- Clear Filters Handler ---
  const clearFilters = () => {
    reset({
      startDate: startOfMonth(new Date()),
      endDate: new Date(),
      supplierId: null,
      status: null,
    });
    setSearchParams({ page: "1" });
  };

  // --- Pagination Handler ---
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  // --- Retry Handler ---
  const handleRetry = () => {
    fetchReport(currentFilters, currentPage);
  };

  // --- Calculate Summary Stats ---
  const summaryStats = useMemo(() => {
    if (!reportData?.data) return null;

    const totalPurchases = reportData.data.length;
    const totalAmount = reportData.data.reduce(
      (sum: number, purchase: Purchase) => sum + Number(purchase.total_amount || 0),
      0
    );
    const pendingCount = reportData.data.filter(
      (purchase: Purchase) => purchase.status === "pending"
    ).length;

    const averagePurchase =
      totalPurchases > 0 ? totalAmount / totalPurchases : 0;

    return {
      totalPurchases,
      totalAmount,
      pendingCount,
      averagePurchase,
    };
  }, [reportData]);

  // --- Render Page ---
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6" dir="rtl">
      <PurchaseReportHeader />

      <div className="mx-auto max-w-[1400px]">
        {/* Filters Bar */}
        <FormProvider {...form}>
          <PurchaseReportFilters
            control={control}
            onSubmit={handleSubmit(onFilterSubmit)}
            onClear={clearFilters}
            isLoading={isLoading}
            suppliers={suppliers}
            loadingSuppliers={loadingSuppliers}
          />
        </FormProvider>

        {/* Main Content */}
        <div>
          {/* Summary Stats */}
          {summaryStats && <PurchaseReportSummaryStats stats={summaryStats} />}

          {/* Loading State */}
          {isLoading && <PurchaseReportLoadingState />}

          {/* Error State */}
          {!isLoading && error && (
            <PurchaseReportErrorState error={error} onRetry={handleRetry} />
          )}

          {/* Results */}
          {!isLoading && !error && reportData && (
            <PurchaseReportTable
              data={reportData.data || []}
              meta={reportData.meta}
              currentPage={currentPage}
              isLoading={isLoading}
              summaryStats={summaryStats}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseReportPage;
