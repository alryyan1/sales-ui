// src/pages/sales/SaleReturnsListPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import {
  useNavigate,
  useSearchParams,
  Link as RouterLink,
} from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth } from "date-fns";
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
import { Input } from "@/components/ui/input"; // For search
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Loader2,
  Filter,
  X,
  Search,
  AlertCircle,
  ArrowLeft,
  Eye,
  Undo2,
} from "lucide-react"; // Eye for View Details

// Services and Types
import saleReturnService, {
  SaleReturn,
  PaginatedResponse,
} from "../../services/saleReturnService"; // Adjust path
import { formatCurrency, formatDate, formatNumber } from "@/constants"; // Helpers
import { Chip } from "@mui/material";
// import clientService, { Client } from '../../services/clientService'; // If adding client filter

// --- Zod Schema for Filter Form ---
const returnFilterSchema = z
  .object({
    startDate: z.date().nullable().optional(),
    endDate: z.date().nullable().optional(),
    originalSaleId: z.string().nullable().optional(), // Search by original sale ID/Invoice
    clientId: z.string().nullable().optional(), // If filtering by client
    status: z.string().nullable().optional(), // Return statuses
  })
  .refine(
    (data) =>
      !data.endDate || !data.startDate || data.endDate >= data.startDate,
    {
      message: "validation:endDateAfterStart",
      path: ["endDate"],
    }
  );

type ReturnFilterValues = z.infer<typeof returnFilterSchema>;

// --- Component ---
const SaleReturnsListPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common", "reports", "clients"]); // Add 'sales' for return specific keys
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [returnsResponse, setReturnsResponse] =
    useState<PaginatedResponse<SaleReturn> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [clientsForFilter, setClientsForFilter] = useState<Client[]>([]); // For client filter dropdown
  // const [loadingClientsFilter, setLoadingClientsFilter] = useState(false);

  // --- Form for Filters ---
  const form = useForm<ReturnFilterValues>({
    resolver: zodResolver(returnFilterSchema),
    defaultValues: {
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : null, // Default to null or start of month
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : null, // Default to null or today
      originalSaleId: searchParams.get("originalSaleId") || null,
      clientId: searchParams.get("clientId") || null,
      status: searchParams.get("status") || null,
    },
  });
  const { control, handleSubmit, reset } = form;

  // --- Fetch Data (Clients for filter - if needed) ---
  // useEffect(() => { /* Fetch clients for filter dropdown */ }, []);

  // --- Fetch Sale Returns Data ---
  const fetchSaleReturns = useCallback(
    async (filters: ReturnFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = {
          page,
          startDate: filters.startDate
            ? format(filters.startDate, "yyyy-MM-dd")
            : "",
          endDate: filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : "",
          originalSaleId: filters.originalSaleId || "", // Assuming backend searches original_sale.invoice_number or id
          clientId: filters.clientId || "",
          status: filters.status || "",
        };
        const data = await saleReturnService.getSaleReturns(
          params.page,
          15, // Per page
          // Pass other filter params if service method supports them directly
          Number(params.originalSaleId) || undefined,
          Number(params.clientId) || undefined,
          params.startDate || undefined,
          params.endDate || undefined,
          params.status || undefined
        );
        setReturnsResponse(data);
      } catch (err) {
        const errorMsg = saleReturnService.getErrorMessage(err);
        setError(errorMsg);
        toast.error(t("common:error"), { description: errorMsg });
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  // --- Effect to Fetch Data When Filters/Page Change from URL ---
  const currentFilters = useMemo(
    () => ({
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : null,
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : null,
      originalSaleId: searchParams.get("originalSaleId") || null,
      clientId: searchParams.get("clientId") || null,
      status: searchParams.get("status") || null,
    }),
    [searchParams]
  );
  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  useEffect(() => {
    reset(currentFilters); // Sync form with URL
    fetchSaleReturns(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchSaleReturns, reset]);

  // --- Filter Form Submit ---
  const onFilterSubmit: SubmitHandler<ReturnFilterValues> = (data) => {
    const newParams = new URLSearchParams();
    if (data.startDate)
      newParams.set("startDate", format(data.startDate, "yyyy-MM-dd"));
    if (data.endDate)
      newParams.set("endDate", format(data.endDate, "yyyy-MM-dd"));
    if (data.originalSaleId)
      newParams.set("originalSaleId", data.originalSaleId);
    if (data.clientId) newParams.set("clientId", data.clientId);
    if (data.status) newParams.set("status", data.status);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  // --- Clear Filters ---
  const clearFilters = () => {
    reset({
      startDate: null,
      endDate: null,
      originalSaleId: null,
      clientId: null,
      status: null,
    });
    setSearchParams({ page: "1" });
  };

  // --- Pagination ---
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    setSearchParams(params);
  };

  // Helper to generate pagination items (same as used in UsersListPage)
  const paginationItems = useMemo(() => {
    /* ... generatePagination logic ... */
  }, [currentPage, returnsResponse?.last_page]);

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          {t("sales:returnsListTitle")} {/* Add key */}
        </h1>
        {/* Optionally, a button to directly go to 'Add Return' page if needed */}
        {/* <Button component={RouterLink} to="/sales/return/add" startIcon={<Undo2 />}>{t('sales:initiateReturn')}</Button> */}
      </div>

      {/* Filter Form Card */}
      <Card className="dark:bg-gray-900 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t("common:filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onFilterSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                {/* Start Date */}
                <FormField
                  control={control}
                  name="startDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>{t("sales:startDate")}</FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full text-left",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : t("common:selectDate")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* End Date */}
                <FormField
                  control={control}
                  name="endDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>{t("sales:endDate")}</FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full text-left",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : t("common:selectDate")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Original Sale ID/Invoice Input */}
                <FormField
                  control={control}
                  name="originalSaleId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      
                      <FormLabel>{t("sales:originalSaleInvoice")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="INV-..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add Key */}
                {/* Client Select (Optional) */}
                {/* <FormField control={control} name="clientId" render={...} /> */}
                {/* Status Select */}
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>{t("sales:returnStatusLabel")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("reports:allStatuses")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value=" ">
                            {t("reports:allStatuses")}
                          </SelectItem>
                          <SelectItem value="pending">
                            {t("sales:status_pending_return")}
                          </SelectItem>
                          <SelectItem value="completed">
                            {t("sales:status_completed_return")}
                          </SelectItem>
                          <SelectItem value="cancelled">
                            {t("sales:status_cancelled_return")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
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

      {/* Results Section */}
      {isLoading && (
        <div className="flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!isLoading && !error && returnsResponse && (
        <>
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("reports:results")}</CardTitle>
              <CardDescription>
                {t("common:paginationSummary", {
                  from: returnsResponse.from,
                  to: returnsResponse.to,
                  total: returnsResponse.total,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sales:returnId")}</TableHead> {/* Add key */}
                    <TableHead>{t("sales:returnDate")}</TableHead>
                    <TableHead>
                      {t("sales:originalSaleInvoiceShort")}
                    </TableHead>
                    {/* Add key */}
                    <TableHead>{t("clients:client")}</TableHead>
                    <TableHead className="text-center">
                      {t("sales:returnStatusLabel")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("sales:totalReturnedValue")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("common:actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnsResponse.data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("sales:noReturnsFound")}
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Add key */}
                  {returnsResponse.data.map((sReturn) => (
                    <TableRow key={sReturn.id}>
                      <TableCell className="font-medium">
                        RTN-{sReturn.id}
                      </TableCell>
                      <TableCell>{formatDate(sReturn.return_date)}</TableCell>
                      <TableCell>
                        {sReturn.originalSale?.invoice_number ||
                          `ID: ${sReturn.original_sale_id}`}
                      </TableCell>
                      <TableCell>
                        {sReturn.client?.name || t("common:n/a")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Chip
                          label={t(`sales:status_return_${sReturn.status}`)}
                          size="small"
                          color={
                            sReturn.status === "completed"
                              ? "success"
                              : sReturn.status === "pending"
                              ? "warning"
                              : "default"
                          }
                        />
                      </TableCell>
                      {/* Add keys like status_return_completed */}
                      <TableCell className="text-right">
                        {formatCurrency(sReturn.total_returned_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/sales/returns/${sReturn.id}`)
                          }
                        >
                          {t("common:view")}
                        </Button>
                        {/* Link to Return Details Page */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Pagination */}
          {returnsResponse.last_page > 1 && (
            <Pagination>
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                {t("common:previous")}
              </PaginationPrevious>
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <PaginationEllipsis key={index} />
                ) : (
                  <PaginationItem key={index} active={item === currentPage}>
                    <PaginationLink onClick={() => handlePageChange(item)}>
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === returnsResponse.last_page}
              >
                {t("common:next")}
              </PaginationNext>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};

export default SaleReturnsListPage;
