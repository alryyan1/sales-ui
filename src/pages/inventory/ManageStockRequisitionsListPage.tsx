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
) => {
  /* ... (same helper) ... */
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
    /* ... generatePagination ... */
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>تاريخ الطلب</TableHead>
                    <TableHead>الطالب</TableHead>
                    <TableHead>القسم / السبب</TableHead>
                    <TableHead className="text-center">
                      الحالة
                    </TableHead>
                    <TableHead className="text-center">
                      الإجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitionsResponse.data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        لم يتم العثور على طلبات
                      </TableCell>
                    </TableRow>
                  )}{" "}
                  {/* Add key */}
                  {requisitionsResponse.data.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs">
                        REQ-{String(req.id).padStart(5, "0")}
                      </TableCell>
                      <TableCell>{formatDate(req.request_date)}</TableCell>
                      <TableCell>
                        {req.requester_name || "غير متوفر"}
                      </TableCell>
                      <TableCell>{req.department_or_reason || "---"}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={getStatusBadgeVariant(req.status)}
                          className="text-xs"
                        >
                          {req.status === "pending_approval" ? "في انتظار الموافقة" :
                           req.status === "approved" ? "معتمد" :
                           req.status === "issued" ? "تم الإصدار" :
                           req.status === "partially_issued" ? "إصدار جزئي" :
                           req.status === "rejected" ? "مرفوض" :
                           req.status === "cancelled" ? "ملغي" : req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {/* Show "Process" button for pending/partially issued, "View" for others */}
                        {(req.status === "pending_approval" ||
                          req.status === "approved" ||
                          req.status === "partially_issued") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessRequest(req.id)}
                          >
                            <Settings2 className="me-2 h-3 w-3" />{" "}
                            معالجة الطلب
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProcessRequest(req.id)}
                          >
                            <Eye className="me-2 h-3 w-3" />{" "}
                            عرض التفاصيل
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
