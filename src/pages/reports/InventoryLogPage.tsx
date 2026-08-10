// src/pages/reports/InventoryLogPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useNavigate,
  useSearchParams,
  Link as RouterLink,
} from "react-router-dom";
import { toast } from "sonner";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

// shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

// Icons
import {
  ArrowLeft,
  ArrowRight,
  Filter,
  Search,
  Download,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  PackageSearch,
  X,
  Check,
} from "lucide-react";

// Services and Types
import inventoryLogService, {
  InventoryLogEntry,
} from "../../services/inventoryLogService";
import { PaginatedResponse as LogPaginatedResponse } from "../../services/clientService";
import { warehouseService, Warehouse } from "../../services/warehouseService";
import productService, { Product } from "../../services/productService";
import { formatNumber } from "@/constants";

// --- Zod Schema ---
const buildLogFilterSchema = (t: (key: string) => string) =>
  z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      productId: z.string().nullable().optional(),
      warehouseId: z.string().nullable().optional(),
      type: z.string().nullable().optional(),
      search: z.string().optional(),
    })
    .refine(
      (data) =>
        !data.endDate || !data.startDate || data.endDate >= data.startDate,
      { message: t("inventoryLogEndDateValidation"), path: ["endDate"] }
    );
type LogFilterValues = z.infer<ReturnType<typeof buildLogFilterSchema>>;

const buildMovementTypes = (t: (key: string) => string) => [
  { value: "purchase", label: t("movementTypePurchase"), className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "sale", label: t("movementTypeSale"), className: "bg-red-100 text-red-800 border-red-200" },
  { value: "adjustment", label: t("movementTypeAdjustment"), className: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "requisition_issue", label: t("movementTypeRequisitionIssue"), className: "bg-sky-100 text-sky-800 border-sky-200" },
];

const InventoryLogPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction } = useLanguage();
  const logFilterSchema = useMemo(() => buildLogFilterSchema(t), [t]);
  const movementTypes = useMemo(() => buildMovementTypes(t), [t]);
  const getMovementType = useCallback(
    (type: string) => movementTypes.find((m) => m.value === type),
    [movementTypes]
  );
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [logData, setLogData] =
    useState<LogPaginatedResponse<InventoryLogEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Product autocomplete
  const [productOpen, setProductOpen] = useState(false);
  const [productInput, setProductInput] = useState("");
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const productDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<LogFilterValues>({
    resolver: zodResolver(logFilterSchema),
    defaultValues: {
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      productId: searchParams.get("productId") || null,
      warehouseId: searchParams.get("warehouseId") || null,
      type: searchParams.get("type") || null,
      search: searchParams.get("search") || "",
    },
  });
  const { control, handleSubmit, reset, watch } = form;

  useEffect(() => {
    warehouseService
      .getAll()
      .then(setWarehouses)
      .catch(() => toast.error(t("failedToLoadWarehouses"), { id: "warehouse-fetch-error" }));
  }, []);

  // Fetch product suggestions with debounce
  useEffect(() => {
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    if (!productOpen) return;
    productDebounceRef.current = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const results = await productService.getProductsForAutocomplete(productInput, 20);
        setProductOptions(results);
      } catch {
        setProductOptions([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 300);
    return () => {
      if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    };
  }, [productInput, productOpen]);

  const fetchLog = useCallback(
    async (filters: LogFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await inventoryLogService.getInventoryLog(page, 25, {
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          productId: filters.productId ? Number(filters.productId) : undefined,
          warehouseId: filters.warehouseId ? Number(filters.warehouseId) : undefined,
          type: filters.type || undefined,
          search: filters.search || undefined,
        });
        setLogData(data);
      } catch (err) {
        setError(t("failedToLoadLog"));
        toast.error(t("failedToLoadLog"), { id: "log-fetch-error" });
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const currentFilters = useMemo(
    () => ({
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      productId: searchParams.get("productId") || null,
      warehouseId: searchParams.get("warehouseId") || null,
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

  const onFilterSubmit: SubmitHandler<LogFilterValues> = (data) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params);
  };

  const clearFilters = () => {
    reset({ startDate: "", endDate: "", productId: null, warehouseId: null, type: null, search: "" });
    setSelectedProduct(null);
    setProductInput("");
    setSearchParams({});
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    setSearchParams(params);
  };

  const generatePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await inventoryLogService.generatePdf({
        startDate: watch("startDate") || undefined,
        endDate: watch("endDate") || undefined,
        productId: watch("productId") ? Number(watch("productId")) : undefined,
        warehouseId: watch("warehouseId") ? Number(watch("warehouseId")) : undefined,
        type: watch("type") || undefined,
        search: watch("search") || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-log-${dayjs().format("YYYY-MM-DD")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t("pdfGenerated"), { id: "pdf-success" });
    } catch {
      toast.error(t("pdfGenerationFailed"), { id: "pdf-error" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="p-4 space-y-4 min-h-screen bg-muted/30" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate("/reports")}
          >
            {direction === "rtl" ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("inventoryLogPageTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("inventoryLogPageSubtitle")}</p>
          </div>
        </div>
        <Button
          onClick={generatePdf}
          disabled={isGeneratingPdf}
          size="sm"
          className="gap-2"
        >
          {isGeneratingPdf ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Download size={15} />
          )}
          {isGeneratingPdf ? t("exportingEllipsis") : t("exportPdf")}
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="shadow-sm">
        <CardHeader
          className="py-3 px-4 cursor-pointer select-none"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Filter size={15} />
              {t("filterOptionsLabel")}
            </CardTitle>
            {showFilters ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="px-4 pb-4 pt-0">
            <form onSubmit={handleSubmit(onFilterSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Product Autocomplete */}
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("productLabel")}</Label>
                  <Controller
                    control={control}
                    name="productId"
                    render={({ field }) => (
                      <Popover open={productOpen} onOpenChange={setProductOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={productOpen}
                            className="w-full h-9 justify-between text-sm font-normal"
                          >
                            {selectedProduct ? (
                              <span className="truncate">{selectedProduct.name}</span>
                            ) : (
                              <span className="text-muted-foreground">{t("searchForProductPlaceholder")}</span>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                              {selectedProduct && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="rounded-sm p-0.5 hover:bg-muted"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProduct(null);
                                    setProductInput("");
                                    field.onChange(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.stopPropagation();
                                      setSelectedProduct(null);
                                      setProductInput("");
                                      field.onChange(null);
                                    }
                                  }}
                                >
                                  <X size={12} />
                                </span>
                              )}
                              <ChevronDown size={14} className="text-muted-foreground" />
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder={t("typeProductNamePlaceholder")}
                              value={productInput}
                              onValueChange={setProductInput}
                            />
                            <CommandList>
                              {loadingProducts ? (
                                <div className="flex justify-center py-4">
                                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                                <>
                                  <CommandEmpty>{t("noMatchingProducts")}</CommandEmpty>
                                  <CommandGroup>
                                    {productOptions.map((p) => (
                                      <CommandItem
                                        key={p.id}
                                        value={String(p.id)}
                                        onSelect={() => {
                                          setSelectedProduct(p);
                                          field.onChange(String(p.id));
                                          setProductOpen(false);
                                        }}
                                      >
                                        <Check
                                          size={14}
                                          className={cn(
                                            "shrink-0",
                                            field.value === String(p.id) ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm truncate">{p.name}</div>
                                          {p.sku && (
                                            <div className="text-xs text-muted-foreground">{p.sku}</div>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>

                {/* General Search (batch, document) */}
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("searchBatchDocumentLabel")}</Label>
                  <Controller
                    control={control}
                    name="search"
                    render={({ field }) => (
                      <div className="relative">
                        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder={t("batchOrDocumentNumberPlaceholder")}
                          className="ps-9 h-9 text-sm"
                        />
                      </div>
                    )}
                  />
                </div>

                {/* Warehouse */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("warehouseLabel")}</Label>
                  <Controller
                    control={control}
                    name="warehouseId"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v === "all" ? null : v)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={t("allLabel")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("allLabel")}</SelectItem>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id.toString()}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Type */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("movementTypeLabel")}</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v === "all" ? null : v)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={t("allLabel")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("allLabel")}</SelectItem>
                          {movementTypes.map((mt) => (
                            <SelectItem key={mt.value} value={mt.value}>
                              {mt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("startDateLabel")}</Label>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="date"
                        className="h-9 text-sm"
                      />
                    )}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("endDateLabel")}</Label>
                  <Controller
                    control={control}
                    name="endDate"
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="date"
                        className="h-9 text-sm"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                  {tCommon("clear")}
                </Button>
                <Button type="submit" size="sm">
                  {t("applyButton")}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Results */}
      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-destructive gap-3">
            <AlertCircle size={36} />
            <p className="text-sm">{error}</p>
          </div>
        ) : !logData || logData.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <PackageSearch size={36} />
            <p className="text-sm">{t("noMatchingLogEntries")}</p>
          </div>
        ) : (
          <>
            {/* Result count */}
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t("totalResultsColonLabel")} <span className="font-semibold text-foreground">{logData.total}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {t("pageOfTotalLabel", { current: currentPage, total: logData.last_page })}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-center text-xs font-semibold py-2">{t("dateColumn")}</TableHead>
                  <TableHead className="text-center text-xs font-semibold py-2">{t("operationColumn")}</TableHead>
                  <TableHead className="text-start text-xs font-semibold py-2">{t("productLabel")}</TableHead>
                  <TableHead className="text-center text-xs font-semibold py-2">{t("warehouseLabel")}</TableHead>
                  <TableHead className="text-center text-xs font-semibold py-2">{t("quantityColumn")}</TableHead>
                  <TableHead className="text-center text-xs font-semibold py-2">{t("documentColumn")}</TableHead>
                  <TableHead className="text-center text-xs font-semibold py-2">{t("byUserColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logData.data.map((row: InventoryLogEntry, i: number) => {
                  const typeInfo = getMovementType(row.type);
                  return (
                    <TableRow key={i} className="hover:bg-muted/20 text-sm">
                      {/* Date */}
                      <TableCell className="text-center py-2 whitespace-nowrap">
                        <div className="text-xs font-medium">
                          {dayjs(row.transaction_date).format("YYYY-MM-DD")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayjs(row.transaction_date).format("HH:mm")}
                        </div>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell className="text-center py-2">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium", typeInfo?.className)}
                        >
                          {typeInfo?.label ?? row.type}
                        </Badge>
                      </TableCell>

                      {/* Product */}
                      <TableCell className="text-start py-2">
                        <div className="font-medium text-xs">{row.product_name}</div>
                        {row.product_sku && (
                          <div className="text-xs text-muted-foreground">{row.product_sku}</div>
                        )}
                        {row.batch_number && (
                          <div className="text-xs text-sky-600">{t("batchColonPrefix")} {row.batch_number}</div>
                        )}
                      </TableCell>

                      {/* Warehouse */}
                      <TableCell className="text-center py-2">
                        <span className="text-xs text-muted-foreground">
                          {row.warehouse_name || "—"}
                        </span>
                      </TableCell>

                      {/* Quantity */}
                      <TableCell className="text-center py-2">
                        <span
                          dir="ltr"
                          className={cn(
                            "text-xs font-bold",
                            row.quantity_change > 0 ? "text-emerald-700" : "text-red-700"
                          )}
                        >
                          {row.quantity_change > 0 ? "+" : ""}
                          {formatNumber(row.quantity_change)}
                        </span>
                      </TableCell>

                      {/* Document */}
                      <TableCell className="text-center py-2">
                        <RouterLink
                          to={
                            row.type === "purchase"
                              ? `/purchases/${row.document_id}`
                              : row.type === "sale"
                              ? `/sales/${row.document_id}`
                              : "#"
                          }
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          {row.document_reference || `#${row.document_id}`}
                        </RouterLink>
                        {row.reason_notes && (
                          <div
                            className="text-xs text-muted-foreground max-w-[160px] truncate mx-auto"
                            title={row.reason_notes}
                          >
                            {row.reason_notes}
                          </div>
                        )}
                      </TableCell>

                      {/* User */}
                      <TableCell className="text-center py-2">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                          {row.user_name || "System"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {logData.last_page > 1 && (
              <div className="border-t px-4 py-3">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(currentPage - 1)}
                        aria-disabled={currentPage <= 1}
                        className={cn(currentPage <= 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-xs text-muted-foreground px-3">
                        {currentPage} / {logData.last_page}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(currentPage + 1)}
                        aria-disabled={currentPage >= logData.last_page}
                        className={cn(currentPage >= logData.last_page && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default InventoryLogPage;
