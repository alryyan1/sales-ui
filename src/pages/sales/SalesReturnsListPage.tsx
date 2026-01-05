// src/pages/sales/SalesReturnsListPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// MUI Pagination (keeping for now as it's already used)
import { Pagination } from "@mui/material";

// Lucide Icons
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  X,
  Eye,
  FileText,
  Calendar,
  User,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from "lucide-react";

// Services
import saleService, { SaleReturn } from "../../services/saleService";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { formatNumber } from "@/constants";
import { cn } from "@/lib/utils";

const SalesReturnsListPage: React.FC = () => {
  const navigate = useNavigate();
  const formatCurrency = useFormatCurrency();

  // State
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query params
  const queryParams = React.useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") {
      params.append("status", statusFilter);
    }
    if (debouncedSearch.trim()) {
      params.append("search", debouncedSearch.trim());
    }
    return params.toString();
  }, [statusFilter, debouncedSearch]);

  // Fetch returns
  const {
    data: returnsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["sale-returns", page, queryParams],
    queryFn: async () => {
      return await saleService.getSaleReturns(page, queryParams);
    },
  });

  const returns = returnsData?.data || [];
  const meta = returnsData?.meta || {
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const config = {
      completed: {
        label: "مكتمل",
        variant: "default" as const,
        icon: CheckCircle2,
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      },
      pending: {
        label: "معلق",
        variant: "secondary" as const,
        icon: Clock,
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      },
      cancelled: {
        label: "ملغى",
        variant: "destructive" as const,
        icon: XCircle,
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      },
    };

    const statusConfig =
      config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <Badge
        variant={statusConfig.variant}
        className={cn("gap-1", statusConfig.className)}
      >
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  // Credit action label
  const getCreditActionLabel = (action: string) => {
    return action === "refund" ? "إسترداد نقدي" : "رصيد دائن";
  };

  // Clear filters
  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || debouncedSearch.trim() !== "";

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-blue-600" />
            سجل مردودات المبيعات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            عرض وإدارة عمليات إرجاع المبيعات
          </p>
        </div>
        <Button
          onClick={() => navigate("/sales/returns/new")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إرجاع جديد
        </Button>
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle>التصفية والبحث</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الفاتورة أو العميل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="حالة الإرجاع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المردودات</p>
                  <p className="text-2xl font-bold">{formatNumber(meta.total)}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مكتملة</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(
                      returns.filter((r) => r.status === "completed").length
                    )}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">معلقة</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatNumber(
                      returns.filter((r) => r.status === "pending").length
                    )}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي القيمة</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      returns.reduce(
                        (sum, r) =>
                          sum + Number(r.total_returned_amount || 0),
                        0
                      )
                    )}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة المردودات</CardTitle>
              <CardDescription>
                عرض {meta.total} مردود من {meta.last_page} صفحة
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : "فشل تحميل البيانات"}
              </AlertDescription>
            </Alert>
          ) : returns.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">
                لا توجد مردودات
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {hasActiveFilters
                  ? "جرب تغيير الفلاتر للعثور على نتائج"
                  : "ابدأ بإنشاء مردود جديد"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20"># المعرف</TableHead>
                    <TableHead>الفاتورة الأصلية</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead className="text-center">تاريخ الإرجاع</TableHead>
                    <TableHead className="text-center">طريقة الإرجاع</TableHead>
                    <TableHead className="text-center">المبلغ المسترد</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center w-32">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((returnItem) => (
                    <TableRow key={returnItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-semibold">
                        #{returnItem.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {returnItem.original_sale?.invoice_number ||
                              `#${returnItem.original_sale_id}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {returnItem.client?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(returnItem.return_date).toLocaleDateString(
                            "ar-SA"
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {getCreditActionLabel(returnItem.credit_action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(
                          Number(returnItem.total_returned_amount || 0)
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(returnItem.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              navigate(`/sales/${returnItem.original_sale_id}`)
                            }
                            title="عرض الفاتورة الأصلية"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                count={meta.last_page}
                page={page}
                onChange={(_event, value) => setPage(value)}
                color="primary"
                size="large"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesReturnsListPage;
