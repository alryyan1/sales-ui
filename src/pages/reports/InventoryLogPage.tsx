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

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

// Icons
import ArrowLeft from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";

// shadcn/ui & Lucide Icons
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

import { Badge } from "@/components/ui/badge";

// Services and Types
import inventoryLogService, {
  InventoryLogEntry,
  PaginatedResponse as LogPaginatedResponse,
} from "../../services/inventoryLogService";
import productService, { Product } from "../../services/productService";
import { formatCurrency, formatDate, formatNumber } from "@/constants";
import dayjs from "dayjs";

// --- Zod Schema for Filter Form ---
const logFilterSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    productId: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    search: z.string().optional(),
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
  const [productsForFilter, setProductsForFilter] = useState<Product[]>([]);
  const [loadingProductsFilter, setLoadingProductsFilter] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // --- Form for Filters ---
  const form = useForm<LogFilterValues>({
    resolver: zodResolver(logFilterSchema),
    defaultValues: {
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      productId: searchParams.get("productId") || null,
      type: searchParams.get("type") || null,
      search: searchParams.get("search") || "",
    },
  });
  const { control, handleSubmit, reset, watch } = form;

  // --- Fetch Products for Filter ---
  const fetchProductsForFilter = useCallback(
    async (search = "") => {
      setLoadingProductsFilter(true);
      try {
        const data = await productService.getProductsForAutocomplete(
          search,
          100
        );
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
  }, [fetchProductsForFilter]);

  // --- Fetch Log Data ---
  const fetchLog = useCallback(
    async (filters: LogFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const apiFilters = {
          page,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
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
        console.error("Failed to fetch inventory log:", err);
        setError(t("common:error"));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  // --- Effect to Fetch Log When Filters/Page Change ---
  const currentFilters = useMemo(
    () => ({
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      productId: searchParams.get("productId") || null,
      type: searchParams.get("type") || null,
      search: searchParams.get("search") || "",
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
      params.set("startDate", data.startDate);
    }
    if (data.endDate) {
      params.set("endDate", data.endDate);
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
    reset();
    setSearchParams({});
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    setSearchParams(params);
  };

  // --- PDF Generation ---
  const generatePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const filters = watch();
      const apiFilters = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        productId: filters.productId ? Number(filters.productId) : undefined,
        type: filters.type || undefined,
        search: filters.search || undefined,
      };
      
      const response = await inventoryLogService.generatePdf(apiFilters);
      
      // Create blob and download
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-log-${dayjs().format('YYYY-MM-DD')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(t("reports:pdfGenerated"));
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error(t("common:error"), { description: t("reports:pdfGenerationFailed") });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => navigate("/reports")}
            size="large"
          >
            <ArrowLeft />
          </IconButton>
          <Typography variant="h4" component="h1" className="text-2xl md:text-3xl font-semibold">
            {t("inventory:logPageTitle")}
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={isGeneratingPdf ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
          onClick={generatePdf}
          disabled={isGeneratingPdf}
          size="large"
        >
          {isGeneratingPdf ? t("reports:generatingPdf") : t("reports:exportPdf")}
        </Button>
      </div>

      {/* Filter Form - No Card Wrapper */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Typography variant="h6" className="mb-4 text-lg font-semibold">
          {t("common:filters")}
        </Typography>
        <Form {...form}>
          <form onSubmit={handleSubmit(onFilterSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
              {/* Start Date */}
              <FormField
                control={control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t("common:startDate")}</FormLabel>
                    <FormControl>
                      <TextField
                        type="date"
                        {...field}
                        size="medium"
                        fullWidth
                        InputProps={{
                          style: { fontSize: '16px' }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t("common:endDate")}</FormLabel>
                    <FormControl>
                      <TextField
                        type="date"
                        {...field}
                        size="medium"
                        fullWidth
                        InputProps={{
                          style: { fontSize: '16px' }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product Filter - MUI Autocomplete */}
              <FormField
                control={control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t("products:product")}</FormLabel>
                    <FormControl>
                      <Autocomplete
                        options={productsForFilter}
                        getOptionLabel={(option) => option.name}
                        value={productsForFilter.find(p => String(p.id) === field.value) || null}
                        onChange={(_, newValue) => field.onChange(newValue ? String(newValue.id) : null)}
                        loading={loadingProductsFilter}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={t("reports:allProducts")}
                            size="medium"
                            InputProps={{
                              ...params.InputProps,
                              style: { fontSize: '16px' }
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            <Typography variant="body1">
                              {option.name} ({option.sku})
                            </Typography>
                          </Box>
                        )}
                      />
                    </FormControl>
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
                    <FormLabel className="text-base">{t("inventory:movementType")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="text-base">
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

              {/* Search */}
              <FormField
                control={control}
                name="search"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t("common:search")}</FormLabel>
                    <FormControl>
                      <TextField
                        placeholder={t("inventory:searchLogPlaceholder")}
                        {...field}
                        size="medium"
                        fullWidth
                        InputProps={{
                          style: { fontSize: '16px' }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="submit" variant="contained" size="large" startIcon={<FilterListIcon />}>
                {t("common:filter")}
              </Button>
              <Button type="button" variant="outlined" size="large" onClick={clearFilters} startIcon={<ClearIcon />}>
                {t("common:clear")}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Results Section */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <CircularProgress size={40} />
        </div>
      )}

      {!isLoading && error && (
        <Alert severity="error" className="mb-6">
          <Typography variant="h6">{t("common:error")}</Typography>
          <Typography>{error}</Typography>
        </Alert>
      )}

      {!isLoading && !error && logData && (
        <>
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">{t("reports:results")}</CardTitle>
              <CardDescription className="text-base">
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
                    <TableHead className="text-center text-base font-semibold">{t("common:date")}</TableHead>
                    <TableHead className="text-center text-base font-semibold">{t("inventory:movementType")}</TableHead>
                    <TableHead className="text-center text-base font-semibold">{t("products:product")}</TableHead>
                    <TableHead className="text-center text-base font-semibold">{t("purchases:batchNumber")}</TableHead>
                    <TableHead className="text-center text-base font-semibold">
                      {t("inventory:quantityChange")}
                    </TableHead>
                    <TableHead className="text-center text-base font-semibold">{t("inventory:documentRef")}</TableHead>
                    <TableHead className="text-center text-base font-semibold">{t("common:user")}</TableHead>
                    <TableHead className="text-center text-base font-semibold">{t("common:notesOrReason")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logData.data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground text-base"
                      >
                        {t("common:noResults")}
                      </TableCell>
                    </TableRow>
                  )}
                  {logData.data.map(
                    (entry, index) => (
                      <TableRow
                        key={`${entry.type}-${entry.document_id}-${entry.product_id}-${index}`}
                      >
                        <TableCell className="text-center text-base">
                          {dayjs(entry.transaction_date).format("YYYY-MM-DD")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="border border-gray-300 text-sm">
                            {t(`inventory:type_${entry.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Typography variant="body1" className="font-medium">
                            {entry.product_name}
                          </Typography>
                          <Typography variant="body2" className="text-muted-foreground">
                            {entry.product_sku}
                          </Typography>
                        </TableCell>
                        <TableCell className="text-center text-base">{entry.batch_number || '---'}</TableCell>
                        <TableCell
                          className={`text-center font-bold text-lg ${getMovementTypeColor(
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
                                : "#"
                            }
                            className="hover:underline text-primary text-base font-medium"
                          >
                            {entry.document_reference ||
                              `#${entry.document_id}`}
                          </RouterLink>
                        </TableCell>
                        <TableCell className="text-center text-base">
                          {entry.user_name || t("common:n/a")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {entry.reason_notes}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {logData.last_page > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    {t("common:previous")}
                  </PaginationPrevious>
                  {Array.from({ length: logData.last_page }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page} active={page === currentPage}>
                      <PaginationLink onClick={() => handlePageChange(page)}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === logData.last_page}
                  >
                    {t("common:next")}
                  </PaginationNext>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryLogPage;
