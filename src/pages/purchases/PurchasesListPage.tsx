// src/pages/PurchasesListPage.tsx
// Premium UI using shadcn/ui + MUI + Tailwind + Lucide
import React, { useState, useEffect, useCallback } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// MUI Components (for complex interactions)
import {
  Pagination,
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";

// Lucide Icons
import {
  Plus,
  Filter,
  X,
  FileSpreadsheet,
  FileText,
  Package,
  History,
  Calendar,
  User,
  Hash,
  Search,
  ShoppingCart,
  CheckCircle,
  Clock,
  Truck,
  RefreshCw,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Boxes,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";

// Services and Types
import purchaseService from "../../services/purchaseService";
import supplierService, { Supplier } from "../../services/supplierService";
import productService, { Product } from "../../services/productService";
import exportService from "../../services/exportService";
import dayjs from "dayjs";
import { formatCurrency } from "@/constants";
import { PurchaseItemDetailsDialog } from "@/components/purchases/PurchaseItemDetailsDialog";
import { cn } from "@/lib/utils";

// Filter interface
interface PurchaseFilters {
  supplier_id?: number;
  reference_number?: string;
  purchase_date?: string;
  created_at?: string;
  status?: string;
  product_id?: number;
}

const PurchasesListPage: React.FC = () => {
  const navigate = useNavigate();

  // --- State ---
  const [purchasesResponse, setPurchasesResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [filters, setFilters] = useState<PurchaseFilters>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Product history dialog states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPurchases, setProductPurchases] = useState<any[]>([]);
  const [loadingProductPurchases, setLoadingProductPurchases] = useState(false);
  const [productHistoryDialogOpen, setProductHistoryDialogOpen] =
    useState(false);

  // Status configuration
  const statusConfig = {
    pending: {
      label: "قيد الانتظار",
      icon: Clock,
      variant: "warning" as const,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    ordered: {
      label: "تم الطلب",
      icon: Truck,
      variant: "secondary" as const,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    received: {
      label: "تم الاستلام",
      icon: CheckCircle,
      variant: "success" as const,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
  };

  // --- Data Fetching ---
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const response = await supplierService.getSuppliers(1, "");
      setSuppliers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const response = await productService.getProducts(
        1,
        "",
        "name",
        "asc",
        1000
      );
      setProducts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchPurchases = useCallback(
    async (page: number, filters: PurchaseFilters = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());

        if (filters.supplier_id)
          params.append("supplier_id", filters.supplier_id.toString());
        if (filters.reference_number)
          params.append("reference_number", filters.reference_number);
        if (filters.purchase_date)
          params.append("purchase_date", filters.purchase_date);
        if (filters.created_at) params.append("created_at", filters.created_at);
        if (filters.status) params.append("status", filters.status);
        if (filters.product_id)
          params.append("product_id", filters.product_id.toString());

        const data = await purchaseService.getPurchases(
          page,
          params.toString()
        );
        setPurchasesResponse(data);
      } catch (err) {
        setError(purchaseService.getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPurchases(currentPage, filters);
  }, [fetchPurchases, currentPage, filters]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [fetchSuppliers, fetchProducts]);

  // --- Handlers ---
  const handleFilterChange = (
    key: keyof PurchaseFilters,
    value: string | number | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== null && value !== ""
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };

  const handleViewPdfReport = async (id: number) => {
    try {
      await exportService.exportPurchasePdf(id);
    } catch (error) {
      console.error("Failed to generate PDF report:", error);
    }
  };

  const handleViewProductHistory = async (product: Product) => {
    setSelectedProduct(product);
    setProductHistoryDialogOpen(true);
    setLoadingProductPurchases(true);
    try {
      const purchases = await purchaseService.getPurchasesForProduct(
        product.id
      );
      setProductPurchases(purchases);
    } catch (error) {
      console.error("Failed to fetch product purchases:", error);
      setProductPurchases([]);
    } finally {
      setLoadingProductPurchases(false);
    }
  };

  const handleCloseProductHistory = () => {
    setProductHistoryDialogOpen(false);
    setSelectedProduct(null);
    setProductPurchases([]);
  };

  const handleExportExcel = async () => {
    try {
      await exportService.exportPurchasesExcel(filters);
    } catch (error) {
      console.error("Failed to export Excel:", error);
    }
  };

  // Stats calculation
  const stats = {
    total: purchasesResponse?.meta?.total || 0,
    received:
      purchasesResponse?.data?.filter((p: any) => p.status === "received")
        .length || 0,
    pending:
      purchasesResponse?.data?.filter((p: any) => p.status === "pending")
        .length || 0,
    totalAmount:
      purchasesResponse?.data?.reduce(
        (sum: number, p: any) => sum + Number(p.total_amount || 0),
        0
      ) || 0,
  };

  return (
    <TooltipProvider>
      <div
        className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-6"
        dir="rtl"
      >
        {/* Header */}
        <div className="mb-6">
          <Card className="border-0 shadow-md bg-gradient-to-r from-sky-400 via-sky-500 to-blue-500">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Title Section */}
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/30 backdrop-blur-sm rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">
                      المشتريات
                    </h1>
                    <p className="text-sky-100 text-xs">
                      إدارة عمليات الشراء والمخزون
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    {showFilters ? (
                      <ChevronUp className="h-4 w-4 ml-2" />
                    ) : (
                      <Filter className="h-4 w-4 ml-2" />
                    )}
                    الفلاتر
                    {activeFilterCount > 0 && (
                      <Badge className="mr-2 bg-white text-blue-600 hover:bg-white">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <FileSpreadsheet className="h-4 w-4 ml-2" />
                    تصدير
                  </Button>

                  <Button
                    size="sm"
                    className="bg-white text-sky-600 hover:bg-sky-50 shadow-md"
                    asChild
                  >
                    <RouterLink to="/purchases/add">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة شراء
                    </RouterLink>
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Boxes className="h-4 w-4 text-white/80" />
                    <ArrowUpRight className="h-3 w-3 text-emerald-200" />
                  </div>
                  <p className="text-xl font-bold text-white mt-1">
                    {stats.total}
                  </p>
                  <p className="text-sky-100 text-xs">إجمالي العمليات</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <CheckCircle className="h-4 w-4 text-emerald-200" />
                    <span className="text-xs text-emerald-200">✓</span>
                  </div>
                  <p className="text-xl font-bold text-white mt-1">
                    {stats.received}
                  </p>
                  <p className="text-sky-100 text-xs">تم الاستلام</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Clock className="h-4 w-4 text-amber-200" />
                    <span className="text-xs text-amber-200">⏳</span>
                  </div>
                  <p className="text-xl font-bold text-white mt-1">
                    {stats.pending}
                  </p>
                  <p className="text-sky-100 text-xs">قيد الانتظار</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <DollarSign className="h-4 w-4 text-white/80" />
                    <TrendingUp className="h-3 w-3 text-emerald-200" />
                  </div>
                  <p className="text-lg font-bold text-white mt-1">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                  <p className="text-sky-100 text-xs">إجمالي المبلغ</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card className="mb-6 border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">بحث وفلترة</CardTitle>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 ml-1" />
                      مسح الكل
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Supplier Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <User className="h-4 w-4" />
                      المورد
                    </label>
                    <Autocomplete
                      options={suppliers}
                      getOptionLabel={(option) => option.name}
                      value={
                        suppliers.find((s) => s.id === filters.supplier_id) ||
                        null
                      }
                      onChange={(_, newValue) =>
                        handleFilterChange("supplier_id", newValue?.id)
                      }
                      loading={loadingSuppliers}
                      size="small"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="اختر المورد"
                          size="small"
                        />
                      )}
                    />
                  </div>

                  {/* Product Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      المنتج
                    </label>
                    <Autocomplete
                      options={products}
                      getOptionLabel={(option) =>
                        `${option.name}${option.sku ? ` (${option.sku})` : ""}`
                      }
                      value={
                        products.find((p) => p.id === filters.product_id) ||
                        null
                      }
                      onChange={(_, newValue) =>
                        handleFilterChange("product_id", newValue?.id)
                      }
                      loading={loadingProducts}
                      size="small"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="اختر المنتج"
                          size="small"
                        />
                      )}
                    />
                  </div>

                  {/* Reference Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      رقم المرجع
                    </label>
                    <Input
                      placeholder="أدخل الرقم"
                      value={filters.reference_number || ""}
                      onChange={(e) =>
                        handleFilterChange("reference_number", e.target.value)
                      }
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">الحالة</label>
                    <Select
                      value={filters.status || ""}
                      onValueChange={(value) =>
                        handleFilterChange("status", value || undefined)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="ordered">تم الطلب</SelectItem>
                        <SelectItem value="received">تم الاستلام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Purchase Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      تاريخ الشراء
                    </label>
                    <Input
                      type="date"
                      value={filters.purchase_date || ""}
                      onChange={(e) =>
                        handleFilterChange("purchase_date", e.target.value)
                      }
                      max={dayjs().format("YYYY-MM-DD")}
                    />
                  </div>

                  {/* Created At */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">تاريخ الإنشاء</label>
                    <Input
                      type="date"
                      value={filters.created_at || ""}
                      onChange={(e) =>
                        handleFilterChange("created_at", e.target.value)
                      }
                      max={dayjs().format("YYYY-MM-DD")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Main Content */}
        <Card className="border shadow-sm">
          {/* Loading State */}
          {isLoading && (
            <CardContent className="p-8">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-destructive/10 rounded-full mb-4">
                  <X className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">حدث خطأ</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={() => fetchPurchases(currentPage, filters)}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  إعادة المحاولة
                </Button>
              </div>
            </CardContent>
          )}

          {/* Table */}
          {!isLoading && !error && purchasesResponse && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-center font-bold">#</TableHead>
                      <TableHead className="text-center font-bold">
                        التاريخ
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        المورد
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        رقم المرجع
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        الحالة
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        الإجمالي
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        إجراءات
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchasesResponse.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-4 bg-muted rounded-full mb-4">
                              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">
                              لا توجد عمليات شراء
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              ابدأ بإضافة أول عملية شراء
                            </p>
                            <Button asChild>
                              <RouterLink to="/purchases/add">
                                <Plus className="h-4 w-4 ml-2" />
                                إضافة شراء
                              </RouterLink>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchasesResponse.data.map((purchase: any) => {
                        const status =
                          statusConfig[
                            purchase.status as keyof typeof statusConfig
                          ] || statusConfig.pending;
                        const StatusIcon = status.icon;

                        return (
                          <TableRow
                            key={purchase.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() =>
                              navigate(`/purchases/${purchase.id}/manage-items`)
                            }
                          >
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono">
                                {purchase.id}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {dayjs(purchase.purchase_date).format(
                                    "YYYY-MM-DD"
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold">
                                {purchase.supplier_name || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <code className="text-sm text-muted-foreground">
                                {purchase.reference_number || "—"}
                              </code>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={cn("gap-1 border", status.color)}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-bold text-primary">
                                {formatCurrency(purchase.total_amount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>
                                    الإجراءات
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/purchases/${purchase.id}/manage-items`
                                      );
                                    }}
                                  >
                                    <Package className="h-4 w-4 ml-2" />
                                    إدارة البنود
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPdfReport(purchase.id);
                                    }}
                                  >
                                    <FileText className="h-4 w-4 ml-2" />
                                    عرض PDF
                                  </DropdownMenuItem>
                                  {filters.product_id && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const product = products.find(
                                          (p) => p.id === filters.product_id
                                        );
                                        if (product)
                                          handleViewProductHistory(product);
                                      }}
                                    >
                                      <History className="h-4 w-4 ml-2" />
                                      سجل المنتج
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {purchasesResponse?.meta?.last_page > 1 && (
                <div className="flex justify-center p-4 border-t">
                  <Pagination
                    count={purchasesResponse.meta.last_page}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                    showFirstButton
                    showLastButton
                    disabled={isLoading}
                  />
                </div>
              )}
            </>
          )}
        </Card>

        {/* Product History Dialog */}
        <PurchaseItemDetailsDialog
          open={productHistoryDialogOpen}
          onClose={handleCloseProductHistory}
          product={selectedProduct}
          purchases={productPurchases}
          isLoading={loadingProductPurchases}
        />
      </div>
    </TooltipProvider>
  );
};

export default PurchasesListPage;
