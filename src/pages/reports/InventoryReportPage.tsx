// src/pages/reports/InventoryReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm,} from "react-hook-form"; // RHF for filters
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";

import {
  useNavigate,
  useSearchParams,
 
} from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pagination,

  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; // Assuming shadcn pagination component
import {
  Loader2,

  AlertCircle,
  ArrowLeft,

} from "lucide-react";

// API Client & Types
import apiClient, { getErrorMessage } from "@/lib/axios";
import { Product } from "@/services/productService"; // Reuse Product type

import { InventoryReportFilters } from "@/components/reports/inventory/InventoryReportFilters";
import { InventoryReportTable } from "@/components/reports/inventory/InventoryReportTable";
import { PaginatedResponse } from "@/services/clientService";

// --- Zod Schema for Filter Form ---
const inventoryFilterSchema = z.object({
  search: z.string().optional(),
  lowStockOnly: z.boolean().optional().default(false),
  outOfStockOnly: z.boolean().optional().default(false),
  // categoryId: z.string().nullable().optional(), // If categories are implemented
});

type InventoryFilterValues = z.infer<typeof inventoryFilterSchema>;

// --- Component ---
const InventoryReportPage: React.FC = () => {
  const { t } = useTranslation(["reports", "products", "common", "validation"]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [reportData, setReportData] =
    useState<PaginatedResponse<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Categories state if implemented
  // const [categories, setCategories] = useState<Category[]>([]);
  // const [loadingCategories, setLoadingCategories] = useState(false);

  // --- Initialize Form with URL Search Params ---
  const form = useForm<InventoryFilterValues>({
    resolver: zodResolver(inventoryFilterSchema),
    defaultValues: {
      search: searchParams.get("search") || "",
      lowStockOnly: searchParams.get("lowStockOnly") === "true",
      outOfStockOnly: searchParams.get("outOfStockOnly") === "true",
      // categoryId: searchParams.get('categoryId') || null,
    },
  });
  const {reset,  } = form;

  // --- Fetch Data for Filters (e.g., Categories - if implemented) ---
  // useEffect(() => { /* Fetch categories logic */ }, []);

  // --- Fetch Report Data ---
  const fetchReport = useCallback(
    async (filters: InventoryFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      console.log("Fetching Inventory Report:", { ...filters, page });
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        if (filters.search) params.append("search", filters.search);
        if (filters.lowStockOnly) params.append("low_stock_only", "true");
        if (filters.outOfStockOnly) params.append("out_of_stock_only", "true");
        // if (filters.categoryId) params.append('category_id', filters.categoryId);

        const response = await apiClient.get<PaginatedResponse<Product>>(
          `/reports/inventory?${params.toString()}`
        );
        setReportData(response.data);
      } catch (err) {
        const errorMsg = getErrorMessage(err);
        setError(errorMsg);
        toast.error(t("common:error"), { description: errorMsg });
        setReportData(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );


  // --- Effect to Fetch Report When Filters/Page Change ---
  const currentFilters = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      lowStockOnly: searchParams.get("lowStockOnly") === "true",
      outOfStockOnly: searchParams.get("outOfStockOnly") === "true",
      // categoryId: searchParams.get('categoryId') || null,
    }),
    [searchParams]
  );

  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  useEffect(() => {
    reset(currentFilters); // Sync form with URL
    fetchReport(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchReport, reset]);


   // --- Filter Handlers ---
   const handleFilterSubmit = (data: InventoryFilterValues) => {
    const newParams = new URLSearchParams();
    if (data.search) newParams.set('search', data.search);
    if (data.lowStockOnly) newParams.set('lowStockOnly', 'true'); else newParams.delete('lowStockOnly');
    if (data.outOfStockOnly) newParams.set('outOfStockOnly', 'true'); else newParams.delete('outOfStockOnly');
    newParams.set('page', '1');
    setSearchParams(newParams);
};
const handleClearFilters = () => { setSearchParams({ page: '1' }); };
  // --- Render Page ---
  return  (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
        <div className="flex items-center mb-6 gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-2xl md:text-3xl font-semibold">{t('reports:inventoryReportTitle')}</h1>
        </div>

        <InventoryReportFilters
            defaultValues={currentFilters}
            onFilterSubmit={handleFilterSubmit}
            onClearFilters={handleClearFilters}
            isLoading={isLoading}
        />

        {isLoading && ( <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> )}
        {!isLoading && error && ( <Alert variant="destructive" className="mt-6"><AlertCircle className="h-4 w-4" /><AlertTitle>{t('common:error')}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> )}
        {!isLoading && !error && reportData && (
            <>
                <Card className="dark:bg-gray-900 mt-6">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{t('reports:results')}</CardTitle>
                         <CardDescription>{t('common:paginationSummary', { from: reportData.from, to: reportData.to, total: reportData.total })}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <InventoryReportTable products={reportData.data} />
                    </CardContent>
                </Card>
                 {reportData.last_page > 1 && (
                    <Pagination className="mt-4">
                        {currentPage > 1 ? (
                            <PaginationPrevious
                                onClick={() => setSearchParams({ page: (currentPage - 1).toString() })}
                            >
                                {t('common:previous')}
                            </PaginationPrevious>
                        ) : (
                            <PaginationPrevious
                                onClick={(e) => e.preventDefault()}
                                className="cursor-not-allowed opacity-50"
                            >
                                {t('common:previous')}
                            </PaginationPrevious>
                        )}
                        {Array.from({ length: reportData.last_page }, (_, i) => i + 1).map((page) => (
                            <PaginationItem
                                key={page}
                                className={cn({ "active-class": page === currentPage })}
                            >
                                <PaginationLink
                                    onClick={() => setSearchParams({ page: page.toString() })}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        {currentPage === reportData.last_page ? (
                            <PaginationNext
                                onClick={(e) => e.preventDefault()}
                                className="cursor-not-allowed opacity-50"
                            >
                                {t('common:next')}
                            </PaginationNext>
                        ) : (
                            <PaginationNext
                                onClick={() => setSearchParams({ page: (currentPage + 1).toString() })}
                            >
                                {t('common:next')}
                            </PaginationNext>
                        )}
                    </Pagination>
                 )}
            </>
        )}
         {!isLoading && !error && !reportData?.data?.length && ( <div className="text-center py-10 text-muted-foreground">{t('common:noResults')}</div> )}
    </div>
);
};

export default InventoryReportPage;
