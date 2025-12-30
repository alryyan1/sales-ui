// src/pages/reports/InventoryLogPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
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

// Import CSS
import "./InventoryLogPage.css";

// MUI Components (Used for specific inputs where needed, but avoiding Grid layout)
import {
  TextField,
  Button,
  CircularProgress,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Collapse,
  Pagination,
  Box,
} from "@mui/material";

// Icons (Lucide)
import {
  ArrowLeft,
  Filter,
  Search,
  Store,
  Download,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  AlertCircle,
} from "lucide-react";

// Services and Types
import inventoryLogService, {
  InventoryLogEntry,
  PaginatedResponse as LogPaginatedResponse,
} from "../../services/inventoryLogService";
import productService, { Product } from "../../services/productService";
import { warehouseService, Warehouse } from "../../services/warehouseService";
import { formatNumber } from "@/constants";

// --- Zod Schema ---
const logFilterSchema = z
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
    { message: "End date must be after start date", path: ["endDate"] }
  );
type LogFilterValues = z.infer<typeof logFilterSchema>;

const movementTypes = [
  { value: "purchase", label: "شراء", colorClass: "chip-success" },
  { value: "sale", label: "بيع", colorClass: "chip-error" },
  { value: "adjustment", label: "تعديل مخزني", colorClass: "chip-warning" },
  { value: "requisition_issue", label: "صرف مخزني", colorClass: "chip-info" },
];

const getMovementLabel = (type: string) => {
  const t = movementTypes.find((m) => m.value === type);
  return t ? t.label : type;
};

const getMovementColorClass = (type: string) => {
  const t = movementTypes.find((m) => m.value === type);
  return t ? t.colorClass : "chip-default";
};

const InventoryLogPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [logData, setLogData] =
    useState<LogPaginatedResponse<InventoryLogEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productsForFilter, setProductsForFilter] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingProductsFilter, setLoadingProductsFilter] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // --- Form ---
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

  // --- Effects ---
  useEffect(() => {
    warehouseService
      .getAll()
      .then(setWarehouses)
      .catch(() =>
        toast.error("فشل تحميل المستودعات", { id: "warehouse-fetch-error" })
      );
    fetchProductsForFilter("");
  }, []);

  const fetchProductsForFilter = useCallback(async (search = "") => {
    setLoadingProductsFilter(true);
    try {
      const data = await productService.getProductsForAutocomplete(search, 100);
      setProductsForFilter(data);
    } finally {
      setLoadingProductsFilter(false);
    }
  }, []);

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
          warehouseId: filters.warehouseId
            ? Number(filters.warehouseId)
            : undefined,
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
        console.error(err);
        setError("فشل في تحميل السجل");
        toast.error("فشل في تحميل السجل", { id: "log-fetch-error" });
      } finally {
        setIsLoading(false);
      }
    },
    []
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

  // --- Handlers ---
  const onFilterSubmit: SubmitHandler<LogFilterValues> = (data) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params);
  };

  const clearFilters = () => {
    reset({
      startDate: "",
      endDate: "",
      productId: null,
      warehouseId: null,
      type: null,
      search: "",
    });
    setSearchParams({});
  };

  const handlePageChange = (_: any, newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    setSearchParams(params);
  };

  const generatePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const apiFilters = {
        startDate: watch("startDate") || undefined,
        endDate: watch("endDate") || undefined,
        productId: watch("productId") ? Number(watch("productId")) : undefined,
        warehouseId: watch("warehouseId")
          ? Number(watch("warehouseId"))
          : undefined,
        type: watch("type") || undefined,
        search: watch("search") || undefined,
      };
      const blob = await inventoryLogService.generatePdf(apiFilters);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-log-${dayjs().format("YYYY-MM-DD")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF Created", { id: "pdf-success" });
    } catch {
      toast.error("Error creating PDF", { id: "pdf-error" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="inventory-log-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-title-group">
          <button className="back-button" onClick={() => navigate("/reports")}>
            <ArrowLeft size={20} className="text-muted" />
          </button>
          <div className="header-text">
            <h1>سجل حركات المخزون</h1>
            <p>مراقبة حركة المخزون عبر جميع المستودعات</p>
          </div>
        </div>
        <Button
          variant="contained"
          size="medium"
          startIcon={
            isGeneratingPdf ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Download size={18} />
            )
          }
          onClick={generatePdf}
          disabled={isGeneratingPdf}
          sx={{
            borderRadius: 2,
            height: 42,
            px: 3,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {isGeneratingPdf ? "جاري التصدير..." : "تصدير PDF"}
        </Button>
      </div>

      {/* Filter Card */}
      <div className="filter-card">
        <div
          className="filter-header"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="filter-header-title">
            <Filter size={18} />
            <span>خيارات التصفية</span>
          </div>
          {showFilters ? (
            <ChevronUp size={18} color="#64748b" />
          ) : (
            <ChevronDown size={18} color="#64748b" />
          )}
        </div>

        <Collapse in={showFilters}>
          <form onSubmit={handleSubmit(onFilterSubmit)}>
            <div className="filter-grid">
              <div className="filter-grid-search">
                <Controller
                  control={control}
                  name="search"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      placeholder="بحث (اسم المنتج، رقم المستند...)"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={18} color="#94a3b8" />
                          </InputAdornment>
                        ),
                      }}
                      size="medium"
                    />
                  )}
                />
              </div>
              <div>
                <Controller
                  control={control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormControl fullWidth size="medium">
                      <InputLabel>المستودع</InputLabel>
                      <Select
                        {...field}
                        value={field.value || ""}
                        label="المستودع"
                      >
                        <MenuItem value="">الكل</MenuItem>
                        {warehouses.map((w) => (
                          <MenuItem key={w.id} value={w.id.toString()}>
                            {w.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </div>
              <div>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <FormControl fullWidth size="medium">
                      <InputLabel>نوع الحركة</InputLabel>
                      <Select
                        {...field}
                        value={field.value || ""}
                        label="نوع الحركة"
                      >
                        <MenuItem value="">الكل</MenuItem>
                        {movementTypes.map((t) => (
                          <MenuItem key={t.value} value={t.value}>
                            {t.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </div>
              <div>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="من تاريخ"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </div>
              <div>
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="إلى تاريخ"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </div>
            </div>
            <div className="filter-actions">
              <Button
                variant="outlined"
                onClick={clearFilters}
                sx={{ height: 42 }}
              >
                مسح
              </Button>
              <Button
                type="submit"
                variant="contained"
                sx={{ height: 42, px: 4 }}
              >
                تطبيق
              </Button>
            </div>
          </form>
        </Collapse>
      </div>

      {/* Results Table */}
      <div className="table-card">
        {isLoading ? (
          <div className="loading-container">
            <CircularProgress />
          </div>
        ) : error ? (
          <div className="empty-state">
            <AlertCircle
              size={48}
              color="#ef4444"
              style={{ marginBottom: 16 }}
            />
            <p>{error}</p>
          </div>
        ) : !logData || logData.data.length === 0 ? (
          <div className="empty-state">
            <Search size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p>لا توجد سجلات مطابقة للبحث</p>
          </div>
        ) : (
          <>
            <table className="log-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>العملية</th>
                  <th>المنتج</th>
                  <th>المستودع</th>
                  <th>الكمية</th>
                  <th>المستند</th>
                  <th>بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {logData.data.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div className="text-sm font-bold">
                        {dayjs(row.transaction_date).format("YYYY-MM-DD")}
                      </div>
                      <div className="text-sm text-muted">
                        {dayjs(row.transaction_date).format("HH:mm")}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`chip ${getMovementColorClass(row.type)}`}
                      >
                        {getMovementLabel(row.type)}
                      </span>
                    </td>
                    <td>
                      <div className="font-bold">{row.product_name}</div>
                      <div className="text-sm text-muted">
                        {row.product_sku}
                      </div>
                      {row.batch_number && (
                        <div className="text-sm" style={{ color: "#0ea5e9" }}>
                          دفعة: {row.batch_number}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex-row gap-2">
                        <Store size={14} className="text-muted" />
                        <span className="text-sm">
                          {row.warehouse_name || "-"}
                        </span>
                      </div>
                    </td>
                    <td
                      className={
                        row.quantity_change > 0
                          ? "quantity-positive"
                          : "quantity-negative"
                      }
                    >
                      <span dir="ltr">
                        {row.quantity_change > 0 ? "+" : ""}
                        {formatNumber(row.quantity_change)}
                      </span>
                    </td>
                    <td>
                      <RouterLink
                        to={
                          row.type === "purchase"
                            ? `/purchases/${row.document_id}`
                            : row.type === "sale"
                            ? `/sales/${row.document_id}`
                            : "#"
                        }
                        className="link-text"
                      >
                        {row.document_reference || `#${row.document_id}`}
                      </RouterLink>
                      {row.reason_notes && (
                        <div
                          className="text-sm text-muted"
                          style={{
                            maxWidth: 200,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {row.reason_notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="user-badge">
                        <User size={12} />
                        {row.user_name || "System"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination-container">
              <Pagination
                count={logData.last_page}
                page={currentPage}
                onChange={(e, p) => handlePageChange(e, p)}
                color="primary"
                shape="rounded"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryLogPage;
