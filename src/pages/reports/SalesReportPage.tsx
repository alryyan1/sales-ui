// src/pages/reports/SalesReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom"; // Use search params for filters
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
import { Pagination } from "@/components/ui/pagination"; // Assuming you have/add a shadcn pagination component
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
  FileText,
} from "lucide-react";

// Services and Types
import saleService, { Sale } from "../../services/saleService"; // Use Sale types
import clientService, {
  Client,
  PaginatedResponse,
} from "../../services/clientService"; // For client filter dropdown
// Import UserService if filtering by user
// import userService, { User } from '../../services/userService';

// Helpers
import { formatNumber } from "@/constants"; // Your formatters
import { Chip } from "@mui/material";
import dayjs from "dayjs";

// --- Zod Schema for Filter Form ---
const reportFilterSchema = z
  .object({
    startDate: z.date().nullable().optional(),
    endDate: z.date().nullable().optional(),
    clientId: z.string().nullable().optional(), // Store ID as string from Select/Command
    // userId: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      !data.endDate || !data.startDate || data.endDate >= data.startDate,
    {
      message: "validation:endDateAfterStart", // Add key
      path: ["endDate"], // Associate error with end date
    }
  );

type ReportFilterValues = z.infer<typeof reportFilterSchema>;

// --- Component ---
const SalesReportPage: React.FC = () => {
  const { t } = useTranslation([
    "reports",
    "sales",
    "common",
    "clients",
    "validation",
  ]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams(); // To manage filters in URL
 
  // --- State ---
  const [reportData, setReportData] = useState<PaginatedResponse<Sale> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Filter options state
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // --- Initialize Form with URL Search Params ---
  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      // Read initial values from URL or set defaults
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : startOfMonth(new Date()),
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : new Date(), // Default to today
      clientId: searchParams.get("clientId") || null,
      status: searchParams.get("status") || null,
      // userId: searchParams.get('userId') || null,
    },
  });
  const { control, handleSubmit, reset, watch } = form;

  // --- Fetch Data for Filters (Clients) ---
  const fetchClientsForFilter = useCallback(async () => {
    setLoadingClients(true);
    try {
      // Fetch *all* clients for the filter dropdown (consider performance for huge lists)
      // Alternatively, use an async combobox like in SaleFormPage
      const response = await clientService.getClients(); // Fetch all for select
      setClients(response.data);
    } catch (err) {
      toast.error(t("common:error"), {
        description: clientService.getErrorMessage(err),
      });
    } finally {
      setLoadingClients(false);
    }
  }, [t]);

  useEffect(() => {
    fetchClientsForFilter();
  }, [fetchClientsForFilter]);

  // --- Fetch Report Data ---
  const fetchReport = useCallback(
    async (filters: ReportFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      console.log("Fetching Sales Report:", { ...filters, page });
      try {
        const params = {
          page,
          startDate: filters.startDate
            ? format(filters.startDate, "yyyy-MM-dd")
            : "",
          endDate: filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : "",
          client_id: filters.clientId || "",
          // user_id: filters.userId || '',
          status: filters.status || "",
        };
        const data = await saleService.getSales(
          // Use getSales with filters
          params.page,
          "", // No general search term here, handled by specific filters
          params.status,
          params.startDate,
          params.endDate,
          15, // Default per page
          Number(params.client_id) // Ensure ID is number if service expects it
          // Number(params.user_id)
        );
        setReportData(data);
      } catch (err) {
        const errorMsg = saleService.getErrorMessage(err);
        setError(errorMsg);
        toast.error(t("common:error"), { description: errorMsg });
        setReportData(null); // Clear data on error
      } finally {
        setIsLoading(false);
      }
    },
    []
  ); // No dependencies needed if filters are passed in

  // --- Effect to Fetch Report When Filters/Page Change ---
  // Use useMemo to stabilize the filters object based on searchParams
  const currentFilters = useMemo(
    () => ({
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : null,
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : null,
      clientId: searchParams.get("clientId") || null,
      status: searchParams.get("status") || null,
      // userId: searchParams.get('userId') || null,
    }),
    [searchParams]
  );

  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  useEffect(() => {
    // Reset form if URL params change externally (e.g., browser back button)
    reset({
      startDate: currentFilters.startDate ?? null, // Handle null for reset
      endDate: currentFilters.endDate ?? null,
      clientId: currentFilters.clientId,
      status: currentFilters.status,
    });
    fetchReport(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchReport, reset]); // Fetch when filters or page from URL change

  // --- Filter Form Submit Handler ---
  const onFilterSubmit: SubmitHandler<ReportFilterValues> = (data) => {
    console.log("Applying filters:", data);
    // Update URL search parameters, which triggers the useEffect to refetch
    const newParams = new URLSearchParams();
    if (data.startDate) {
      newParams.set("startDate", format(data.startDate, "yyyy-MM-dd"));
    }
    if (data.endDate) {
      newParams.set("endDate", format(data.endDate, "yyyy-MM-dd"));
    }
    if (data.clientId) newParams.set("clientId", data.clientId);
    // if (data.userId) newParams.set('userId', data.userId);
    if (data.status) newParams.set("status", data.status);
    newParams.set("page", "1"); // Reset to page 1 when filters change

    setSearchParams(newParams);
  };

  // --- Clear Filters Handler ---
  const clearFilters = () => {
    reset({
      startDate: startOfMonth(new Date()),
      endDate: new Date(),
      clientId: null,
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

  const handleDownloadPdf = () => {
    // Get current filter values from the form
    const currentFilterValues = watch(); // Gets all current form values

    const params = new URLSearchParams();
    if (currentFilterValues.startDate) {
      params.append(
        "start_date",
        format(currentFilterValues.startDate, "yyyy-MM-dd")
      );
    }
    if (currentFilterValues.endDate) {
      params.append(
        "end_date",
        format(currentFilterValues.endDate, "yyyy-MM-dd")
      );
    }
    if (currentFilterValues.clientId) {
      params.append("client_id", String(currentFilterValues.clientId));
    }
    if (currentFilterValues.status) {
      params.append("status", currentFilterValues.status);
    }
    // Add other filters (userId, etc.) if they are part of your P/L report

    // Construct the full URL to the PDF download endpoint
    // VITE_API_BASE_URL should be like http://localhost:8000 or http://localhost/sales-api
    const pdfUrl = `${
      import.meta.env.VITE_API_BASE_URL
    }/reports/sales/pdf?${params.toString()}`;

    // Open the URL in a new tab to trigger the download
    // The browser will handle the 'Content-Disposition: attachment' header
    window.open(pdfUrl, "_blank");

    toast.info(t("reports:pdfDownloadStarting")); // Add key
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
          {t("reports:salesReportTitle")} {/* Add key */}
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
                      
                      <FormLabel>{t("common:startDate")}</FormLabel>
                      <Popover>
                        
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              
                              <CalendarIcon className="me-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("common:pickDate")}</span>
                              )}
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
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* End Date */}
                <FormField
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      
                      <FormLabel>{t("common:endDate")}</FormLabel>
                      <Popover>
                        
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              
                              <CalendarIcon className="me-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("common:pickDate")}</span>
                              )}
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
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Client Select */}
                <FormField
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>{t("clients:client")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={loadingClients || form.formState.isSubmitting}
                      >
                        
                        <FormControl>
                          <SelectTrigger>
                            
                            <SelectValue
                              placeholder={
                                t("reports:allClients") || "All Clients"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          
                          <SelectItem value="all">
                            {t("reports:allClients") || "All Clients"}
                          </SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Status Select */}
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>{t("sales:status")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={form.formState.isSubmitting}
                      >
                        
                        <FormControl>
                          <SelectTrigger>
                            
                            <SelectValue
                              placeholder={
                                t("reports:allStatuses") || "All Statuses"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          
                          <SelectItem value="All">
                            {t("reports:allStatuses") || "All Statuses"}
                          </SelectItem>
                          <SelectItem value="completed">
                            {t("sales:status_completed")}
                          </SelectItem>
                          <SelectItem value="pending">
                            {t("sales:status_pending")}
                          </SelectItem>
                          <SelectItem value="draft">
                            {t("sales:status_draft")}
                          </SelectItem>
                          <SelectItem value="cancelled">
                            {t("sales:status_cancelled")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add User filter similarly if needed */}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearFilters}
                  disabled={isLoading || form.formState.isSubmitting}
                >
                  <X className="me-2 h-4 w-4" />
                  {t("common:clearFilters")}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || form.formState.isSubmitting}
                >
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
      {/* Download PDF Button (could be near results or filter section) */}
      {!isLoading &&
        reportData &&
        reportData.data.length > 0 && ( // Show only if there's data
          <div className="mt-4 mb-6 flex justify-end">
            <Button onClick={handleDownloadPdf} variant="outline">
              <FileText className="me-2 h-4 w-4" /> {/* Example Icon */}
              {t("reports:downloadPDF")} {/* Add key */}
            </Button>
          </div>
        )}

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
            <CardHeader>
              <CardTitle>{t("reports:results")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">
                      {t("sales:date")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("sales:invoice")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("clients:client")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("common:recordedBy")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("sales:status")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("sales:totalAmount")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("sales:paidAmount")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("sales:dueAmount")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("common:actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("common:noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                  {reportData.data.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-center">
                        {dayjs(sale.sale_date).format("YYYY-MM-DD")}
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.invoice_number || "---"}
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.client_name || t("common:n/a")}
                      </TableCell>
                      <TableCell className="text-center">
                        {sale.user_name || t("common:n/a")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Chip
                          label={t(`sales:status_${sale.status}`)}
                          size="small"
                          color={
                            sale.status === "completed"
                              ? "success"
                              : sale.status === "pending"
                              ? "warning"
                              : sale.status === "draft"
                              ? "info"
                              : "default"
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {formatNumber(sale.total_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatNumber(sale.paid_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatNumber(sale.due_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sales/${sale.id}`)}
                        >
                          {t("common:view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Pagination (using basic buttons or shadcn pagination) */}
          {reportData.last_page > 1 && (
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
                {t("common:page")} {currentPage} / {reportData.last_page}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === reportData.last_page || isLoading}
                className="mx-1"
              >
                {t("common:next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesReportPage;
