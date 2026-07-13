// src/pages/admin/inventory/ManageStockRequisitionsListPage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form"; // RHF for filters
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
import {
  Loader2,
  Filter,
  X,
  Search,
  AlertCircle,
  ArrowLeft,
  Edit,
  Settings2,
  Eye,
} from "lucide-react"; // Edit or Settings2 for Process, Eye for View
import { Badge } from "@/components/ui/badge"; // For status

// Services and Types
import { User } from "../../../services/authService"; // For requester filter if implemented
// import userService from '../../../services/userService'; // If fetching users for filter

// Helpers
import { formatNumber, formatDate } from "@/constants";
import { PaginatedResponse } from "@/services/clientService";
import stockRequisitionService, {
  StockRequisition,
} from "@/services/stockRequisitionService";
const generatePagination = (
  currentPage: number,
  lastPage: number,
  delta = 1
): (number | string)[] => {
  const range: number[] = [];
  for (let i = 1; i <= lastPage; i++) {
    if (
      i === 1 ||
      i === lastPage ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      range.push(i);
    }
  }

  const withDots: (number | string)[] = [];
  let last: number | undefined;
  for (const page of range) {
    if (last !== undefined) {
      if (page - last === 2) {
        withDots.push(last + 1);
      } else if (page - last > 2) {
        withDots.push("...");
      }
    }
    withDots.push(page);
    last = page;
  }
  return withDots;
};

// --- Filter Form Types ---
type RequisitionFilterValues = {
  search?: string;
  status?: string | null;
  requesterId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
};

// --- Component ---
const ManageStockRequisitionsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [requisitionsResponse, setRequisitionsResponse] =
    useState<PaginatedResponse<StockRequisition> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [usersForFilter, setUsersForFilter] = useState<User[]>([]); // If implementing requester filter
  // const [loadingUsersFilter, setLoadingUsersFilter] = useState(false);

  // --- Form for Filters ---
  const form = useForm<RequisitionFilterValues>({
    defaultValues: {
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || null,
      requesterId: searchParams.get("requesterId") || null,
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : null,
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : null,
    },
  });
  const { control, handleSubmit, reset } = form;

  // --- Memoized Filters & Page from URL ---
  const currentFilters = useMemo<RequisitionFilterValues>(
    () => ({
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || null,
      requesterId: searchParams.get("requesterId") || null,
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : null,
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : null,
    }),
    [searchParams]
  );
  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  // --- Data Fetching ---
  const fetchRequisitions = useCallback(
    async (filters: RequisitionFilterValues, page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const apiFilters = {
          page,
          search: filters.search || undefined,
          status: filters.status || undefined,
          requesterId: filters.requesterId
            ? Number(filters.requesterId)
            : undefined,
          startDate: filters.startDate
            ? format(filters.startDate, "yyyy-MM-dd")
            : undefined,
          endDate: filters.endDate
            ? format(filters.endDate, "yyyy-MM-dd")
            : undefined,
        };
        const data = await stockRequisitionService.getRequisitions(
          page,
          15,
          apiFilters
        );
        setRequisitionsResponse(data);
      } catch (err) {
        /* ... error handling with toast ... */
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Effect to fetch when filters/page change
  useEffect(() => {
    reset(currentFilters);
    fetchRequisitions(currentFilters, currentPage);
  }, [currentFilters, currentPage, fetchRequisitions, reset]);
  // useEffect(() => { /* Fetch users for filter if needed */ }, []);

  // --- Handlers ---
  const onFilterSubmit: SubmitHandler<RequisitionFilterValues> = (data) => {
    const params = new URLSearchParams();
    if (data.search) params.set("search", data.search);
    if (data.status) params.set("status", data.status);
    if (data.requesterId) params.set("requesterId", data.requesterId);
    if (data.startDate)
      params.set("startDate", format(data.startDate, "yyyy-MM-dd"));
    if (data.endDate) params.set("endDate", format(data.endDate, "yyyy-MM-dd"));
    params.set("page", "1"); // Reset to page 1
    setSearchParams(params);
  };
  const clearFilters = () => {
    reset({
      search: "",
      status: null,
      requesterId: null,
      startDate: null,
      endDate: null,
    });
    setSearchParams({});
  };
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    setSearchParams(params);
  };

  const handleProcessRequest = (requisitionId: number) => {
    navigate(`/admin/inventory/requisitions/${requisitionId}/process`); // Navigate to processing page
  };

  const paginationItems = useMemo(() => {
    if (!requisitionsResponse) return [];
    return generatePagination(currentPage, requisitionsResponse.last_page);
  }, [currentPage, requisitionsResponse?.last_page]);

  const getStatusBadgeVariant = (
    status: StockRequisition["status"]
  ): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "pending_approval":
        return "secondary";
      case "approved":
        return "default"; // Or a blue-ish color
      case "issued":
      case "partially_issued":
        return "default"; // Green if available, or default
      case "rejected":
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          إدارة طلبات المخزون
        </h1>{" "}
        {/* Add key */}
        {/* No "Add" button here, requests are made by other users */}
      </div>

      {/* Filter Form Card */}
      <Card className="dark:bg-gray-900 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">الفلاتر</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onFilterSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                <FormField
                  control={control}
                  name="search"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>بحث</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ابحث عن طلبات المخزون..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />{" "}
                {/* Add key */}
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الحالة</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder="جميع الحالات"
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value=" ">
                            جميع الحالات
                          </SelectItem>
                          <SelectItem value="pending_approval">
                            في انتظار الموافقة
                          </SelectItem>
                          <SelectItem value="approved">
                            معتمد
                          </SelectItem>
                          <SelectItem value="issued">
                            تم الإصدار
                          </SelectItem>
                          <SelectItem value="partially_issued">
                            إصدار جزئي
                          </SelectItem>
                          <SelectItem value="rejected">
                            مرفوض
                          </SelectItem>
                          <SelectItem value="cancelled">
                            ملغي
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />{" "}
                {/* Add keys */}
                <FormField
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ البداية</FormLabel>
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
                                ? format(field.value, "PPP")
                                : "اختر التاريخ"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ النهاية</FormLabel>
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
                                ? format(field.value, "PPP")
                                : "اختر التاريخ"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
                {/* Add Requester User filter if needed */}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearFilters}
                  disabled={isLoading}
                >
                  <X className="me-2 h-4 w-4" />
                  مسح الفلاتر
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Filter className="me-2 h-4 w-4" />
                  )}{" "}
                  تطبيق الفلاتر
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {!isLoading && error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!isLoading && !error && requisitionsResponse && (
        <>
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>النتائج</CardTitle>
              <CardDescription>
                عرض {requisitionsResponse.from} إلى {requisitionsResponse.to} من {requisitionsResponse.total}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <table className="w-full table-fixed text-sm caption-bottom">
                  <colgroup>
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "130px" }} />
                    <col />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "110px" }} />
                  </colgroup>
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">رقم الطلب</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">تاريخ الطلب</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">الطالب</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">القسم / السبب</th>
                      <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">الحالة</th>
                      <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {requisitionsResponse.data.length === 0 && (
                      <tr>
                        <td colSpan={6} className="h-24 text-center text-muted-foreground">
                          لم يتم العثور على طلبات
                        </td>
                      </tr>
                    )}
                    {requisitionsResponse.data.map((req) => (
                      <tr key={req.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3 align-middle font-mono font-semibold">
                          SR-{String(req.id).padStart(4, "0")}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {formatDate(req.request_date)}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {req.requester_name || "غير متوفر"}
                        </td>
                        <td className="px-4 py-3 align-middle truncate max-w-0">
                          <span className="block truncate" title={req.department_or_reason || ""}>
                            {req.department_or_reason || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            req.status === "pending_approval" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                            req.status === "approved"         ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                            req.status === "issued"           ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                            req.status === "partially_issued" ? "bg-teal-100 text-teal-800" :
                            req.status === "rejected"         ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                                                                "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}>
                            {req.status === "pending_approval" ? "قيد المراجعة"  :
                             req.status === "approved"         ? "موافق عليه"    :
                             req.status === "issued"           ? "تم الصرف"      :
                             req.status === "partially_issued" ? "صرف جزئي"      :
                             req.status === "rejected"         ? "مرفوض"          :
                             req.status === "cancelled"        ? "ملغي"           : req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-center">
                          {(req.status === "pending_approval" ||
                            req.status === "approved" ||
                            req.status === "partially_issued") ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcessRequest(req.id)}
                            >
                              <Settings2 className="me-1 h-3.5 w-3.5" />
                              معالجة
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProcessRequest(req.id)}
                            >
                              <Eye className="me-1 h-3.5 w-3.5" />
                              عرض
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {requisitionsResponse.last_page > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationPrevious
                  onClick={
                    currentPage === 1
                      ? undefined
                      : () => handlePageChange(currentPage - 1)
                  }
                  className={
                    currentPage === 1 ? "cursor-not-allowed opacity-50" : ""
                  }
                >
                  السابق
                </PaginationPrevious>
                {paginationItems.map((item, index) =>
                  item === "..." ? (
                    <PaginationEllipsis key={index} />
                  ) : (
                    <PaginationItem
                      key={index}
                      className={item === currentPage ? "active-class" : ""}
                    >
                      <PaginationLink onClick={() => handlePageChange(item)}>
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationNext
                  onClick={
                    currentPage === requisitionsResponse.last_page
                      ? undefined
                      : () => handlePageChange(currentPage + 1)
                  }
                  className={
                    currentPage === requisitionsResponse.last_page
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  }
                >
                  التالي
                </PaginationNext>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};

export default ManageStockRequisitionsListPage;
