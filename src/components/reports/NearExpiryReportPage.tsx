// src/pages/reports/NearExpiryReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import {
  useNavigate,
  useSearchParams,
  Link as RouterLink,
} from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, addDays, differenceInDays } from "date-fns"; // For date calculations
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input"; // For threshold and product search
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent /* ... */,
} from "@/components/ui/pagination";
import {
  Loader2,
  Filter,
  X,
  AlertCircle,
  ArrowLeft,
  PackageSearch,
  CalendarClock,
  Edit,
} from "lucide-react";

// API Client & Types
import apiClient, { getErrorMessage } from "@/lib/axios";
import { PurchaseItem as PurchaseItemType } from "@/services/purchaseService"; // Use PurchaseItem type as it represents a batch
import { Product as ProductType } from "@/services/productService"; // For product name in table
import { formatCurrency, formatDate, formatNumber } from "@/constants";
import { PaginatedResponse } from "@/services/clientService";

// --- Zod Schema for Filter Form ---
const nearExpiryFilterSchema = z.object({
  daysThreshold: z.coerce.number().int().min(1).max(365).default(30),
  productId: z.string().nullable().optional(), // For filtering by a specific product
  // categoryId: z.string().nullable().optional(),
});
type NearExpiryFilterValues = z.infer<typeof nearExpiryFilterSchema>;

// Define the structure of the items returned by the API
// This will be PurchaseItemType with product eager loaded
interface NearExpiryItem extends PurchaseItemType {
  product?: Pick<ProductType, "id" | "name" | "sku">; // Ensure product details are included
}
interface PaginatedNearExpiryItems extends PaginatedResponse<NearExpiryItem> {}

// --- Component ---
const NearExpiryReportPage: React.FC = () => {
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
  const [reportData, setReportData] = useState<PaginatedNearExpiryItems | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add state for product filter dropdown if needed

  // --- Form for Filters ---
  const form = useForm<NearExpiryFilterValues>({
    resolver: zodResolver(nearExpiryFilterSchema),
    defaultValues: {
      daysThreshold: Number(searchParams.get("daysThreshold")) || 30,
      productId: searchParams.get("productId") || null,
    },
  });
  const { control, handleSubmit, reset, watch } = form;

  // --- Fetch Report Data ---
  const fetchReport = useCallback(
    async (filters: NearExpiryFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("days_threshold", String(filters.daysThreshold || 30));
        if (filters.productId) params.append("product_id", filters.productId);

        const response = await apiClient.get<PaginatedNearExpiryItems>(
          `/reports/near-expiry?${params.toString()}`
        );
        setReportData(response.data);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // --- Effect to Fetch Report When Filters/Page Change from URL ---
  const currentFilters = useMemo<NearExpiryFilterValues>(
    () => ({
      daysThreshold: Number(searchParams.get("daysThreshold")) || 30,
      productId: searchParams.get("productId") || null,
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

  // --- Filter Form Submit ---
  const onFilterSubmit: SubmitHandler<NearExpiryFilterValues> = (data) => {
    const newParams = new URLSearchParams();
    newParams.set("daysThreshold", String(data.daysThreshold || 30));
    if (data.productId) newParams.set("productId", data.productId);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  // --- Clear Filters ---
  const clearFilters = () => {
    reset({ daysThreshold: 30, productId: null });
    setSearchParams({ page: "1" });
  };

  // --- Pagination ---
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
  };
  // Remove unused paginationItems or implement if needed
  // const paginationItems = useMemo(() => { /* ... generatePagination logic ... */ }, [currentPage, reportData?.last_page]);

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center mb-6 gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          {t("reports:nearExpiryReportTitle")} {/* Add key */}
        </h1>
      </div>

      {/* Filter Form Card */}
      <Card className="dark:bg-gray-900 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t("common:filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onFilterSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                <FormField
                  control={control}
                  name="daysThreshold"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      
                      <FormLabel>{t("reports:daysThreshold")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="30"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                {/* Add key */}
                {/* Add Product Filter Combobox Here if needed */}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearFilters}
                  disabled={isLoading}
                >
                  <X className="me-2 h-4 w-4" />
                  {t("common:clearFilters")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Filter className="me-2 h-4 w-4" />
                  )}
                  {t("common:applyFilters")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Report Results Section */}
      {isLoading && (
        <div className="flex justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!isLoading && !error && reportData && (
        <>
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("reports:results")}</CardTitle>
              <CardDescription>
                {t("common:paginationSummary", {
                  from: reportData.from,
                  to: reportData.to,
                  total: reportData.total,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("products:product")}</TableHead>
                    <TableHead>{t("products:sku")}</TableHead>
                    <TableHead>{t("purchases:batchNumber")}</TableHead>
                    <TableHead className="text-center">
                      {t("reports:remainingQty")}
                    </TableHead>
                    <TableHead>{t("purchases:expiryDate")}</TableHead>
                    <TableHead className="text-center">
                      {t("reports:daysToExpiry")}
                    </TableHead>
                    {/* Add key */}
                    <TableHead className="text-right">
                      {t("purchases:costPerUnit")} (
                      {t("products:sellableUnits")})
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("reports:noNearExpiryItems")}
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Add key */}
                  {reportData.data.map((item) => {
                    const expiry = item.expiry_date
                      ? parseISO(item.expiry_date)
                      : null;
                    const daysLeft = expiry
                      ? differenceInDays(expiry, new Date())
                      : null;
                    const isVerySoon = daysLeft !== null && daysLeft <= 7; // Example: highlight if <= 7 days
                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          isVerySoon && "bg-yellow-50 dark:bg-yellow-900/30",
                          daysLeft !== null &&
                            daysLeft < 0 &&
                            "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                        )}
                      >
                        
                        {/* Highlight expired */}
                        <TableCell className="font-medium">
                          {item.product?.name || `ID: ${item.product_id}`}
                        </TableCell>
                        <TableCell>{item.product?.sku || "---"}</TableCell>
                        <TableCell>{item.batch_number || "---"}</TableCell>
                        <TableCell className="text-center">
                          {formatNumber(item.remaining_quantity)}
                        </TableCell>
                        <TableCell>
                          {item.expiry_date
                            ? formatDate(item.expiry_date)
                            : t("common:n/a")}
                        </TableCell>
                        <TableCell
                          className={`text-center font-medium ${
                            isVerySoon
                              ? "text-orange-600 dark:text-orange-400"
                              : ""
                          } ${
                            daysLeft !== null && daysLeft < 0
                              ? "text-red-600 dark:text-red-300"
                              : ""
                          }`}
                        >
                          {daysLeft !== null
                            ? daysLeft < 0
                              ? t("reports:expired")
                              : daysLeft
                            : t("common:n/a")}
                          {/* Add key */}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.cost_per_sellable_unit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {reportData.last_page > 1 && (
            <div className="mt-6 flex justify-end">
              <Pagination
                page={currentPage}
                pageCount={reportData.last_page}
                onPageChange={handlePageChange}
              >
                <PaginationContent />
              </Pagination>
            </div>
          )}
        </>
      )}
      {!isLoading && !error && (!reportData || !reportData.data?.length) && (
        <div className="text-center text-muted-foreground my-8">
          <PackageSearch className="mx-auto mb-2 h-8 w-8" />
          <div>{t("reports:noNearExpiryItems")}</div>
        </div>
      )}
    </div>
  );
};

export default NearExpiryReportPage;
