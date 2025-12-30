// src/pages/reports/ProfitLossReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";

// MUI Components
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  Stack,
  Grid,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Filter as FilterIcon,
  Clear as ClearIcon,
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";

// API Client & Types
import apiClient, { getErrorMessage } from "@/lib/axios";
// Helpers
import { formatNumber } from "@/constants";
import dayjs from "dayjs";

// --- Zod Schema for Filter Form ---
const profitLossFilterSchema = z
  .object({
    startDate: z.date({ required_error: "هذا الحقل مطلوب" }), // Dates are required for P/L
    endDate: z.date({ required_error: "هذا الحقل مطلوب" }),
    // Optional filters
    // productId: z.string().nullable().optional(),
    // clientId: z.string().nullable().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
    path: ["endDate"],
  });

type ProfitLossFilterValues = z.infer<typeof profitLossFilterSchema>;

// --- Type for Report Data ---
interface ProfitLossData {
  start_date: string;
  end_date: string;
  filters: Record<string, any>;
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
}

// --- Component ---
const ProfitLossReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [reportData, setReportData] = useState<ProfitLossData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add state for optional filters (products, clients) if needed

  // --- Form ---
  const form = useForm<ProfitLossFilterValues>({
    resolver: zodResolver(profitLossFilterSchema),
    defaultValues: {
      // Default to current month
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : startOfMonth(new Date()),
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : new Date(),
      // clientId: searchParams.get('clientId') || null,
      // productId: searchParams.get('productId') || null,
    },
  });
  const { control, handleSubmit, reset, formState } = form;

  // --- Fetch Report Data ---
  const fetchReport = useCallback(async (filters: ProfitLossFilterValues) => {
    setIsLoading(true);
    setError(null);
    setReportData(null); // Clear previous data
    console.log("Fetching P/L Report:", filters);
    try {
      const params = new URLSearchParams();
      params.append("start_date", format(filters.startDate, "yyyy-MM-dd"));
      params.append("end_date", format(filters.endDate, "yyyy-MM-dd"));
      // if (filters.clientId) params.append('client_id', filters.clientId);
      // if (filters.productId) params.append('product_id', filters.productId);

      const response = await apiClient.get<{ data: ProfitLossData }>(
        `/reports/profit-loss?${params.toString()}`
      );
      setReportData(response.data.data);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error("خطأ", { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependency 't' for toast

  // --- Effect to Fetch Report When URL Params Change ---
  const currentFilters = useMemo(
    () => ({
      startDate: searchParams.get("startDate")
        ? parseISO(searchParams.get("startDate")!)
        : startOfMonth(new Date()),
      endDate: searchParams.get("endDate")
        ? parseISO(searchParams.get("endDate")!)
        : new Date(),
      // clientId: searchParams.get('clientId') || null,
      // productId: searchParams.get('productId') || null,
    }),
    [searchParams]
  );

  useEffect(() => {
    reset(currentFilters); // Sync form with URL
    // Automatically fetch if dates are valid according to schema
    const validationResult = profitLossFilterSchema.safeParse(currentFilters);
    if (validationResult.success) {
      fetchReport(validationResult.data);
    } else {
      // Clear results if current URL params are invalid, maybe show validation error
      setReportData(null);
      // Optionally set an error state based on validationResult.error
      console.warn(
        "Initial URL params invalid for P/L report:",
        validationResult.error.flatten()
      );
    }
  }, [currentFilters, fetchReport, reset]); // Fetch when filters from URL change

  // --- Filter Form Submit Handler ---
  const onFilterSubmit: SubmitHandler<ProfitLossFilterValues> = (data) => {
    console.log("Applying P/L filters:", data);
    const newParams = new URLSearchParams();
    newParams.set("startDate", format(data.startDate, "yyyy-MM-dd"));
    newParams.set("endDate", format(data.endDate, "yyyy-MM-dd"));
    // if (data.clientId) newParams.set('clientId', data.clientId);
    // if (data.productId) newParams.set('productId', data.productId);
    setSearchParams(newParams); // Update URL, triggers useEffect -> fetchReport
  };

  // --- Clear Filters Handler ---
  const clearFilters = () => {
    const defaultFormValues = {
      startDate: startOfMonth(new Date()),
      endDate: new Date() /*, clientId: null, productId: null */,
    };
    reset(defaultFormValues);
    setSearchParams({}); // Clear URL params (triggers refetch via useEffect)
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3, lg: 4 }, minHeight: "100vh", pb: 10 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate("/dashboard")}
          sx={{ minWidth: 40, width: 40, height: 40 }}
        >
          <ArrowBackIcon fontSize="small" />
        </Button>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          تقرير الأرباح والخسائر
        </Typography>
      </Stack>

      {/* Filter Form Card */}
      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography variant="h6" component="h2">
            الفلاتر
          </Typography>
        </CardHeader>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit(onFilterSubmit)}>
            <Grid container spacing={2} alignItems="flex-end">
              {/* Start Date */}
              <Grid item xs={12} sm={6} md={4}>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field, fieldState }) => (
                    <DatePicker
                      label="تاريخ البدء *"
                      value={field.value ?? null}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          required: true,
                          error: !!fieldState.error,
                          helperText: fieldState.error?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              {/* End Date */}
              <Grid item xs={12} sm={6} md={4}>
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field, fieldState }) => (
                    <DatePicker
                      label="تاريخ الانتهاء *"
                      value={field.value ?? null}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          required: true,
                          error: !!fieldState.error,
                          helperText: fieldState.error?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              {/* Filter/Clear Buttons */}
              <Grid item xs={12} sm={12} md={4}>
                <Stack direction="row" spacing={2} justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={clearFilters}
                    disabled={isLoading}
                    startIcon={<ClearIcon />}
                  >
                    مسح الفلاتر
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={16} /> : <FilterIcon />}
                  >
                    توليد التقرير
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Report Results Section */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      )}
      {!isLoading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>خطأ</AlertTitle>
          {error}
        </Alert>
      )}
      {!isLoading && !error && reportData && (
        <Card>
          <CardHeader>
            <Typography variant="h6" component="h2">
              ملخص الأرباح والخسائر
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`للفترة من ${dayjs(reportData.start_date).format(
                "YYYY-MM-DD"
              )} إلى ${dayjs(reportData.end_date).format("YYYY-MM-DD")}`}
            </Typography>
          </CardHeader>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الإيرادات
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <TrendingUpIcon sx={{ fontSize: 16, color: "success.main" }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>
                    {formatNumber(reportData.revenue)}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="body2" color="text.secondary">
                  تكلفة البضاعة المباعة
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <TrendingDownIcon sx={{ fontSize: 16, color: "error.main" }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "error.main" }}>
                    {formatNumber(reportData.cost_of_goods_sold)}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  مجمل الربح
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {reportData.gross_profit < 0 && (
                    <RemoveIcon sx={{ fontSize: 16 }} />
                  )}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: reportData.gross_profit >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    {formatNumber(reportData.gross_profit)}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
      {!isLoading && !error && !reportData && (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <Typography variant="body1" color="text.secondary">
            الرجاء تحديد نطاق التاريخ لعرض التقرير
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ProfitLossReportPage;
