// src/pages/reports/PurchaseReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination } from "@/components/ui/pagination"; // Assuming shadcn pagination component
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Calendar as CalendarIcon,
  Filter,
  X,
  Search,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

// Services and Types
import purchaseService, { Purchase } from "../../services/purchaseService"; // Use Purchase service
import supplierService, { Supplier } from "../../services/supplierService"; // For supplier filter dropdown
// Import UserService if filtering by user

// Helpers
import { formatNumber } from "@/constants";
import { Chip } from "@mui/material";
import dayjs from "dayjs";
import { PaginatedResponse } from "@/services/clientService";

// --- Zod Schema for Filter Form ---
const reportFilterSchema = z
  .object({
    startDate: z.date().nullable().optional(),
    endDate: z.date().nullable().optional(),
    supplierId: z.string().nullable().optional(), // Filter by supplier
    // userId: z.string().nullable().optional(),
    status: z.string().nullable().optional(), // Purchase statuses
  })
  .refine(
    (data) =>
      !data.endDate || !data.startDate || data.endDate >= data.startDate,
    {
      message: "validation:endDateAfterStart",
      path: ["endDate"],
    }
  );

type ReportFilterValues = z.infer<typeof reportFilterSchema>;

// --- Component ---
const PurchaseReportPage: React.FC = () => {
  const { t } = useTranslation([
    "reports",
    "purchases",
    "common",
    "suppliers",
    "validation",
  ]); // Add purchases, suppliers
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [reportData, setReportData] =
    useState<PaginatedResponse<Purchase> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Filter options state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // For supplier dropdown
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
      const response = await supplierService.getSuppliers(1, "", 9999);
      setSuppliers(response.data);
    } catch (err) {
      toast.error(t("common:error"), {
        description: supplierService.getErrorMessage(err),
      });
    } finally {
      setLoadingSuppliers(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSuppliersForFilter();
  }, [fetchSuppliersForFilter]);

  // --- Fetch Report Data ---
  const fetchReport = useCallback(
    async (filters: ReportFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = {
          page,
          startDate: filters.startDate
            ? format(filters.startDate, "yyyy-MM-dd")
            : "",
          endDate: filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : "",
          supplier_id: filters.supplierId || "", // Use supplier_id
          status: filters.status || "",
        };
        // Use purchaseService to get data
        const data = await purchaseService.getPurchases(
          params.page,
          "",
          params.status,
          params.startDate,
          params.endDate,
          Number(params.supplier_id)
          // Adjust service call signature if needed
        );
        setReportData(data);
      } catch (err) {
        /* ... error handling ... */
        setError(t("common:error"));
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
      supplierId: searchParams.get("supplierId") || null, // Use supplierId
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
      startDate: currentFilters.startDate ?? null, // Handle null for reset
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
    if (data.supplierId) newParams.set("supplierId", data.supplierId); // Use supplierId
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
      status: null /* userId: null */,
    }); // Reset form to defaults
    setSearchParams({ page: "1" }); // Reset URL params (triggers refetch via useEffect)
  };

  // --- Pagination Handler ---
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams); // Update URL, triggers useEffect
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
          {t("reports:purchaseReportTitle")} {/* Use correct title key */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Start Date */}
                <FormField
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      {" "}
                      <FormLabel>{t("common:startDate")}</FormLabel>{" "}
                      <Popover>
                        {" "}
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {" "}
                              <CalendarIcon className="me-2 h-4 w-4" />{" "}
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("common:pickDate")}</span>
                              )}{" "}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>{" "}
                      </Popover>{" "}
                      <FormMessage />{" "}
                    </FormItem>
                  )}
                />
                {/* End Date */}
                <FormField
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      {" "}
                      <FormLabel>{t("common:endDate")}</FormLabel>{" "}
                      <Popover>
                        {" "}
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {" "}
                              <CalendarIcon className="me-2 h-4 w-4" />{" "}
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("common:pickDate")}</span>
                              )}{" "}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>{" "}
                      </Popover>{" "}
                      <FormMessage />{" "}
                    </FormItem>
                  )}
                />
                {/* Supplier Select */}
                <FormField
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      {" "}
                      <FormLabel>{t("suppliers:supplier")}</FormLabel>{" "}
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={loadingSuppliers || isLoading}
                      >
                        {" "}
                        <FormControl>
                          <SelectTrigger>
                            {" "}
                            <SelectValue
                              placeholder={
                                t("reports:allSuppliers") || "All Suppliers"
                              }
                            />{" "}
                          </SelectTrigger>
                        </FormControl>{" "}
                        <SelectContent>
                          {" "}
                          <SelectItem value="all">
                            {t("reports:allSuppliers") || "All Suppliers"}
                          </SelectItem>{" "}
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                      <FormMessage />{" "}
                    </FormItem>
                  )}
                />
                {/* Status Select */}
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      {" "}
                      <FormLabel>{t("purchases:status")}</FormLabel>{" "}
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={isLoading}
                      >
                        {" "}
                        <FormControl>
                          <SelectTrigger>
                            {" "}
                            <SelectValue
                              placeholder={
                                t("reports:allStatuses") || "All Statuses"
                              }
                            />{" "}
                          </SelectTrigger>
                        </FormControl>{" "}
                        <SelectContent>
                          {" "}
                          <SelectItem value="all">
                            {t("reports:allStatuses") || "All Statuses"}
                          </SelectItem>{" "}
                          <SelectItem value="received">
                            {t("purchases:status_received")}
                          </SelectItem>
                          <SelectItem value="pending">
                            {t("purchases:status_pending")}
                          </SelectItem>
                          <SelectItem value="ordered">
                            {t("purchases:status_ordered")}
                          </SelectItem>{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                      <FormMessage />{" "}
                    </FormItem>
                  )}
                />
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
                  {" "}
                  {isLoading ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Filter className="me-2 h-4 w-4" />
                  )}{" "}
                  {t("common:applyFilters")}{" "}
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

      <>
        <Card className="dark:bg-gray-900">
          <CardHeader>
            <CardTitle>{t("reports:results")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Purchase Table Headers */}
                  <TableHead>{t("purchases:date")}</TableHead>
                  <TableHead>{t("purchases:reference")}</TableHead>
                  <TableHead>{t("suppliers:supplier")}</TableHead>{" "}
                  {/* Use supplier key */}
                  <TableHead>{t("common:recordedBy")}</TableHead>
                  <TableHead className="text-center">
                    {t("purchases:status")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("purchases:totalAmount")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("common:actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {t("common:noResults")}
                    </TableCell>
                  </TableRow>
                )}
                {reportData?.data.map((purchase) => (
                  <TableRow key={purchase.id}>
                    {/* Purchase Table Cells */}
                    <TableCell>
                      {dayjs(purchase.purchase_date).format("YYYY-MM-DD")}
                    </TableCell>
                    <TableCell>{purchase.reference_number || "---"}</TableCell>
                    <TableCell>
                      {purchase.supplier_name || t("common:n/a")}
                    </TableCell>
                    <TableCell>
                      {purchase.user_name || t("common:n/a")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Chip
                        label={t(`purchases:status_${purchase.status}`)}
                        size="small"
                        color={
                          purchase.status === "received"
                            ? "success"
                            : purchase.status === "pending"
                            ? "warning"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(purchase.total_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/purchases/${purchase.id}`)}
                      >
                        {t("common:view")}
                      </Button>{" "}
                      {/* Link to Purchase Details */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Pagination */}
        {reportData?.last_page > 1 && (
          <div className="flex justify-center items-center pt-6">
            {/* Replace with shadcn Pagination component if available */}
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="mx-1"
            >
              {t("common:previous")}
            </Button>
            <span className="px-3 py-1 text-sm text-gray-800 dark:text-gray-100">
              {t("common:page")} {currentPage} / {reportData?.last_page}
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === reportData?.last_page || isLoading}
              className="mx-1"
            >
              {t("common:next")}
            </Button>
          </div>
        )}
      </>
    </div>
  );
};

export default PurchaseReportPage;
