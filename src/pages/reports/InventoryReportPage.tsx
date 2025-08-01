// src/pages/reports/InventoryReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Assuming you have this from shadcn/ui setup

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  PackageCheck,
  FileText,
} from "lucide-react";

// API Client & Types
import apiClient, { getErrorMessage } from "@/lib/axios";
import {
  Product as ProductType
} from "@/services/productService"; // Ensure ProductType includes available_batches and new accessors
import { PaginatedResponse } from "@/services/clientService"; // Assuming shared type

// Child Components
import {
  InventoryReportFilters,
  InventoryFilterValues,
} from "../../components/reports/inventory/InventoryReportFilters"; // Path to your filter component
import { InventoryReportTable } from "../../components/reports/inventory/InventoryReportTable"; // Path to your table component
import { formatNumber } from "@/constants";
import { PurchaseItem } from "@/services/purchaseService";
import { PdfViewerDialog } from "@/components/common/PdfViewerDialog";

// Interface for Product with potentially loaded batches for this page
interface ProductWithBatches extends Omit<ProductType, 'available_batches'> {
  available_batches?: PurchaseItem[];
}
type PaginatedProductsWithBatches = PaginatedResponse<ProductWithBatches>;

// Pagination helper function (place in a utils file or define here)
const DOTS = "...";
const generatePagination = (
  currentPage: number,
  totalPages: number,
  siblingCount = 1
) => {
  const totalPageNumbers = siblingCount + 5; // siblingCount + firstPage + lastPage + currentPage + 2*DOTS

  /*
      Case 1:
      If the number of pages is less than the page numbers we want to show in our
      paginationComponent, we return the range [1..totalPageNumbers]
    */
  if (totalPages <= totalPageNumbers - 2) {
    // -2 for first and last page always shown
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, DOTS, lastPageIndex];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => lastPageIndex - rightItemCount + 1 + i
    );
    return [firstPageIndex, DOTS, ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
  }
  return []; // Should not happen
};

const InventoryReportPage: React.FC = () => {
  const { t } = useTranslation([
    "reports",
    "products",
    "common",
    "purchases",
    "validation",
  ]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [reportData, setReportData] =
    useState<PaginatedProductsWithBatches | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  // Add categories state here if implementing category filter
  // const [categories, setCategories] = useState<Category[]>([]);
  // const [loadingCategories, setLoadingCategories] = useState(false);

  // --- Filters from URL ---
  const currentFilters = useMemo<InventoryFilterValues>(
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

  // --- Fetch Report Data ---
  const fetchReport = useCallback(
    async (filters: InventoryFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        if (filters.search) params.append("search", filters.search);
        if (filters.lowStockOnly) params.append("low_stock_only", "true");
        if (filters.outOfStockOnly) params.append("out_of_stock_only", "true");
        // if (filters.categoryId) params.append('category_id', filters.categoryId);

        // ALWAYS INCLUDE BATCHES for this report version to allow expansion
        params.append("include_batches", "true");

        const response = await apiClient.get<PaginatedProductsWithBatches>(
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
    [t]
  ); // Added t as dependency for toast

  // --- Effect to Fetch Report When Filters/Page Change from URL ---
  useEffect(() => {
    fetchReport(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchReport]); // Fetch when filters or page from URL change

  // --- Filter Handlers ---
  const handleFilterSubmit = (data: InventoryFilterValues) => {
    const newParams = new URLSearchParams();
    if (data.search) newParams.set("search", data.search);
    else newParams.delete("search");
    if (data.lowStockOnly) newParams.set("lowStockOnly", "true");
    else newParams.delete("lowStockOnly");
    if (data.outOfStockOnly) newParams.set("outOfStockOnly", "true");
    else newParams.delete("outOfStockOnly");
    // if (data.categoryId) newParams.set('categoryId', data.categoryId); else newParams.delete('categoryId');
    newParams.set("page", "1"); // Reset to page 1 when filters change
    setSearchParams(newParams);
  };

  // --- PDF Export Handler ---
  const handleExportPdf = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (currentFilters.search) params.append("search", currentFilters.search);
      if (currentFilters.lowStockOnly) params.append("low_stock_only", "true");
      if (currentFilters.outOfStockOnly) params.append("out_of_stock_only", "true");

      const url = `/api/reports/inventory-pdf?${params.toString()}`;
      setPdfUrl(url);
      setPdfDialogOpen(true);
    } catch (err) {
      toast.error(t("common:error"), {
        description: t("reports:errorGeneratingPdf"),
      });
    }
  }, [currentFilters, t]);
  const handleClearFilters = () => {
    // Does not reset form directly, relies on useEffect syncing form with URL params
    setSearchParams({ page: "1" }); // This will trigger useEffect which resets the form
  };

  // --- Pagination Handler ---
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const paginationItems = useMemo(() => {
    if (!reportData?.last_page || reportData.last_page <= 1) return [];
    return generatePagination(currentPage, reportData.last_page);
  }, [currentPage, reportData?.last_page]);

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard")}
            aria-label={t("common:back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
            {t("reports:inventoryReportTitle")}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {!isLoading && !error && reportData && (
            <Button
              variant="outline"
              onClick={handleExportPdf}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {t("reports:exportPdf")}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Form Component */}
      <InventoryReportFilters
        defaultValues={currentFilters} // Pass current filters to sync form
        onFilterSubmit={handleFilterSubmit}
        onClearFilters={handleClearFilters}
        isLoading={isLoading}
        // Pass categories and loadingCategories if implementing category filter
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common:errorFetchingData")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => fetchReport(currentFilters, currentPage)}
            >
              {t("common:retry")}
            </Button>
          </div>
        </Alert>
      )}

      {/* Report Results Section */}
      {!isLoading && !error && reportData && (
        <>
          <Card className="dark:bg-gray-900 mt-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4 sm:px-6">
              <CardTitle className="text-lg font-medium">
                {t("reports:results")}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {t("common:paginationSummary", {
                  from: formatNumber(reportData.from),
                  to: formatNumber(reportData.to),
                  total: formatNumber(reportData.total),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {" "}
              {/* Remove CardContent padding if table has its own */}
              <InventoryReportTable
                products={reportData.data}
                isLoading={isLoading} // Pass general loading state
              />
            </CardContent>
          </Card>

          {/* shadcn Pagination */}
          {reportData.last_page > 1 && (
            <div className="flex justify-center items-center pt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#" // Let onClick handle it
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      aria-disabled={currentPage === 1 || isLoading}
                      tabIndex={currentPage === 1 || isLoading ? -1 : undefined}
                      className={cn(
                        "rtl:rotate-180",
                        currentPage === 1 || isLoading
                          ? "pointer-events-none opacity-50"
                          : undefined
                      )}
                    />
                  </PaginationItem>

                  {paginationItems.map((page, index) => (
                    <PaginationItem
                      key={
                        typeof page === "number"
                          ? `page-${page}`
                          : `ellipsis-${index}`
                      }
                    >
                      {page === DOTS ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(page as number);
                          }}
                          isActive={currentPage === page}
                          aria-current={
                            currentPage === page ? "page" : undefined
                          }
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < reportData.last_page)
                          handlePageChange(currentPage + 1);
                      }}
                      aria-disabled={
                        currentPage === reportData.last_page || isLoading
                      }
                      tabIndex={
                        currentPage === reportData.last_page || isLoading
                          ? -1
                          : undefined
                      }
                      className={cn(
                        "rtl:rotate-180",
                        currentPage === reportData.last_page || isLoading
                          ? "pointer-events-none opacity-50"
                          : undefined
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
      {/* Message for No Results after successful fetch but empty data */}
      {!isLoading && !error && reportData && reportData.data.length === 0 && (
        <div className="text-center py-10 text-muted-foreground mt-6">
          <PackageCheck className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          {t("common:noResults")}
        </div>
      )}
      {/* Initial prompt if no filters applied and no data (before first fetch attempt with filters) */}
      {!isLoading &&
        !error &&
        !reportData &&
        !Object.values(currentFilters).some(Boolean) && (
          <div className="text-center py-10 text-muted-foreground mt-6">
            {t("reports:applyFiltersToView")} {/* Add key */}
          </div>
        )}

      {/* PDF Viewer Dialog */}
      <PdfViewerDialog
        isOpen={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        pdfUrl={pdfUrl}
        title={t("reports:inventoryReportTitle")}
      />
    </div>
  );
};

export default InventoryReportPage;
