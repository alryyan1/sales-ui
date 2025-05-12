// src/pages/reports/InventoryLogPage.tsx
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
import { Input } from "@/components/ui/input";
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
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

import { Badge } from "@/components/ui/badge"; // Ensure correct Badge component is imported

// Services and Types
import inventoryLogService, {
  InventoryLogEntry,
  PaginatedResponse as LogPaginatedResponse,
} from "../../services/inventoryLogService";
import productService, { Product } from "../../services/productService"; // For product filter
import { formatCurrency, formatDate, formatNumber } from "@/constants";
import {
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Command,
} from "cmdk";
import dayjs from "dayjs";
import { AlertCircle, ArrowLeft, Check, ChevronsUpDown, Loader2 } from "lucide-react";

// --- Zod Schema for Filter Form ---
const logFilterSchema = z
  .object({
    startDate: z.date().nullable().optional(),
    endDate: z.date().nullable().optional(),
    productId: z.string().nullable().optional(), // Product ID as string from select
    type: z.string().nullable().optional(), // Movement type
    search: z.string().optional(), // General search
  })
  .refine(
    (data) =>
      !data.endDate || !data.startDate || data.endDate >= data.startDate,
    {
      message: "validation:endDateAfterStart",
      path: ["endDate"],
    }
  );
type LogFilterValues = z.infer<typeof logFilterSchema>;

const movementTypes = [
  { value: "purchase", labelKey: "inventory:type_purchase" },
  { value: "sale", labelKey: "inventory:type_sale" },
  { value: "adjustment", labelKey: "inventory:type_adjustment" },
  { value: "requisition_issue", labelKey: "inventory:type_requisition_issue" },
];

// --- Component ---
const InventoryLogPage: React.FC = () => {
  const { t } = useTranslation(["inventory", "common", "reports", "products"]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [logData, setLogData] =
    useState<LogPaginatedResponse<InventoryLogEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // For product filter dropdown
  const [productsForFilter, setProductsForFilter] = useState<Product[]>([]);
  const [loadingProductsFilter, setLoadingProductsFilter] = useState(false);

  // --- Form for Filters ---
  const form = useForm<LogFilterValues>({
    resolver: zodResolver(logFilterSchema),
    defaultValues: {
      /* ... read from searchParams ... */
    },
  });
  const { control, handleSubmit, reset } = form;

  // --- Fetch Products for Filter ---
  const fetchProductsForFilter = useCallback(
    async (search = "") => {
      setLoadingProductsFilter(true);
      try {
        const data = await productService.getProductsForAutocomplete(
          search,
          100
        ); // Fetch a good number for filter
        setProductsForFilter(data);
      } catch (err) {
        toast.error(t("common:error"), {
          description: productService.getErrorMessage(err),
        });
      } finally {
        setLoadingProductsFilter(false);
      }
    },
    [t]
  );
  useEffect(() => {
    fetchProductsForFilter("");
  }, [fetchProductsForFilter]); // Load initial

  // --- Fetch Log Data ---
  const fetchLog = useCallback(
    async (filters: LogFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const apiFilters = {
          page,
          startDate: filters.startDate
            ? format(filters.startDate, "yyyy-MM-dd")
            : undefined,
          endDate: filters.endDate
            ? format(filters.endDate, "yyyy-MM-dd")
            : undefined,
          productId: filters.productId ? Number(filters.productId) : undefined,
          type: filters.type || undefined,
          search: filters.search || undefined,
        };
        const data = await inventoryLogService.getInventoryLog(
          page,
          25,
          apiFilters
        );
        setLogData(data);
      } catch (err) {
        /* ... error handling ... */
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // --- Effect to Fetch Log When Filters/Page Change ---
  const currentFilters = useMemo(
    () => ({
      /* ... get from searchParams ... */
    }),
    [searchParams]
  );
  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );
  useEffect(() => {
    reset(currentFilters);
    fetchLog(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchLog, reset]);

  // --- Filter/Pagination Handlers ---
  const onFilterSubmit: SubmitHandler<LogFilterValues> = (data) => {
    const params = new URLSearchParams();

    if (data.startDate) {
      params.set("startDate", format(data.startDate, "yyyy-MM-dd"));
    }
    if (data.endDate) {
      params.set("endDate", format(data.endDate, "yyyy-MM-dd"));
    }
    if (data.productId) {
      params.set("productId", data.productId);
    }
    if (data.type) {
      params.set("type", data.type);
    }
    if (data.search) {
      params.set("search", data.search);
    }

    setSearchParams(params);
  };
  const clearFilters = () => {
    reset(); // Reset the form to its default values
    setSearchParams({}); // Clear all search parameters
  };
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    setSearchParams(params);
  };
  const paginationItems = useMemo(() => {
    /* ... generatePagination logic ... */
  }, [currentPage, logData?.last_page]);

  const getMovementTypeColor = (type: string) => {
    if (type.includes("purchase")) return "text-green-600 dark:text-green-400";
    if (type.includes("sale") || type.includes("issue"))
      return "text-red-600 dark:text-red-400";
    if (type.includes("adjustment")) return "text-blue-600 dark:text-blue-400";
    return "text-muted-foreground";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center mb-6 gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/reports")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {/* Or /dashboard */}
        <h1 className="text-2xl md:text-3xl font-semibold">
          {t("inventory:logPageTitle")}
        </h1>
        {/* Add key */}
      </div>

      {/* Filter Form Card */}
      <Card className="dark:bg-gray-900 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t("common:filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onFilterSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                {/* More columns for filters */}
                <FormField
                  control={control}
                  name="startDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>{t("common:startDate")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : t("common:selectDate")}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="endDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>{t("common:endDate")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : t("common:selectDate")}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Product Filter (Combobox) */}
                <FormField
                  control={control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("products:product")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? productsForFilter.find(
                                    (p) => String(p.id) === field.value
                                  )?.name
                                : t("reports:allProducts")}
                              {/* Add key */}
                              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--popover-trigger-width] p-0">
                          <Command
                            // Removed invalid filter function
                          >
                            <CommandInput onValueChange={fetchProductsForFilter}
                              placeholder={t("products:searchPlaceholder")}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {t("common:noResults")}
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value=""
                                  onSelect={() => field.onChange(null)}
                                >
                                  {t("reports:allProducts")}
                                </CommandItem>
                                {productsForFilter.map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={p.name}
                                    onSelect={() =>
                                      field.onChange(String(p.id))
                                    }
                                  >
                                    <Check
                                      className={cn(
                                        "me-2 h-4 w-4",
                                        String(p.id) === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {p.name} ({p.sku})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Type Filter */}
                <FormField
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inventory:movementType")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? " "}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("reports:allTypes")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value=" ">
                            {t("reports:allTypes")}
                          </SelectItem>
                          {movementTypes.map((mt) => (
                            <SelectItem key={mt.value} value={mt.value}>
                              {t(mt.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add keys */}
                {/* Search (General) */}
                <FormField
                  control={control}
                  name="search"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common:search")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("inventory:searchLogPlaceholder")}
                          {...field}
                          value={field.value ?? " "}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Add key */}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="submit" variant="default">
                  {t("common:filter")}
                </Button>
                <Button type="button" variant="outline" onClick={clearFilters}>
                  {t("common:clear")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {!isLoading && error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!isLoading && !error && logData && (
        <>
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("reports:results")}</CardTitle>
              <CardDescription>
                {t("common:paginationSummary", {
                  from: logData.from,
                  to: logData.to,
                  total: logData.total,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t("common:date")}</TableHead>
                    <TableHead className="text-center">{t("inventory:movementType")}</TableHead>
                    <TableHead className="text-center">{t("products:product")}</TableHead>
                    <TableHead className="text-center">{t("purchases:batchNumber")}</TableHead>
                    <TableHead className="text-center">
                      {t("inventory:quantityChange")}
                    </TableHead>
                    <TableHead className="text-center">{t("inventory:documentRef")}</TableHead>
                    <TableHead className="text-center">{t("common:user")}</TableHead>
                    <TableHead className="text-center">{t("common:notesOrReason")}</TableHead>
                    {/* Add key */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logData.data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("common:noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                  {logData.data.map(
                    (
                      entry,
                      index // Use index for key if no unique ID from UNION
                    ) => (
                      <TableRow
                        key={`${entry.type}-${entry.document_id}-${entry.product_id}-${index}`}
                      >
                        <TableCell className="text-center">
                          {dayjs(entry.transaction_date).format("YYYY-MM-DD")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="border border-gray-300">
                            {t(`inventory:type_${entry.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">
                            {entry.product_name}
                          </span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {entry.product_sku}
                          </span>
                        </TableCell>
                                            <TableCell className="text-center">{entry.batch_number || '---'}</TableCell>
                        <TableCell
                          className={`text-center font-semibold ${getMovementTypeColor(
                            entry.type
                          )}`}
                        >
                          {entry.quantity_change > 0 ? "+" : ""}
                          {formatNumber(entry.quantity_change)}
                        </TableCell>
                        <TableCell className="text-center">
                          <RouterLink
                            to={
                              entry.type === "purchase"
                                ? `/purchases/${entry.document_id}`
                                : entry.type === "sale"
                                ? `/sales/${entry.document_id}`
                                : entry.type === "requisition_issue"
                                ? `/admin/inventory/requisitions/${entry.document_id}/process`
                                : "#" // No link for adjustment currently
                            }
                            className="hover:underline text-primary"
                          >
                            {entry.document_reference ||
                              `#${entry.document_id}`}
                          </RouterLink>
                        </TableCell>
                        <TableCell>
                          {entry.user_name || t("common:n/a")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.reason_notes}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {logData.last_page > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t("common:previous")}
                </PaginationPrevious>
                {paginationItems.map((item, index) =>
                  item === "..." ? (
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
                  disabled={currentPage === logData.last_page}
                >
                  {t("common:next")}
                </PaginationNext>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryLogPage;
