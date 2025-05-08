// src/pages/reports/InventoryReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form"; // RHF for filters
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"; // For expandable rows
import {
  useNavigate,
  useSearchParams,
  Link as RouterLink,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input"; // For search
import { Checkbox } from "@/components/ui/checkbox"; // For boolean filters
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
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; // Assuming shadcn pagination component
import {
  Loader2,
  Filter,
  X,
  Search,
  AlertCircle,
  ArrowLeft,
  PackageCheck,
  Edit,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// API Client & Types
import apiClient, { getErrorMessage } from "@/lib/axios";
import { Product, PaginatedResponse } from "@/services/productService"; // Reuse Product type

// Helpers
import { formatNumber } from "@/constants";
import dayjs from "dayjs";

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
  const [openCollapsibles, setOpenCollapsibles] = useState<
    Record<number, boolean>
  >({}); // To track expanded rows
  // --- State ---
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
  const { control, handleSubmit, reset, watch } = form;

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
  const toggleBatchDetails = (productId: number) => {
    setOpenCollapsibles((prev) => ({ ...prev, [productId]: !prev[productId] }));
    // Here you could fetch batches for *only* this product if not already loaded:
    // if (!prev[productId] && !reportData?.data.find(p=>p.id === productId)?.available_batches?.length) {
    //   fetchBatchesForProduct(productId); // New function needed
    // }
  };

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

  // --- Filter Form Submit Handler ---
  const onFilterSubmit: SubmitHandler<InventoryFilterValues> = (data) => {
    console.log("Applying inventory filters:", data);
    const newParams = new URLSearchParams();
    if (data.search) newParams.set("search", data.search);
    if (data.lowStockOnly) newParams.set("lowStockOnly", "true");
    if (data.outOfStockOnly) newParams.set("outOfStockOnly", "true");
    // if (data.categoryId) newParams.set('categoryId', data.categoryId);
    newParams.set("page", "1"); // Reset to page 1 when filters change
    setSearchParams(newParams);
  };

  // --- Clear Filters Handler ---
  const clearFilters = () => {
    const defaultFormValues = {
      search: "",
      lowStockOnly: false,
      outOfStockOnly: false /*, categoryId: null */,
    };
    reset(defaultFormValues);
    setSearchParams({ page: "1" });
  };

  // --- Pagination Handler ---
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  // --- Render Page ---
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
          {t("reports:inventoryReportTitle")}
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
                {/* Search Input */}
                <FormField
                  control={control}
                  name="search"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common:search")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("products:searchPlaceholder")}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category Select - If implemented */}
                {/* <FormField control={control} name="categoryId" render={({ field }) => ( <FormItem> <FormLabel>{t('products:category')}</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={loadingCategories}> <FormControl><SelectTrigger> <SelectValue placeholder={t('reports:allCategories')} /> </SelectTrigger></FormControl> <SelectContent> <SelectItem value="">{t('reports:allCategories')}</SelectItem> {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} /> */}

                {/* Boolean Filters */}
                <div className="flex flex-col space-y-2 pt-2 sm:pt-0 md:pt-6">
                  {/* Align with other fields */}
                  <FormField
                    control={control}
                    name="lowStockOnly"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t("reports:showLowStockOnly")}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  {/* Add key */}
                  <FormField
                    control={control}
                    name="outOfStockOnly"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t("reports:showOutOfStockOnly")}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  {/* Add key */}
                </div>
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
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}
      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    {/* For expand icon */}
                    <TableHead>{t("products:sku")}</TableHead>
                    <TableHead>{t("products:name")}</TableHead>
                    <TableHead className="text-center">
                      {t("products:stockQuantity")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("products:stockAlertLevel")}
                    </TableHead>
                    {/* <TableHead className="text-right">{t('products:latestPurchaseCost')}</TableHead> */}
                    {/* If available */}
                    <TableHead className="text-center">
                      {t("common:actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("common:noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                  {reportData.data.map((product) => {
                    const isLow =
                      product.stock_alert_level !== null &&
                      product.stock_quantity <= product.stock_alert_level;
                    const isOutOfStock = product.stock_quantity <= 0;
                    return (
                      <React.Fragment key={product.id}>
                        <TableRow
                          key={product.id}
                          className={cn(
                            isLow &&
                              !isOutOfStock &&
                              "bg-orange-50 dark:bg-orange-900/30",
                            isOutOfStock && "bg-red-50 dark:bg-red-900/30"
                          )}
                        >
                          <TableCell>
                          <Collapsible>  {product.available_batches &&
                              product.available_batches.length > 0 && ( // Show expand only if batches exist
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      toggleBatchDetails(product.id)
                                    }
                                  >
                                    {openCollapsibles[product.id] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              )}</Collapsible>
                          
                          </TableCell>
                          <TableCell>{product.sku || "---"}</TableCell>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell className="text-center">
                            {formatNumber(product.stock_quantity)}
                          </TableCell>
                          <TableCell className="text-center">
                            {product.stock_alert_level !== null
                              ? formatNumber(product.stock_alert_level)
                              : "---"}
                          </TableCell>
                          {/* <TableCell className="text-right">{product.latest_purchase_cost ? formatCurrency(product.latest_purchase_cost) : '---'}</TableCell> */}
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" asChild>
                              <RouterLink to={`/products/${product.id}/edit`}>
                                {t("common:edit")}
                              </RouterLink>
                              {/* Link to product edit page */}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* Collapsible Content for Batches */}
                        {product.available_batches &&
                          product.available_batches.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="p-0">
                                
                                {/* Remove padding for full-width collapsible */}
                                <Collapsible
                                  open={openCollapsibles[product.id]}
                                >
                                  <CollapsibleContent className="p-4 bg-slate-50 dark:bg-slate-800/50">
                                    <h4 className="text-sm font-semibold mb-2">
                                      {t("reports:batchDetailsFor", {
                                        name: product.name,
                                      })}
                                    </h4>
                                    {/* Add key */}
                                    {product.available_batches.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">
                                        {t("reports:noBatchesAvailable")}
                                      </p> /* Add key */
                                    ) : (
                                        <Table className="text-center" size="sm">
                                        <TableHeader>
                                          <TableRow>
                                          <TableHead className="text-xs text-center">
                                            {t("purchases:batchNumber")}
                                          </TableHead>
                                          <TableHead className="text-xs text-center">
                                            {t("reports:remainingQty")}
                                          </TableHead>
                                            {/* Add key */}
                                            <TableHead className="text-xs text-center">
                                              {t("purchases:expiryDate")}
                                            </TableHead>
                                            <TableHead className="text-xs text-right">
                                              {t("purchases:unitCost")}
                                            </TableHead>
                                            <TableHead className="text-xs text-right">
                                              {t("purchases:intendedSalePrice")}
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {product.available_batches.map(
                                            (batch) => (
                                              <TableRow key={batch.id}>
                                                <TableCell className="text-xs">
                                                  {batch.batch_number || "---"}
                                                </TableCell>
                                                <TableCell className="text-xs text-center">
                                                  {formatNumber(
                                                    batch.remaining_quantity
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                  {batch.expiry_date
                                                    ? dayjs(
                                                        batch.expiry_date
                                                      ).format("YYYY-MM-DD")
                                                    : "---"}
                                                </TableCell>
                                                <TableCell className="text-xs text-right">
                                                  {formatNumber(
                                                    batch.unit_cost
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-xs text-right">
                                                  {batch.sale_price
                                                    ? formatNumber(
                                                        batch.sale_price
                                                      )
                                                    : "---"}
                                                </TableCell>
                                              </TableRow>
                                            )
                                          )}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </CollapsibleContent>
                                </Collapsible>
                              </TableCell>
                            </TableRow>
                          )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* shadcn Pagination */}
          {reportData.meta.last_page > 1 && (
            <div className="flex justify-center items-center pt-6">
              <Pagination>
                <PaginationContent className="flex items-center">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage - 1);
                      }}
                      aria-disabled={currentPage === 1 || isLoading}
                      tabIndex={currentPage === 1 ? -1 : undefined}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>
                      {currentPage}
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage + 1);
                      }}
                      aria-disabled={
                        currentPage === reportData.meta.last_page || isLoading
                      }
                      tabIndex={
                        currentPage === reportData.meta.last_page ? -1 : undefined
                      }
                      className={
                        currentPage === reportData.meta.last_page
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryReportPage;
