// src/pages/reports/SaleReturnsReportPage.tsx
import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Autocomplete,
  Box,
  Button,
  Typography,
  Stack,
  Card,
  CardContent,
  TextField,
  Tabs,
  Tab,
} from "@mui/material";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import saleReturnService from "@/services/saleReturnService";
import { useShifts } from "@/hooks/useShifts";
import { formatNumber } from "@/constants";
import SaleReturnsMonthlyTab from "@/components/reports/sales/SaleReturnsMonthlyTab";
import SaleReturnsProductsPieTab from "@/components/reports/sales/SaleReturnsProductsPieTab";
import SaleReturnsPaymentsBreakdownTab from "@/components/reports/sales/SaleReturnsPaymentsBreakdownTab";

const SaleReturnsReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabIndex, setTabIndex] = useState(0);

  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = searchParams.get("startDate") || today;
  const endDate = searchParams.get("endDate") || today;
  const shiftIdParam = searchParams.get("shiftId");

  const { data: shifts = [] } = useShifts();

  const selectedShift = useMemo(
    () =>
      shiftIdParam
        ? shifts.find((s) => String(s.id) === shiftIdParam) ?? null
        : null,
    [shifts, shiftIdParam],
  );

  const [selectedShiftOption, setSelectedShiftOption] = useState<any | null>(
    selectedShift,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["sale-returns-report", startDate, endDate, shiftIdParam],
    queryFn: () =>
      saleReturnService.getSaleReturns({
        start_date: startDate,
        end_date: endDate,
        shift_id: selectedShift?.id ?? null,
        page: 1,
        per_page: 100,
      }),
  });

  const returns = data?.data ?? [];

  const totalAmount = returns.reduce((sum, r) => {
    const itemsTotal =
      r.items?.reduce(
        (acc, item) => acc + Number(item.price) * Number(item.quantity),
        0,
      ) ?? 0;
    return sum + itemsTotal;
  }, 0);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newStart = String(formData.get("startDate") || "");
    const newEnd = String(formData.get("endDate") || "");
    const newShiftId = selectedShiftOption?.id
      ? String(selectedShiftOption.id)
      : "";

    const params = new URLSearchParams();
    if (newStart) params.set("startDate", newStart);
    if (newEnd) params.set("endDate", newEnd);
    if (newShiftId) params.set("shiftId", newShiftId);
    setSearchParams(params);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: 3,
      }}
    >
      <Box
        sx={{
          maxWidth: "1200px",
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
        }}
      >
        <Stack spacing={3}>
          {/* Header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                onClick={() => navigate("/dashboard")}
                size="small"
                variant="outlined"
                startIcon={<ArrowLeft size={16} />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                رجوع
              </Button>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  تقرير مردودات المبيعات
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  عرض مردودات المبيعات حسب التاريخ والوردية
                </Typography>
              </Box>
            </Stack>
          </Stack>

          {/* Filters */}
          <Card>
            <CardContent>
              <Box
                component="form"
                onSubmit={handleFilterSubmit}
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: { xs: "stretch", md: "flex-end" },
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  <TextField
                    name="startDate"
                    type="date"
                    size="small"
                    label="من تاريخ"
                    InputLabelProps={{ shrink: true }}
                    defaultValue={startDate}
                    fullWidth
                  />
                  <TextField
                    name="endDate"
                    type="date"
                    size="small"
                    label="إلى تاريخ"
                    InputLabelProps={{ shrink: true }}
                    defaultValue={endDate}
                    fullWidth
                  />
                  <TextField
                    name="startDate"
                    type="date"
                    size="small"
                    label="من تاريخ"
                    InputLabelProps={{ shrink: true }}
                    defaultValue={startDate}
                    fullWidth
                  />
                  <TextField
                    name="endDate"
                    type="date"
                    size="small"
                    label="إلى تاريخ"
                    InputLabelProps={{ shrink: true }}
                    defaultValue={endDate}
                    fullWidth
                  />
                  <Autocomplete
                    size="small"
                    options={shifts}
                    getOptionLabel={(option: any) =>
                      option?.name
                        ? `${option.name} (#${option.id})`
                        : `وردية #${option?.id ?? ""}`
                    }
                    value={selectedShiftOption}
                    onChange={(_, newValue) => setSelectedShiftOption(newValue)}
                    isOptionEqualToValue={(option: any, value: any) =>
                      option?.id === value?.id
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="الوردية (اختياري)"
                        placeholder="اختر الوردية"
                        fullWidth
                      />
                    )}
                    fullWidth
                  />
                </Stack>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: { xs: "stretch", md: "flex-start" },
                  }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      minWidth: 140,
                      px: 3,
                      textTransform: "none",
                      height: 40,
                    }}
                  >
                    تطبيق الفلاتر
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Stats */}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Card sx={{ minWidth: 220, flex: 1 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      عدد المردودات
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {formatNumber(returns.length)}
                    </Typography>
                  </Box>
                  <FileText className="h-8 w-8 text-blue-500" />
                </Stack>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 220, flex: 1 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  إجمالي القيمة
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatNumber(totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {/* Table */}
          <Card>
            <CardContent>
              {isLoading ? (
                <Typography variant="body2">جاري التحميل...</Typography>
              ) : (
                <>
                  <Tabs
                    value={tabIndex}
                    onChange={(_, newValue) => setTabIndex(newValue)}
                    sx={{ mb: 2 }}
                  >
                    <Tab label="ملخص شهري حسب اليوم" />
                    <Tab label="توزيع المنتجات المرتجعة" />
                    <Tab label="توزيع طرق الدفع للمردودات" />
                  </Tabs>

                  {returns.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 6 }}>
                      <Typography variant="body1" color="text.secondary">
                        لا توجد مردودات في الفترة المحددة
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {tabIndex === 0 && (
                        <SaleReturnsMonthlyTab
                          returns={returns}
                          startDate={startDate}
                          endDate={endDate}
                        />
                      )}
                      {tabIndex === 1 && (
                        <SaleReturnsProductsPieTab returns={returns} />
                      )}
                      {tabIndex === 2 && (
                        <SaleReturnsPaymentsBreakdownTab returns={returns} />
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
};

export default SaleReturnsReportPage;

